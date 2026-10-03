-- PURPOSE: restore the public map feed to invoker semantics while keeping the
-- accepted multi-trace coverage projection recalculable and bounded.
-- CALLER: public map readers through actions_map_feed and server-owned geometry
-- contribution/repair triggers.
-- AUTHORIZATION_BOUNDARY: action_geometry_contributions remains service-only;
-- public readers see only RLS-visible actions and sanitized preparation data.
-- IDEMPOTENCY: replacing the canonical refresh/repair functions and the stable
-- RPC signature is safe to replay only through the migration history.
-- ATOMICITY: projection cleanup and action updates remain in the same database
-- transaction; the read RPC replacement is transactional.
-- FAILURE_BEHAVIOR: unsupported or stale observedCoverage is removed rather
-- than exposed; no accepted contribution produces no public coverage.
-- SEARCH_PATH: SECURITY DEFINER trigger helpers pin public, pg_catalog.
-- GRANTS: actions_map_feed and its immutable sanitizer are executable by the
-- existing public map roles anon, authenticated and service_role.

-- The projection is derived only from accepted attributable contributions. Drop
-- any mutation-provided value before rebuilding it so an unsupported value can
-- never survive a repair cycle.
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
      'routeGeometryMode', 'routeGeometryProvider', 'routeObservedDistanceKm',
      'observedCoverage']::text[];

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

revoke all privileges on function public.refresh_action_geometry_coverage(uuid)
  from public, anon, authenticated, service_role;

-- Repair direct updates even when no accepted contribution remains. This is
-- deliberately unconditional: the refresh function removes unsupported fields.
create or replace function public.refresh_observed_action_geometry_after_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  perform public.refresh_action_geometry_coverage(new.id);
  return new;
end;
$$;

revoke all privileges on function public.refresh_observed_action_geometry_after_update()
  from public, anon, authenticated, service_role;

-- Apply the same cleanup to inserts carrying an unsupported user projection.
create or replace function public.refresh_observed_action_geometry_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  perform public.refresh_action_geometry_coverage(new.id);
  return new;
end;
$$;

revoke all privileges on function public.refresh_observed_action_geometry_after_insert()
  from public, anon, authenticated, service_role;

drop trigger if exists refresh_observed_action_geometry_after_insert on public.actions;
create trigger refresh_observed_action_geometry_after_insert
after insert on public.actions
for each row
execute function public.refresh_observed_action_geometry_after_insert();

-- The existing UPDATE trigger name and event contract remain stable.
drop trigger if exists refresh_observed_action_geometry_after_update on public.actions;
create trigger refresh_observed_action_geometry_after_update
after update of derived_geometry_kind, derived_geometry_geojson,
  geometry_source, geometry_confidence, preparation_data on public.actions
for each row
execute function public.refresh_observed_action_geometry_after_update();

-- The helper is safe for public invocation and must be executable by invoker
-- callers because actions_map_feed no longer elevates privileges.
grant execute on function public.public_action_map_preparation(jsonb)
  to anon, authenticated, service_role;

drop function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
);

create function public.actions_map_feed(
  p_south double precision default null, p_west double precision default null,
  p_north double precision default null, p_east double precision default null,
  p_zoom integer default null, p_status text default null,
  p_floor_date date default null, p_types text[] default null,
  p_impact text default null, p_limit integer default 80
)
returns table (
  source text, entity_type text, id uuid, created_at timestamptz,
  updated_at timestamptz, status text,
  observed_at date, location_label text, latitude double precision,
  longitude double precision, waste_kg numeric, cigarette_butts integer,
  volunteers_count integer, duration_minutes integer, notes text,
  derived_geometry_kind text, derived_geometry_geojson text,
  geometry_confidence numeric, geometry_source text,
  observed_coverage jsonb, public_preparation_data jsonb
)
language sql stable security invoker
set search_path = public, pg_catalog
as $$
with effective_limit as (
  select greatest(1, least(coalesce(p_limit, 80), case
    when coalesce(p_zoom, 12) <= 8 then 60
    when coalesce(p_zoom, 12) <= 10 then 120
    when coalesce(p_zoom, 12) <= 12 then 180 else 300 end)) as value
), action_rows as (
  select 'actions'::text source, 'action'::text entity_type, a.id,
    a.created_at, a.updated_at, 'approved'::text status,
    a.action_date observed_at, a.location_label, a.latitude, a.longitude,
    a.waste_kg, a.cigarette_butts, a.volunteers_count, a.duration_minutes,
    a.notes, a.derived_geometry_kind::text, a.derived_geometry_geojson,
    a.geometry_confidence, a.geometry_source::text,
    case
      when jsonb_typeof(a.preparation_data -> 'observedCoverage') = 'object'
        and a.preparation_data -> 'observedCoverage' ->> 'type' = 'MultiLineString'
      then a.preparation_data -> 'observedCoverage'
      else null
    end as observed_coverage,
    public.public_action_map_preparation(a.preparation_data) as public_preparation_data,
    case
      when coalesce(a.waste_kg, 0) * 5 + coalesce(a.cigarette_butts, 0) * .035
        + coalesce(a.volunteers_count, 0) * 1.6 + coalesce(a.duration_minutes, 0) * .05 >= 80 then 'critique'
      when coalesce(a.waste_kg, 0) * 5 + coalesce(a.cigarette_butts, 0) * .035
        + coalesce(a.volunteers_count, 0) * 1.6 + coalesce(a.duration_minutes, 0) * .05 >= 60 then 'fort'
      when coalesce(a.waste_kg, 0) * 5 + coalesce(a.cigarette_butts, 0) * .035
        + coalesce(a.volunteers_count, 0) * 1.6 + coalesce(a.duration_minutes, 0) * .05 >= 30 then 'moyen'
      else 'faible' end as impact_level
  from public.actions a
  where coalesce(a.moderation_visibility, 'visible') = 'visible'
    and (a.status = 'approved' or (a.status = 'pending' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action'))
    and (coalesce(a.action_phase, 'post_action_complete') <> 'pre_action' or public.is_public_future_pre_action(a.action_phase, a.published_at, a.moderation_visibility, a.status, a.action_date, a.event_start_time))
    and (p_floor_date is null or a.action_date >= p_floor_date)
    and (p_types is null or 'action' = any(p_types))
    and a.latitude is not null and a.longitude is not null
    and (p_south is null or p_north is null or a.latitude between p_south and p_north)
    and (p_west is null or p_east is null or a.longitude between p_west and p_east)
), spot_rows as (
  select 'trash_spotter_spots'::text source,
    case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end::text entity_type,
    s.id, s.created_at, null::timestamptz updated_at,
    s.status, s.created_at::date observed_at, s.label location_label,
    s.latitude, s.longitude, null::numeric waste_kg, null::integer cigarette_butts,
    null::integer volunteers_count, null::integer duration_minutes, s.notes,
    null::text derived_geometry_kind, null::text derived_geometry_geojson,
    null::numeric geometry_confidence, null::text geometry_source,
    null::jsonb observed_coverage, null::jsonb public_preparation_data, 'faible'::text impact_level
  from public.trash_spotter_spots s
  where s.status in ('validated', 'cleaned')
    and (p_floor_date is null or s.created_at::date >= p_floor_date)
    and (p_types is null or (case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end) = any(p_types))
    and s.latitude is not null and s.longitude is not null
    and (p_south is null or p_north is null or s.latitude between p_south and p_north)
    and (p_west is null or p_east is null or s.longitude between p_west and p_east)
)
select source, entity_type, id, created_at, updated_at, status,
  observed_at, location_label, latitude, longitude, waste_kg, cigarette_butts,
  volunteers_count, duration_minutes, notes, derived_geometry_kind,
  derived_geometry_geojson, geometry_confidence, geometry_source,
  observed_coverage, public_preparation_data
from (select * from action_rows union all select * from spot_rows) map_rows
where p_impact is null or impact_level = p_impact
order by observed_at desc, created_at desc
limit (select value from effective_limit);
$$;

revoke all privileges on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) from public;
grant execute on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) to anon, authenticated, service_role;
