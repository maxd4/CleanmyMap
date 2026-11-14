-- PURPOSE: Extend the existing public map preparation allowlist with bounded
--          historical reconstruction and verified official-area provenance.
-- CALLER: public.actions_map_feed -> public.public_action_map_preparation(jsonb).
-- AUTHORIZATION_BOUNDARY: Keep the invoker boundary and expose only the
--                          explicitly selected public cartographic fields.
-- IDEMPOTENCY: CREATE OR REPLACE preserves the existing function signature.
-- ATOMICITY: The function is a pure JSON projection; no table is mutated.
-- FAILURE_BEHAVIOR: Invalid or oversized reconstruction/reference objects are
--                   omitted instead of being exposed partially.
-- SEARCH_PATH: Keep the existing explicit `public, pg_catalog` search path.
-- GRANTS: Keep the existing anon/authenticated/service_role execute grants.

create or replace function public.public_action_map_preparation(p_preparation jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = public, pg_catalog
as $$
with simulated as (
  select case
    when jsonb_typeof(p_preparation -> 'simulatedRouteCoverage') = 'object'
      and p_preparation #>> '{simulatedRouteCoverage,type}' = 'MultiLineString'
      and p_preparation #>> '{simulatedRouteCoverage,geometrySource}' = 'estimated_route'
      and p_preparation #>> '{simulatedRouteCoverage,provenance}' = 'estimated'
      and p_preparation #>> '{simulatedRouteCoverage,status}' = 'hypothetical'
      and case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,speedKmPerHour}') = 'number'
        then (p_preparation #>> '{simulatedRouteCoverage,speedKmPerHour}')::numeric = 3
        else false end
      and p_preparation #>> '{simulatedRouteCoverage,coverageVersion}' in ('simulated-routes-v1', 'simulated-routes-v2')
      and jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,coordinates}') = 'array'
      and case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,coordinates}') = 'array'
        then jsonb_array_length(p_preparation #> '{simulatedRouteCoverage,coordinates}') between 1 and 12
        else false end
      and (p_preparation #>> '{simulatedRouteCoverage,groupCount}') ~ '^[0-9]+$'
      and case when (p_preparation #>> '{simulatedRouteCoverage,groupCount}') ~ '^[0-9]+$'
        then (p_preparation #>> '{simulatedRouteCoverage,groupCount}')::integer between 1 and 12
        else false end
      and case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,coordinates}') = 'array'
        then jsonb_array_length(p_preparation #> '{simulatedRouteCoverage,coordinates}') =
          case when (p_preparation #>> '{simulatedRouteCoverage,groupCount}') ~ '^[0-9]+$'
            then (p_preparation #>> '{simulatedRouteCoverage,groupCount}')::integer
            else 0 end
        else false end
      and case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,durationMinutes}') = 'number'
        then (p_preparation #>> '{simulatedRouteCoverage,durationMinutes}')::numeric > 0
        else false end
      and case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,targetDistanceKm}') = 'number'
        then (p_preparation #>> '{simulatedRouteCoverage,targetDistanceKm}')::numeric >= 0
        else false end
      and (
        select coalesce(bool_and(
          jsonb_typeof(line_value) = 'array'
          and case when jsonb_typeof(line_value) = 'array'
            then jsonb_array_length(line_value) between 2 and 1000
            else false end
          and coalesce((
            select bool_and(
              jsonb_typeof(point_value) = 'array'
              and case when jsonb_typeof(point_value) = 'array'
                then jsonb_array_length(point_value) = 2
                else false end
              and jsonb_typeof(point_value -> 0) = 'number'
              and jsonb_typeof(point_value -> 1) = 'number'
              and case when jsonb_typeof(point_value -> 0) = 'number'
                then (point_value ->> 0)::numeric between -90 and 90
                else false end
              and case when jsonb_typeof(point_value -> 1) = 'number'
                then (point_value ->> 1)::numeric between -180 and 180
                else false end
            )
            from jsonb_array_elements(case when jsonb_typeof(line_value) = 'array'
              then line_value else '[]'::jsonb end) as points(point_value)
          ), false)
        ), false)
        from jsonb_array_elements(case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,coordinates}') = 'array'
          then p_preparation #> '{simulatedRouteCoverage,coordinates}' else '[]'::jsonb end) as lines(line_value)
      )
      and jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,groupParticipantCounts}') = 'array'
      and case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,groupParticipantCounts}') = 'array'
        then jsonb_array_length(p_preparation #> '{simulatedRouteCoverage,groupParticipantCounts}') =
          case when (p_preparation #>> '{simulatedRouteCoverage,groupCount}') ~ '^[0-9]+$'
            then (p_preparation #>> '{simulatedRouteCoverage,groupCount}')::integer
            else 0 end
        else false end
      and (
        select coalesce(bool_and(
          jsonb_typeof(count_value) = 'number'
          and case when jsonb_typeof(count_value) = 'number'
            then (count_value::text)::numeric between
              case when p_preparation #>> '{simulatedRouteCoverage,groupSizePolicy}' = 'explicit_exception' then 1 else 5 end
              and 8
            else false end
        ), false)
        from jsonb_array_elements(case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,groupParticipantCounts}') = 'array'
          then p_preparation #> '{simulatedRouteCoverage,groupParticipantCounts}' else '[]'::jsonb end) as counts(count_value)
      )
      and (
        p_preparation #>> '{simulatedRouteCoverage,coverageVersion}' = 'simulated-routes-v1'
        or (
          p_preparation #>> '{simulatedRouteCoverage,groupSizePolicy}' in ('preferred_5_to_8', 'explicit_exception')
          and jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,individualSimulatedDistancesKm}') = 'array'
          and case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,individualSimulatedDistancesKm}') = 'array'
            then jsonb_array_length(p_preparation #> '{simulatedRouteCoverage,individualSimulatedDistancesKm}') =
              case when (p_preparation #>> '{simulatedRouteCoverage,groupCount}') ~ '^[0-9]+$'
                then (p_preparation #>> '{simulatedRouteCoverage,groupCount}')::integer
                else 0 end
            else false end
          and (
            select coalesce(bool_and(
              jsonb_typeof(distance_value) = 'number'
              and case when jsonb_typeof(distance_value) = 'number'
                then (distance_value::text)::numeric >= 0
                else false end
            ), false)
            from jsonb_array_elements(case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,individualSimulatedDistancesKm}') = 'array'
              then p_preparation #> '{simulatedRouteCoverage,individualSimulatedDistancesKm}' else '[]'::jsonb end) as distances(distance_value)
          )
          and jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,totalSimulatedDistanceKm}') = 'number'
          and case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,totalSimulatedDistanceKm}') = 'number'
            then (p_preparation #>> '{simulatedRouteCoverage,totalSimulatedDistanceKm}')::numeric >= 0
            else false end
        )
      )
    then jsonb_build_object(
      'type', 'MultiLineString',
      'coordinates', (
        select jsonb_agg(
          (
            select jsonb_agg(
              jsonb_build_array(point_value -> 1, point_value -> 0)
              order by point_ordinal
            )
            from jsonb_array_elements(case when jsonb_typeof(line_value) = 'array'
              then line_value else '[]'::jsonb end) with ordinality as points(point_value, point_ordinal)
          )
          order by line_ordinal
        )
        from jsonb_array_elements(case when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,coordinates}') = 'array'
          then p_preparation #> '{simulatedRouteCoverage,coordinates}' else '[]'::jsonb end) with ordinality as lines(line_value, line_ordinal)
      ),
      'groupCount', (p_preparation #>> '{simulatedRouteCoverage,groupCount}')::integer,
      'groupSizePolicy', p_preparation #>> '{simulatedRouteCoverage,groupSizePolicy}',
      'groupParticipantCounts', p_preparation #> '{simulatedRouteCoverage,groupParticipantCounts}',
      'durationMinutes', (p_preparation #> '{simulatedRouteCoverage,durationMinutes}'),
      'targetDistanceKm', (p_preparation #> '{simulatedRouteCoverage,targetDistanceKm}'),
      'individualSimulatedDistancesKm', p_preparation #> '{simulatedRouteCoverage,individualSimulatedDistancesKm}',
      'totalSimulatedDistanceKm', p_preparation #> '{simulatedRouteCoverage,totalSimulatedDistanceKm}',
      'uniqueNetworkDistanceKm', null,
      'observedDistanceKm', null,
      'speedKmPerHour', 3,
      'geometrySource', 'estimated_route',
      'provenance', 'estimated',
      'status', 'hypothetical',
      'coverageVersion', p_preparation #>> '{simulatedRouteCoverage,coverageVersion}'
    )
  end as value
), reference as (
  select case
    when jsonb_typeof(p_preparation -> 'referenceAreaProvenance') = 'object'
      and p_preparation #>> '{referenceAreaProvenance,kind}' = 'official_park'
      and p_preparation #>> '{referenceAreaProvenance,source}' = 'ville_de_paris'
      and p_preparation #>> '{referenceAreaProvenance,license}' = 'ODbL'
      and jsonb_typeof(p_preparation #> '{referenceAreaProvenance,attribution}') = 'string'
      and btrim(p_preparation #>> '{referenceAreaProvenance,attribution}') <> ''
      and jsonb_typeof(p_preparation #> '{referenceAreaProvenance,sourceUrl}') = 'string'
      and btrim(p_preparation #>> '{referenceAreaProvenance,sourceUrl}') <> ''
    then jsonb_build_object(
      'kind', 'official_park',
      'source', 'ville_de_paris',
      'attribution', p_preparation #>> '{referenceAreaProvenance,attribution}',
      'license', 'ODbL',
      'sourceUrl', p_preparation #>> '{referenceAreaProvenance,sourceUrl}'
    )
  end as value
)
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
    ) end,
  'simulatedRouteCoverage', simulated.value,
  'referenceAreaProvenance', reference.value
))
from simulated, reference;
$$;

revoke all privileges on function public.public_action_map_preparation(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.public_action_map_preparation(jsonb)
  to anon, authenticated, service_role;
