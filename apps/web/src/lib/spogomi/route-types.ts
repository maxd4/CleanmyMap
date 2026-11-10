import type { ActionRouteTopology, ActionDrawing } from "@/lib/actions/types";

export const SPOGOMI_ROUTE_SOURCES = ["official_reference", "gpx_reference", "manual_reference"] as const;
export type SpogomiRouteSource = (typeof SPOGOMI_ROUTE_SOURCES)[number];

export type SpogomiRouteProjection = {
  id: string;
  event_id: string;
  action_id: string;
  division_id: string | null;
  source: SpogomiRouteSource;
  file_name: string;
  point_count: number;
  reference_distance_km: number;
  inferred_topology: ActionRouteTopology;
  geometry_geojson: { type: "LineString"; coordinates: [number, number][] };
  route_version: number;
  last_change_reason: string | null;
  reference_media_id: string | null;
  updated_at: string;
  created_at: string;
};

export type SpogomiRouteInput = {
  divisionId: string | null;
  source: SpogomiRouteSource;
  fileName: string;
  drawing: ActionDrawing & { kind: "polyline" };
  referenceDistanceKm: number;
  inferredTopology: ActionRouteTopology;
  correctionReason?: string | null;
  referenceMediaId?: string | null;
};

export function selectSpogomiRouteForDivision(
  routes: readonly SpogomiRouteProjection[],
  divisionId: string | null,
): SpogomiRouteProjection | null {
  return routes.find((route) => (route.division_id ?? null) === divisionId)
    ?? (divisionId ? routes.find((route) => route.division_id == null) ?? null : routes.find((route) => route.division_id == null) ?? null);
}

export function spogomiRouteCoverage(
  routes: readonly Pick<SpogomiRouteProjection, "division_id">[],
  mode: "casual" | "world_cup" | "mixed",
  divisionIds: readonly string[],
): "missing" | "shared" | "separate" {
  const shared = routes.some((route) => route.division_id === null);
  if (shared) return "shared";
  if (mode !== "mixed") return routes.some((route) => route.division_id === divisionIds[0]) ? "separate" : "missing";
  return divisionIds.length === 2 && divisionIds.every((divisionId) => routes.some((route) => route.division_id === divisionId)) ? "separate" : "missing";
}
