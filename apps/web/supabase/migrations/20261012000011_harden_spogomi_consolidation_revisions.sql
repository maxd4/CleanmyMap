-- SPOGOMI reliability follow-up: historical content hashes must not short-circuit
-- a correction that restores an older projection. The RPC also validates the
-- source row versions captured by the server preview before replacing the
-- current action projection.

alter table public.spogomi_action_consolidations
  drop constraint if exists spogomi_action_consolidations_event_id_source_hash_key;

create index if not exists spogomi_action_consolidations_event_source_hash_idx
  on public.spogomi_action_consolidations(event_id, source_hash);

-- PURPOSE: compare the application preview with the persisted source snapshot.
-- CALLER: the consolidation RPC after its service-role transaction locks.
-- AUTHORIZATION_BOUNDARY: invoker-only helper, never exposed to client roles.
-- IDEMPOTENCY: read-only; the active projection decision remains in the RPC.
-- ATOMICITY: evaluated inside the caller transaction.
-- FAILURE_BEHAVIOR: false for missing, added, removed or version-changed rows.
-- SEARCH_PATH: explicitly public-qualified objects under public, pg_catalog.
-- GRANTS: service_role only.
create or replace function public.spogomi_consolidation_sources_match(
  p_event_id uuid,
  p_projection jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_snapshot jsonb := p_projection -> 'sourceSnapshot';
  v_event public.spogomi_events%rowtype;
  v_action public.actions%rowtype;
begin
  if jsonb_typeof(v_snapshot) <> 'object' then
    return false;
  end if;

  select * into v_event
    from public.spogomi_events
   where id = p_event_id;
  if not found then
    return false;
  end if;

  if (v_snapshot #>> '{event,id}') is distinct from v_event.id::text
     or (v_snapshot #>> '{event,name}') is distinct from v_event.name
     or (v_snapshot #>> '{event,locationLabel}') is distinct from v_event.location_label
     or (v_snapshot #>> '{event,startsAt}')::timestamptz is distinct from v_event.starts_at
     or (v_snapshot #>> '{event,endsAt}')::timestamptz is distinct from v_event.ends_at
     or (v_snapshot #>> '{event,mappingVersion}') is distinct from v_event.environmental_mapping_version
     or (v_snapshot #>> '{event,updatedAt}')::timestamptz is distinct from v_event.updated_at then
    return false;
  end if;

  select * into v_action
    from public.actions
   where id = v_event.action_id;
  if not found then
    return false;
  end if;
  if (v_snapshot #>> '{action,id}') is distinct from v_action.id::text
     or (v_snapshot #>> '{action,organizerId}') is distinct from v_action.organizer_id
     or (v_snapshot #>> '{action,organizerName}') is distinct from v_action.organizer_name
     or (v_snapshot #>> '{action,organizerType}') is distinct from v_action.organizer_type
     or (v_snapshot #>> '{action,updatedAt}')::timestamptz is distinct from v_action.updated_at then
    return false;
  end if;

  if jsonb_typeof(v_snapshot -> 'categories') <> 'array'
     or jsonb_array_length(v_snapshot -> 'categories') <> (
       select count(*) from public.spogomi_category_rules where event_id = p_event_id
     )
     or exists (
       select 1
         from public.spogomi_category_rules row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1
              from jsonb_array_elements(v_snapshot -> 'categories') as captured(value)
             where captured.value ->> 'id' = row_data.id::text
               and (captured.value ->> 'updatedAt')::timestamptz is not distinct from row_data.updated_at
          )
     )
     or exists (
       select 1
         from jsonb_array_elements(v_snapshot -> 'categories') as captured(value)
        where not exists (
          select 1
            from public.spogomi_category_rules row_data
           where row_data.event_id = p_event_id
             and row_data.id::text = captured.value ->> 'id'
             and row_data.updated_at is not distinct from (captured.value ->> 'updatedAt')::timestamptz
        )
     ) then
    return false;
  end if;

  if jsonb_typeof(v_snapshot -> 'mappings') <> 'array'
     or jsonb_array_length(v_snapshot -> 'mappings') <> (
       select count(*)
         from public.spogomi_environment_category_mappings
        where event_id = p_event_id and mapping_version = v_event.environmental_mapping_version
     )
     or exists (
       select 1
         from public.spogomi_environment_category_mappings row_data
        where row_data.event_id = p_event_id
          and row_data.mapping_version = v_event.environmental_mapping_version
          and not exists (
            select 1
              from jsonb_array_elements(v_snapshot -> 'mappings') as captured(value)
             where captured.value ->> 'id' = row_data.id::text
               and (captured.value ->> 'updatedAt')::timestamptz is not distinct from row_data.updated_at
          )
     ) then
    return false;
  end if;

  if jsonb_typeof(v_snapshot -> 'teams') <> 'array'
     or jsonb_array_length(v_snapshot -> 'teams') <> (
       select count(*) from public.spogomi_teams where event_id = p_event_id
     )
     or exists (
       select 1
         from public.spogomi_teams row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1
              from jsonb_array_elements(v_snapshot -> 'teams') as captured(value)
             where captured.value ->> 'id' = row_data.id::text
               and (captured.value ->> 'updatedAt')::timestamptz is not distinct from row_data.updated_at
          )
     ) then
    return false;
  end if;

  if jsonb_typeof(v_snapshot -> 'submissions') <> 'array'
     or jsonb_array_length(v_snapshot -> 'submissions') <> (
       select count(*) from public.spogomi_result_submissions where event_id = p_event_id
     )
     or exists (
       select 1
         from public.spogomi_result_submissions row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1
              from jsonb_array_elements(v_snapshot -> 'submissions') as captured(value)
             where captured.value ->> 'id' = row_data.id::text
               and (captured.value ->> 'updatedAt')::timestamptz is not distinct from row_data.updated_at
          )
     ) then
    return false;
  end if;

  if jsonb_typeof(v_snapshot -> 'items') <> 'array'
     or jsonb_array_length(v_snapshot -> 'items') <> (
       select count(*) from public.spogomi_result_items where event_id = p_event_id
     )
     or exists (
       select 1
         from public.spogomi_result_items row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1
              from jsonb_array_elements(v_snapshot -> 'items') as captured(value)
             where captured.value ->> 'id' = row_data.id::text
               and (captured.value ->> 'updatedAt')::timestamptz is not distinct from row_data.updated_at
          )
     ) then
    return false;
  end if;

  if jsonb_typeof(v_snapshot -> 'participants') <> 'array'
     or jsonb_array_length(v_snapshot -> 'participants') <> (
       select count(*) from public.spogomi_participants where event_id = p_event_id
     )
     or exists (
       select 1
         from public.spogomi_participants row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1
              from jsonb_array_elements(v_snapshot -> 'participants') as captured(value)
             where captured.value ->> 'id' = row_data.id::text
               and (captured.value ->> 'updatedAt')::timestamptz is not distinct from row_data.updated_at
          )
     ) then
    return false;
  end if;

  if jsonb_typeof(v_snapshot -> 'route') = 'null' then
    if exists (select 1 from public.spogomi_event_routes where event_id = p_event_id) then
      return false;
    end if;
  elsif jsonb_typeof(v_snapshot -> 'route') = 'object' then
    if not exists (
      select 1
        from public.spogomi_event_routes row_data
       where row_data.event_id = p_event_id
         and row_data.id::text = v_snapshot #>> '{route,id}'
         and row_data.updated_at is not distinct from (v_snapshot #>> '{route,updatedAt}')::timestamptz
    ) then
      return false;
    end if;
  else
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.consolidate_spogomi_event_to_action(
  p_event_id uuid,
  p_consolidation_key text,
  p_source_hash text,
  p_projection_version text,
  p_mappings jsonb,
  p_projection jsonb,
  p_published_by_clerk_id text
)
returns public.spogomi_action_consolidations
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_action public.actions%rowtype;
  v_existing public.spogomi_action_consolidations%rowtype;
  v_revision integer;
  v_expected_participants integer;
  v_preparation jsonb;
  v_route jsonb;
  v_organizer jsonb;
begin
  -- PURPOSE: atomically publish one complete SPOGOMI environmental projection.
  -- CALLER: the authenticated organizer route through service_role.
  -- AUTHORIZATION_BOUNDARY: execution remains service_role-only.
  -- IDEMPOTENCY: only the active projection hash short-circuits; historical hashes replay as new revisions.
  -- ATOMICITY: locks, source validation, action replacement and projection history share this transaction.
  -- FAILURE_BEHAVIOR: stale source snapshots raise serialization_failure before any mutation.
  -- SEARCH_PATH: explicitly public-qualified objects under public, pg_catalog.
  -- GRANTS: service_role only.
  if p_event_id is null or p_consolidation_key is null or p_source_hash is null or p_source_hash !~ '^[0-9a-f]{64}$'
     or p_projection_version is null or p_published_by_clerk_id is null then
    raise exception using errcode = '22023', message = 'Invalid SPOGOMI consolidation identity';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  if v_event.state in ('draft', 'registration_open', 'cancelled', 'archived') then
    raise exception using errcode = '23514', message = 'The SPOGOMI event is not eligible for environmental consolidation';
  end if;
  if v_event.environmental_mapping_version <> p_projection_version then
    raise exception using errcode = '40001', message = 'The SPOGOMI environmental mapping version changed';
  end if;
  if coalesce(p_projection ->> 'readyForPublication', 'false') <> 'true' then
    raise exception using errcode = '23514', message = 'The SPOGOMI environmental balance is incomplete';
  end if;

  select * into v_action from public.actions where id = v_event.action_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Target CleanMyMap action not found'; end if;

  -- Serialize every source collection used by the preview, not only the
  -- certification and attendance pointers.
  perform 1 from public.spogomi_category_rules where event_id = p_event_id for update;
  perform 1 from public.spogomi_environment_category_mappings where event_id = p_event_id and mapping_version = v_event.environmental_mapping_version for update;
  perform 1 from public.spogomi_teams where event_id = p_event_id for update;
  perform 1 from public.spogomi_result_submissions where event_id = p_event_id for update;
  perform 1 from public.spogomi_result_items where event_id = p_event_id for update;
  perform 1 from public.spogomi_participants where event_id = p_event_id for update;
  perform 1 from public.spogomi_event_routes where event_id = p_event_id for update;

  if jsonb_typeof(coalesce(p_projection -> 'sourceSubmissionIds', '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid SPOGOMI source submission list';
  end if;
  if jsonb_array_length(coalesce(p_projection -> 'sourceSubmissionIds', '[]'::jsonb))
     <> (select count(*) from public.spogomi_teams where event_id = p_event_id) then
    raise exception using errcode = '40001', message = 'The current SPOGOMI team set changed';
  end if;
  if exists (
    select 1
      from public.spogomi_teams t
     where t.event_id = p_event_id
       and not exists (
         select 1
           from jsonb_array_elements_text(p_projection -> 'sourceSubmissionIds') as sid(value)
          where sid.value = t.certified_submission_id::text
       )
  ) then
    raise exception using errcode = '40001', message = 'The current SPOGOMI certification set changed';
  end if;
  v_expected_participants := coalesce((p_projection ->> 'participantsPresent')::integer, -1);
  if v_expected_participants <> (
    select count(*)::integer
      from public.spogomi_participants
     where event_id = p_event_id and registration_status = 'registered' and attendance_status = 'present'
  ) then
    raise exception using errcode = '40001', message = 'The current SPOGOMI attendance set changed';
  end if;
  if exists (
    select 1
      from public.spogomi_teams t
      left join public.spogomi_result_submissions rs on rs.id = t.certified_submission_id and rs.event_id = t.event_id
     where t.event_id = p_event_id
       and (t.certified_submission_id is null or rs.status <> 'certified')
  ) then
    raise exception using errcode = '23514', message = 'Every SPOGOMI team must have a current certified submission';
  end if;

  select * into v_existing
    from public.spogomi_action_consolidations
   where event_id = p_event_id and is_current
   for update;
  if found and v_existing.source_hash = p_source_hash then
    if (v_existing.projection - 'sourceSnapshot') = (p_projection - 'sourceSnapshot')
       and v_action.spogomi_projection_source_hash = p_source_hash
       and v_action.spogomi_projection_version = p_projection_version then
      return v_existing;
    end if;
    raise exception using errcode = '40001', message = 'The active SPOGOMI projection does not match the requested source hash';
  end if;

  if not public.spogomi_consolidation_sources_match(p_event_id, p_projection) then
    raise exception using errcode = '40001', message = 'The SPOGOMI source snapshot changed since the preview';
  end if;

  insert into public.spogomi_environment_category_mappings (
    event_id, category_rule_id, mapping_version, category_code,
    environmental_category_slug, source_field, source_unit, target_unit,
    unit_factor_to_target, counts_toward_total, is_megots, mapping_status,
    exclusion_reason
  )
  select p_event_id, m.category_rule_id, p_projection_version, m.category_code,
    m.environmental_category_slug, m.source_field, m.source_unit, m.target_unit,
    m.unit_factor_to_target, m.counts_toward_total, m.is_megots,
    m.mapping_status, m.exclusion_reason
    from jsonb_to_recordset(coalesce(p_mappings, '[]'::jsonb)) as m(
      category_rule_id uuid,
      category_code text,
      environmental_category_slug text,
      source_field text,
      source_unit text,
      target_unit text,
      unit_factor_to_target numeric,
      counts_toward_total boolean,
      is_megots boolean,
      mapping_status text,
      exclusion_reason text
    )
   on conflict (event_id, mapping_version, category_rule_id) do update set
     category_code = excluded.category_code,
     environmental_category_slug = excluded.environmental_category_slug,
     source_field = excluded.source_field,
     source_unit = excluded.source_unit,
     target_unit = excluded.target_unit,
     unit_factor_to_target = excluded.unit_factor_to_target,
     counts_toward_total = excluded.counts_toward_total,
     is_megots = excluded.is_megots,
     mapping_status = excluded.mapping_status,
     exclusion_reason = excluded.exclusion_reason,
     updated_at = now();

  select coalesce(max(projection_revision), 0) + 1 into v_revision
    from public.spogomi_action_consolidations
   where event_id = p_event_id;
  update public.spogomi_action_consolidations
     set is_current = false, status = 'superseded', updated_at = now()
   where event_id = p_event_id and is_current;

  v_preparation := coalesce(v_action.preparation_data, '{}'::jsonb)
    || jsonb_build_object(
      'spogomiConsolidation',
      coalesce(p_projection -> 'consolidation', '{}'::jsonb)
        || jsonb_build_object('projectionRevision', v_revision)
    );
  v_route := p_projection -> 'officialRoute';
  if v_route is not null and jsonb_typeof(v_route) = 'object' then
    v_preparation := v_preparation || jsonb_build_object('spogomiOfficialReference', v_route);
  else
    v_preparation := v_preparation - 'spogomiOfficialReference';
  end if;
  v_organizer := p_projection -> 'organizer';

  update public.actions
     set waste_kg = nullif(p_projection #>> '{action,wasteKg}', '')::numeric,
         cigarette_butts = nullif(p_projection #>> '{action,cigaretteButts}', '')::integer,
         volunteers_count = coalesce((p_projection #>> '{action,volunteersCount}')::integer, 0),
         spogomi_total_mass_grams = nullif(p_projection #>> '{totalWasteMassGrams}', '')::numeric,
         spogomi_megots_mass_grams = nullif(p_projection #>> '{cigaretteButtsMassGrams}', '')::numeric,
         spogomi_megots_count = nullif(p_projection #>> '{cigaretteButtsCount}', '')::bigint,
         spogomi_projection_source_hash = p_source_hash,
         spogomi_projection_version = p_projection_version,
         action_date = v_event.starts_at::date,
         location_label = v_event.location_label,
         event_start_time = v_event.starts_at,
         event_end_time = v_event.ends_at,
         organizer_type = case when v_organizer is null or jsonb_typeof(v_organizer) <> 'object' then v_action.organizer_type else 'association' end,
         organizer_id = case when v_organizer is null or jsonb_typeof(v_organizer) <> 'object' then v_action.organizer_id else v_organizer ->> 'id' end,
         organizer_name = case when v_organizer is null or jsonb_typeof(v_organizer) <> 'object' then v_action.organizer_name else v_organizer ->> 'name' end,
         derived_geometry_kind = case when v_route is not null and jsonb_typeof(v_route) = 'object' then 'polyline' else null end,
         derived_geometry_geojson = case when v_route is not null and jsonb_typeof(v_route) = 'object' then (v_route -> 'geometryGeojson')::text else null end,
         geometry_source = case when v_route is not null and jsonb_typeof(v_route) = 'object' then 'reference' else null end,
         preparation_data = v_preparation
   where id = v_event.action_id;

  insert into public.spogomi_action_consolidations (
    event_id, action_id, consolidation_key, projection_version,
    projection_revision, source_hash, mapping_version, status, is_current,
    teams_included, participants_present, source_submission_ids, projection,
    published_by_clerk_id
  ) values (
    p_event_id, v_event.action_id, p_consolidation_key, p_projection_version,
    v_revision, p_source_hash, p_projection_version, 'published', true,
    (p_projection ->> 'teamsIncluded')::integer,
    (p_projection ->> 'participantsPresent')::integer,
    coalesce(p_projection -> 'sourceSubmissionIds', '[]'::jsonb),
    p_projection, p_published_by_clerk_id
  ) returning * into v_existing;

  update public.spogomi_events set state = 'certified', updated_at = now() where id = p_event_id;
  return v_existing;
end;
$$;

revoke all on function public.spogomi_consolidation_sources_match(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_consolidation_sources_match(uuid, jsonb) to service_role;
revoke all on function public.consolidate_spogomi_event_to_action(uuid, text, text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.consolidate_spogomi_event_to_action(uuid, text, text, text, jsonb, jsonb, text) to service_role;

comment on function public.spogomi_consolidation_sources_match(uuid, jsonb) is
  'Checks the preview source snapshot against current row versions, metadata, mappings, measurements, attendance and official route before an ATOMIC publication.';
comment on function public.consolidate_spogomi_event_to_action(uuid, text, text, text, jsonb, jsonb, text) is
  'ATOMIC owner for SPOGOMI publication: active-hash idempotence, historical replay as a new monotone revision, source snapshot validation, one current projection and one canonical action.';
