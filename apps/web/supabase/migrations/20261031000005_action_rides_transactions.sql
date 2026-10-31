-- PURPOSE: transactional mutations for private action ride reservations.
-- CALLER: authenticated HTTP handlers after Clerk AuthN/AuthZ; SQL remains
-- service_role-only because the tables and RPCs contain private ride data.
-- LOCK ORDER: ride row, then request row. Every capacity-affecting mutation
-- uses this order and delegates the aggregate to action_ride_capacity.
-- PRIVACY: only confirmed members can reach the HTTP projection. Exact
-- addresses, coordinates and direct contacts are not stored or returned.
-- IDEMPOTENCY: terminal request states are stable; cancellation notifications
-- use a recipient/ride/event identity and ON CONFLICT DO NOTHING.
-- FORWARD_ONLY: this migration is append-only.

create unique index if not exists app_notifications_action_ride_cancel_identity_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'eventType'),
    (payload ->> 'rideId')
  )
  where type = 'community'
    and payload ->> 'eventType' = 'action_ride_cancelled'
    and nullif(payload ->> 'rideId', '') is not null;

create or replace function public.accept_action_ride_request(
  p_request_id uuid,
  p_actor_user_id text
)
returns table (
  request_id uuid,
  ride_id uuid,
  status text,
  seats_requested smallint,
  resolved_at timestamptz,
  seats_available integer
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_ride public.action_rides%rowtype;
  v_request public.action_ride_requests%rowtype;
  v_capacity record;
  v_action public.actions%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_request_id is null or v_actor is null then
    raise exception 'Invalid ride request actor';
  end if;

  -- Stable lock order: ride first, request second.
  select r.* into v_ride
  from public.action_rides r
  join public.action_ride_requests rr on rr.ride_id = r.id
  where rr.id = p_request_id
  for update of r;
  if not found then
    raise exception 'Ride not found';
  end if;

  select rr.* into v_request
  from public.action_ride_requests rr
  where rr.id = p_request_id
    and rr.ride_id = v_ride.id
  for update;
  if not found then
    raise exception 'Ride request not found';
  end if;

  if v_ride.driver_user_id <> v_actor then
    raise exception 'Only the ride driver can accept a request';
  end if;
  if v_request.passenger_user_id = v_ride.driver_user_id then
    raise exception 'Driver cannot accept their own ride request';
  end if;
  if v_ride.status <> 'open' or v_request.status <> 'pending' then
    raise exception 'Ride request is no longer pending';
  end if;

  select a.* into v_action
  from public.actions a
  where a.id = v_ride.action_id;
  if not found
     or not public.is_public_future_pre_action(
       v_action.action_phase, v_action.published_at,
       v_action.moderation_visibility, v_action.status,
       v_action.action_date, v_action.event_start_time
     )
     or coalesce(v_action.access_mode, 'public') <> 'public'
     or coalesce(v_action.review_state, 'not_required') not in ('not_required', 'approved')
     or not public.is_action_ride_departure_eligible(v_ride.action_id, v_ride.departure_at)
     or not public.is_action_ride_eligible_member(v_ride.action_id, v_ride.driver_user_id)
     or not public.is_action_ride_eligible_member(v_ride.action_id, v_request.passenger_user_id) then
    raise exception 'Ride is no longer eligible';
  end if;

  select * into v_capacity
  from public.action_ride_capacity(v_ride.id);
  if coalesce(v_capacity.seats_available, 0) < v_request.seats_requested then
    raise exception 'Ride capacity exceeded';
  end if;

  update public.action_ride_requests
  set status = 'accepted',
      resolved_at = timezone('utc', now())
  where id = v_request.id;

  return query
  select v_request.id, v_ride.id, 'accepted'::text, v_request.seats_requested,
    timezone('utc', now()),
    (v_capacity.seats_available - v_request.seats_requested)::integer;
end;
$$;

create or replace function public.decline_action_ride_request(
  p_request_id uuid,
  p_actor_user_id text
)
returns table (request_id uuid, ride_id uuid, status text, resolved_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_ride public.action_rides%rowtype;
  v_request public.action_ride_requests%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_request_id is null or v_actor is null then raise exception 'Invalid ride request actor'; end if;
  select r.* into v_ride
  from public.action_rides r
  join public.action_ride_requests rr on rr.ride_id = r.id
  where rr.id = p_request_id
  for update of r;
  if not found then raise exception 'Ride not found'; end if;
  select rr.* into v_request from public.action_ride_requests rr
  where rr.id = p_request_id and rr.ride_id = v_ride.id for update;
  if not found then raise exception 'Ride request not found'; end if;
  if v_ride.driver_user_id <> v_actor then raise exception 'Only the ride driver can decline a request'; end if;
  if v_request.status <> 'pending' then raise exception 'Ride request is no longer pending'; end if;
  update public.action_ride_requests
  set status = 'declined', resolved_at = timezone('utc', now())
  where id = v_request.id;
  return query select v_request.id, v_ride.id, 'declined'::text, timezone('utc', now());
end;
$$;

create or replace function public.withdraw_action_ride_request(
  p_request_id uuid,
  p_actor_user_id text
)
returns table (
  request_id uuid,
  ride_id uuid,
  status text,
  resolved_at timestamptz,
  seats_available integer
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_ride public.action_rides%rowtype;
  v_request public.action_ride_requests%rowtype;
  v_capacity record;
  v_actor text := nullif(btrim(p_actor_user_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_request_id is null or v_actor is null then raise exception 'Invalid ride request actor'; end if;
  select r.* into v_ride
  from public.action_rides r
  join public.action_ride_requests rr on rr.ride_id = r.id
  where rr.id = p_request_id
  for update of r;
  if not found then raise exception 'Ride not found'; end if;
  select rr.* into v_request from public.action_ride_requests rr
  where rr.id = p_request_id and rr.ride_id = v_ride.id for update;
  if not found then raise exception 'Ride request not found'; end if;
  if v_request.passenger_user_id <> v_actor then raise exception 'Only the requester can withdraw this request'; end if;
  if v_request.status not in ('pending', 'accepted') then raise exception 'Ride request is already resolved'; end if;
  update public.action_ride_requests
  set status = 'withdrawn', resolved_at = timezone('utc', now())
  where id = v_request.id;
  select * into v_capacity from public.action_ride_capacity(v_ride.id);
  return query select v_request.id, v_ride.id, 'withdrawn'::text, timezone('utc', now()), v_capacity.seats_available;
end;
$$;

create or replace function public.transition_action_ride(
  p_ride_id uuid,
  p_actor_user_id text,
  p_status text
)
returns table (ride_id uuid, status text, resolved_requests integer, notified_passengers integer)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_ride public.action_rides%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
  v_resolved integer := 0;
  v_notified integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_ride_id is null or v_actor is null or p_status not in ('closed', 'cancelled') then
    raise exception 'Invalid ride transition';
  end if;
  select r.* into v_ride from public.action_rides r where r.id = p_ride_id for update;
  if not found then raise exception 'Ride not found'; end if;
  if v_ride.driver_user_id <> v_actor then raise exception 'Only the ride driver can close this ride'; end if;
  if v_ride.status = 'cancelled' and p_status = 'cancelled' then
    return query select v_ride.id, v_ride.status, 0, 0;
    return;
  end if;
  if v_ride.status not in ('open', 'closed') then raise exception 'Ride is already cancelled'; end if;

  update public.action_rides set status = p_status where id = v_ride.id;
  update public.action_ride_requests
  set status = 'declined', resolved_at = timezone('utc', now())
  where ride_id = v_ride.id and status = 'pending';
  get diagnostics v_resolved = row_count;

  if p_status = 'cancelled' then
    insert into public.app_notifications (user_id, type, title, content, payload)
    select rr.passenger_user_id,
      'community',
      'Trajet annulé',
      'Le trajet proposé pour cette action a été annulé.',
      jsonb_build_object(
        'eventType', 'action_ride_cancelled',
        'actionId', v_ride.action_id,
        'rideId', v_ride.id
      )
    from public.action_ride_requests rr
    where rr.ride_id = v_ride.id
      and rr.status = 'accepted'
      and rr.passenger_user_id <> v_ride.driver_user_id
    on conflict do nothing;
    get diagnostics v_notified = row_count;
  end if;

  return query select v_ride.id, p_status, v_resolved, v_notified;
end;
$$;

create or replace function public.update_action_ride_details(
  p_ride_id uuid,
  p_actor_user_id text,
  p_origin_zone_name text,
  p_departure_at timestamptz,
  p_seats_total smallint,
  p_note text
)
returns public.action_rides
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_ride public.action_rides%rowtype;
  v_action public.actions%rowtype;
  v_actor text := nullif(btrim(p_actor_user_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  select r.* into v_ride from public.action_rides r where r.id = p_ride_id for update;
  if not found then raise exception 'Ride not found'; end if;
  if v_ride.driver_user_id <> v_actor then raise exception 'Only the ride driver can modify this ride'; end if;
  select a.* into v_action from public.actions a where a.id = v_ride.action_id;
  if not found
     or not public.is_public_future_pre_action(v_action.action_phase, v_action.published_at, v_action.moderation_visibility, v_action.status, v_action.action_date, v_action.event_start_time)
     or not public.is_action_ride_eligible_member(v_ride.action_id, v_actor)
     or not public.is_action_ride_departure_eligible(v_ride.action_id, p_departure_at) then
    raise exception 'Ride is no longer eligible for modification';
  end if;
  update public.action_rides
  set origin_zone_name = p_origin_zone_name,
      departure_at = p_departure_at,
      seats_total = p_seats_total,
      note = p_note
  where id = v_ride.id
  returning * into v_ride;
  return v_ride;
end;
$$;

revoke all on function public.accept_action_ride_request(uuid, text) from public, anon, authenticated;
revoke all on function public.decline_action_ride_request(uuid, text) from public, anon, authenticated;
revoke all on function public.withdraw_action_ride_request(uuid, text) from public, anon, authenticated;
revoke all on function public.transition_action_ride(uuid, text, text) from public, anon, authenticated;
revoke all on function public.update_action_ride_details(uuid, text, text, timestamptz, smallint, text) from public, anon, authenticated;
grant execute on function public.accept_action_ride_request(uuid, text) to service_role;
grant execute on function public.decline_action_ride_request(uuid, text) to service_role;
grant execute on function public.withdraw_action_ride_request(uuid, text) to service_role;
grant execute on function public.transition_action_ride(uuid, text, text) to service_role;
grant execute on function public.update_action_ride_details(uuid, text, text, timestamptz, smallint, text) to service_role;
