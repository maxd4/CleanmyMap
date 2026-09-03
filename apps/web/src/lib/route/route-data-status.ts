import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";

export type RouteDataStatus = "complete" | "empty" | "partial" | "unavailable";
export type RouteRecommendationStatus = "ok" | "empty" | "degraded";

export function resolveRouteDataStatus(params: {
  candidateCount: number;
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
}): RouteDataStatus {
  // This route explicitly requests the canonical Trash Spotter source only.
  // A failed or absent source must never be presented as a genuinely empty
  // dataset.
  if (
    params.sourceHealth.failedSources.includes("spots") ||
    !params.sourceHealth.availableSources.includes("spots")
  ) {
    return "unavailable";
  }

  if (params.isTruncated || params.sourceHealth.partial) {
    return "partial";
  }

  return params.candidateCount === 0 ? "empty" : "complete";
}

export function resolveRouteRecommendationStatus(params: {
  dataStatus: RouteDataStatus;
  selectedCount: number;
  routeGeometryMode: "network" | "fallback";
}): RouteRecommendationStatus {
  if (
    params.dataStatus === "partial" ||
    params.dataStatus === "unavailable" ||
    (params.selectedCount > 0 && params.routeGeometryMode === "fallback")
  ) {
    return "degraded";
  }

  if (params.dataStatus === "empty" || params.selectedCount === 0) {
    return "empty";
  }

  return "ok";
}
