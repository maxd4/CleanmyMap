-- SPOGOMI preparation concurrency: serialize lifecycle mutations and GPX/Action sync.
-- Forward-only. This migration does not alter the certificate correction published
-- in 20261012000021; its concurrent proof lives in the ephemeral DB test below.

create or replace function public.spogomi_lock_event_for_mutation(p_event_id uuid)
returns public.spogomi_events
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
begin
  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  return v_event;
end;
$$;

-- A ticket refresh may remain auditable after the composition boundary, but its
-- trigger must first serialize on the same event row as composition RPCs. If it
-- wins the lock first, lock_team_composition sees the new place; if composition
-- wins first, the refresh is rejected as a new official place.
create or replace function public.guard_spogomi_participant_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_context text := coalesce(current_setting('spogomi.composition_write_context', true), '');
  v_composition_protected boolean;
  v_team_changed boolean := false;
  v_eligibility_changed boolean := false;
begin
  select * into v_event
    from public.spogomi_events
   where id = new.event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;

  if tg_op = 'INSERT' then
    v_team_changed := true;
    v_eligibility_changed := true;
  else
    v_team_changed := old.team_id is distinct from new.team_id;
    v_eligibility_changed := old.registration_status is distinct from new.registration_status
      or old.ticket_status is distinct from new.ticket_status
      or old.ticket_deleted is distinct from new.ticket_deleted;
  end if;
  v_composition_protected := v_event.state not in ('draft', 'registration_open')
    or exists (
      select 1
        from public.spogomi_teams team
       where team.event_id = new.event_id
         and public.spogomi_team_requires_composition_correction(new.event_id, team.id)
    );

  if not v_composition_protected then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if v_context = 'ticket_reconciliation'
       and new.source_system = 'cachan_ticketing'
       and new.registration_status = 'withdrawn'
       and new.team_id is null then
      return new;
    end if;
    raise exception using
      errcode = 'check_violation',
      message = 'New SPOGOMI places after composition lock require an explicit audited arbitration procedure';
  end if;

  if not v_team_changed and not v_eligibility_changed then
    return new;
  end if;
  if v_context = 'ticket_reconciliation'
     and not v_team_changed
     and new.registration_status is not distinct from old.registration_status then
    return new;
  end if;
  raise exception using
    errcode = 'check_violation',
    message = 'SPOGOMI participant eligibility or team changes require an explicit audited arbitration procedure after composition lock';
end;
$$;

create or replace function public.spogomi_attach_official_gpx(
  p_event_id uuid,
  p_expected_revision bigint,
  p_file_name text,
  p_point_count integer,
  p_reference_distance_km numeric,
  p_inferred_topology text,
  p_geometry_geojson jsonb,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  -- PURPOSE: atomically replace the official route and its Action reference.
  -- CALLER: server-only organizer GPX route attachment after Clerk authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only; the API owns organizer access.
  -- IDEMPOTENCY: expected event revision rejects stale concurrent uploads.
  -- ATOMICITY: event lock, route write and Action JSON merge share one transaction.
  -- FAILURE_BEHAVIOR: any error rolls back both projections; retry reloads revision.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: service_role only below.
  v_event public.spogomi_events%rowtype;
  v_action public.actions%rowtype;
  v_route public.spogomi_event_routes%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI route attachment requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A route attachment actor is required';
  end if;
  if p_file_name is null or length(btrim(p_file_name)) = 0 or length(p_file_name) > 255
     or p_point_count is null or p_point_count < 2
     or p_reference_distance_km is null or p_reference_distance_km < 0
     or p_inferred_topology not in ('loop', 'point_to_point')
     or jsonb_typeof(p_geometry_geojson) <> 'object'
     or p_geometry_geojson ->> 'type' <> 'LineString'
     or jsonb_typeof(p_geometry_geojson -> 'coordinates') <> 'array' then
    raise exception using errcode = 'check_violation', message = 'Invalid official SPOGOMI route';
  end if;

  v_event := public.spogomi_lock_event_for_mutation(p_event_id);
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI event changed since the route preview';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'The official route cannot be changed after composition lock';
  end if;

  select * into v_action
    from public.actions
   where id = v_event.action_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI Action not found';
  end if;

  insert into public.spogomi_event_routes(
    event_id, action_id, source, file_name, point_count, reference_distance_km,
    inferred_topology, geometry_geojson, imported_by_clerk_id
  ) values (
    p_event_id, v_event.action_id, 'official_reference', btrim(p_file_name),
    p_point_count, p_reference_distance_km, p_inferred_topology,
    p_geometry_geojson, p_actor_clerk_id
  )
  on conflict (event_id) do update set
    action_id = excluded.action_id,
    source = excluded.source,
    file_name = excluded.file_name,
    point_count = excluded.point_count,
    reference_distance_km = excluded.reference_distance_km,
    inferred_topology = excluded.inferred_topology,
    geometry_geojson = excluded.geometry_geojson,
    imported_by_clerk_id = excluded.imported_by_clerk_id,
    imported_at = now(),
    updated_at = now()
  returning * into v_route;

  update public.actions
     set preparation_data = jsonb_set(
       coalesce(v_action.preparation_data, '{}'::jsonb),
       '{spogomiOfficialReference}',
       jsonb_build_object(
         'source', 'official_reference',
         'fileName', v_route.file_name,
         'pointCount', v_route.point_count,
         'referenceDistanceKm', v_route.reference_distance_km,
         'note', 'Parcours officiel de référence, non observé sur le terrain.'
       ),
       true
     ),
         updated_at = now()
   where id = v_action.id;

  update public.spogomi_events
     set composition_revision = composition_revision + 1, updated_at = now()
   where id = p_event_id;

  return jsonb_build_object(
    'already_processed', false,
    'eventId', p_event_id,
    'actionId', v_action.id,
    'routeId', v_route.id,
    'compositionRevision', v_event.composition_revision + 1,
    'source', v_route.source,
    'fileName', v_route.file_name,
    'pointCount', v_route.point_count,
    'referenceDistanceKm', v_route.reference_distance_km,
    'inferredTopology', v_route.inferred_topology
  );
end;
$$;

revoke all on function public.spogomi_lock_event_for_mutation(uuid) from public, anon, authenticated;
grant execute on function public.spogomi_lock_event_for_mutation(uuid) to service_role;
revoke all on function public.spogomi_attach_official_gpx(uuid, bigint, text, integer, numeric, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_attach_official_gpx(uuid, bigint, text, integer, numeric, text, jsonb, text) to service_role;

comment on function public.spogomi_lock_event_for_mutation(uuid) is
  'Shared event-row lock owner for server-side SPOGOMI preparation mutations.';
comment on function public.spogomi_attach_official_gpx(uuid, bigint, text, integer, numeric, text, jsonb, text) is
  'Atomic official GPX route and Action preparation reference synchronization; it never overwrites unrelated Action metadata.';
