begin;

-- PURPOSE: restore the terminal-state guard in the UTC-aware ride detail RPC.
-- CALLER: server-side ride services using the service_role execution grant.
-- AUTHORIZATION_BOUNDARY: service_role and the owning driver remain required.
-- IDEMPOTENCY: CREATE OR REPLACE preserves the RPC signature and replay shape.
-- ATOMICITY: the locked row update remains one transactional RPC operation.
-- FAILURE_BEHAVIOR: missing, unauthorized, ineligible or non-open rides fail closed.
-- SEARCH_PATH: the function pins public, pg_catalog only.
-- GRANTS: public, anon and authenticated remain revoked; service_role remains the sole executor.

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
     or v_ride.status <> 'open'
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

revoke all on function public.update_action_ride_details(
  uuid, text, text, timestamptz, smallint, text
) from public, anon, authenticated;
grant execute on function public.update_action_ride_details(
  uuid, text, text, timestamptz, smallint, text
) to service_role;

commit;
