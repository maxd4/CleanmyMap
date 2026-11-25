begin;

-- Forward-only repair:
-- 1. Scope team referee eligibility and status checks to the division's
--    regulation_version and current quiz_version (instead of event.regulation_version).
-- 2. Enforce purpose = 'route_reference' under lock in spogomi_upsert_planned_route.

create or replace function public.spogomi_referee_is_team_eligible(
  p_event_id uuid,
  p_division_id uuid,
  p_referee_clerk_id text
)
returns boolean
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  -- PURPOSE: verify referee eligibility for a specific division using division regulation and quiz version.
  -- CALLER: spogomi_assign_team_referee or server-only referee checks.
  -- AUTHORIZATION_BOUNDARY: service_role only.
  -- IDEMPOTENCY: read-only function.
  -- ATOMICITY: single consistent read within caller transaction.
  -- FAILURE_BEHAVIOR: raises 42501 for non-service_role; returns boolean otherwise.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: service_role only below.
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
  v_current_quiz_version text;
  v_referee_id text := btrim(coalesce(p_referee_clerk_id, ''));
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_referee_eligibility_requires_service_role';
  end if;
  if length(v_referee_id) = 0 then
    return false;
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found then
    return false;
  end if;

  select * into v_division
  from public.spogomi_divisions d
  where d.id = p_division_id and d.event_id = p_event_id;
  if not found then
    return false;
  end if;

  -- Registered competitors across the entire event cannot be assigned as team referees.
  if exists (
    select 1
    from public.spogomi_participants p
    where p.event_id = p_event_id
      and p.registration_status = 'registered'
      and p.clerk_id = v_referee_id
  ) then
    return false;
  end if;

  if not exists (
    select 1
    from public.spogomi_event_reviewers r
    where r.event_id = p_event_id
      and r.clerk_id = v_referee_id
      and r.role = 'referee'
      and r.revoked_at is null
  ) then
    return false;
  end if;

  v_current_quiz_version := public.spogomi_referee_quiz_definition_internal(p_event_id, p_division_id) ->> 'quizVersion';

  if not exists (
    select 1
    from public.spogomi_referee_applications app
    where app.event_id = p_event_id
      and app.division_id = p_division_id
      and app.clerk_id = v_referee_id
      and app.status = 'habilitated'
      and app.regulation_version = v_division.regulation_version
      and app.quiz_version is not null
      and app.quiz_version = v_current_quiz_version
      and app.theory_proof_id is not null
      and app.practical_confirmed_at is not null
  ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.spogomi_referee_is_team_eligible(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.spogomi_referee_is_team_eligible(uuid, uuid, text) to service_role;

create or replace function public.spogomi_team_referee_status(
  p_event_id uuid,
  p_division_id uuid,
  p_team_id uuid
)
returns text
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  -- PURPOSE: compute current team referee assignment status against division regulation and quiz version.
  -- CALLER: spogomi_assign_team_referee, spogomi_division_referee_coverage_ready, and server projections.
  -- AUTHORIZATION_BOUNDARY: service_role only.
  -- IDEMPOTENCY: read-only function.
  -- ATOMICITY: single consistent read within caller transaction.
  -- FAILURE_BEHAVIOR: raises 42501 for non-service_role; returns status text otherwise.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: service_role only below.
  v_assignment public.spogomi_team_referee_assignments%rowtype;
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
  v_current_quiz_version text;
  v_app public.spogomi_referee_applications%rowtype;
  v_has_active_reviewer boolean;
  v_is_participant boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_team_referee_status_requires_service_role';
  end if;

  select *
  into v_assignment
  from public.spogomi_team_referee_assignments a
  where a.event_id = p_event_id
    and a.division_id = p_division_id
    and a.team_id = p_team_id
    and a.revoked_at is null
  limit 1;

  if not found then
    return 'to_assign';
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found then
    return 'unavailable';
  end if;

  select * into v_division
  from public.spogomi_divisions d
  where d.id = p_division_id and d.event_id = p_event_id;
  if not found then
    return 'unavailable';
  end if;

  select exists (
    select 1
    from public.spogomi_participants p
    where p.event_id = p_event_id
      and p.registration_status = 'registered'
      and p.clerk_id = v_assignment.referee_clerk_id
  ) into v_is_participant;

  if v_is_participant then
    return 'unavailable';
  end if;

  select exists (
    select 1
    from public.spogomi_event_reviewers r
    where r.event_id = p_event_id
      and r.clerk_id = v_assignment.referee_clerk_id
      and r.role = 'referee'
      and r.revoked_at is null
  ) into v_has_active_reviewer;

  if not v_has_active_reviewer then
    return 'unavailable';
  end if;

  select *
  into v_app
  from public.spogomi_referee_applications app
  where app.event_id = p_event_id
    and app.division_id = p_division_id
    and app.clerk_id = v_assignment.referee_clerk_id
  limit 1;

  if not found then
    return 'unavailable';
  end if;

  if v_app.status in ('refused', 'revoked') then
    return 'unavailable';
  end if;

  v_current_quiz_version := public.spogomi_referee_quiz_definition_internal(p_event_id, p_division_id) ->> 'quizVersion';

  if v_app.status in ('candidate', 'theory_qualified', 'practical_pending')
     or v_app.regulation_version is distinct from v_division.regulation_version
     or v_app.quiz_version is distinct from v_current_quiz_version
     or v_app.theory_proof_id is null
     or v_app.practical_confirmed_at is null then
    return 'pending_validation';
  end if;

  if v_app.status = 'habilitated' then
    return 'assigned';
  end if;

  return 'unavailable';
end;
$$;

revoke all on function public.spogomi_team_referee_status(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.spogomi_team_referee_status(uuid, uuid, uuid) to service_role;

create or replace function public.spogomi_upsert_planned_route(
  p_event_id uuid,
  p_division_id uuid,
  p_expected_revision bigint,
  p_source text,
  p_file_name text,
  p_point_count integer,
  p_reference_distance_km numeric,
  p_inferred_topology text,
  p_geometry_geojson jsonb,
  p_change_reason text,
  p_reference_media_id uuid,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  -- PURPOSE: atomically upsert one planned route, enforce route_reference media purpose, and preserve replaced versions.
  -- CALLER: server-only event organizer API after Clerk/ownership authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only; division ownership and route_reference media purpose are checked here.
  -- IDEMPOTENCY: expected event revision rejects stale concurrent edits with SQLSTATE 40001.
  -- ATOMICITY: event lock, revision snapshot, route update and media validation share one transaction.
  -- FAILURE_BEHAVIOR: any error rolls back; caller reloads the event revision.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: service_role only below.
  v_event public.spogomi_events%rowtype;
  v_route public.spogomi_event_routes%rowtype;
  v_existing public.spogomi_event_routes%rowtype;
  v_media public.action_media%rowtype;
  v_version bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI route mutation requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A route mutation actor is required';
  end if;
  if p_source not in ('official_reference', 'gpx_reference', 'manual_reference')
     or p_file_name is null or length(btrim(p_file_name)) = 0 or length(p_file_name) > 255
     or p_point_count is null or p_point_count < 2
     or p_reference_distance_km is null or p_reference_distance_km < 0
     or p_inferred_topology not in ('loop', 'point_to_point')
     or jsonb_typeof(p_geometry_geojson) <> 'object'
     or p_geometry_geojson ->> 'type' <> 'LineString'
     or jsonb_typeof(p_geometry_geojson -> 'coordinates') <> 'array'
     or p_change_reason is not null and length(btrim(p_change_reason)) not between 3 and 500 then
    raise exception using errcode = 'check_violation', message = 'Invalid planned SPOGOMI route';
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI event changed since the route preview';
  end if;
  if v_event.state in ('composition_locked', 'certified', 'closed', 'archived') then
    raise exception using errcode = 'check_violation', message = 'The planned route cannot be changed after event closure';
  end if;
  if v_event.state = 'in_progress' and (p_change_reason is null or length(btrim(p_change_reason)) < 3) then
    raise exception using errcode = 'check_violation', message = 'A correction reason is required during the event';
  end if;
  if p_division_id is not null and not exists (select 1 from public.spogomi_divisions where id = p_division_id and event_id = p_event_id) then
    raise exception using errcode = 'foreign_key_violation', message = 'The route division does not belong to the event';
  end if;
  if p_division_id is null and v_event.mode = 'mixed' and not exists (select 1 from public.spogomi_divisions where event_id = p_event_id) then
    raise exception using errcode = 'check_violation', message = 'The mixed event has no valid divisions';
  end if;
  if p_reference_media_id is not null then
    select * into v_media
    from public.action_media
    where id = p_reference_media_id
      and action_id = v_event.action_id
    for update;
    if not found or v_media.upload_state <> 'ready' or v_media.purpose <> 'route_reference' then
      raise exception using errcode = 'check_violation', message = 'The route reference image is not ready for this event';
    end if;
  end if;

  select * into v_existing from public.spogomi_event_routes
   where event_id = p_event_id and division_id is not distinct from p_division_id
   for update;
  if found then
    insert into public.spogomi_event_route_revisions(
      route_id, event_id, division_id, action_id, route_version, source, file_name,
      point_count, reference_distance_km, inferred_topology, geometry_geojson,
      last_change_reason, reference_media_id, changed_by_clerk_id
    ) values (
      v_existing.id, v_existing.event_id, v_existing.division_id, v_existing.action_id,
      v_existing.route_version, v_existing.source, v_existing.file_name, v_existing.point_count,
      v_existing.reference_distance_km, v_existing.inferred_topology, v_existing.geometry_geojson,
      coalesce(p_change_reason, v_existing.last_change_reason), v_existing.reference_media_id,
      p_actor_clerk_id
    );
    v_version := v_existing.route_version + 1;
    update public.spogomi_event_routes set
      source = p_source, file_name = btrim(p_file_name), point_count = p_point_count,
      reference_distance_km = p_reference_distance_km, inferred_topology = p_inferred_topology,
      geometry_geojson = p_geometry_geojson, route_version = v_version,
      last_change_reason = nullif(btrim(p_change_reason), ''), updated_by_clerk_id = p_actor_clerk_id,
      reference_media_id = p_reference_media_id, updated_at = now()
    where id = v_existing.id
    returning * into v_route;
  else
    v_version := 1;
    insert into public.spogomi_event_routes(
      event_id, action_id, division_id, source, file_name, point_count,
      reference_distance_km, inferred_topology, geometry_geojson, route_version,
      last_change_reason, updated_by_clerk_id, reference_media_id, imported_by_clerk_id
    ) values (
      p_event_id, v_event.action_id, p_division_id, p_source, btrim(p_file_name), p_point_count,
      p_reference_distance_km, p_inferred_topology, p_geometry_geojson, v_version,
      nullif(btrim(p_change_reason), ''), p_actor_clerk_id, p_reference_media_id, p_actor_clerk_id
    ) returning * into v_route;
  end if;

  update public.spogomi_events set composition_revision = composition_revision + 1, updated_at = now() where id = p_event_id;
  return jsonb_build_object(
    'already_processed', false, 'eventId', p_event_id, 'actionId', v_event.action_id,
    'routeId', v_route.id, 'divisionId', v_route.division_id, 'routeVersion', v_route.route_version,
    'compositionRevision', v_event.composition_revision + 1, 'source', v_route.source,
    'fileName', v_route.file_name, 'pointCount', v_route.point_count,
    'referenceDistanceKm', v_route.reference_distance_km, 'inferredTopology', v_route.inferred_topology
  );
end;
$$;

revoke all on function public.spogomi_upsert_planned_route(uuid, uuid, bigint, text, text, integer, numeric, text, jsonb, text, uuid, text) from public, anon, authenticated;
grant execute on function public.spogomi_upsert_planned_route(uuid, uuid, bigint, text, text, integer, numeric, text, jsonb, text, uuid, text) to service_role;

commit;
