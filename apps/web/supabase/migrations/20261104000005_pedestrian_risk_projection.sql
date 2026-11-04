-- PURPOSE: materialize theoretical waste and cigarette-butt risk on accepted
-- pedestrian segments, from the canonical IRIS pressure and municipal
-- serviceability snapshots.
-- CALLER: the offline projection builder through the publish RPC; the route
-- generator reads only the active projection RPC.
-- AUTHORIZATION_BOUNDARY: service_role only. Browser roles receive neither
-- tables nor projection RPC access.
-- IDEMPOTENCY: projection identity is the projection key plus all source and
-- policy versions; a transaction lock serializes publication per key.
-- ATOMICITY: the RPC inserts/replaces rows and flips the active snapshot in one
-- transaction. Any validation or insert failure rolls the publication back.
-- FAILURE_BEHAVIOR: missing or ambiguous IRIS segments are stored as
-- unavailable with null scores; they are never converted to zero.
-- SEARCH_PATH: all spatial calls use the extensions schema explicitly and the
-- SECURITY DEFINER function pins its search_path.

create extension if not exists postgis with schema extensions;

create table if not exists public.pedestrian_risk_projection_versions (
  id uuid primary key default gen_random_uuid(),
  projection_key text not null,
  schema_version text not null,
  policy_version text not null,
  network_key text not null,
  network_importer_version text not null,
  network_source_sha256 text not null check (network_source_sha256 ~ '^[0-9a-f]{64}$'),
  network_source_retrieved_at timestamptz not null,
  pressure_snapshot_id text not null,
  pressure_schema_version text not null,
  pressure_generated_at timestamptz not null,
  pressure_refreshed_at timestamptz not null,
  risk_model_version text not null,
  serviceability_snapshot_id text,
  serviceability_schema_version text,
  serviceability_model_version text,
  serviceability_generated_at timestamptz,
  serviceability_refreshed_at timestamptz,
  serviceability_snapshot_identity text generated always as (coalesce(serviceability_snapshot_id, '')) stored,
  source_versions jsonb not null default '{}'::jsonb,
  counts jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null,
  status text not null default 'superseded' check (status in ('active', 'superseded')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (
    projection_key,
    schema_version,
    policy_version,
    network_source_sha256,
    pressure_snapshot_id,
    serviceability_snapshot_identity
  )
);

create unique index if not exists pedestrian_risk_projection_versions_one_active_idx
  on public.pedestrian_risk_projection_versions (projection_key)
  where status = 'active';

create index if not exists pedestrian_risk_projection_versions_sources_idx
  on public.pedestrian_risk_projection_versions (
    projection_key,
    pressure_snapshot_id,
    serviceability_snapshot_id
  );

create table if not exists public.pedestrian_segment_risk_projections (
  projection_version_id uuid not null references public.pedestrian_risk_projection_versions(id) on delete cascade,
  projection_segment_id text not null,
  edge_key text not null,
  osm_way_id bigint not null,
  segment_index integer not null check (segment_index >= 0),
  direction text not null check (direction in ('forward', 'reverse')),
  from_osm_node_id bigint not null,
  to_osm_node_id bigint not null,
  zone_id text,
  intersected_zone_ids text[] not null default '{}',
  length_m double precision not null check (length_m > 0),
  intersection_length_m double precision not null check (intersection_length_m > 0),
  effective_resolution text not null check (effective_resolution in ('iris', 'unknown')),
  risk_status text not null check (risk_status in ('predicted', 'unavailable')),
  waste_risk double precision check (waste_risk is null or waste_risk between 0 and 100),
  cigarette_butt_risk double precision check (cigarette_butt_risk is null or cigarette_butt_risk between 0 and 100),
  mixed_risk double precision check (mixed_risk is null or mixed_risk between 0 and 100),
  geom extensions.geometry(LineString, 4326) not null,
  midpoint extensions.geometry(Point, 4326) not null,
  waste_confidence jsonb,
  cigarette_butt_confidence jsonb,
  waste_factors jsonb,
  cigarette_butt_factors jsonb,
  available_factors jsonb not null default '{}'::jsonb,
  missing_factors jsonb not null default '{}'::jsonb,
  serviceability jsonb,
  source_versions jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  primary key (projection_version_id, projection_segment_id),
  unique (projection_version_id, edge_key, projection_segment_id),
  check ((risk_status = 'predicted') = (waste_risk is not null and cigarette_butt_risk is not null and mixed_risk is not null)),
  check (zone_id is not null or risk_status = 'unavailable')
);

create index if not exists pedestrian_segment_risk_projection_geom_gist_idx
  on public.pedestrian_segment_risk_projections using gist (geom);
create index if not exists pedestrian_segment_risk_projection_midpoint_gist_idx
  on public.pedestrian_segment_risk_projections using gist (midpoint);
create index if not exists pedestrian_segment_risk_projection_version_zone_idx
  on public.pedestrian_segment_risk_projections (projection_version_id, zone_id, risk_status);
create index if not exists pedestrian_segment_risk_projection_version_edge_idx
  on public.pedestrian_segment_risk_projections (projection_version_id, edge_key);

alter table public.pedestrian_risk_projection_versions enable row level security;
alter table public.pedestrian_segment_risk_projections enable row level security;

revoke all on table public.pedestrian_risk_projection_versions,
  public.pedestrian_segment_risk_projections
  from public, anon, authenticated;
grant select, insert, update, delete on table public.pedestrian_risk_projection_versions,
  public.pedestrian_segment_risk_projections
  to service_role;

drop policy if exists pedestrian_risk_projection_versions_service_role
  on public.pedestrian_risk_projection_versions;
create policy pedestrian_risk_projection_versions_service_role
  on public.pedestrian_risk_projection_versions for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists pedestrian_segment_risk_projections_service_role
  on public.pedestrian_segment_risk_projections;
create policy pedestrian_segment_risk_projections_service_role
  on public.pedestrian_segment_risk_projections for all to service_role
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create or replace function public.publish_pedestrian_risk_projection(
  p_projection jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_projection_id uuid;
  v_projection_key text := p_projection->>'projectionKey';
  v_source jsonb := p_projection->'sourceVersions';
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if v_projection_key is null or p_projection->>'schemaVersion' <> 'paris-pedestrian-risk-projection-v1' then
    raise exception 'invalid pedestrian risk projection identity';
  end if;
  if v_source->>'riskModelVersion' <> 'paris-pressure-risk-v3-urban-morphology' then
    raise exception 'unsupported risk model version';
  end if;
  if jsonb_typeof(p_projection->'segments') <> 'array' then
    raise exception 'segments must be an array';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_projection_key, 0));

  update public.pedestrian_risk_projection_versions
  set status = 'superseded'
  where projection_key = v_projection_key and status = 'active';

  insert into public.pedestrian_risk_projection_versions (
    projection_key, schema_version, policy_version, network_key,
    network_importer_version, network_source_sha256,
    network_source_retrieved_at, pressure_snapshot_id, pressure_schema_version,
    pressure_generated_at, pressure_refreshed_at, risk_model_version,
    serviceability_snapshot_id, serviceability_schema_version,
    serviceability_model_version, serviceability_generated_at,
    serviceability_refreshed_at, source_versions, counts, provenance,
    generated_at, status
  ) values (
    v_projection_key,
    p_projection->>'schemaVersion',
    p_projection->>'policyVersion',
    v_source->>'networkKey',
    v_source->>'networkImporterVersion',
    v_source->>'networkSourceSha256',
    (v_source->>'networkSourceRetrievedAt')::timestamptz,
    v_source->>'pressureSnapshotId',
    v_source->>'pressureSchemaVersion',
    (v_source->>'pressureGeneratedAt')::timestamptz,
    (v_source->>'pressureRefreshedAt')::timestamptz,
    v_source->>'riskModelVersion',
    nullif(v_source->>'serviceabilitySnapshotId', ''),
    nullif(v_source->>'serviceabilitySchemaVersion', ''),
    nullif(v_source->>'serviceabilityModelVersion', ''),
    nullif(v_source->>'serviceabilityGeneratedAt', '')::timestamptz,
    nullif(v_source->>'serviceabilityRefreshedAt', '')::timestamptz,
    v_source,
    coalesce(p_projection->'counts', '{}'::jsonb),
    coalesce(p_projection->'provenance', '[]'::jsonb),
    (p_projection->>'generatedAt')::timestamptz,
    'superseded'
  )
  on conflict (
    projection_key, schema_version, policy_version, network_source_sha256,
    pressure_snapshot_id, serviceability_snapshot_identity
  ) do update set
    counts = excluded.counts,
    provenance = excluded.provenance,
    source_versions = excluded.source_versions,
    generated_at = excluded.generated_at,
    status = 'superseded'
  returning id into v_projection_id;

  delete from public.pedestrian_segment_risk_projections
  where projection_version_id = v_projection_id;

  insert into public.pedestrian_segment_risk_projections (
    projection_version_id, projection_segment_id, edge_key, osm_way_id,
    segment_index, direction, from_osm_node_id, to_osm_node_id, zone_id,
    intersected_zone_ids, length_m, intersection_length_m,
    effective_resolution, risk_status, waste_risk, cigarette_butt_risk,
    mixed_risk, geom, midpoint, waste_confidence, cigarette_butt_confidence,
    waste_factors, cigarette_butt_factors, available_factors, missing_factors,
    serviceability, source_versions, provenance, notes
  )
  select
    v_projection_id,
    s."projectionSegmentId",
    s."edgeKey",
    s."osmWayId"::bigint,
    s."segmentIndex"::integer,
    s.direction,
    s."fromNodeId"::bigint,
    s."toNodeId"::bigint,
    nullif(s."zoneId", ''),
    coalesce(s."intersectedZoneIds", '{}'),
    s."lengthM"::double precision,
    s."intersectionLengthM"::double precision,
    s."effectiveResolution",
    s."riskStatus",
    s."wasteRisk"::double precision,
    s."cigaretteButtRisk"::double precision,
    s."mixedRisk"::double precision,
    extensions.st_setsrid(extensions.st_geomfromgeojson(s.geometry::text), 4326),
    extensions.st_setsrid(extensions.st_geomfromgeojson(s.midpoint::text), 4326),
    s."wasteConfidence",
    s."cigaretteButtConfidence",
    s."wasteFactors",
    s."cigaretteButtFactors",
    coalesce(s."availableFactors", '{}'::jsonb),
    coalesce(s."missingFactors", '{}'::jsonb),
    s.serviceability,
    coalesce(s."sourceVersions", '{}'::jsonb),
    coalesce(s.provenance, '[]'::jsonb),
    coalesce(s.notes, '[]'::jsonb)
  from jsonb_to_recordset(p_projection->'segments') as s(
    "projectionSegmentId" text,
    "edgeKey" text,
    "osmWayId" text,
    "segmentIndex" text,
    direction text,
    "fromNodeId" text,
    "toNodeId" text,
    "zoneId" text,
    "intersectedZoneIds" text[],
    "lengthM" text,
    "intersectionLengthM" text,
    "effectiveResolution" text,
    "riskStatus" text,
    "wasteRisk" text,
    "cigaretteButtRisk" text,
    "mixedRisk" text,
    geometry jsonb,
    midpoint jsonb,
    "wasteConfidence" jsonb,
    "cigaretteButtConfidence" jsonb,
    "wasteFactors" jsonb,
    "cigaretteButtFactors" jsonb,
    "availableFactors" jsonb,
    "missingFactors" jsonb,
    serviceability jsonb,
    "sourceVersions" jsonb,
    provenance jsonb,
    notes jsonb
  );

  update public.pedestrian_risk_projection_versions
  set status = 'active'
  where id = v_projection_id;
  return v_projection_id;
end;
$$;

revoke all on function public.publish_pedestrian_risk_projection(jsonb)
  from public, anon, authenticated;
grant execute on function public.publish_pedestrian_risk_projection(jsonb)
  to service_role;

create or replace function public.get_active_pedestrian_risk_projection(
  p_south double precision,
  p_west double precision,
  p_north double precision,
  p_east double precision
)
returns table (
  projection_version_id uuid,
  projection_key text,
  schema_version text,
  policy_version text,
  network_version_id uuid,
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
language sql
stable
security invoker
set search_path = pg_catalog, public, extensions
as $$
  select
    version.id,
    version.projection_key,
    version.schema_version,
    version.policy_version,
    null::uuid,
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
  join public.pedestrian_segment_risk_projections as segment
    on segment.projection_version_id = version.id
  where version.status = 'active'
    and extensions.st_intersects(
      segment.geom,
      extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    )
  order by segment.edge_key, segment.projection_segment_id;
$$;

revoke all on function public.get_active_pedestrian_risk_projection(double precision, double precision, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.get_active_pedestrian_risk_projection(double precision, double precision, double precision, double precision)
  to service_role;
