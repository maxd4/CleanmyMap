-- Ephemeral PostgreSQL contract for the paginated pedestrian projection reader.
-- Never execute this fixture against the linked or production project.

begin;
select plan(14);

set local role postgres;
select ok(to_regprocedure('public.get_active_pedestrian_risk_projection_page(double precision,double precision,double precision,double precision,integer,integer)') is not null, 'paged projection RPC exists after replay');
select ok(has_function_privilege('service_role', 'public.get_active_pedestrian_risk_projection_page(double precision,double precision,double precision,double precision,integer,integer)', 'EXECUTE'), 'service_role can read paged projections');
select ok(not has_function_privilege('authenticated', 'public.get_active_pedestrian_risk_projection_page(double precision,double precision,double precision,double precision,integer,integer)', 'EXECUTE'), 'authenticated cannot read paged projections');

insert into public.pedestrian_network_versions (
  id, network_key, importer_version, source_sha256, source_retrieved_at,
  source_endpoint, bounds, status
) values (
  '11111111-1111-4111-8111-111111111111',
  'paris-pantheon-jardin-des-plantes', 'pedestrian-network-v2', repeat('a', 64),
  '2026-11-04T08:00:00Z', 'https://example.invalid/pilot',
  extensions.st_geomfromtext('POLYGON((2.3 48.8,2.5 48.8,2.5 48.9,2.3 48.9,2.3 48.8))', 4326),
  'active'
);
insert into public.pedestrian_risk_projection_versions (
  id, projection_key, schema_version, policy_version, network_key,
  network_importer_version, network_source_sha256, network_source_retrieved_at,
  pressure_snapshot_id, pressure_schema_version, pressure_generated_at,
  pressure_refreshed_at, risk_model_version, source_versions, generated_at, status
) values (
  '22222222-2222-4222-8222-222222222222',
  'paris-pantheon-jardin-des-plantes', 'paris-pedestrian-risk-projection-v1',
  'segment-zonal-neutral-v1', 'paris-pantheon-jardin-des-plantes',
  'pedestrian-network-v2', repeat('a', 64), '2026-11-04T08:00:00Z',
  'pressure-contract', 'paris-pressure-v1', '2026-11-04T07:00:00Z',
  '2026-11-04T07:30:00Z', 'paris-pressure-risk-v3-urban-morphology',
  '{"networkKey":"paris-pantheon-jardin-des-plantes"}'::jsonb,
  '2026-11-04T09:00:00Z', 'active'
);
insert into public.pedestrian_segment_risk_projections (
  projection_version_id, projection_segment_id, edge_key, osm_way_id,
  segment_index, direction, from_osm_node_id, to_osm_node_id, zone_id,
  intersected_zone_ids, length_m, intersection_length_m, effective_resolution,
  risk_status, waste_risk, cigarette_butt_risk, mixed_risk, geom, midpoint,
  available_factors, missing_factors, source_versions, provenance, notes
)
select
  '22222222-2222-4222-8222-222222222222',
  'segment-' || series,
  'edge-' || lpad(series::text, 5, '0'),
  series, 0, 'forward', series, series + 1,
  case when series = 1000 then null else 'iris-1' end,
  case when series = 1000 then '{}'::text[] else array['iris-1'] end,
  12, 12, case when series = 1000 then 'unknown' else 'iris' end,
  case when series = 1000 then 'unavailable' else 'predicted' end,
  case when series = 1000 then null else 40 end,
  case when series = 1000 then null else 60 end,
  case when series = 1000 then null else 50 end,
  extensions.st_makeline(
    extensions.st_makepoint(2.35 + series * 0.00001, 48.84),
    extensions.st_makepoint(2.350005 + series * 0.00001, 48.84)
  ),
  extensions.st_makepoint(2.3500025 + series * 0.00001, 48.84),
  '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb
from generate_series(0, 1000) as series;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(
  (select count(*)::integer from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, 0)),
  901,
  'first page includes one bounded continuation row'
);
select is(
  (select count(*)::integer from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, 900)),
  101,
  'second page returns the remaining rows'
);
select is(
  (select count(*)::integer from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, 0) where projection_version_id = '22222222-2222-4222-8222-222222222222'),
  901,
  'page rows keep one projection identity'
);
select is(
  (select count(*)::integer from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, 0) where network_version_id = '11111111-1111-4111-8111-111111111111'),
  901,
  'page rows expose the exact matching graph version'
);
select is(
  (select count(distinct projection_version_id)::integer from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, 900)),
  1,
  'continuation page keeps the same projection version'
);
select is(
  (select count(distinct network_version_id)::integer from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, 900)),
  1,
  'continuation page keeps the same graph version'
);
select is(
  (select min(generated_at) from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, 0)),
  '2026-11-04T09:00:00Z'::timestamptz,
  'page rows expose persisted projection generation time'
);
select is(
  (select count(*)::integer from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, 900) where risk_status = 'unavailable' and waste_risk is null and cigarette_butt_risk is null and mixed_risk is null),
  1,
  'unavailable segments preserve null independent scores'
);
select is(
  (select projection_segment_id from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, 900) order by edge_key, projection_segment_id limit 1),
  'segment-900',
  'pagination order is stable and resumes at the requested offset'
);
select throws_ok(
  $$select * from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 1000, 0)$$,
  'P0001',
  'invalid pedestrian projection page bounds',
  'page size above the API-safe bound is rejected'
);
select throws_ok(
  $$select * from public.get_active_pedestrian_risk_projection_page(48.8, 2.3, 48.9, 2.5, 900, -1)$$,
  'P0001',
  'invalid pedestrian projection page bounds',
  'negative page offset is rejected'
);

select * from finish();
rollback;
