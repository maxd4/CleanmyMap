-- Ephemeral PostgreSQL contract for the public reconstruction projection.
-- Never execute this fixture against the linked or production project.

begin;
select plan(17);

select ok(
  to_regprocedure('public.public_action_map_preparation(jsonb)') is not null,
  'public map preparation projection exists after replay'
);
select ok(
  has_function_privilege('anon', 'public.public_action_map_preparation(jsonb)', 'EXECUTE'),
  'anon retains the public projection execute grant'
);

select is(
  public.public_action_map_preparation($json$
    {
      "simulatedRouteCoverage": {
        "type": "MultiLineString",
        "coordinates": [[[48.8567, 2.3501], [48.8578, 2.3519]], [[48.8461, 2.3602], [48.8473, 2.3618]]],
        "groupCount": 2,
        "groupSizePolicy": "preferred_5_to_8",
        "groupParticipantCounts": [5, 5],
        "durationMinutes": 90,
        "targetDistanceKm": 4.5,
        "individualSimulatedDistancesKm": [4.4, 4.6],
        "totalSimulatedDistanceKm": 9,
        "uniqueNetworkDistanceKm": null,
        "observedDistanceKm": null,
        "speedKmPerHour": 3,
        "geometrySource": "estimated_route",
        "provenance": "estimated",
        "status": "hypothetical",
        "coverageVersion": "simulated-routes-v2"
      },
      "referenceAreaProvenance": {
        "kind": "official_park",
        "source": "ville_de_paris",
        "attribution": "Ville de Paris",
        "license": "ODbL",
        "sourceUrl": "https://example.invalid/belleville"
      },
      "mission_id": "private",
      "contributor_clerk_id": "private"
    }
  $json$::jsonb) #> '{simulatedRouteCoverage,coordinates,0,0}',
  '[2.3501, 48.8567]'::jsonb,
  'simulation is emitted as bounded public GeoJSON coordinates'
);
select is(
  (public.public_action_map_preparation($json${"simulatedRouteCoverage":{"type":"MultiLineString","coordinates":[[[48.8,2.3],[48.81,2.31]]],"groupCount":1,"groupParticipantCounts":[6],"durationMinutes":60,"targetDistanceKm":3,"speedKmPerHour":3,"geometrySource":"estimated_route","provenance":"estimated","status":"hypothetical","coverageVersion":"simulated-routes-v1"}}$json$::jsonb) #>> '{simulatedRouteCoverage,coverageVersion}',
  'simulated-routes-v1',
  'v1 reconstructions remain publicly compatible'
);
select is(
  public.public_action_map_preparation($json${"referenceAreaProvenance":{"kind":"official_park","source":"ville_de_paris","attribution":"","license":"ODbL","sourceUrl":"https://example.invalid"}}$json$::jsonb),
  '{}'::jsonb,
  'an unproven official reference is omitted'
);
select ok(
  not (public.public_action_map_preparation($json${"mission_id":"private","technical_provenance":"private"}$json$::jsonb) ? 'mission_id'),
  'private preparation fields are not projected'
);
select is(
  (public.public_action_map_preparation($json${"simulatedRouteCoverage":{"type":"MultiLineString","coordinates":[[[48.8,2.3]]],"groupCount":1,"groupParticipantCounts":[6],"durationMinutes":60,"targetDistanceKm":3,"speedKmPerHour":3,"geometrySource":"estimated_route","provenance":"estimated","status":"hypothetical","coverageVersion":"simulated-routes-v2"}}$json$::jsonb),
  '{}'::jsonb,
  'an incomplete v2 reconstruction is omitted'
);
select is(
  (public.public_action_map_preparation($json${"simulatedRouteCoverage":{"type":"MultiLineString","coordinates":[[[95,2.3],[48.81,2.31]]],"groupCount":1,"groupParticipantCounts":[6],"durationMinutes":60,"targetDistanceKm":3,"speedKmPerHour":3,"geometrySource":"estimated_route","provenance":"estimated","status":"hypothetical","coverageVersion":"simulated-routes-v1"}}$json$::jsonb),
  '{}'::jsonb,
  'out-of-range coordinates are omitted'
);
select ok(
  (public.public_action_map_preparation($json${"referenceAreaProvenance":{"kind":"official_park","source":"ville_de_paris","attribution":"Ville de Paris","license":"ODbL","sourceUrl":"https://example.invalid"}}$json$::jsonb) ? 'referenceAreaProvenance',
  'verified official reference provenance survives the public projection'
);
select is(
  (public.public_action_map_preparation($json${"referenceAreaProvenance":{"kind":"official_park","source":"other","attribution":"Ville de Paris","license":"ODbL","sourceUrl":"https://example.invalid"}}$json$::jsonb),
  '{}'::jsonb,
  'a label or attribution cannot establish the official source'
);
select ok(
  (public.public_action_map_preparation($json${"simulatedRouteCoverage":{"type":"MultiLineString","coordinates":[[[48.8,2.3],[48.81,2.31]]],"groupCount":1,"groupSizePolicy":"explicit_exception","groupParticipantCounts":[4],"durationMinutes":90,"targetDistanceKm":4.5,"individualSimulatedDistancesKm":[4.5],"totalSimulatedDistanceKm":4.5,"speedKmPerHour":3,"geometrySource":"estimated_route","provenance":"estimated","status":"hypothetical","coverageVersion":"simulated-routes-v2"}}$json$::jsonb) ? 'simulatedRouteCoverage',
  'explicit exception remains accepted for a bounded v2 reconstruction'
);
select lives_ok(
  $$select public.public_action_map_preparation($json${"simulatedRouteCoverage":{"type":"MultiLineString","coordinates":[[[48.8,2.3],[48.81,2.31]]],"groupCount":999999999999999999999999999999999999,"groupParticipantCounts":[6],"durationMinutes":60,"targetDistanceKm":3,"speedKmPerHour":3,"geometrySource":"estimated_route","provenance":"estimated","status":"hypothetical","coverageVersion":"simulated-routes-v1"}}$json$::jsonb)$$,
  'an oversized group count does not raise integer overflow'
);
select is(
  public.public_action_map_preparation($json${"simulatedRouteCoverage":{"type":"MultiLineString","coordinates":[[[48.8,2.3],[48.81,2.31]]],"groupCount":999999999999999999999999999999999999,"groupParticipantCounts":[6],"durationMinutes":60,"targetDistanceKm":3,"speedKmPerHour":3,"geometrySource":"estimated_route","provenance":"estimated","status":"hypothetical","coverageVersion":"simulated-routes-v1"}}$json$::jsonb),
  '{}'::jsonb,
  'an oversized group count is omitted'
);
select is(
  public.public_action_map_preparation($json${"simulatedRouteCoverage":{"type":"MultiLineString","coordinates":[[[48.8,2.3],[48.81,2.31]]],"groupCount": 5.5,"groupParticipantCounts":[6],"durationMinutes":60,"targetDistanceKm":3,"speedKmPerHour":3,"geometrySource":"estimated_route","provenance":"estimated","status":"hypothetical","coverageVersion":"simulated-routes-v1"}}$json$::jsonb),
  '{}'::jsonb,
  'a fractional group count is omitted'
);
select is(
  public.public_action_map_preparation($json${"simulatedRouteCoverage":{"type":"MultiLineString","coordinates":[[[48.8,2.3],[48.81,2.31]]],"groupCount":1,"groupParticipantCounts":[5.5],"durationMinutes":60,"targetDistanceKm":3,"speedKmPerHour":3,"geometrySource":"estimated_route","provenance":"estimated","status":"hypothetical","coverageVersion":"simulated-routes-v1"}}$json$::jsonb),
  '{}'::jsonb,
  'a fractional participant count is omitted'
);
select is(
  public.public_action_map_preparation($json${"operationalRoute":{"routes":[{"routeId":"overflow-group","groupIndex":999999999999999999999999999999999999,"geometry":{"coordinates":[[48.8,2.3],[48.81,2.31]]}}]}}$json$::jsonb) #> '{operationalRoute,routes}',
  '[]'::jsonb,
  'an oversized operational group index is omitted without overflow'
);
select lives_ok(
  $$select public.public_action_map_preparation($json${"operationalRoute":{"routes":[{"routeId":"malformed","groupIndex":1,"geometry":{"coordinates":[[95,2.3],[48.81,2.31]]}}]}}$json$::jsonb)$$,
  'malformed operational coordinates do not interrupt the projection'
);
select * from finish();
rollback;
