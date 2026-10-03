-- Canonical attributable field-geometry observations.
-- PURPOSE: retain each accepted GPX/mobile trace independently and expose a
-- recalculable action projection without inventing a collective itinerary.
-- CALLER: server-owned GPX RPC and completed linked-mission trigger.
-- AUTHORIZATION_BOUNDARY: only confirmed action participants or persisted
-- action organizers are accepted; direct table writes remain service-only.
-- IDEMPOTENCY: action + contributor + source + source_fingerprint.
-- ATOMICITY: the contribution and its action projection are refreshed in one
-- database transaction.
-- FAILURE_BEHAVIOR: invalid or ineligible observations are refused and never
-- enter the exploitable projection or gamification facts.
-- SEARCH_PATH: SECURITY DEFINER functions pin public, pg_catalog explicitly.
-- GRANTS: no direct table or function access for public/anon/authenticated.

create table if not exists public.action_geometry_contributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  action_id uuid not null references public.actions(id) on delete cascade,
  contributor_clerk_id text not null,
  source text not null check (source in ('gpx_import', 'gps_tracking')),
  mission_id uuid references public.missions(id) on delete set null,
  observed_geometry jsonb not null,
  observed_distance_km numeric(12, 3) not null check (observed_distance_km >= 0),
  point_count integer not null check (point_count >= 2),
  source_fingerprint text not null,
  validation_state text not null default 'accepted'
    check (validation_state in ('accepted', 'refused')),
  refusal_reason text,
  observed_at timestamptz not null default timezone('utc', now()),
  technical_provenance jsonb not null default '{}'::jsonb,
  constraint action_geometry_contributions_geometry_linestring_check
    check (
      observed_geometry ->> 'type' = 'LineString'
      and jsonb_typeof(observed_geometry -> 'coordinates') = 'array'
      and jsonb_array_length(observed_geometry -> 'coordinates') >= 2
    ),
  constraint action_geometry_contributions_mission_source_check
    check (source <> 'gps_tracking' or mission_id is not null)
);

-- The original derived-geometry migration constrained Action projections to a
-- single LineString/polygon vocabulary. Multi-trace coverage is a legitimate
-- new projection kind, while spots retain the original three-kind contract.
alter table public.actions
  drop constraint if exists actions_derived_geometry_kind_check;

alter table public.actions
  add constraint actions_derived_geometry_kind_check
  check (derived_geometry_kind in ('point', 'polyline', 'polygon', 'multiline'));

create unique index if not exists uq_action_geometry_contributions_identity
  on public.action_geometry_contributions
    (action_id, contributor_clerk_id, source, source_fingerprint);

create index if not exists idx_action_geometry_contributions_action_accepted
  on public.action_geometry_contributions(action_id, observed_at, id)
  where validation_state = 'accepted';

create index if not exists idx_action_geometry_contributions_contributor_accepted
  on public.action_geometry_contributions(contributor_clerk_id, action_id)
  where validation_state = 'accepted';

alter table public.action_geometry_contributions enable row level security;
revoke all on table public.action_geometry_contributions from public, anon, authenticated;
grant all privileges on table public.action_geometry_contributions to service_role;

drop policy if exists action_geometry_contributions_service_only
  on public.action_geometry_contributions;
create policy action_geometry_contributions_service_only
on public.action_geometry_contributions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.refresh_action_geometry_coverage(p_action_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_action public.actions;
  accepted_count integer := 0;
  line_coordinates jsonb := '[]'::jsonb;
  trace_distances jsonb := '[]'::jsonb;
  trace_sources jsonb := '[]'::jsonb;
  observed_coverage jsonb;
  first_geometry jsonb;
  first_source text;
  first_distance numeric;
  next_preparation jsonb;
  next_kind text;
  next_geojson text;
  next_source text;
begin
  select * into current_action
    from public.actions
   where id = p_action_id
   for update;

  if current_action.id is null then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(jsonb_agg(c.observed_geometry -> 'coordinates' order by c.observed_at, c.id), '[]'::jsonb),
    coalesce(jsonb_agg(to_jsonb(round(c.observed_distance_km, 3)) order by c.observed_at, c.id), '[]'::jsonb),
    coalesce(jsonb_agg(to_jsonb(c.source) order by c.observed_at, c.id), '[]'::jsonb),
    (array_agg(c.observed_geometry order by c.observed_at, c.id))[1],
    (array_agg(c.source order by c.observed_at, c.id))[1],
    (array_agg(c.observed_distance_km order by c.observed_at, c.id))[1]
    into accepted_count, line_coordinates, trace_distances, trace_sources,
      first_geometry, first_source, first_distance
    from public.action_geometry_contributions c
   where c.action_id = p_action_id
     and c.validation_state = 'accepted';

  next_preparation := coalesce(current_action.preparation_data, '{}'::jsonb)
    - array['gpxImport', 'operationalRoute', 'routeNetworkDistanceKm',
      'routeGeometryMode', 'routeGeometryProvider', 'routeObservedDistanceKm']::text[];

  if accepted_count = 0 then
    update public.actions
       set preparation_data = next_preparation
     where id = p_action_id;
    return;
  end if;

  observed_coverage := jsonb_build_object(
    'type', 'MultiLineString',
    'coordinates', line_coordinates,
    'traceCount', accepted_count,
    'individualDistancesKm', trace_distances,
    'sources', trace_sources,
    'coverageDistanceKm', null,
    'coverageVersion', 'observed-traces-v1'
  );
  next_preparation := jsonb_set(
    next_preparation,
    '{observedCoverage}',
    observed_coverage,
    true
  );

  -- A park/closed-zone polygon remains the primary geometry; observations are
  -- complementary coverage shown by the map from preparation_data.
  if current_action.derived_geometry_kind::text = 'polygon' then
    update public.actions
       set preparation_data = next_preparation
     where id = p_action_id;
    return;
  end if;

  if accepted_count = 1 then
    next_kind := 'polyline';
    next_geojson := first_geometry::text;
    next_source := first_source;
    next_preparation := jsonb_set(
      next_preparation,
      '{routeObservedDistanceKm}',
      to_jsonb(round(first_distance, 3)),
      true
    );
  else
    next_kind := 'multiline';
    next_geojson := jsonb_build_object(
      'type', 'MultiLineString',
      'coordinates', line_coordinates
    )::text;
    next_source := case
      when exists (
        select 1 from public.action_geometry_contributions
         where action_id = p_action_id
           and validation_state = 'accepted'
           and source = 'gps_tracking'
      ) then 'gps_tracking'
      else 'gpx_import'
    end;
  end if;

  update public.actions
     set derived_geometry_kind = next_kind,
         derived_geometry_geojson = next_geojson,
         geometry_source = next_source,
         geometry_confidence = case when accepted_count = 1 and next_source = 'gpx_import' then 1 else null end,
         preparation_data = next_preparation
   where id = p_action_id;
end;
$$;

revoke all on function public.refresh_action_geometry_coverage(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.record_action_geometry_contribution(
  p_action_id uuid,
  p_contributor_clerk_id text,
  p_source text,
  p_observed_geometry jsonb,
  p_observed_distance_km numeric,
  p_source_fingerprint text default null,
  p_mission_id uuid default null,
  p_observed_at timestamptz default timezone('utc', now()),
  p_technical_provenance jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  contribution public.action_geometry_contributions;
  eligible boolean;
  fingerprint text;
  point_count integer;
  state text;
  refusal text;
begin
  if p_action_id is null
     or nullif(trim(coalesce(p_contributor_clerk_id, '')), '') is null
     or p_source not in ('gpx_import', 'gps_tracking')
     or p_observed_geometry ->> 'type' <> 'LineString'
     or jsonb_typeof(p_observed_geometry -> 'coordinates') <> 'array'
     or jsonb_array_length(p_observed_geometry -> 'coordinates') < 2
     or p_observed_distance_km is null
     or p_observed_distance_km < 0
     or (p_source = 'gps_tracking' and p_mission_id is null) then
    return jsonb_build_object('accepted', false, 'reason', 'invalid_observation');
  end if;

  if not exists (select 1 from public.actions where id = p_action_id) then
    return jsonb_build_object('accepted', false, 'reason', 'action_not_found');
  end if;

  point_count := jsonb_array_length(p_observed_geometry -> 'coordinates');
  fingerprint := coalesce(
    nullif(trim(p_source_fingerprint), ''),
    md5(p_source || ':' || p_observed_geometry::text || ':' || round(p_observed_distance_km, 3)::text)
  );
  eligible := exists (
    select 1 from public.action_participants
     where action_id = p_action_id
       and user_id = trim(p_contributor_clerk_id)
       and participation_status = 'confirmed'
  ) or exists (
    select 1 from public.action_organizers
     where action_id = p_action_id
       and organizer_clerk_id = trim(p_contributor_clerk_id)
  );
  state := case when eligible then 'accepted' else 'refused' end;
  refusal := case when eligible then null else 'contributor_not_confirmed_or_organizer' end;

  insert into public.action_geometry_contributions (
    action_id, contributor_clerk_id, source, mission_id, observed_geometry,
    observed_distance_km, point_count, source_fingerprint, validation_state,
    refusal_reason, observed_at, technical_provenance
  ) values (
    p_action_id, trim(p_contributor_clerk_id), p_source, p_mission_id,
    p_observed_geometry, round(p_observed_distance_km, 3), point_count,
    fingerprint, state, refusal, coalesce(p_observed_at, timezone('utc', now())),
    coalesce(p_technical_provenance, '{}'::jsonb)
  )
  on conflict (action_id, contributor_clerk_id, source, source_fingerprint)
  do update set updated_at = timezone('utc', now())
  returning * into contribution;

  if contribution.validation_state = 'accepted' then
    perform public.refresh_action_geometry_coverage(p_action_id);
  end if;

  return jsonb_build_object(
    'accepted', contribution.validation_state = 'accepted',
    'contributionId', contribution.id,
    'validationState', contribution.validation_state,
    'traceCount', (
      select count(*) from public.action_geometry_contributions
       where action_id = p_action_id and validation_state = 'accepted'
    )
  );
end;
$$;

revoke all on function public.record_action_geometry_contribution(
  uuid, text, text, jsonb, numeric, text, uuid, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.record_action_geometry_contribution(
  uuid, text, text, jsonb, numeric, text, uuid, timestamptz, jsonb
) to service_role;

create or replace function public.record_completed_mission_geometry_contribution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  point_count integer := 0;
  coordinates jsonb;
  distance_km numeric;
begin
  if old.status is not distinct from 'completed'
     or new.status is distinct from 'completed'
     or new.action_id is null
     or new.volunteer_id is null then
    return new;
  end if;

  with ordered as (
    select gp.latitude, gp.longitude, gp.recorded_at, gp.id,
      lag(gp.latitude) over (order by gp.recorded_at, gp.id) as previous_latitude,
      lag(gp.longitude) over (order by gp.recorded_at, gp.id) as previous_longitude
      from public.gps_points gp
     where gp.mission_id = new.id
       and gp.latitude between -90 and 90
       and gp.longitude between -180 and 180
  ), deduplicated as (
    select latitude, longitude, recorded_at, id
      from ordered
     where previous_latitude is null
        or previous_longitude is null
        or latitude <> previous_latitude
        or longitude <> previous_longitude
  )
  select count(*)::integer,
    jsonb_agg(jsonb_build_array(longitude, latitude) order by recorded_at, id)
    into point_count, coordinates
    from deduplicated;

  if point_count < 2 or coordinates is null then
    return new;
  end if;

  distance_km := round(greatest(coalesce(new.distance_m, 0), 0)::numeric / 1000, 3);
  perform public.record_action_geometry_contribution(
    new.action_id,
    new.volunteer_id,
    'gps_tracking',
    jsonb_build_object('type', 'LineString', 'coordinates', coordinates),
    distance_km,
    md5('gps_tracking:' || new.id::text || ':' || coordinates::text),
    new.id,
    coalesce(new.ended_at, timezone('utc', now())),
    jsonb_build_object('missionId', new.id, 'pointCount', point_count, 'distanceMeters', new.distance_m)
  );
  return new;
end;
$$;

revoke all on function public.record_completed_mission_geometry_contribution()
  from public, anon, authenticated, service_role;

-- The existing trigger name is retained so the mobile contract remains stable;
-- only its canonical behavior changes from first-trace replacement to append-only
-- contribution recording plus projection refresh.
create or replace function public.promote_completed_mission_geometry()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  return public.record_completed_mission_geometry_contribution();
end;
$$;

revoke all on function public.promote_completed_mission_geometry() from public;

-- The observed projection can legitimately be MultiLineString. The legacy
-- LineString primitive remains used for single-trace editor updates only.
create or replace function public.preserve_observed_action_geometry()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  old_source text := old.geometry_source::text;
  new_source text := new.geometry_source::text;
  next_preparation jsonb;
begin
  if old_source in ('gps_tracking', 'gpx_import')
     and new_source not in ('gps_tracking', 'gpx_import') then
    new.derived_geometry_kind := old.derived_geometry_kind;
    new.derived_geometry_geojson := old.derived_geometry_geojson;
    new.geometry_confidence := old.geometry_confidence;
    new.geometry_source := old.geometry_source;
    new.preparation_data := old.preparation_data;
  elsif new_source in ('gps_tracking', 'gpx_import')
    and new.derived_geometry_kind::text <> 'multiline' then
    new := public.apply_observed_action_geometry(
      new, new_source, new.derived_geometry_geojson,
      (new.preparation_data ->> 'routeObservedDistanceKm')::numeric,
      case when new_source = 'gpx_import' then new.preparation_data -> 'gpxImport' else null end
    );
  elsif old_source = 'manual'
     and new_source in ('reference', 'routed', 'estimated_route', 'estimated_area', 'fallback_point') then
    new.derived_geometry_kind := old.derived_geometry_kind;
    new.derived_geometry_geojson := old.derived_geometry_geojson;
    new.geometry_confidence := old.geometry_confidence;
    new.geometry_source := old.geometry_source;
    next_preparation := old.preparation_data;
    new.preparation_data := next_preparation;
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_observed_action_geometry()
  from public, anon, authenticated, service_role;

drop trigger if exists promote_completed_mission_geometry on public.missions;
create trigger promote_completed_mission_geometry
after update on public.missions
for each row
when (old.status is distinct from 'completed' and new.status = 'completed')
execute function public.promote_completed_mission_geometry();
