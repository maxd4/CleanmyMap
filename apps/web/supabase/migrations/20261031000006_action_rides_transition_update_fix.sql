begin;

-- PURPOSE: repair the published ride transition and update RPC contracts forward-only.
-- CALLER: server-side ride services using the service_role execution grant.
-- AUTHORIZATION_BOUNDARY: the RPCs retain their service_role check and driver ownership guard.
-- IDEMPOTENCY: cancellation notification identity and replay behavior remain unchanged.
-- ATOMICITY: row locks and the existing single-transaction RPC mutations are preserved.
-- FAILURE_BEHAVIOR: ambiguous SQL references and non-open updates fail explicitly.
-- SEARCH_PATH: functions use public, pg_catalog only.
-- GRANTS: public, anon and authenticated remain revoked; service_role remains the sole executor.

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

  update public.action_rides as ar
  set status = p_status
  where ar.id = v_ride.id;
  update public.action_ride_requests as rr
  set status = 'declined', resolved_at = timezone('utc', now())
  where rr.ride_id = v_ride.id and rr.status = 'pending';
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
     or v_ride.status <> 'open'
     or not public.is_public_future_pre_action(v_action.action_phase, v_action.published_at, v_action.moderation_visibility, v_action.status, v_action.action_date, v_action.event_start_time)
     or not public.is_action_ride_eligible_member(v_ride.action_id, v_actor)
     or not public.is_action_ride_departure_eligible(v_ride.action_id, p_departure_at) then
    raise exception 'Ride is no longer eligible for modification';
  end if;
  update public.action_rides as ar
  set origin_zone_name = p_origin_zone_name,
      departure_at = p_departure_at,
      seats_total = p_seats_total,
      note = p_note
  where ar.id = v_ride.id
  returning ar.* into v_ride;
  return v_ride;
end;
$$;

revoke all on function public.transition_action_ride(uuid, text, text) from public, anon, authenticated;
revoke all on function public.update_action_ride_details(uuid, text, text, timestamptz, smallint, text) from public, anon, authenticated;
grant execute on function public.transition_action_ride(uuid, text, text) to service_role;
grant execute on function public.update_action_ride_details(uuid, text, text, timestamptz, smallint, text) to service_role;

commit;
