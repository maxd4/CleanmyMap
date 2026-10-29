-- PURPOSE: persist the validated physical participant composition and expose
-- context-specific collection references without changing the existing global
-- collection RPC or the map pollution-score projection.
-- CALLER: the service-only action creation RPC, authorized action PATCHes and
-- public aggregate readers through the new reference RPC.
-- AUTHORIZATION_BOUNDARY: the HTTP/service owners validate the composition;
-- the SECURITY DEFINER creation RPC revalidates its JSON boundary. The
-- reference RPC exposes only approved, visible aggregate values.
-- IDEMPOTENCY: the existing create_action_with_relations idempotency contract
-- is preserved; composition columns are part of its atomic action insert.
-- ATOMICITY: composition, volunteers_count and the action row are committed
-- together; an invalid composition aborts the action transaction.
-- FAILURE_BEHAVIOR: incomplete historical metadata remains NULL. An invalid
-- new composition is rejected; no adult count is inferred from a total.
-- SEARCH_PATH: every function fixes public, pg_catalog explicitly.
-- GRANTS: only service_role executes the creation RPC; anon/authenticated may
-- read the safe aggregate reference RPC.

alter table public.actions
  add column if not exists children_count integer,
  add column if not exists adult_count integer,
  add column if not exists retired_count integer;

-- Backfill only complete, numeric and total-consistent legacy metadata. The
-- [cmm-meta] payload is compatibility input here, never the current owner.
with candidates as (
  select
    a.id,
    a.volunteers_count,
    (regexp_match(a.notes, '(?m)^\\[cmm-meta\\](.*)$'))[1] as meta_text
  from public.actions a
  where a.children_count is null
    and a.adult_count is null
    and a.retired_count is null
), parsed as (
  select
    id,
    volunteers_count,
    btrim(meta_text)::jsonb as meta
  from candidates
  where meta_text is not null
    and pg_input_is_valid(btrim(meta_text), 'jsonb'::regtype)
), values_as_text as (
  select
    id,
    volunteers_count,
    meta->'volunteerParticipation'->>'childrenCount' as children_text,
    meta->'volunteerParticipation'->>'adultCount' as adult_text,
    meta->'volunteerParticipation'->>'retiredCount' as retired_text
  from parsed
), valid as (
  select *
  from values_as_text
  where children_text ~ '^[0-9]+$'
    and adult_text ~ '^[0-9]+$'
    and retired_text ~ '^[0-9]+$'
    and children_text::integer between 0 and 500
    and adult_text::integer between 0 and 500
    and retired_text::integer between 0 and 500
    and volunteers_count is not null
    and children_text::integer + adult_text::integer + retired_text::integer = volunteers_count
)
update public.actions a
set
  children_count = v.children_text::integer,
  adult_count = v.adult_text::integer,
  retired_count = v.retired_text::integer
from valid v
where a.id = v.id;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'actions_volunteer_composition_bounds_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_volunteer_composition_bounds_check
      check (
        (children_count is null or children_count between 0 and 500)
        and (adult_count is null or adult_count between 0 and 500)
        and (retired_count is null or retired_count between 0 and 500)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'actions_volunteer_composition_complete_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_volunteer_composition_complete_check
      check (
        (children_count is null and adult_count is null and retired_count is null)
        or (
          volunteers_count is not null
          and children_count + adult_count + retired_count = volunteers_count
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'actions_volunteer_composition_pair_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_volunteer_composition_pair_check
      check (
        (children_count is null) = (adult_count is null)
        and (adult_count is null) = (retired_count is null)
      );
  end if;
end;
$$;

comment on column public.actions.children_count is
  'Typed physical participant count; NULL means unknown or incomplete.';
comment on column public.actions.adult_count is
  'Typed physical adult participant count; NULL means unknown or incomplete.';
comment on column public.actions.retired_count is
  'Typed physical retired participant count; NULL means unknown or incomplete.';

-- Keep the established atomic creation boundary and add the typed fields to
-- the same transaction. The function signature and idempotency behavior stay
-- unchanged so existing callers remain compatible.
create or replace function public.create_action_with_relations(
  p_action jsonb,
  p_organizers jsonb,
  p_registrations jsonb,
  p_creator_id text,
  p_client_request_id text default null,
  p_client_request_fingerprint text default null,
  p_organizer_required boolean default true
)
returns table (action_id uuid, replayed boolean)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action_id uuid;
  v_replayed boolean := false;
  v_existing_fingerprint text;
begin
  if nullif(trim(p_creator_id), '') is null then
    raise exception 'action_creation_creator_required' using errcode = '22023';
  end if;
  if p_action->>'created_by_clerk_id' is distinct from p_creator_id then
    raise exception 'action_creation_creator_mismatch' using errcode = '42501';
  end if;
  if p_action->>'client_request_id' is distinct from p_client_request_id then
    raise exception 'action_creation_request_key_mismatch' using errcode = '22023';
  end if;
  if coalesce(jsonb_typeof(p_organizers), 'null') <> 'array'
     or coalesce(jsonb_typeof(p_registrations), 'null') <> 'array' then
    raise exception 'action_creation_relations_must_be_arrays' using errcode = '22023';
  end if;
  if p_organizer_required and jsonb_array_length(p_organizers) = 0 then
    raise exception 'action_creation_organizer_required' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_organizers) as item
    where nullif(trim(item->>'organizer_clerk_id'), '') is null
       or nullif(trim(item->>'organizer_label'), '') is null
  ) then
    raise exception 'action_creation_organizer_invalid' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_registrations) as item
    where nullif(trim(item->>'user_id'), '') is null
  ) then
    raise exception 'action_creation_registration_invalid' using errcode = '22023';
  end if;
  if coalesce(p_action->>'access_mode', 'public') = 'invite_link'
     and (coalesce(p_action->>'action_phase', 'post_action_complete') <> 'pre_action'
       or coalesce(p_action->>'record_type', 'action') <> 'action') then
    raise exception 'action_creation_private_mode_requires_pre_action' using errcode = '22023';
  end if;

  if (p_action->>'action_context' is null)
     is distinct from (p_action->>'action_context_source' is null) then
    raise exception 'action_creation_context_pair_invalid' using errcode = '22023';
  end if;
  if p_action->>'action_context' is not null
     and p_action->>'action_context' not in ('citizen', 'company', 'school') then
    raise exception 'action_creation_context_invalid' using errcode = '22023';
  end if;
  if p_action->>'action_context_source' is not null
     and p_action->>'action_context_source' not in ('explicit', 'automatic_children_ratio') then
    raise exception 'action_creation_context_source_invalid' using errcode = '22023';
  end if;
  if p_action->>'action_context_source' = 'automatic_children_ratio'
     and p_action->>'action_context' not in ('citizen', 'school') then
    raise exception 'action_creation_automatic_context_invalid' using errcode = '22023';
  end if;
  if p_action->>'school_context_confirmed' is not null
     and lower(p_action->>'school_context_confirmed') <> 'true' then
    raise exception 'action_creation_school_confirmation_invalid' using errcode = '22023';
  end if;
  if p_action->>'action_context' = 'school'
     and p_action->>'action_context_source' = 'explicit'
     and lower(coalesce(p_action->>'school_context_confirmed', 'false')) <> 'true' then
    raise exception 'action_creation_school_confirmation_required' using errcode = '42501';
  end if;
  if p_action->>'school_context_confirmed' = 'true'
     and (
       p_action->>'action_context' <> 'school'
       or p_action->>'action_context_source' <> 'explicit'
       or nullif(trim(p_action->>'school_context_confirmed_by_clerk_id'), '') is distinct from trim(p_creator_id)
       or nullif(trim(p_action->>'school_context_confirmed_at'), '') is null
     ) then
    raise exception 'action_creation_school_confirmation_provenance_invalid' using errcode = '42501';
  end if;
  if p_action->>'school_context_confirmed_by_clerk_id' is not null
     and nullif(trim(p_action->>'school_context_confirmed_by_clerk_id'), '') is distinct from trim(p_creator_id) then
    raise exception 'action_creation_school_confirmation_actor_mismatch' using errcode = '42501';
  end if;
  if p_action->>'school_context_confirmed_at' is not null
     and lower(coalesce(p_action->>'school_context_confirmed', 'false')) <> 'true' then
    raise exception 'action_creation_school_confirmation_trace_invalid' using errcode = '22023';
  end if;

  if (p_action->>'children_count' is null)
     is distinct from (p_action->>'adult_count' is null)
     or (p_action->>'adult_count' is null)
     is distinct from (p_action->>'retired_count' is null) then
    raise exception 'action_creation_volunteer_composition_incomplete' using errcode = '22023';
  end if;
  if p_action->>'children_count' is not null and (
    p_action->>'children_count' !~ '^[0-9]+$'
    or p_action->>'adult_count' !~ '^[0-9]+$'
    or p_action->>'retired_count' !~ '^[0-9]+$'
    or (p_action->>'children_count')::integer not between 0 and 500
    or (p_action->>'adult_count')::integer not between 0 and 500
    or (p_action->>'retired_count')::integer not between 0 and 500
    or p_action->>'volunteers_count' is null
    or (p_action->>'children_count')::integer
       + (p_action->>'adult_count')::integer
       + (p_action->>'retired_count')::integer
       <> (p_action->>'volunteers_count')::integer
  ) then
    raise exception 'action_creation_volunteer_composition_invalid' using errcode = '22023';
  end if;

  insert into public.actions (
    created_by_clerk_id, actor_name, organizer_type, organizer_id, organizer_name,
    action_context, action_context_source, school_context_confirmed,
    school_context_confirmed_at, school_context_confirmed_by_clerk_id,
    action_date, location_label, department_code, department_name, latitude, longitude,
    derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source,
    waste_kg, cigarette_butts, volunteers_count, children_count, adult_count, retired_count,
    duration_minutes, event_start_time, event_end_time, published_at, preparation_data, notes,
    status, action_phase, access_mode, client_request_id, client_request_fingerprint
  ) values (
    p_action->>'created_by_clerk_id', p_action->>'actor_name', p_action->>'organizer_type',
    p_action->>'organizer_id', p_action->>'organizer_name',
    p_action->>'action_context', p_action->>'action_context_source',
    nullif(p_action->>'school_context_confirmed', '')::boolean,
    nullif(p_action->>'school_context_confirmed_at', '')::timestamptz,
    nullif(p_action->>'school_context_confirmed_by_clerk_id', ''),
    (p_action->>'action_date')::date, p_action->>'location_label',
    p_action->>'department_code', p_action->>'department_name',
    nullif(p_action->>'latitude', '')::double precision, nullif(p_action->>'longitude', '')::double precision,
    p_action->>'derived_geometry_kind', p_action->>'derived_geometry_geojson',
    nullif(p_action->>'geometry_confidence', '')::double precision, p_action->>'geometry_source',
    nullif(p_action->>'waste_kg', '')::numeric, nullif(p_action->>'cigarette_butts', '')::integer,
    nullif(p_action->>'volunteers_count', '')::integer,
    nullif(p_action->>'children_count', '')::integer,
    nullif(p_action->>'adult_count', '')::integer,
    nullif(p_action->>'retired_count', '')::integer,
    nullif(p_action->>'duration_minutes', '')::integer,
    nullif(p_action->>'event_start_time', '')::time, nullif(p_action->>'event_end_time', '')::time,
    nullif(p_action->>'published_at', '')::timestamptz, coalesce(p_action->'preparation_data', '{}'::jsonb),
    p_action->>'notes', coalesce(p_action->>'status', 'pending'),
    coalesce(p_action->>'action_phase', 'post_action_complete'),
    coalesce(p_action->>'access_mode', 'public'), p_client_request_id, p_client_request_fingerprint
  )
  on conflict (created_by_clerk_id, client_request_id)
    where client_request_id is not null
    do nothing
  returning id into v_action_id;

  if v_action_id is null then
    select a.id, a.client_request_fingerprint
      into v_action_id, v_existing_fingerprint
      from public.actions a
     where a.created_by_clerk_id = p_creator_id
       and a.client_request_id = p_client_request_id
     for update;
    if v_action_id is null then
      raise exception 'action_creation_retry_target_missing' using errcode = '40001';
    end if;
    if v_existing_fingerprint is not null
       and v_existing_fingerprint is distinct from p_client_request_fingerprint then
      raise exception 'action_creation_idempotency_conflict' using errcode = '23505';
    end if;
    if v_existing_fingerprint is null then
      update public.actions
         set client_request_fingerprint = p_client_request_fingerprint
       where id = v_action_id;
    end if;
    v_replayed := true;
  end if;

  insert into public.action_organizers (
    action_id, organizer_clerk_id, organizer_label, organizer_handle, is_primary
  )
  select v_action_id, item->>'organizer_clerk_id', item->>'organizer_label',
    item->>'organizer_handle', coalesce((item->>'is_primary')::boolean, false)
  from jsonb_array_elements(p_organizers) as item
  on conflict (action_id, organizer_clerk_id) do nothing;

  insert into public.action_registrations (
    action_id, user_id, registered_at, registration_status, registration_source
  )
  select v_action_id, item->>'user_id',
    coalesce(nullif(item->>'registered_at', '')::timestamptz, timezone('utc', now())),
    coalesce(item->>'registration_status', 'pending'),
    coalesce(item->>'registration_source', 'group_form')
  from jsonb_array_elements(p_registrations) as item
  on conflict (action_id, user_id) do nothing;

  if p_organizer_required and (
    select count(*) from public.action_organizers where action_id = v_action_id
  ) < jsonb_array_length(p_organizers) then
    raise exception 'action_creation_organizers_incomplete' using errcode = '40001';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_registrations) as item
    where not exists (
      select 1 from public.action_registrations r
       where r.action_id = v_action_id and r.user_id = item->>'user_id'
    )
  ) then
    raise exception 'action_creation_registrations_incomplete' using errcode = '40001';
  end if;

  return query select v_action_id, v_replayed;
end;
$$;

revoke all on function public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean)
  to service_role;

create or replace function public.action_collection_context_reference_averages_v1()
returns table (
  action_context text,
  waste_per_effective_unit numeric,
  butts_per_effective_unit numeric,
  waste_source_count integer,
  butts_source_count integer,
  eligible_action_count integer,
  formula_version text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
with eligible as (
  select
    a.action_context,
    a.waste_kg,
    a.cigarette_butts,
    case
      when a.action_context in ('citizen', 'company')
        then a.adult_count + 0.5 * a.children_count + 0.5 * a.retired_count
      when a.action_context = 'school'
        then a.adult_count + 0.45 * a.children_count
      else null
    end as waste_units,
    case
      when a.action_context in ('citizen', 'company')
        then a.adult_count + 0.5 * a.children_count + 0.5 * a.retired_count
      when a.action_context = 'school'
        then a.adult_count
      else null
    end as butts_units
  from public.actions a
  where a.status = 'approved'
    and a.moderation_visibility = 'visible'
    and a.action_phase = 'post_action_complete'
    and a.action_date <= current_date
    and a.action_context is not null
    and a.children_count is not null
    and a.adult_count is not null
    and a.retired_count is not null
    and a.children_count + a.adult_count + a.retired_count = a.volunteers_count
    and (a.action_context <> 'school' or a.retired_count = 0)
), grouped as (
  select
    action_context,
    avg(waste_kg / nullif(waste_units, 0)) filter (
      where waste_kg is not null and waste_kg >= 0 and waste_units > 0
    ) as waste_average,
    avg(cigarette_butts::numeric / nullif(butts_units, 0)) filter (
      where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0
    ) as butts_average,
    count(*) filter (
      where waste_kg is not null and waste_kg >= 0 and waste_units > 0
    )::integer as waste_count,
    count(*) filter (
      where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0
    )::integer as butts_count,
    count(*) filter (
      where (waste_kg is not null and waste_kg >= 0 and waste_units > 0)
         or (cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0)
    )::integer as eligible_count
  from eligible
  group by action_context
)
select
  action_context,
  waste_average,
  butts_average,
  waste_count,
  butts_count,
  eligible_count,
  'contextual-effective-units-v1'::text,
  now()
from grouped
order by action_context;
$$;

revoke all on function public.action_collection_context_reference_averages_v1() from public;
grant execute on function public.action_collection_context_reference_averages_v1() to anon, authenticated;

-- Preserve the typed composition fields when an action backup is restored.
-- The older restore function remains compatible with backups that omit them.
create or replace function public.restore_action_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action_count integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if p_backup->>'format' <> 'cleanmymap.action-backup'
    or (p_backup->>'version')::integer <> 2
  then
    raise exception 'Unsupported action backup format or version';
  end if;

  if jsonb_typeof(p_backup->'tables'->'actions') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_organizers') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_registrations') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_participants') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'training_examples') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'forms') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_conversations') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_conversation_members') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_conversation_exclusions') <> 'array'
    or jsonb_typeof(p_backup->'tables'->'action_share_contact_requests') <> 'array'
  then
    raise exception 'Incomplete action backup tables';
  end if;

  if exists (
    select 1
    from public.actions a
    join jsonb_to_recordset(p_backup->'tables'->'actions') as r(id uuid)
      on r.id = a.id
  ) then
    raise exception 'Action backup overlaps existing action identities';
  end if;

  perform set_config('cleanmymap.action_restore', 'on', true);

  insert into public.actions (
    id, created_at, updated_at, created_by_clerk_id, actor_name,
    organizer_type, organizer_id, organizer_name, action_date, location_label,
    department_code, department_name, latitude, longitude,
    derived_geometry_kind, derived_geometry_geojson, geometry_confidence,
    geometry_source, waste_kg, cigarette_butts, volunteers_count,
    children_count, adult_count, retired_count,
    duration_minutes, event_start_time, event_end_time, notes, status,
    cancelled_at, cancelled_by_clerk_id, cancellation_reason,
    cancelled_from_status, published_at, moderation_visibility, hidden_at,
    hidden_by_clerk_id, hidden_reason, type, action_phase, preparation_data
  )
  select
    r.id, r.created_at, r.updated_at, r.created_by_clerk_id, r.actor_name,
    r.organizer_type, r.organizer_id, r.organizer_name, r.action_date, r.location_label,
    r.department_code, r.department_name, r.latitude, r.longitude,
    r.derived_geometry_kind, r.derived_geometry_geojson, r.geometry_confidence,
    r.geometry_source, r.waste_kg, r.cigarette_butts, r.volunteers_count,
    case when r.children_count is not null and r.adult_count is not null and r.retired_count is not null
      and r.children_count + r.adult_count + r.retired_count = r.volunteers_count then r.children_count end,
    case when r.children_count is not null and r.adult_count is not null and r.retired_count is not null
      and r.children_count + r.adult_count + r.retired_count = r.volunteers_count then r.adult_count end,
    case when r.children_count is not null and r.adult_count is not null and r.retired_count is not null
      and r.children_count + r.adult_count + r.retired_count = r.volunteers_count then r.retired_count end,
    r.duration_minutes, r.event_start_time, r.event_end_time, r.notes, r.status,
    r.cancelled_at, r.cancelled_by_clerk_id, r.cancellation_reason,
    r.cancelled_from_status, r.published_at, r.moderation_visibility, r.hidden_at,
    r.hidden_by_clerk_id, r.hidden_reason, r.type, r.action_phase, r.preparation_data
  from jsonb_to_recordset(p_backup->'tables'->'actions') as r(
    id uuid,
    created_at timestamptz,
    updated_at timestamptz,
    created_by_clerk_id text,
    actor_name text,
    organizer_type text,
    organizer_id text,
    organizer_name text,
    action_date date,
    location_label text,
    department_code text,
    department_name text,
    latitude double precision,
    longitude double precision,
    derived_geometry_kind text,
    derived_geometry_geojson text,
    geometry_confidence double precision,
    geometry_source text,
    waste_kg numeric,
    cigarette_butts integer,
    volunteers_count integer,
    children_count integer,
    adult_count integer,
    retired_count integer,
    duration_minutes integer,
    event_start_time time,
    event_end_time time,
    notes text,
    status text,
    cancelled_at timestamptz,
    cancelled_by_clerk_id text,
    cancellation_reason text,
    cancelled_from_status text,
    published_at timestamptz,
    moderation_visibility text,
    hidden_at timestamptz,
    hidden_by_clerk_id text,
    hidden_reason text,
    type text,
    action_phase text,
    preparation_data jsonb
  );

  insert into public.action_organizers (
    id, created_at, action_id, organizer_clerk_id, organizer_label,
    organizer_handle, is_primary
  )
  select r.id, r.created_at, r.action_id, r.organizer_clerk_id,
    r.organizer_label, r.organizer_handle, r.is_primary
  from jsonb_to_recordset(p_backup->'tables'->'action_organizers') as r(
    id uuid, created_at timestamptz, action_id uuid, organizer_clerk_id text,
    organizer_label text, organizer_handle text, is_primary boolean
  );

  insert into public.action_registrations (
    id, created_at, updated_at, action_id, user_id, registered_at,
    registration_status, registration_source
  )
  select r.id, r.created_at, r.updated_at, r.action_id, r.user_id,
    r.registered_at, r.registration_status, r.registration_source
  from jsonb_to_recordset(p_backup->'tables'->'action_registrations') as r(
    id uuid, created_at timestamptz, updated_at timestamptz, action_id uuid,
    user_id text, registered_at timestamptz, registration_status text,
    registration_source text
  );

  insert into public.action_participants (
    id, created_at, updated_at, action_id, user_id, joined_at,
    participation_status, participation_source, individual_waste_kg,
    individual_waste_condition, individual_waste_measurement_method,
    individual_waste_normalization_version, individual_cigarette_butts_count,
    individual_cigarette_butts_mass_kg, individual_cigarette_butts_condition,
    individual_cigarette_butts_provenance, individual_cigarette_butts_conversion_version,
    individual_impact_measured_by, individual_impact_measured_at
  )
  select r.id, r.created_at, r.updated_at, r.action_id, r.user_id, r.joined_at,
    r.participation_status, r.participation_source, r.individual_waste_kg,
    r.individual_waste_condition, r.individual_waste_measurement_method,
    r.individual_waste_normalization_version, r.individual_cigarette_butts_count,
    r.individual_cigarette_butts_mass_kg, r.individual_cigarette_butts_condition,
    r.individual_cigarette_butts_provenance, r.individual_cigarette_butts_conversion_version,
    r.individual_impact_measured_by, r.individual_impact_measured_at
  from jsonb_to_recordset(p_backup->'tables'->'action_participants') as r(
    id uuid, created_at timestamptz, updated_at timestamptz, action_id uuid,
    user_id text, joined_at timestamptz, participation_status text,
    participation_source text, individual_waste_kg numeric,
    individual_waste_condition text, individual_waste_measurement_method text,
    individual_waste_normalization_version text, individual_cigarette_butts_count integer,
    individual_cigarette_butts_mass_kg numeric, individual_cigarette_butts_condition text,
    individual_cigarette_butts_provenance text, individual_cigarette_butts_conversion_version text,
    individual_impact_measured_by text, individual_impact_measured_at timestamptz
  );

  insert into public.training_examples (
    action_id, created_at, photos, poids_reel, poids_estime, intervalle,
    confiance, metadata, model_version, status
  )
  select r.action_id, r.created_at, r.photos, r.poids_reel, r.poids_estime,
    r.intervalle, r.confiance, r.metadata, r.model_version, r.status
  from jsonb_to_recordset(p_backup->'tables'->'training_examples') as r(
    action_id uuid, created_at timestamptz, photos jsonb, poids_reel numeric,
    poids_estime numeric, intervalle jsonb, confiance numeric, metadata jsonb,
    model_version text, status text
  );

  insert into public.forms (
    id, created_at, updated_at, action_id, group_id, status,
    validated_by_admin, is_duplicate, is_deleted, is_test
  )
  select r.id, r.created_at, r.updated_at, r.action_id, r.group_id, r.status,
    r.validated_by_admin, r.is_duplicate, r.is_deleted, r.is_test
  from jsonb_to_recordset(p_backup->'tables'->'forms') as r(
    id uuid, created_at timestamptz, updated_at timestamptz, action_id uuid,
    group_id text, status text, validated_by_admin boolean, is_duplicate boolean,
    is_deleted boolean, is_test boolean
  );

  insert into public.action_conversations (id, action_id, created_at, updated_at)
  select r.id, r.action_id, r.created_at, r.updated_at
  from jsonb_to_recordset(p_backup->'tables'->'action_conversations') as r(
    id uuid, action_id uuid, created_at timestamptz, updated_at timestamptz
  );

  insert into public.action_conversation_members (
    conversation_id, user_id, granted_at, access_source
  )
  select r.conversation_id, r.user_id, r.granted_at, r.access_source
  from jsonb_to_recordset(p_backup->'tables'->'action_conversation_members') as r(
    conversation_id uuid, user_id text, granted_at timestamptz, access_source text
  );

  insert into public.action_conversation_exclusions (
    conversation_id, user_id, excluded_by_user_id, excluded_at, reason,
    active, reinstated_at, reinstated_by_user_id
  )
  select r.conversation_id, r.user_id, r.excluded_by_user_id, r.excluded_at,
    r.reason, r.active, r.reinstated_at, r.reinstated_by_user_id
  from jsonb_to_recordset(p_backup->'tables'->'action_conversation_exclusions') as r(
    conversation_id uuid, user_id text, excluded_by_user_id text,
    excluded_at timestamptz, reason text, active boolean,
    reinstated_at timestamptz, reinstated_by_user_id text
  );

  insert into public.action_share_contact_requests (
    id, created_at, sender_id, recipient_id, action_id, content, status,
    responded_at
  )
  select r.id, r.created_at, r.sender_id, r.recipient_id, r.action_id,
    r.content, r.status, r.responded_at
  from jsonb_to_recordset(p_backup->'tables'->'action_share_contact_requests') as r(
    id uuid, created_at timestamptz, sender_id text, recipient_id text,
    action_id uuid, content text, status text, responded_at timestamptz
  );

  select count(*) into v_action_count
  from jsonb_to_recordset(p_backup->'tables'->'actions') as r(id uuid);

  return jsonb_build_object('restored', v_action_count);
end;
$$;

revoke all on function public.restore_action_backup(jsonb) from public, anon, authenticated;
grant execute on function public.restore_action_backup(jsonb) to service_role;
