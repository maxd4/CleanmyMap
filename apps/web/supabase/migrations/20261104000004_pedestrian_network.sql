-- PURPOSE: store a versioned, server-owned pedestrian graph imported from OSM.
-- CALLER: the bounded import script and the route recommendation server path.
-- AUTHORIZATION_BOUNDARY: only service_role can write or read the graph and its
-- diagnostics; browser roles receive neither table nor RPC access.
-- IDEMPOTENCY: version identity is network_key + importer_version + source_sha256.
-- FAILURE_BEHAVIOR: unknown or forbidden OSM access is kept in diagnostics and
-- never becomes an accepted edge.
-- SEARCH_PATH: explicit PostGIS schema and a pinned function search_path.

create extension if not exists postgis with schema extensions;

create table if not exists public.pedestrian_network_versions (
  id uuid primary key default gen_random_uuid(),
  network_key text not null,
  importer_version text not null,
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_retrieved_at timestamptz not null,
  source_endpoint text not null,
  source_tiles jsonb not null default '[]'::jsonb,
  bounds extensions.geometry(Polygon, 4326) not null,
  status text not null default 'active' check (status in ('active', 'superseded')),
  counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (network_key, importer_version, source_sha256)
);

create unique index if not exists pedestrian_network_versions_one_active_idx
  on public.pedestrian_network_versions (network_key)
  where status = 'active';

create table if not exists public.pedestrian_network_nodes (
  network_version_id uuid not null references public.pedestrian_network_versions(id) on delete cascade,
  osm_node_id bigint not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  component_id text,
  geom extensions.geometry(Point, 4326) not null,
  primary key (network_version_id, osm_node_id)
);

create table if not exists public.pedestrian_network_edges (
  network_version_id uuid not null references public.pedestrian_network_versions(id) on delete cascade,
  edge_key text not null,
  osm_way_id bigint not null,
  segment_index integer not null check (segment_index >= 0),
  direction text not null check (direction in ('forward', 'reverse')),
  from_osm_node_id bigint not null,
  to_osm_node_id bigint not null,
  highway text not null,
  name text,
  pedestrian_access_status text not null check (pedestrian_access_status = 'allowed'),
  length_m double precision not null check (length_m > 0),
  geom extensions.geometry(LineString, 4326) not null,
  tags jsonb not null default '{}'::jsonb,
  primary key (network_version_id, edge_key),
  unique (network_version_id, osm_way_id, segment_index, direction),
  foreign key (network_version_id, from_osm_node_id)
    references public.pedestrian_network_nodes(network_version_id, osm_node_id),
  foreign key (network_version_id, to_osm_node_id)
    references public.pedestrian_network_nodes(network_version_id, osm_node_id)
);

create table if not exists public.pedestrian_network_connections (
  network_version_id uuid not null references public.pedestrian_network_versions(id) on delete cascade,
  from_osm_node_id bigint not null,
  to_osm_node_id bigint not null,
  edge_key text not null,
  primary key (network_version_id, from_osm_node_id, to_osm_node_id, edge_key),
  foreign key (network_version_id, edge_key)
    references public.pedestrian_network_edges(network_version_id, edge_key),
  foreign key (network_version_id, from_osm_node_id)
    references public.pedestrian_network_nodes(network_version_id, osm_node_id),
  foreign key (network_version_id, to_osm_node_id)
    references public.pedestrian_network_nodes(network_version_id, osm_node_id)
);

create table if not exists public.pedestrian_network_diagnostics (
  id uuid primary key default gen_random_uuid(),
  network_version_id uuid not null references public.pedestrian_network_versions(id) on delete cascade,
  entity_type text not null check (entity_type in ('way', 'segment', 'component', 'source')),
  osm_way_id bigint,
  segment_index integer,
  reason_code text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pedestrian_network_versions_bounds_gist_idx
  on public.pedestrian_network_versions using gist (bounds);
create index if not exists pedestrian_network_nodes_geom_gist_idx
  on public.pedestrian_network_nodes using gist (geom);
create index if not exists pedestrian_network_nodes_version_component_idx
  on public.pedestrian_network_nodes (network_version_id, component_id);
create index if not exists pedestrian_network_edges_geom_gist_idx
  on public.pedestrian_network_edges using gist (geom);
create index if not exists pedestrian_network_edges_version_from_idx
  on public.pedestrian_network_edges (network_version_id, from_osm_node_id);
create index if not exists pedestrian_network_edges_version_to_idx
  on public.pedestrian_network_edges (network_version_id, to_osm_node_id);
create index if not exists pedestrian_network_diagnostics_version_reason_idx
  on public.pedestrian_network_diagnostics (network_version_id, reason_code);

alter table public.pedestrian_network_versions enable row level security;
alter table public.pedestrian_network_nodes enable row level security;
alter table public.pedestrian_network_edges enable row level security;
alter table public.pedestrian_network_connections enable row level security;
alter table public.pedestrian_network_diagnostics enable row level security;

revoke all on table public.pedestrian_network_versions,
  public.pedestrian_network_nodes,
  public.pedestrian_network_edges,
  public.pedestrian_network_connections,
  public.pedestrian_network_diagnostics
  from public, anon, authenticated;
grant select, insert, update, delete on table public.pedestrian_network_versions,
  public.pedestrian_network_nodes,
  public.pedestrian_network_edges,
  public.pedestrian_network_connections,
  public.pedestrian_network_diagnostics
  to service_role;

drop policy if exists pedestrian_network_versions_service_role on public.pedestrian_network_versions;
create policy pedestrian_network_versions_service_role
  on public.pedestrian_network_versions for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists pedestrian_network_nodes_service_role on public.pedestrian_network_nodes;
create policy pedestrian_network_nodes_service_role
  on public.pedestrian_network_nodes for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists pedestrian_network_edges_service_role on public.pedestrian_network_edges;
create policy pedestrian_network_edges_service_role
  on public.pedestrian_network_edges for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists pedestrian_network_connections_service_role on public.pedestrian_network_connections;
create policy pedestrian_network_connections_service_role
  on public.pedestrian_network_connections for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists pedestrian_network_diagnostics_service_role on public.pedestrian_network_diagnostics;
create policy pedestrian_network_diagnostics_service_role
  on public.pedestrian_network_diagnostics for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create or replace function public.get_active_pedestrian_network(
  p_south double precision,
  p_west double precision,
  p_north double precision,
  p_east double precision
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
language sql
stable
security invoker
set search_path = pg_catalog, public, extensions
as $$
  select
    version.id,
    version.network_key,
    version.source_retrieved_at,
    extensions.st_asgeojson(version.bounds)::jsonb,
    edge.edge_key,
    edge.from_osm_node_id,
    edge.to_osm_node_id,
    edge.length_m,
    edge.name,
    edge.highway,
    edge.osm_way_id,
    edge.segment_index,
    edge.direction,
    edge.pedestrian_access_status,
    extensions.st_asgeojson(edge.geom)::jsonb,
    edge.tags
  from public.pedestrian_network_versions as version
  join public.pedestrian_network_edges as edge
    on edge.network_version_id = version.id
  where version.status = 'active'
    and extensions.st_intersects(
      edge.geom,
      extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    )
  order by edge.edge_key;
$$;

revoke all on function public.get_active_pedestrian_network(double precision, double precision, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.get_active_pedestrian_network(double precision, double precision, double precision, double precision)
  to service_role;
