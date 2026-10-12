-- SPOGOMI lot 5: one atomic environmental projection per event/action.
-- The application computes and previews the projection; this RPC owns the
-- durable replacement of the current projection and the canonical action.

alter table public.spogomi_events
  add column if not exists environmental_mapping_version text not null default 'spogomi-cleanmymap-v1'
    check (length(btrim(environmental_mapping_version)) > 0);

alter table public.actions
  add column if not exists spogomi_total_mass_grams numeric(14,3),
  add column if not exists spogomi_megots_mass_grams numeric(14,3),
  add column if not exists spogomi_megots_count bigint,
  add column if not exists spogomi_projection_source_hash text,
  add column if not exists spogomi_projection_version text;

create table public.spogomi_environment_category_mappings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  category_rule_id uuid not null,
  mapping_version text not null check (length(btrim(mapping_version)) > 0),
  category_code text not null check (length(btrim(category_code)) > 0),
  environmental_category_slug text,
  source_field text check (source_field is null or source_field in ('mass_grams', 'object_count', 'quantity')),
  source_unit text not null,
  target_unit text check (target_unit is null or target_unit in ('grams', 'count', 'quantity')),
  unit_factor_to_target numeric,
  counts_toward_total boolean not null default true,
  is_megots boolean not null default false,
  mapping_status text not null check (mapping_status in ('mapped', 'excluded', 'unmapped')),
  exclusion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, mapping_version, category_rule_id),
  foreign key (category_rule_id, event_id)
    references public.spogomi_category_rules(id, event_id)
    on delete restrict,
  check (mapping_status = 'mapped' or exclusion_reason is not null),
  check (mapping_status <> 'mapped' or (environmental_category_slug is not null and source_field is not null and target_unit is not null and unit_factor_to_target is not null))
);

create table public.spogomi_action_consolidations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete restrict,
  action_id uuid not null references public.actions(id) on delete restrict,
  consolidation_key text not null,
  projection_version text not null,
  projection_revision integer not null check (projection_revision > 0),
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  mapping_version text not null,
  status text not null check (status in ('published', 'superseded')),
  is_current boolean not null default true,
  teams_included integer not null check (teams_included >= 0),
  participants_present integer not null check (participants_present >= 0),
  source_submission_ids jsonb not null default '[]'::jsonb,
  projection jsonb not null,
  published_by_clerk_id text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, source_hash),
  unique (event_id, projection_revision)
);

create unique index spogomi_action_consolidations_current_unique
  on public.spogomi_action_consolidations(event_id)
  where is_current;

create unique index spogomi_action_consolidations_current_action_unique
  on public.spogomi_action_consolidations(action_id)
  where is_current;

create index spogomi_environment_category_mappings_event_idx
  on public.spogomi_environment_category_mappings(event_id, mapping_version);

create trigger spogomi_environment_category_mappings_set_updated_at
before update on public.spogomi_environment_category_mappings
for each row execute function public.set_updated_at();

create trigger spogomi_action_consolidations_set_updated_at
before update on public.spogomi_action_consolidations
for each row execute function public.set_updated_at();

alter table public.spogomi_environment_category_mappings enable row level security;
alter table public.spogomi_action_consolidations enable row level security;

revoke all on table public.spogomi_environment_category_mappings from public, anon, authenticated;
revoke all on table public.spogomi_action_consolidations from public, anon, authenticated;
grant all on table public.spogomi_environment_category_mappings to service_role;
grant all on table public.spogomi_action_consolidations to service_role;

create or replace function public.prevent_ordinary_spogomi_projection_overwrite()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and exists (
       select 1 from public.spogomi_action_consolidations c
       where c.action_id = old.id and c.is_current
     )
     and (
       old.waste_kg is distinct from new.waste_kg
       or old.cigarette_butts is distinct from new.cigarette_butts
       or old.volunteers_count is distinct from new.volunteers_count
       or old.action_date is distinct from new.action_date
       or old.location_label is distinct from new.location_label
       or old.organizer_type is distinct from new.organizer_type
       or old.organizer_id is distinct from new.organizer_id
       or old.organizer_name is distinct from new.organizer_name
       or old.derived_geometry_kind is distinct from new.derived_geometry_kind
       or old.derived_geometry_geojson is distinct from new.derived_geometry_geojson
       or old.geometry_source is distinct from new.geometry_source
       or old.preparation_data -> 'spogomiConsolidation' is distinct from new.preparation_data -> 'spogomiConsolidation'
       or old.preparation_data -> 'spogomiOfficialReference' is distinct from new.preparation_data -> 'spogomiOfficialReference'
     ) then
    raise exception using
      errcode = '42501',
      message = 'A current SPOGOMI environmental projection is controlled by its consolidation orchestrator';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_ordinary_spogomi_projection_overwrite on public.actions;
create trigger trg_prevent_ordinary_spogomi_projection_overwrite
before update on public.actions
for each row execute function public.prevent_ordinary_spogomi_projection_overwrite();

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
  -- Serialize certification corrections and attendance corrections with the
  -- projection. The checks below therefore observe one current source set.
  perform 1 from public.spogomi_teams where event_id = p_event_id for update;
  perform 1 from public.spogomi_participants where event_id = p_event_id for update;
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
  where event_id = p_event_id and source_hash = p_source_hash;
  if found then return v_existing; end if;

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
      derived_geometry_kind = case when v_route is not null and jsonb_typeof(v_route) = 'object' then 'polyline' else v_action.derived_geometry_kind end,
      derived_geometry_geojson = case when v_route is not null and jsonb_typeof(v_route) = 'object' then (v_route -> 'geometryGeojson')::text else v_action.derived_geometry_geojson end,
      geometry_source = case when v_route is not null and jsonb_typeof(v_route) = 'object' then 'reference' else v_action.geometry_source end,
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

revoke all on function public.prevent_ordinary_spogomi_projection_overwrite() from public, anon, authenticated;
revoke all on function public.consolidate_spogomi_event_to_action(uuid, text, text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.consolidate_spogomi_event_to_action(uuid, text, text, text, jsonb, jsonb, text) to service_role;

comment on table public.spogomi_action_consolidations is
  'One current, versioned environmental projection per SPOGOMI event/action; corrections supersede the prior projection without creating another action.';
comment on table public.spogomi_environment_category_mappings is
  'Versioned explicit mapping from event SPOGOMI categories to CleanMyMap environmental categories; unmapped or excluded measures are never imputed.';
comment on function public.consolidate_spogomi_event_to_action(uuid, text, text, text, jsonb, jsonb, text) is
  'ATOMIC owner for the explicit SPOGOMI environmental publication: locks the event, replaces the current projection, updates the single action, and marks the event certified.';
