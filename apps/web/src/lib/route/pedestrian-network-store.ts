import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Coordinate,
  PedestrianNetworkBounds,
  PedestrianNetworkEdge,
  PedestrianNetworkGraph,
} from "./pedestrian-network";

type NetworkRow = {
  network_version_id: string;
  network_key: string;
  source_retrieved_at: string;
  bounds: unknown;
  edge_key: string;
  from_node_id: number | string;
  to_node_id: number | string;
  length_m: number;
  name: string | null;
  highway: string;
  osm_way_id: number | string;
  segment_index: number;
  direction: "forward" | "reverse";
  pedestrian_access_status: "allowed";
  geometry_geojson: unknown;
  tags: Record<string, string>;
};

const NETWORK_PAGE_SIZE = 900;

function sameNetworkIdentity(left: NetworkRow, right: NetworkRow): boolean {
  return left.network_version_id === right.network_version_id &&
    left.network_key === right.network_key &&
    left.source_retrieved_at === right.source_retrieved_at;
}

function validCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]);
}

function boundsFromGeoJson(value: unknown, fallback: PedestrianNetworkBounds): PedestrianNetworkBounds {
  const geoJson = value as { coordinates?: unknown } | null;
  if (!geoJson || !Array.isArray(geoJson.coordinates)) return fallback;
  const ring = geoJson.coordinates[0];
  if (!Array.isArray(ring)) return fallback;
  const coordinates = ring.filter(validCoordinate);
  if (coordinates.length < 4) return fallback;
  return {
    south: Math.min(...coordinates.map((coordinate) => coordinate[1])),
    west: Math.min(...coordinates.map((coordinate) => coordinate[0])),
    north: Math.max(...coordinates.map((coordinate) => coordinate[1])),
    east: Math.max(...coordinates.map((coordinate) => coordinate[0])),
  };
}

function coordinatesFromGeoJson(value: unknown): Coordinate[] | null {
  const geoJson = value as { coordinates?: unknown } | null;
  if (!geoJson || !Array.isArray(geoJson.coordinates)) return null;
  const coordinates = geoJson.coordinates
    .filter(validCoordinate)
    .map(([longitude, latitude]) => [latitude, longitude] as Coordinate);
  return coordinates.length >= 2 ? coordinates : null;
}

function finiteNumber(value: number | string): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function loadActivePedestrianNetwork(
  supabase: SupabaseClient,
  points: Array<{ latitude: number; longitude: number }>,
): Promise<PedestrianNetworkGraph | null> {
  if (typeof supabase.rpc !== "function" || points.length === 0) return null;
  const validPoints = points.filter((point) =>
    Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );
  if (validPoints.length === 0) return null;
  const fallbackBounds: PedestrianNetworkBounds = {
    south: Math.min(...validPoints.map((point) => point.latitude)),
    west: Math.min(...validPoints.map((point) => point.longitude)),
    north: Math.max(...validPoints.map((point) => point.latitude)),
    east: Math.max(...validPoints.map((point) => point.longitude)),
  };
  const bounds = {
    south: fallbackBounds.south - 0.002,
    west: fallbackBounds.west - 0.002,
    north: fallbackBounds.north + 0.002,
    east: fallbackBounds.east + 0.002,
  };
  const rows: NetworkRow[] = [];
  let offset = 0;
  let first: NetworkRow | null = null;
  for (;;) {
    const { data, error } = await supabase.rpc("get_active_pedestrian_network_page", {
      p_south: bounds.south,
      p_west: bounds.west,
      p_north: bounds.north,
      p_east: bounds.east,
      p_limit: NETWORK_PAGE_SIZE,
      p_offset: offset,
    });
    if (error || !Array.isArray(data) || data.length > NETWORK_PAGE_SIZE + 1) return null;
    const pageRows = data as NetworkRow[];
    if (pageRows.length === 0 && rows.length === 0) return null;
    if (!first && pageRows.length > 0) first = pageRows[0]!;
    if (first && pageRows.some((row) => !sameNetworkIdentity(first!, row))) return null;
    rows.push(...pageRows.slice(0, NETWORK_PAGE_SIZE));
    if (pageRows.length <= NETWORK_PAGE_SIZE) break;
    offset += NETWORK_PAGE_SIZE;
  }
  if (!first || rows.length === 0) return null;

  const edges: PedestrianNetworkEdge[] = [];
  for (const row of rows) {
    const coordinates = coordinatesFromGeoJson(row.geometry_geojson);
    const osmWayId = finiteNumber(row.osm_way_id);
    if (!sameNetworkIdentity(first, row) || !Number.isFinite(row.length_m) || row.length_m <= 0 ||
      !Number.isInteger(row.segment_index) || !row.highway || row.pedestrian_access_status !== "allowed" ||
      !row.tags || typeof row.tags !== "object") return null;
    const fromNodeId = String(row.from_node_id);
    const toNodeId = String(row.to_node_id);
    if (!coordinates || osmWayId === null || !row.edge_key ||
      (row.direction !== "forward" && row.direction !== "reverse") ||
      !fromNodeId || !toNodeId) return null;
    edges.push({
      edgeKey: row.edge_key,
      osmWayId: String(row.osm_way_id),
      segmentIndex: row.segment_index,
      direction: row.direction,
      fromNodeId,
      toNodeId,
      highway: row.highway,
      name: row.name,
      accessStatus: row.pedestrian_access_status,
      lengthM: row.length_m,
      coordinates,
      tags: row.tags ?? {},
    });
  }
  if (edges.length === 0) return null;
  return {
    versionId: first.network_version_id,
    networkKey: first.network_key,
    sourceRetrievedAt: first.source_retrieved_at,
    bounds: boundsFromGeoJson(first.bounds, fallbackBounds),
    edges,
  };
}
