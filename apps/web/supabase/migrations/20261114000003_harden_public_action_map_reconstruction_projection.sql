-- PURPOSE: Harden the forward-only public map projection against malformed
--          historical reconstruction and operational-route numbers.
-- CALLER: public.actions_map_feed -> public.public_action_map_preparation(jsonb).
-- AUTHORIZATION_BOUNDARY: Preserve the existing invoker-only public allowlist.
-- IDEMPOTENCY: CREATE OR REPLACE preserves the existing function signature.
-- ATOMICITY: The function is a pure JSON projection; no table is mutated.
-- FAILURE_BEHAVIOR: Invalid objects are omitted without evaluating unsafe casts.
-- SEARCH_PATH: Keep the existing explicit `public, pg_catalog` search path.
-- GRANTS: Keep the existing anon/authenticated/service_role execute grants.

create or replace function public.public_action_map_preparation(p_preparation jsonb)
returns jsonb
language sql
immutable
security invoker
set search_path = public, pg_catalog
as $$
with validated as (
  select
    p_preparation,
    p_preparation -> 'simulatedRouteCoverage' as simulated_input,
    case
      when jsonb_typeof(p_preparation #> '{simulatedRouteCoverage,groupCount}') = 'number'
        and (p_preparation #>> '{simulatedRouteCoverage,groupCount}') ~ '^([1-9]|1[0-2])([.]0+)?$'
      then ((p_preparation #>> '{simulatedRouteCoverage,groupCount}')::numeric)::integer
    end as group_count
), simulated as (
  select case
    when jsonb_typeof(simulated_input) = 'object'
      and simulated_input ->> 'type' = 'MultiLineString'
      and simulated_input ->> 'geometrySource' = 'estimated_route'
      and simulated_input ->> 'provenance' = 'estimated'
      and simulated_input ->> 'status' = 'hypothetical'
      and case when jsonb_typeof(simulated_input -> 'speedKmPerHour') = 'number'
        then (simulated_input ->> 'speedKmPerHour')::numeric = 3
        else false end
      and simulated_input ->> 'coverageVersion' in ('simulated-routes-v1', 'simulated-routes-v2')
      and jsonb_typeof(simulated_input -> 'coordinates') = 'array'
      and case when jsonb_typeof(simulated_input -> 'coordinates') = 'array'
        then jsonb_array_length(simulated_input -> 'coordinates') between 1 and 12
        else false end
      and validated.group_count is not null
      and jsonb_typeof(simulated_input -> 'groupCount') = 'number'
      and case when jsonb_typeof(simulated_input -> 'coordinates') = 'array'
        then jsonb_array_length(simulated_input -> 'coordinates') = validated.group_count
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
        from jsonb_array_elements(case when jsonb_typeof(simulated_input -> 'coordinates') = 'array'
          then simulated_input -> 'coordinates' else '[]'::jsonb end) as lines(line_value)
      )
      and case when jsonb_typeof(simulated_input -> 'durationMinutes') = 'number'
        then (simulated_input ->> 'durationMinutes')::numeric > 0
        else false end
      and case when jsonb_typeof(simulated_input -> 'targetDistanceKm') = 'number'
        then (simulated_input ->> 'targetDistanceKm')::numeric >= 0
        else false end
      and jsonb_typeof(simulated_input -> 'groupParticipantCounts') = 'array'
      and case when jsonb_typeof(simulated_input -> 'groupParticipantCounts') = 'array'
        then jsonb_array_length(simulated_input -> 'groupParticipantCounts') = validated.group_count
        else false end
      and (
        select coalesce(bool_and(
          jsonb_typeof(count_value) = 'number'
          and case
            when simulated_input ->> 'groupSizePolicy' = 'explicit_exception'
            then count_value::text ~ '^([1-8])([.]0+)?$'
            else count_value::text ~ '^([5-8])([.]0+)?$'
          end
        ), false)
        from jsonb_array_elements(case when jsonb_typeof(simulated_input -> 'groupParticipantCounts') = 'array'
          then simulated_input -> 'groupParticipantCounts' else '[]'::jsonb end) as counts(count_value)
      )
      and (
        simulated_input ->> 'coverageVersion' = 'simulated-routes-v1'
        or (
          simulated_input ->> 'groupSizePolicy' in ('preferred_5_to_8', 'explicit_exception')
          and jsonb_typeof(simulated_input -> 'individualSimulatedDistancesKm') = 'array'
          and case when jsonb_typeof(simulated_input -> 'individualSimulatedDistancesKm') = 'array'
            then jsonb_array_length(simulated_input -> 'individualSimulatedDistancesKm') = validated.group_count
            else false end
          and (
            select coalesce(bool_and(
              jsonb_typeof(distance_value) = 'number'
              and case when jsonb_typeof(distance_value) = 'number'
                then (distance_value::text)::numeric >= 0
                else false end
            ), false)
            from jsonb_array_elements(case when jsonb_typeof(simulated_input -> 'individualSimulatedDistancesKm') = 'array'
              then simulated_input -> 'individualSimulatedDistancesKm' else '[]'::jsonb end) as distances(distance_value)
          )
          and jsonb_typeof(simulated_input -> 'totalSimulatedDistanceKm') = 'number'
          and case when jsonb_typeof(simulated_input -> 'totalSimulatedDistanceKm') = 'number'
            then (simulated_input ->> 'totalSimulatedDistanceKm')::numeric >= 0
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
            from jsonb_array_elements(line_value) with ordinality as points(point_value, point_ordinal)
          )
          order by line_ordinal
        )
        from jsonb_array_elements(simulated_input -> 'coordinates') with ordinality as lines(line_value, line_ordinal)
      ),
      'groupCount', validated.group_count,
      'groupSizePolicy', simulated_input ->> 'groupSizePolicy',
      'groupParticipantCounts', simulated_input -> 'groupParticipantCounts',
      'durationMinutes', simulated_input -> 'durationMinutes',
      'targetDistanceKm', simulated_input -> 'targetDistanceKm',
      'individualSimulatedDistancesKm', simulated_input -> 'individualSimulatedDistancesKm',
      'totalSimulatedDistanceKm', simulated_input -> 'totalSimulatedDistanceKm',
      'uniqueNetworkDistanceKm', null,
      'observedDistanceKm', null,
      'speedKmPerHour', 3,
      'geometrySource', 'estimated_route',
      'provenance', 'estimated',
      'status', 'hypothetical',
      'coverageVersion', simulated_input ->> 'coverageVersion'
    )
  end as value
  from validated
), reference as (
  select case
    when jsonb_typeof(input.preparation -> 'referenceAreaProvenance') = 'object'
      and input.preparation #>> '{referenceAreaProvenance,kind}' = 'official_park'
      and input.preparation #>> '{referenceAreaProvenance,source}' = 'ville_de_paris'
      and input.preparation #>> '{referenceAreaProvenance,license}' = 'ODbL'
      and jsonb_typeof(input.preparation #> '{referenceAreaProvenance,attribution}') = 'string'
      and btrim(input.preparation #>> '{referenceAreaProvenance,attribution}') <> ''
      and jsonb_typeof(input.preparation #> '{referenceAreaProvenance,sourceUrl}') = 'string'
      and btrim(input.preparation #>> '{referenceAreaProvenance,sourceUrl}') <> ''
    then jsonb_build_object(
      'kind', 'official_park',
      'source', 'ville_de_paris',
      'attribution', input.preparation #>> '{referenceAreaProvenance,attribution}',
      'license', 'ODbL',
      'sourceUrl', input.preparation #>> '{referenceAreaProvenance,sourceUrl}'
    )
  end as value
  from (select p_preparation as preparation) as input
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
      and case when jsonb_typeof(p_preparation -> 'routeTargetDistanceKm') = 'number'
        then (p_preparation ->> 'routeTargetDistanceKm')::numeric >= 0
        else false end
    then p_preparation -> 'routeTargetDistanceKm' end,
  'routeNetworkDistanceKm', case
    when jsonb_typeof(p_preparation -> 'routeNetworkDistanceKm') = 'number'
      and case when jsonb_typeof(p_preparation -> 'routeNetworkDistanceKm') = 'number'
        then (p_preparation ->> 'routeNetworkDistanceKm')::numeric >= 0
        else false end
    then p_preparation -> 'routeNetworkDistanceKm' end,
  'routeObservedDistanceKm', case
    when jsonb_typeof(p_preparation -> 'routeObservedDistanceKm') = 'number'
      and case when jsonb_typeof(p_preparation -> 'routeObservedDistanceKm') = 'number'
        then (p_preparation ->> 'routeObservedDistanceKm')::numeric >= 0
        else false end
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
          'groupIndex', parsed.group_index,
          'coordinates', route_value #> '{geometry,coordinates}'
        ) order by route_ordinal)
        from jsonb_array_elements(p_preparation #> '{operationalRoute,routes}')
          with ordinality as routes(route_value, route_ordinal)
        cross join lateral (
          select case
            when jsonb_typeof(route_value -> 'groupIndex') = 'number'
              and (route_value ->> 'groupIndex') ~ '^([1-9]|1[0-2])([.]0+)?$'
            then ((route_value ->> 'groupIndex')::numeric)::integer
          end as group_index
        ) as parsed
        where jsonb_typeof(route_value #> '{geometry,coordinates}') = 'array'
          and case when jsonb_typeof(route_value #> '{geometry,coordinates}') = 'array'
            then jsonb_array_length(route_value #> '{geometry,coordinates}') >= 2
            else false end
          and coalesce(route_value ->> 'routeId', '') <> ''
          and parsed.group_index is not null
          and (
            select coalesce(bool_and(
              jsonb_typeof(point_value) = 'array'
              and case when jsonb_typeof(point_value) = 'array'
                then jsonb_array_length(point_value) >= 2
                else false end
              and jsonb_typeof(point_value -> 0) = 'number'
              and jsonb_typeof(point_value -> 1) = 'number'
              and case when jsonb_typeof(point_value -> 0) = 'number'
                then (point_value ->> 0)::numeric between -90 and 90
                else false end
              and case when jsonb_typeof(point_value -> 1) = 'number'
                then (point_value ->> 1)::numeric between -180 and 180
                else false end
            ), false)
            from jsonb_array_elements(case when jsonb_typeof(route_value #> '{geometry,coordinates}') = 'array'
              then route_value #> '{geometry,coordinates}' else '[]'::jsonb end) as points(point_value)
          )
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
