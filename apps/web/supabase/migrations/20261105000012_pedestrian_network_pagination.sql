-- PURPOSE: expose a bounded, stable page of the active pedestrian network.
-- CALLER: the server-side route reader, service_role only.
-- FAILURE_BEHAVIOR: callers reject incomplete pages or a network identity that
-- changes while a snapshot is being assembled.

create or replace function public.get_active_pedestrian_network_page(
  p_south double precision,
  p_west double precision,
  p_north double precision,
  p_east double precision,
  p_limit integer,
  p_offset integer
)
returns table (
  network_version_id uuid,
  network_key text,
  source_retrieved_at timestamptz,
  bounds jsonb,
  edge_key text,
  from_node_id bigint,
  to_node_id bigint,
  length_m double precision,
  name text,
  highway text,
  osm_way_id bigint,
  segment_index integer,
  direction text,
  pedestrian_access_status text,
  geometry_geojson jsonb,
  tags jsonb
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public, extensions
as $$
begin
  if p_limit < 1 or p_limit > 999 or p_offset < 0 then
    raise exception 'invalid pedestrian network page bounds';
  end if;
  return query
    select version.id, version.network_key, version.source_retrieved_at,
      extensions.st_asgeojson(version.bounds)::jsonb, edge.edge_key,
      edge.from_osm_node_id, edge.to_osm_node_id, edge.length_m, edge.name,
      edge.highway, edge.osm_way_id, edge.segment_index, edge.direction,
      edge.pedestrian_access_status, extensions.st_asgeojson(edge.geom)::jsonb,
      edge.tags
    from public.pedestrian_network_versions as version
    join public.pedestrian_network_edges as edge on edge.network_version_id = version.id
    where version.status = 'active'
      and extensions.st_intersects(edge.geom,
        extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326))
    order by edge.edge_key
    limit p_limit + 1 offset p_offset;
end;
$$;

revoke all on function public.get_active_pedestrian_network_page(
  double precision, double precision, double precision, double precision, integer, integer
) from public, anon, authenticated;
grant execute on function public.get_active_pedestrian_network_page(
  double precision, double precision, double precision, double precision, integer, integer
) to service_role;
