import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Coordinate } from "./pedestrian-network";
import type {
  PedestrianRiskProjectionServiceability,
  PedestrianRiskProjectionSnapshot,
  PedestrianRiskProjectionSourceVersions,
  PedestrianRiskProjectionSegment,
} from "../geo/pedestrian-risk-projection";

type ProjectionRow = {
  projection_version_id: string;
  projection_key: string;
  schema_version: string;
  policy_version: string;
  network_version_id: string | null;
  generated_at: string;
  publication_revision: number;
  source_versions: PedestrianRiskProjectionSourceVersions;
  projection_segment_id: string;
  edge_key: string;
  osm_way_id: number | string;
  segment_index: number;
  direction: "forward" | "reverse";
  from_node_id: number | string;
  to_node_id: number | string;
  zone_id: string | null;
  intersected_zone_ids: string[];
  length_m: number;
  intersection_length_m: number;
  effective_resolution: "iris" | "unknown";
  risk_status: "predicted" | "unavailable";
  waste_risk: number | null;
  cigarette_butt_risk: number | null;
  mixed_risk: number | null;
  geometry_geojson: { coordinates?: unknown };
  midpoint_geojson: { coordinates?: unknown };
  waste_confidence: PedestrianRiskProjectionSegment["wasteConfidence"];
  cigarette_butt_confidence: PedestrianRiskProjectionSegment["cigaretteButtConfidence"];
  waste_factors: PedestrianRiskProjectionSegment["wasteFactors"];
  cigarette_butt_factors: PedestrianRiskProjectionSegment["cigaretteButtFactors"];
  available_factors: PedestrianRiskProjectionSegment["availableFactors"];
  missing_factors: PedestrianRiskProjectionSegment["missingFactors"];
  serviceability: PedestrianRiskProjectionServiceability | null;
  provenance: PedestrianRiskProjectionSegment["provenance"];
  notes: string[];
};

const PROJECTION_PAGE_SIZE = 900;

function sameProjectionIdentity(left: ProjectionRow, right: ProjectionRow): boolean {
  return Number.isSafeInteger(left.publication_revision) &&
    left.publication_revision > 0 &&
    Number.isSafeInteger(right.publication_revision) &&
    right.publication_revision > 0 &&
    left.projection_version_id === right.projection_version_id &&
    left.projection_key === right.projection_key &&
    left.schema_version === right.schema_version &&
    left.policy_version === right.policy_version &&
    left.network_version_id === right.network_version_id &&
    left.generated_at === right.generated_at &&
    left.publication_revision === right.publication_revision;
}

function coordinatesFromGeoJson(value: unknown): Coordinate[] | null {
  const coordinates = (value as { coordinates?: unknown } | null)?.coordinates;
  if (!Array.isArray(coordinates)) return null;
  const result = coordinates
    .filter((coordinate): coordinate is [number, number] =>
      Array.isArray(coordinate) && coordinate.length >= 2 &&
      Number.isFinite(coordinate[0]) && Number.isFinite(coordinate[1]),
    )
    .map(([longitude, latitude]) => [latitude, longitude] as Coordinate);
  return result.length >= 2 ? result : null;
}
function pointFromGeoJson(value: unknown): Coordinate | null {
  const coordinates = (value as { coordinates?: unknown } | null)?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [longitude, latitude] = coordinates;
  return Number.isFinite(longitude) && Number.isFinite(latitude)
    ? [latitude, longitude]
    : null;
}

export async function loadActivePedestrianRiskProjection(
  supabase: SupabaseClient,
  points: Array<{ latitude: number; longitude: number }>,
): Promise<PedestrianRiskProjectionSnapshot | null> {
  if (typeof supabase.rpc !== "function" || points.length === 0) return null;
  const validPoints = points.filter((point) =>
    Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  if (validPoints.length === 0) return null;
  const bounds = {
    south: Math.min(...validPoints.map((point) => point.latitude)) - 0.002,
    west: Math.min(...validPoints.map((point) => point.longitude)) - 0.002,
    north: Math.max(...validPoints.map((point) => point.latitude)) + 0.002,
    east: Math.max(...validPoints.map((point) => point.longitude)) + 0.002,
  };
  const rows: ProjectionRow[] = [];
  let offset = 0;
  let first: ProjectionRow | null = null;
  let continuationExpected = false;
  for (;;) {
    const { data, error } = await supabase.rpc("get_active_pedestrian_risk_projection_page", {
      p_south: bounds.south,
      p_west: bounds.west,
      p_north: bounds.north,
      p_east: bounds.east,
      p_limit: PROJECTION_PAGE_SIZE,
      p_offset: offset,
    });
    if (error || !Array.isArray(data) || data.length > PROJECTION_PAGE_SIZE + 1) return null;
    const pageRows = data as ProjectionRow[];
    if (pageRows.length === 0 && rows.length === 0) return null;
    if (continuationExpected && pageRows.length === 0) return null;
    if (!first && pageRows.length > 0) first = pageRows[0]!;
    if (first && pageRows.some((row) => !sameProjectionIdentity(first!, row))) return null;
    rows.push(...pageRows.slice(0, PROJECTION_PAGE_SIZE));
    continuationExpected = pageRows.length > PROJECTION_PAGE_SIZE;
    if (!continuationExpected) break;
    offset += PROJECTION_PAGE_SIZE;
  }
  if (!first || rows.length === 0 || first.network_version_id === null) return null;
  const segments: PedestrianRiskProjectionSegment[] = [];
  for (const row of rows) {
    const coordinates = coordinatesFromGeoJson(row.geometry_geojson);
    const segmentMidpoint = pointFromGeoJson(row.midpoint_geojson);
    if (!coordinates || !segmentMidpoint || !sameProjectionIdentity(first, row)) return null;
    segments.push({
      projectionSegmentId: row.projection_segment_id,
      edgeKey: row.edge_key,
      osmWayId: String(row.osm_way_id),
      segmentIndex: row.segment_index,
      direction: row.direction,
      fromNodeId: String(row.from_node_id),
      toNodeId: String(row.to_node_id),
      lengthM: row.length_m,
      intersectionLengthM: row.intersection_length_m,
      coordinates,
      midpoint: segmentMidpoint,
      zoneId: row.zone_id,
      intersectedZoneIds: row.intersected_zone_ids ?? [],
      effectiveResolution: row.effective_resolution,
      riskStatus: row.risk_status,
      wasteRisk: row.waste_risk,
      cigaretteButtRisk: row.cigarette_butt_risk,
      mixedRisk: row.mixed_risk,
      wasteConfidence: row.waste_confidence,
      cigaretteButtConfidence: row.cigarette_butt_confidence,
      wasteFactors: row.waste_factors,
      cigaretteButtFactors: row.cigarette_butt_factors,
      availableFactors: row.available_factors,
      missingFactors: row.missing_factors,
      serviceability: row.serviceability,
      sourceVersions: row.source_versions,
      provenance: row.provenance,
      notes: row.notes ?? [],
    });
  }
  if (segments.length === 0) return null;
  const sourceVersions = first.source_versions;
  return {
    schemaVersion: "paris-pedestrian-risk-projection-v1",
    projectionKey: first.projection_key as PedestrianRiskProjectionSnapshot["projectionKey"],
    policyVersion: first.policy_version as PedestrianRiskProjectionSnapshot["policyVersion"],
    projectionVersionId: first.projection_version_id,
    networkVersionId: first.network_version_id,
    sourceVersions,
    generatedAt: first.generated_at,
    counts: {
      sourceEdges: new Set(segments.map((segment) => segment.edgeKey)).size,
      projectedSegments: segments.length,
      predictedSegments: segments.filter((segment) => segment.riskStatus === "predicted").length,
      unavailableSegments: segments.filter((segment) => segment.riskStatus === "unavailable").length,
      zonesIntersected: new Set(segments.flatMap((segment) => segment.intersectedZoneIds)).size,
    },
    segments,
  };
}
