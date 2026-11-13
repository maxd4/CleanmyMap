begin;

-- PURPOSE: close the private-action read boundary and move the remaining
-- action-linked authorization decisions to persisted UTC instants.
-- CALLERS: public Data API RLS, authenticated chat RLS and service-side
-- action-needs, buddy and ride RPCs.
-- AUTHORIZATION_BOUNDARY: owners and service_role retain their existing
-- action access; public reads and public action references require public
-- access_mode, visibility and review approval.
-- IDEMPOTENCY: no new mutation path is introduced; existing locked RPCs and
-- terminal-state replays remain unchanged.
-- ATOMICITY: all policy, grant and function replacements are transactional
-- DDL and keep the existing RPC signatures.
-- FAILURE_BEHAVIOR: missing UTC instants, non-public actions, invalid review
-- state and invalid local-day ride departures fail closed.
-- SEARCH_PATH: privileged functions pin public, pg_catalog or pg_catalog only.
-- GRANTS: client roles retain only the existing RLS/helper grants; the public
-- message-reference RPC is service-only and the private policy helper remains
-- authenticated-only.

-- Public action reads must not expose invitation-link actions. The owner and
-- service_role branches deliberately remain broader than the public branch.
drop policy if exists actions_select_public_or_owner on public.actions;
create policy actions_select_public_or_owner on public.actions
for select using (
  (select auth.role()) = 'service_role'
  or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  or (
    coalesce(access_mode, 'public') = 'public'
    and coalesce(moderation_visibility, 'visible') = 'visible'
    and coalesce(review_state, 'not_required') in ('not_required', 'approved')
    and (
      (
        status = 'approved'
        and coalesce(action_phase, 'post_action_complete') <> 'pre_action'
      )
      or public.is_public_future_pre_action_v2(
        action_phase, published_at, moderation_visibility, status, event_start_at
      )
    )
  )
);

-- The exposed compatibility RPC is not a browser permission. Keep its public
-- schema name for legacy server callers, but restore service-only EXECUTE.
create or replace function public.can_insert_action_message_reference(p_action_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.actions a
    where a.id = p_action_id
      and coalesce(a.access_mode, 'public') = 'public'
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
      and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
      and a.published_at is not null
      and (
        public.is_public_future_pre_action_v2(
          a.action_phase, a.published_at, a.moderation_visibility,
          a.status, a.event_start_at
        )
        or (
          a.action_phase = 'post_action_complete'
          and a.status = 'approved'
        )
      )
  );
$$;

revoke all on function public.can_insert_action_message_reference(uuid)
  from public, anon, authenticated;
grant execute on function public.can_insert_action_message_reference(uuid)
  to service_role;

-- This private helper is the policy owner for app_messages action references.
-- It must not delegate back to the historical Paris-based predicate.
create or replace function private.can_insert_action_message_reference(
  p_action_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select (select auth.role()) = 'authenticated'
    and exists (
      select 1
      from public.actions a
      where a.id = p_action_id
        and coalesce(a.access_mode, 'public') = 'public'
        and coalesce(a.moderation_visibility, 'visible') = 'visible'
        and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
        and a.published_at is not null
        and (
          public.is_public_future_pre_action_v2(
            a.action_phase, a.published_at, a.moderation_visibility,
            a.status, a.event_start_at
          )
          or (
            a.action_phase = 'post_action_complete'
            and a.status = 'approved'
          )
        )
    );
$$;

revoke all on function private.can_insert_action_message_reference(uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.can_insert_action_message_reference(uuid)
  to authenticated;

-- Needs remain public only when the parent action is a public, reviewed future
-- action. The signature is unchanged for existing service callers.
create or replace function public.is_public_open_action_need(p_need_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.action_needs n
    join public.actions a on a.id = n.action_id
    where n.id = p_need_id
      and n.status = 'open'
      and (n.expires_at is null or n.expires_at >= now())
      and coalesce(a.access_mode, 'public') = 'public'
      and public.is_public_future_pre_action_v2(
        a.action_phase, a.published_at, a.moderation_visibility,
        a.status, a.event_start_at
      )
      and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
  );
$$;

-- Keep buddy matching's lock, transition and notification behavior, replacing
-- only its action eligibility predicate with the persisted UTC contract.
create or replace function public.accept_action_buddy_proposal(p_proposal_id uuid)
returns table (
  status text,
  request_id uuid,
  proposal_id uuid,
  mentor_user_id text,
  matched_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action public.actions%rowtype;
  v_request public.action_buddy_requests%rowtype;
  v_proposal public.action_buddy_proposals%rowtype;
  v_probe record;
  v_registration record;
  v_requester_confirmed boolean := false;
  v_mentor_confirmed boolean := false;
  v_existing_request_id uuid;
  v_matched_at timestamptz := now();
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'action_buddy_server_only' using errcode = '42501';
  end if;

  select p.id, p.request_id, p.mentor_user_id, r.action_id
  into v_probe
  from public.action_buddy_proposals as p
  join public.action_buddy_requests as r on r.id = p.request_id
  where p.id = p_proposal_id;

  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(format('action-buddy:%s:%s', v_probe.action_id, v_probe.mentor_user_id), 0)
  );

  select action_row.* into v_action
  from public.actions as action_row
  where action_row.id = v_probe.action_id
  for update;
  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  select request_row.* into v_request
  from public.action_buddy_requests as request_row
  where request_row.id = v_probe.request_id
  for update;
  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  select proposal_row.* into v_proposal
  from public.action_buddy_proposals as proposal_row
  where proposal_row.id = p_proposal_id
  for update;
  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  if v_proposal.status = 'accepted'
     and v_request.status = 'matched'
     and v_request.matched_mentor_user_id = v_proposal.mentor_user_id then
    return query select 'already_matched'::text, v_request.id, v_proposal.id, v_proposal.mentor_user_id, v_request.matched_at;
    return;
  end if;

  if v_proposal.status <> 'pending' then
    raise exception 'action_buddy_conflict_proposal_not_pending' using errcode = 'P0001';
  end if;
  if v_request.status <> 'open' then
    raise exception 'action_buddy_conflict_request_not_open' using errcode = 'P0001';
  end if;
  if v_request.requester_user_id = v_proposal.mentor_user_id then
    raise exception 'action_buddy_conflict_self_match' using errcode = 'P0001';
  end if;
  if coalesce(v_action.access_mode, 'public') <> 'public'
     or not public.is_public_future_pre_action_v2(
       coalesce(v_action.action_phase, 'post_action_complete'),
       v_action.published_at,
       coalesce(v_action.moderation_visibility, 'visible'),
       v_action.status,
       v_action.event_start_at
     )
     or coalesce(v_action.review_state, 'not_required') not in ('not_required', 'approved') then
    raise exception 'action_buddy_conflict_action_not_eligible' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.action_buddy_availability as availability_row
    where availability_row.action_id = v_action.id
      and availability_row.mentor_user_id = v_proposal.mentor_user_id
    for update
  ) then
    raise exception 'action_buddy_conflict_mentor_unavailable' using errcode = 'P0001';
  end if;

  for v_registration in
    select ar.user_id, ar.registration_status
    from public.action_registrations as ar
    where ar.action_id = v_action.id
      and ar.user_id in (v_request.requester_user_id, v_proposal.mentor_user_id)
    order by ar.user_id
    for update
  loop
    if v_registration.user_id = v_request.requester_user_id
       and v_registration.registration_status = 'confirmed' then
      v_requester_confirmed := true;
    end if;
    if v_registration.user_id = v_proposal.mentor_user_id
       and v_registration.registration_status = 'confirmed' then
      v_mentor_confirmed := true;
    end if;
  end loop;

  if not v_requester_confirmed or not v_mentor_confirmed then
    raise exception 'action_buddy_conflict_registration_not_confirmed' using errcode = 'P0001';
  end if;

  select existing_request.id into v_existing_request_id
  from public.action_buddy_requests as existing_request
  where existing_request.action_id = v_action.id
    and existing_request.status = 'matched'
    and existing_request.matched_mentor_user_id = v_proposal.mentor_user_id
    and existing_request.id <> v_request.id
  order by existing_request.id
  for update;

  if found then
    raise exception 'action_buddy_conflict_mentor_already_matched' using errcode = 'P0001';
  end if;

  update public.action_buddy_proposals as competing_proposal
  set status = 'declined', resolved_at = v_matched_at
  where competing_proposal.request_id = v_request.id
    and competing_proposal.status = 'pending'
    and competing_proposal.id <> v_proposal.id;

  update public.action_buddy_requests as accepted_request
  set status = 'matched',
      matched_mentor_user_id = v_proposal.mentor_user_id,
      matched_at = v_matched_at
  where accepted_request.id = v_request.id;

  update public.action_buddy_proposals as accepted_proposal
  set status = 'accepted', resolved_at = v_matched_at
  where accepted_proposal.id = v_proposal.id;

  return query select 'matched'::text, v_request.id, v_proposal.id, v_proposal.mentor_user_id, v_matched_at;
exception
  when unique_violation then
    raise exception 'action_buddy_conflict_unique_matching' using errcode = 'P0001';
end;
$$;

revoke all on function public.accept_action_buddy_proposal(uuid)
  from public, anon, authenticated;
grant execute on function public.accept_action_buddy_proposal(uuid)
  to service_role;

-- Ride departure must be in the same civil date as the action in the action's
-- IANA zone, while the ordering remains an instant comparison in UTC.
create or replace function public.is_action_ride_departure_eligible(
  p_action_id uuid, p_departure_at timestamptz
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select coalesce(auth.role(), '') = 'service_role'
    and p_departure_at > now()
    and exists (
      select 1
      from public.actions a
      where a.id = p_action_id
        and a.event_start_at is not null
        and a.action_timezone is not null
        and p_departure_at < a.event_start_at
        and (p_departure_at at time zone a.action_timezone)::date
          = (a.event_start_at at time zone a.action_timezone)::date
        and public.is_public_future_pre_action_v2(
          a.action_phase, a.published_at, a.moderation_visibility,
          a.status, a.event_start_at
        )
        and coalesce(a.access_mode, 'public') = 'public'
        and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
    );
$$;

-- Keep the existing ride transition/locking contracts and replace only the
-- stale Paris-based eligibility call in the accept path.
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
     or not public.is_public_future_pre_action_v2(
       v_action.action_phase, v_action.published_at,
       v_action.moderation_visibility, v_action.status, v_action.event_start_at
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

-- The update RPC is the other active ride consumer that still used the
-- historical Paris predicate.
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
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  select r.* into v_ride from public.action_rides r where r.id = p_ride_id for update;
  if not found then
    raise exception 'Ride not found';
  end if;
  if v_ride.driver_user_id <> v_actor then
    raise exception 'Only the ride driver can modify this ride';
  end if;
  select a.* into v_action from public.actions a where a.id = v_ride.action_id;
  if not found
     or not public.is_public_future_pre_action_v2(
       v_action.action_phase, v_action.published_at,
       v_action.moderation_visibility, v_action.status, v_action.event_start_at
     )
     or coalesce(v_action.access_mode, 'public') <> 'public'
     or coalesce(v_action.review_state, 'not_required') not in ('not_required', 'approved')
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

revoke all on function public.accept_action_ride_request(uuid, text)
  from public, anon, authenticated;
grant execute on function public.accept_action_ride_request(uuid, text)
  to service_role;
revoke all on function public.update_action_ride_details(
  uuid, text, text, timestamptz, smallint, text
) from public, anon, authenticated;
grant execute on function public.update_action_ride_details(
  uuid, text, text, timestamptz, smallint, text
) to service_role;

commit;
