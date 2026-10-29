-- PURPOSE: restore the public action-map boundary and persist the validated
-- classification produced by the server-side atomic action-creation contract.
-- CALLER: service_role for action creation; anon/authenticated/service_role for
-- the public map projection.
-- AUTHORIZATION_BOUNDARY: the HTTP layer resolves the Clerk creator and the
-- server-built classification before calling the service-only creation RPC;
-- the map RPC remains SECURITY INVOKER and therefore inherits public RLS.
-- IDEMPOTENCY: the existing creator/client_request_id conflict and fingerprint
-- checks remain unchanged; the map is a deterministic read projection.
-- ATOMICITY: action, classification, organizers and registrations remain in the
-- same creation transaction; replacing either function is transactional.
-- FAILURE_BEHAVIOR: malformed classification or confirmation provenance aborts
-- creation; private, hidden, unpublished and otherwise ineligible actions are
-- excluded from the public map.
-- SEARCH_PATH: public, pg_catalog is fixed explicitly on both functions.
-- GRANTS: creation stays service_role-only; map access stays limited to the
-- existing public reader roles plus service_role.

-- The server-side builder is the owner of these values. The checks below keep
-- the RPC from accepting a forged school confirmation or an incompatible
-- source/context pair, even though the RPC is not browser-callable.
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
    select 1
    from jsonb_array_elements(p_organizers) as item
    where nullif(trim(item->>'organizer_clerk_id'), '') is null
       or nullif(trim(item->>'organizer_label'), '') is null
  ) then
    raise exception 'action_creation_organizer_invalid' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_registrations) as item
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

  insert into public.actions (
    created_by_clerk_id, actor_name, organizer_type, organizer_id, organizer_name,
    action_context, action_context_source, school_context_confirmed,
    school_context_confirmed_at, school_context_confirmed_by_clerk_id,
    action_date, location_label, department_code, department_name, latitude, longitude,
    derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source,
    waste_kg, cigarette_butts, volunteers_count, duration_minutes, event_start_time,
    event_end_time, published_at, preparation_data, notes, status, action_phase,
    access_mode, client_request_id, client_request_fingerprint
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
    nullif(p_action->>'volunteers_count', '')::integer, nullif(p_action->>'duration_minutes', '')::integer,
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
    select 1
    from jsonb_array_elements(p_registrations) as item
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

-- Rebuild the public map feed from the last safe projection. In particular,
-- this function must not read action_geometry_contributions: its server-only
-- projection is already persisted in actions.preparation_data by the canonical
-- geometry owner and is exposed here only through the action row.
drop function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
);

create function public.actions_map_feed(
  p_south double precision default null,
  p_west double precision default null,
  p_north double precision default null,
  p_east double precision default null,
  p_zoom integer default null,
  p_status text default null,
  p_floor_date date default null,
  p_types text[] default null,
  p_impact text default null,
  p_limit integer default 80
)
returns table (
  source text, entity_type text, id uuid, created_at timestamptz,
  updated_at timestamptz, status text, observed_at date,
  location_label text, latitude double precision, longitude double precision,
  waste_kg numeric, cigarette_butts integer, volunteers_count integer,
  duration_minutes integer, notes text, derived_geometry_kind text,
  derived_geometry_geojson text, geometry_confidence numeric,
  geometry_source text, action_context text, action_context_source text,
  school_context_confirmed boolean, observed_coverage jsonb,
  public_preparation_data jsonb
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
with effective_limit as (
  select greatest(
    1,
    least(
      coalesce(p_limit, 80),
      case
        when coalesce(p_zoom, 12) <= 8 then 60
        when coalesce(p_zoom, 12) <= 10 then 120
        when coalesce(p_zoom, 12) <= 12 then 180
        else 300
      end
    )
  ) as value
), action_rows as (
  select
    'actions'::text as source,
    'action'::text as entity_type,
    a.id,
    a.created_at,
    a.updated_at,
    'approved'::text as status,
    a.action_date as observed_at,
    a.location_label,
    a.latitude,
    a.longitude,
    a.waste_kg,
    a.cigarette_butts,
    a.volunteers_count,
    a.duration_minutes,
    a.notes,
    a.derived_geometry_kind::text,
    a.derived_geometry_geojson,
    a.geometry_confidence,
    a.geometry_source::text,
    a.action_context,
    a.action_context_source,
    a.school_context_confirmed,
    case
      when jsonb_typeof(a.preparation_data -> 'observedCoverage') = 'object'
        and a.preparation_data -> 'observedCoverage' ->> 'type' = 'MultiLineString'
      then a.preparation_data -> 'observedCoverage'
      else null
    end as observed_coverage,
    public.public_action_map_preparation(a.preparation_data) as public_preparation_data,
    case
      when coalesce(a.waste_kg, 0) * 5
        + coalesce(a.cigarette_butts, 0) * .035
        + coalesce(a.volunteers_count, 0) * 1.6
        + coalesce(a.duration_minutes, 0) * .05 >= 80 then 'critique'
      when coalesce(a.waste_kg, 0) * 5
        + coalesce(a.cigarette_butts, 0) * .035
        + coalesce(a.volunteers_count, 0) * 1.6
        + coalesce(a.duration_minutes, 0) * .05 >= 60 then 'fort'
      when coalesce(a.waste_kg, 0) * 5
        + coalesce(a.cigarette_butts, 0) * .035
        + coalesce(a.volunteers_count, 0) * 1.6
        + coalesce(a.duration_minutes, 0) * .05 >= 30 then 'moyen'
      else 'faible'
    end as impact_level
  from public.actions a
  where coalesce(a.access_mode, 'public') = 'public'
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and (
      a.status = 'approved'
      or (a.status = 'pending' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action')
    )
    and (
      coalesce(a.action_phase, 'post_action_complete') <> 'pre_action'
      or public.is_public_future_pre_action(
        a.action_phase, a.published_at, a.moderation_visibility, a.status,
        a.action_date, a.event_start_time
      )
    )
    and (p_floor_date is null or a.action_date >= p_floor_date)
    and (p_types is null or 'action' = any(p_types))
    and a.latitude is not null
    and a.longitude is not null
    and (p_south is null or p_north is null or a.latitude between p_south and p_north)
    and (p_west is null or p_east is null or a.longitude between p_west and p_east)
), spot_rows as (
  select
    'trash_spotter_spots'::text as source,
    case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end::text as entity_type,
    s.id,
    s.created_at,
    null::timestamptz as updated_at,
    s.status,
    s.created_at::date as observed_at,
    s.label as location_label,
    s.latitude,
    s.longitude,
    null::numeric as waste_kg,
    null::integer as cigarette_butts,
    null::integer as volunteers_count,
    null::integer as duration_minutes,
    s.notes,
    null::text as derived_geometry_kind,
    null::text as derived_geometry_geojson,
    null::numeric as geometry_confidence,
    null::text as geometry_source,
    null::text as action_context,
    null::text as action_context_source,
    null::boolean as school_context_confirmed,
    null::jsonb as observed_coverage,
    null::jsonb as public_preparation_data,
    'faible'::text as impact_level
  from public.trash_spotter_spots s
  where s.status in ('validated', 'cleaned')
    and (p_floor_date is null or s.created_at::date >= p_floor_date)
    and (
      p_types is null
      or (case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end) = any(p_types)
    )
    and s.latitude is not null
    and s.longitude is not null
    and (p_south is null or p_north is null or s.latitude between p_south and p_north)
    and (p_west is null or p_east is null or s.longitude between p_west and p_east)
)
select
  source, entity_type, id, created_at, updated_at, status, observed_at,
  location_label, latitude, longitude, waste_kg, cigarette_butts,
  volunteers_count, duration_minutes, notes, derived_geometry_kind,
  derived_geometry_geojson, geometry_confidence, geometry_source,
  action_context, action_context_source, school_context_confirmed,
  observed_coverage, public_preparation_data
from (
  select * from action_rows
  union all
  select * from spot_rows
) map_rows
where p_impact is null or impact_level = p_impact
order by observed_at desc, created_at desc
limit (select value from effective_limit);
$$;

revoke all on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) from public, anon, authenticated, service_role;
grant execute on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) to anon, authenticated, service_role;
