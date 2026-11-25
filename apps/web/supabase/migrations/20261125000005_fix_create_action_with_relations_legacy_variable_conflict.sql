-- Resolve PL/pgSQL OUT parameter vs table column conflict (SQLSTATE 42702) in
-- create_action_with_relations_legacy, including ON CONFLICT (action_id, ...)
-- targets where column names cannot be table-qualified.

create or replace function public.create_action_with_relations_legacy(
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
#variable_conflict use_column
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
    select count(*) from public.action_organizers o where o.action_id = v_action_id
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

revoke all on function public.create_action_with_relations_legacy(jsonb, jsonb, jsonb, text, text, text, boolean)
  from public, anon, authenticated, service_role;
