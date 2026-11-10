-- SPOGOMI planned routes per division, with shared-route compatibility and
-- append-only correction history. A route is planned/reference geometry only;
-- it is never an observed field trace or an environmental measurement.

alter table public.spogomi_event_routes
  add column if not exists division_id uuid,
  add column if not exists route_version bigint not null default 1,
  add column if not exists last_change_reason text,
  add column if not exists updated_by_clerk_id text,
  add column if not exists reference_media_id uuid references public.action_media(id) on delete set null;

alter table public.spogomi_event_routes
  drop constraint if exists spogomi_event_routes_event_id_key,
  drop constraint if exists spogomi_event_routes_action_id_key,
  drop constraint if exists spogomi_event_routes_source_check,
  add constraint spogomi_event_routes_source_check
    check (source in ('official_reference', 'gpx_reference', 'manual_reference')),
  add constraint spogomi_event_routes_division_event_fk
    foreign key (division_id, event_id)
    references public.spogomi_divisions(id, event_id)
    on delete restrict,
  add constraint spogomi_event_routes_route_version_check
    check (route_version > 0),
  add constraint spogomi_event_routes_reason_check
    check (last_change_reason is null or length(btrim(last_change_reason)) between 3 and 500);

create unique index if not exists spogomi_event_routes_shared_event_unique
  on public.spogomi_event_routes(event_id)
  where division_id is null;

create unique index if not exists spogomi_event_routes_division_unique
  on public.spogomi_event_routes(event_id, division_id)
  where division_id is not null;

create index if not exists spogomi_event_routes_event_division_idx
  on public.spogomi_event_routes(event_id, division_id);

create table if not exists public.spogomi_event_route_revisions (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.spogomi_event_routes(id) on delete restrict,
  event_id uuid not null references public.spogomi_events(id) on delete restrict,
  division_id uuid,
  action_id uuid not null references public.actions(id) on delete restrict,
  route_version bigint not null check (route_version > 0),
  source text not null check (source in ('official_reference', 'gpx_reference', 'manual_reference')),
  file_name text not null check (length(btrim(file_name)) > 0 and length(file_name) <= 255),
  point_count integer not null check (point_count >= 2),
  reference_distance_km numeric not null check (reference_distance_km >= 0),
  inferred_topology text not null check (inferred_topology in ('loop', 'point_to_point')),
  geometry_geojson jsonb not null,
  last_change_reason text,
  reference_media_id uuid references public.action_media(id) on delete set null,
  changed_by_clerk_id text not null,
  created_at timestamptz not null default now(),
  unique (route_id, route_version)
);

alter table public.spogomi_event_route_revisions
  add constraint spogomi_event_route_revisions_division_event_fk
  foreign key (division_id, event_id)
  references public.spogomi_divisions(id, event_id)
  on delete restrict;

create index if not exists spogomi_event_route_revisions_event_division_idx
  on public.spogomi_event_route_revisions(event_id, division_id, route_version desc);

alter table public.spogomi_event_routes enable row level security;
alter table public.spogomi_event_route_revisions enable row level security;
revoke all on table public.spogomi_event_route_revisions from public, anon, authenticated;
grant all on table public.spogomi_event_route_revisions to service_role;
grant select on table public.spogomi_event_route_revisions to authenticated;

drop policy if exists spogomi_event_route_revisions_service_write on public.spogomi_event_route_revisions;
create policy spogomi_event_route_revisions_service_write on public.spogomi_event_route_revisions
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists spogomi_event_route_revisions_organizer_read on public.spogomi_event_route_revisions;
create policy spogomi_event_route_revisions_organizer_read on public.spogomi_event_route_revisions
for select using (
  exists (
    select 1 from public.spogomi_events e
    where e.id = event_id and public.is_spogomi_action_organizer(e.action_id)
  )
);

create or replace function public.spogomi_route_coverage_complete(p_event_id uuid)
returns boolean
language sql
security invoker
set search_path = pg_catalog, public
stable
as $$
  select exists (select 1 from public.spogomi_event_routes r where r.event_id = p_event_id and r.division_id is null)
    or (
      (select e.mode from public.spogomi_events e where e.id = p_event_id) <> 'mixed'
      and exists (select 1 from public.spogomi_event_routes r where r.event_id = p_event_id and r.division_id is not null)
    )
    or (
      (select e.mode from public.spogomi_events e where e.id = p_event_id) = 'mixed'
      and not exists (
        select 1 from public.spogomi_divisions d
        where d.event_id = p_event_id
          and not exists (select 1 from public.spogomi_event_routes r where r.event_id = p_event_id and r.division_id = d.id)
      )
    );
$$;

revoke all on function public.spogomi_route_coverage_complete(uuid) from public, anon, authenticated;
grant execute on function public.spogomi_route_coverage_complete(uuid) to service_role;

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
  -- PURPOSE: atomically upsert one planned route and preserve the replaced version.
  -- CALLER: server-only event organizer API after Clerk/ownership authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only; division ownership is checked here.
  -- IDEMPOTENCY: expected event revision rejects stale concurrent edits.
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
    select * into v_media from public.action_media where id = p_reference_media_id and action_id = v_event.action_id for update;
    if not found or v_media.upload_state <> 'ready' then
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

comment on table public.spogomi_event_route_revisions is
  'Append-only snapshots of replaced planned route references; never an observed field trace.';

-- Keep the historical RPC callable for older server consumers while routing it
-- through the division-aware, versioned mutation owner above.
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
  v_result jsonb;
  v_action_id uuid;
begin
  v_result := public.spogomi_upsert_planned_route(
    p_event_id, null, p_expected_revision, 'official_reference', p_file_name,
    p_point_count, p_reference_distance_km, p_inferred_topology,
    p_geometry_geojson, null, null, p_actor_clerk_id
  );
  v_action_id := (v_result ->> 'actionId')::uuid;
  update public.actions
     set preparation_data = jsonb_set(
       coalesce(preparation_data, '{}'::jsonb),
       '{spogomiOfficialReference}',
       jsonb_build_object(
         'source', 'official_reference',
         'fileName', v_result ->> 'fileName',
         'pointCount', (v_result ->> 'pointCount')::integer,
         'referenceDistanceKm', (v_result ->> 'referenceDistanceKm')::numeric,
         'note', 'Parcours officiel de référence, non observé sur le terrain.'
       ), true
     ), updated_at = now()
   where id = v_action_id;
  return v_result;
end;
$$;

revoke all on function public.spogomi_attach_official_gpx(uuid, bigint, text, integer, numeric, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_attach_official_gpx(uuid, bigint, text, integer, numeric, text, jsonb, text) to service_role;

-- Registration readiness must require a valid shared route or complete
-- per-division coverage; a single unrelated division route is insufficient.
create or replace function public.spogomi_registration_readiness(p_event_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_policy jsonb;
  v_edition_items jsonb;
  v_divisions jsonb := '[]'::jsonb;
  v_division record;
  v_items jsonb;
  v_division_ready boolean;
  v_ready boolean := true;
  v_structure_valid boolean;
  v_minors_applicable boolean;
begin
  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  v_policy := coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb);
  v_minors_applicable := case when jsonb_typeof(v_policy -> 'minorsApplicable') = 'boolean' then (v_policy ->> 'minorsApplicable')::boolean else null end;
  v_edition_items := jsonb_build_array(
    jsonb_build_object('id', 'meeting_point', 'label', 'Lieu de rendez-vous', 'status', case when length(btrim(coalesce(v_event.location_label, ''))) > 0 and v_event.location_label <> 'Lieu à préciser' then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-event-information'),
    jsonb_build_object('id', 'collection_scope', 'label', 'Périmètre de collecte', 'status', case when public.spogomi_route_coverage_complete(p_event_id) then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-route'),
    jsonb_build_object('id', 'safety_instructions', 'label', 'Consignes de sécurité', 'status', case when length(btrim(coalesce(v_policy ->> 'safetyInstructions', ''))) = 0 then 'incomplete' when jsonb_typeof(v_policy -> 'safetyInstructionsVerified') = 'boolean' and (v_policy ->> 'safetyInstructionsVerified')::boolean then 'complete' else 'not_verified' end, 'required', true, 'href', '#spogomi-registration-readiness'),
    jsonb_build_object('id', 'organization_contact', 'label', 'Contact d’organisation', 'status', case when length(btrim(coalesce(v_policy ->> 'organizationContact', ''))) = 0 then 'incomplete' when jsonb_typeof(v_policy -> 'organizationContactVerified') = 'boolean' and (v_policy ->> 'organizationContactVerified')::boolean then 'complete' else 'not_verified' end, 'required', true, 'href', '#spogomi-registration-readiness'),
    jsonb_build_object('id', 'assistance_procedure', 'label', 'Procédure d’assistance', 'status', case when length(btrim(coalesce(v_policy ->> 'assistanceProcedure', ''))) = 0 then 'incomplete' when jsonb_typeof(v_policy -> 'assistanceProcedureVerified') = 'boolean' and (v_policy ->> 'assistanceProcedureVerified')::boolean then 'complete' else 'not_verified' end, 'required', true, 'href', '#spogomi-registration-readiness'),
    jsonb_build_object('id', 'minor_information', 'label', 'Informations utiles aux mineurs', 'status', case when v_minors_applicable is null then 'incomplete' when v_minors_applicable = false then 'complete' when length(btrim(coalesce(v_policy ->> 'minorInformation', ''))) = 0 then 'incomplete' when jsonb_typeof(v_policy -> 'minorInformationVerified') = 'boolean' and (v_policy ->> 'minorInformationVerified')::boolean then 'complete' else 'not_verified' end, 'required', coalesce(v_minors_applicable, true), 'href', '#spogomi-registration-readiness')
  );
  if exists (select 1 from jsonb_array_elements(v_edition_items) item where (item ->> 'required')::boolean and item ->> 'status' <> 'complete') then v_ready := false; end if;
  select case
    when v_event.mode = 'casual' then count(*) = 1 and count(*) filter (where division_type = 'casual') = 1
    when v_event.mode = 'world_cup' then count(*) = 1 and count(*) filter (where division_type = 'world_cup') = 1
    when v_event.mode = 'mixed' then count(*) = 2 and count(*) filter (where division_type = 'casual') = 1 and count(*) filter (where division_type = 'world_cup') = 1
    else false
  end into v_structure_valid from public.spogomi_divisions where event_id = p_event_id;
  if not coalesce(v_structure_valid, false) then v_ready := false; end if;
  for v_division in select d.id, d.division_type, d.regulation_version, d.regulation_config from public.spogomi_divisions d where d.event_id = p_event_id order by d.division_type loop
    v_policy := public.spogomi_registration_policy_for_division(p_event_id, v_division.id);
    v_items := jsonb_build_array(
      jsonb_build_object('id', 'regulation', 'label', 'Règlement applicable, version et source', 'status', case when public.spogomi_division_regulation_is_complete(p_event_id, v_division.id, v_division.regulation_version) then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-regulation-' || v_division.id),
      jsonb_build_object('id', 'categories', 'label', 'Catégories et barèmes', 'status', case when exists (select 1 from public.spogomi_category_rules category where category.event_id = p_event_id and category.division_id = v_division.id and category.regulation_version = v_division.regulation_version) and not exists (select 1 from public.spogomi_category_rules category where category.event_id = p_event_id and category.division_id = v_division.id and category.regulation_version = v_division.regulation_version and (not category.is_complete or length(btrim(category.code)) = 0 or length(btrim(category.label)) = 0 or length(btrim(category.unit)) = 0)) then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-regulation-' || v_division.id),
      jsonb_build_object('id', 'schedule', 'label', 'Horaires officiels', 'status', case when exists (select 1 from public.spogomi_field_operations operation where operation.event_id = p_event_id and operation.division_id = v_division.id and operation.regulation_version = v_division.regulation_version and exists (select 1 from pg_timezone_names zone where zone.name = operation.timezone_name) and operation.official_start_at is not null and operation.collection_limit_at is not null and operation.sorting_limit_at is not null and operation.weighing_start_at is not null and operation.weighing_end_at is not null) then 'complete' else 'incomplete' end, 'required', true, 'href', '#operations'),
      jsonb_build_object('id', 'capacity', 'label', 'Capacité d’inscription', 'status', case when coalesce((v_policy ->> 'capacity') ~ '^[1-9][0-9]*$', false) then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-registration-readiness'),
      jsonb_build_object('id', 'eligibility', 'label', 'Conditions d’éligibilité', 'status', case when jsonb_typeof(v_division.regulation_config -> 'eligibility') = 'object' and jsonb_typeof(v_division.regulation_config #> '{eligibility,requiresAllCategories}') = 'boolean' then 'complete' else 'incomplete' end, 'required', true, 'href', '#spogomi-regulation-' || v_division.id)
    );
    select not exists (select 1 from jsonb_array_elements(v_items) item where (item ->> 'required')::boolean and item ->> 'status' <> 'complete') into v_division_ready;
    if not v_division_ready then v_ready := false; end if;
    v_divisions := v_divisions || jsonb_build_array(jsonb_build_object('divisionId', v_division.id, 'divisionType', v_division.division_type, 'ready', v_division_ready and v_structure_valid, 'items', v_items));
  end loop;
  return jsonb_build_object('eventId', p_event_id, 'ready', v_ready, 'policy', coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb), 'divisionStructureValid', coalesce(v_structure_valid, false), 'editionItems', v_edition_items, 'divisions', v_divisions);
end;
$$;

revoke all on function public.spogomi_registration_readiness(uuid) from public, anon, authenticated;
grant execute on function public.spogomi_registration_readiness(uuid) to service_role;

-- Consolidation rows carry all planned-route revisions in their source
-- snapshot. This trigger extends the historical validator without rewriting
-- the published consolidation migration.
create or replace function public.spogomi_validate_route_snapshot_before_consolidation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_routes jsonb := NEW.projection -> 'sourceSnapshot' -> 'routes';
begin
  if v_routes is null then return NEW; end if;
  if jsonb_typeof(v_routes) <> 'array' then
    raise exception using errcode = 'check_violation', message = 'The planned route source snapshot must be an array';
  end if;
  if jsonb_array_length(v_routes) <> (select count(*) from public.spogomi_event_routes where event_id = NEW.event_id) then
    raise exception using errcode = 'serialization_failure', message = 'The planned route source snapshot is stale';
  end if;
  if exists (
    select 1 from public.spogomi_event_routes route
    where route.event_id = NEW.event_id
      and not exists (
        select 1 from jsonb_array_elements(v_routes) captured(value)
        where captured.value ->> 'id' = route.id::text
          and (captured.value ->> 'updatedAt')::timestamptz is not distinct from route.updated_at
      )
  ) or exists (
    select 1 from jsonb_array_elements(v_routes) captured(value)
    where not exists (
      select 1 from public.spogomi_event_routes route
      where route.event_id = NEW.event_id
        and route.id::text = captured.value ->> 'id'
        and route.updated_at is not distinct from (captured.value ->> 'updatedAt')::timestamptz
    )
  ) then
    raise exception using errcode = 'serialization_failure', message = 'The planned route source snapshot is stale';
  end if;
  return NEW;
end;
$$;

drop trigger if exists spogomi_validate_route_snapshot on public.spogomi_action_consolidations;
create trigger spogomi_validate_route_snapshot
before insert or update of projection on public.spogomi_action_consolidations
for each row execute function public.spogomi_validate_route_snapshot_before_consolidation();

revoke all on function public.spogomi_validate_route_snapshot_before_consolidation() from public, anon, authenticated;
