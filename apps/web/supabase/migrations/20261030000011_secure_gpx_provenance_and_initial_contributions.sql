-- PURPOSE: keep planned GPX imports out of observed contributions and make
-- the new independent-segment workflow the sole owner for candidate files.
-- CALLER: action insert/update triggers and the public map projection.
-- AUTHORIZATION_BOUNDARY: no public role gains access to contribution writes;
-- the existing service-only RPC and trigger grants remain unchanged.
-- IDEMPOTENCY: legacy single-segment imports retain the existing RPC-derived
-- identity; candidate files are persisted by their segment fingerprints only.
-- ATOMICITY: trigger decisions and any projection refresh stay in the action
-- row transaction; the server workflow remains retryable per segment.
-- FAILURE_BEHAVIOR: planned or candidate-file imports are never auto-recorded;
-- legacy unmarked single-segment imports keep their compatibility path.
-- SEARCH_PATH: SECURITY DEFINER functions pin public, pg_catalog explicitly.
-- GRANTS: this migration preserves the existing trigger-only and public-feed
-- grants; it does not expose action_geometry_contributions.

create or replace function public.record_initial_action_geometry_contribution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  observed_geometry jsonb;
  observed_distance_km numeric;
  gpx_import jsonb;
begin
  if new.geometry_source::text <> 'gpx_import'
     or new.created_by_clerk_id is null
     or new.derived_geometry_geojson is null
     or new.preparation_data is null then
    return new;
  end if;

  gpx_import := new.preparation_data -> 'gpxImport';
  -- A planned marker is authoritative. A files array marks the newer server
  -- orchestration, which records each independent segment after creation.
  if gpx_import ->> 'intent' = 'planned'
     or gpx_import ->> 'provenance' = 'planned'
     or jsonb_typeof(gpx_import -> 'files') = 'array' then
    return new;
  end if;

  begin
    observed_geometry := new.derived_geometry_geojson::jsonb;
    observed_distance_km := coalesce(
      (new.preparation_data ->> 'routeObservedDistanceKm')::numeric,
      (new.preparation_data #>> '{gpxImport,observedDistanceKm}')::numeric
    );
  exception when others then
    return new;
  end;

  if observed_geometry ->> 'type' <> 'LineString'
     or jsonb_typeof(observed_geometry -> 'coordinates') <> 'array'
     or jsonb_array_length(observed_geometry -> 'coordinates') < 2
     or observed_distance_km is null
     or observed_distance_km < 0 then
    return new;
  end if;

  perform public.record_action_geometry_contribution(
    new.id,
    new.created_by_clerk_id,
    'gpx_import',
    observed_geometry,
    observed_distance_km,
    null,
    null,
    new.created_at,
    jsonb_build_object('initialActionCreation', true, 'legacySingleSegment', true)
  );
  return new;
end;
$$;

revoke all privileges on function public.record_initial_action_geometry_contribution()
  from public, anon, authenticated, service_role;

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
  gpx_import jsonb;
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

  gpx_import := current_action.preparation_data -> 'gpxImport';
  next_preparation := coalesce(current_action.preparation_data, '{}'::jsonb)
    - array['operationalRoute', 'routeNetworkDistanceKm',
      'routeGeometryMode', 'routeGeometryProvider', 'routeObservedDistanceKm',
      'observedCoverage']::text[];

  -- Keep the candidate ledger for independent-segment retries and keep planned
  -- provenance visible; legacy single-segment imports remain projection-owned.
  if jsonb_typeof(gpx_import -> 'files') = 'array'
     or gpx_import ->> 'intent' = 'planned'
     or gpx_import ->> 'provenance' = 'planned' then
    next_preparation := jsonb_set(next_preparation, '{gpxImport}', gpx_import, true);
  else
    next_preparation := next_preparation - 'gpxImport';
  end if;

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
  next_preparation := jsonb_set(next_preparation, '{observedCoverage}', observed_coverage, true);

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

  if (new.preparation_data -> 'gpxImport' ->> 'intent') = 'planned'
     or (new.preparation_data -> 'gpxImport' ->> 'provenance') = 'planned'
     or jsonb_typeof(new.preparation_data -> 'gpxImport' -> 'files') = 'array' then
    return new;
  end if;

  perform public.refresh_action_geometry_coverage(new.id);
  return new;
end;
$$;

revoke all privileges on function public.refresh_observed_action_geometry_after_insert()
  from public, anon, authenticated, service_role;

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

  if (new.preparation_data -> 'gpxImport' ->> 'intent') = 'planned'
     or (new.preparation_data -> 'gpxImport' ->> 'provenance') = 'planned'
     or jsonb_typeof(new.preparation_data -> 'gpxImport' -> 'files') = 'array' then
    return new;
  end if;

  if exists (
    select 1
    from public.action_geometry_contributions c
    where c.action_id = new.id
      and c.validation_state = 'accepted'
  ) then
    perform public.refresh_action_geometry_coverage(new.id);
  end if;
  return new;
end;
$$;

revoke all privileges on function public.refresh_observed_action_geometry_after_update()
  from public, anon, authenticated, service_role;

create or replace function public.public_action_map_preparation(p_preparation jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = public, pg_catalog
as $$
select jsonb_strip_nulls(jsonb_build_object(
  'geometryMethod', case
    when p_preparation ->> 'geometryMethod' in ('automatic', 'generator', 'manual', 'gpx_import', 'location_only')
    then to_jsonb(p_preparation ->> 'geometryMethod') end,
  'gpxImportProvenance', case
    when p_preparation #>> '{gpxImport,intent}' = 'planned'
      or p_preparation #>> '{gpxImport,provenance}' = 'planned'
    then to_jsonb('planned'::text)
    when p_preparation #>> '{gpxImport,intent}' = 'observed'
      or p_preparation #>> '{gpxImport,provenance}' = 'unknown'
    then to_jsonb('unknown'::text) end,
  'routeTargetDistanceKm', case
    when jsonb_typeof(p_preparation -> 'routeTargetDistanceKm') = 'number'
      and (p_preparation ->> 'routeTargetDistanceKm')::numeric >= 0
    then p_preparation -> 'routeTargetDistanceKm' end,
  'routeNetworkDistanceKm', case
    when jsonb_typeof(p_preparation -> 'routeNetworkDistanceKm') = 'number'
      and (p_preparation ->> 'routeNetworkDistanceKm')::numeric >= 0
    then p_preparation -> 'routeNetworkDistanceKm' end,
  'routeObservedDistanceKm', case
    when jsonb_typeof(p_preparation -> 'routeObservedDistanceKm') = 'number'
      and (p_preparation ->> 'routeObservedDistanceKm')::numeric >= 0
    then p_preparation -> 'routeObservedDistanceKm' end,
  'routeGeometryMode', case
    when p_preparation ->> 'routeGeometryMode' in ('network', 'fallback')
    then to_jsonb(p_preparation ->> 'routeGeometryMode') end,
  'routeGeometryProvider', case
    when p_preparation ->> 'routeGeometryProvider' in ('osrm', 'fossgis-osrm', 'none')
    then to_jsonb(p_preparation ->> 'routeGeometryProvider') end,
  'operationalRoute', case
    when jsonb_typeof(p_preparation #> '{operationalRoute,routes}') = 'array'
    then jsonb_build_object(
      'routes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'routeId', route_value ->> 'routeId',
          'groupIndex', (route_value ->> 'groupIndex')::integer,
          'coordinates', route_value #> '{geometry,coordinates}'
        ) order by route_ordinal)
        from jsonb_array_elements(p_preparation #> '{operationalRoute,routes}')
          with ordinality as routes(route_value, route_ordinal)
        where jsonb_typeof(route_value #> '{geometry,coordinates}') = 'array'
          and jsonb_array_length(route_value #> '{geometry,coordinates}') >= 2
          and coalesce(route_value ->> 'routeId', '') <> ''
          and (route_value ->> 'groupIndex') ~ '^[0-9]+$'
      ), '[]'::jsonb)
    ) end
));
$$;

revoke all privileges on function public.public_action_map_preparation(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.public_action_map_preparation(jsonb)
  to anon, authenticated, service_role;
