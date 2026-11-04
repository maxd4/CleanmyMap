-- PURPOSE: expose a bounded, stable page of the active pedestrian risk projection.
-- CALLER: the server-side route reader, service_role only.
-- AUTHORIZATION_BOUNDARY: browser roles receive neither the function nor its rows.
-- IDEMPOTENCY: read-only; the active projection and graph are never mutated.
-- ATOMICITY: one snapshot is selected for each call; the caller verifies its
-- identity across pages before accepting the assembled projection.
-- FAILURE_BEHAVIOR: callers must reject an incomplete page, a changed version,
-- or a projection without an exact active graph match.
-- SEARCH_PATH: pinned explicitly for the SQL and PostGIS calls.
-- GRANTS: service_role only, matching the existing projection RPC.

create or replace function public.get_active_pedestrian_risk_projection_page(
  p_south double precision,
  p_west double precision,
  p_north double precision,
  p_east double precision,
  p_limit integer,
  p_offset integer
)
returns table (
  projection_version_id uuid,
  projection_key text,
  schema_version text,
  policy_version text,
  network_version_id uuid,
  generated_at timestamptz,
  source_versions jsonb,
  projection_segment_id text,
  edge_key text,
  osm_way_id bigint,
  segment_index integer,
  direction text,
  from_node_id bigint,
  to_node_id bigint,
  zone_id text,
  intersected_zone_ids text[],
  length_m double precision,
  intersection_length_m double precision,
  effective_resolution text,
  risk_status text,
  waste_risk double precision,
  cigarette_butt_risk double precision,
  mixed_risk double precision,
  geometry_geojson jsonb,
  midpoint_geojson jsonb,
  waste_confidence jsonb,
  cigarette_butt_confidence jsonb,
  waste_factors jsonb,
  cigarette_butt_factors jsonb,
  available_factors jsonb,
  missing_factors jsonb,
  serviceability jsonb,
  provenance jsonb,
  notes jsonb
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public, extensions
as $$
begin
  if p_limit < 1 or p_limit > 999 or p_offset < 0 then
    raise exception 'invalid pedestrian projection page bounds';
  end if;

  return query
    select
      version.id,
      version.projection_key,
      version.schema_version,
      version.policy_version,
      network.id,
      version.generated_at,
      version.source_versions,
      segment.projection_segment_id,
      segment.edge_key,
      segment.osm_way_id,
      segment.segment_index,
      segment.direction,
      segment.from_osm_node_id,
      segment.to_osm_node_id,
      segment.zone_id,
      segment.intersected_zone_ids,
      segment.length_m,
      segment.intersection_length_m,
      segment.effective_resolution,
      segment.risk_status,
      segment.waste_risk,
      segment.cigarette_butt_risk,
      segment.mixed_risk,
      extensions.st_asgeojson(segment.geom)::jsonb,
      extensions.st_asgeojson(segment.midpoint)::jsonb,
      segment.waste_confidence,
      segment.cigarette_butt_confidence,
      segment.waste_factors,
      segment.cigarette_butt_factors,
      segment.available_factors,
      segment.missing_factors,
      segment.serviceability,
      segment.provenance,
      segment.notes
    from public.pedestrian_risk_projection_versions as version
    left join public.pedestrian_network_versions as network
      on network.status = 'active'
      and network.network_key = version.network_key
      and network.importer_version = version.network_importer_version
      and network.source_sha256 = version.network_source_sha256
      and network.source_retrieved_at = version.network_source_retrieved_at
    join public.pedestrian_segment_risk_projections as segment
      on segment.projection_version_id = version.id
    where version.status = 'active'
      and extensions.st_intersects(
        segment.geom,
        extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
      )
    order by segment.edge_key, segment.projection_segment_id
    limit p_limit + 1
    offset p_offset;
end;
$$;

revoke all on function public.get_active_pedestrian_risk_projection_page(
  double precision, double precision, double precision, double precision, integer, integer
) from public, anon, authenticated;
grant execute on function public.get_active_pedestrian_risk_projection_page(
  double precision, double precision, double precision, double precision, integer, integer
) to service_role;
