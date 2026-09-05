import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";

export type RouteDataStatus = "complete" | "empty" | "partial" | "unavailable";
export type RouteRecommendationStatus = "ok" | "empty" | "degraded";
export type RoutePredictionDataStatus = "available" | "partial" | "unavailable";
export type RouteDataLayers = {
  observed: RouteDataStatus;
  prediction: RoutePredictionDataStatus;
  recommendation: RouteRecommendationStatus;
};

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
  predictionStatus?: RoutePredictionDataStatus;
  selectedPredictedCount?: number;
}): RouteRecommendationStatus {
  const selectedPredictedCount = params.selectedPredictedCount ?? 0;
  if (
    params.dataStatus === "partial" ||
    params.dataStatus === "unavailable" ||
    (selectedPredictedCount > 0 && params.predictionStatus === "partial") ||
    (params.selectedCount > 0 && params.routeGeometryMode === "fallback")
  ) {
    return "degraded";
  }

  if (
    params.selectedCount === 0 ||
    (params.dataStatus === "empty" && selectedPredictedCount === 0)
  ) {
    return "empty";
  }

  return "ok";
}

export function resolveRouteDataLayers(params: {
  observed: {
    candidateCount: number;
    isTruncated: boolean;
    sourceHealth: UnifiedSourceHealth;
  };
  prediction: {
    status: RoutePredictionDataStatus;
    selectedCount: number;
  };
  selectedCount: number;
  routeGeometryMode: "network" | "fallback";
}): RouteDataLayers {
  const observed = resolveRouteDataStatus(params.observed);
  return {
    observed,
    prediction: params.prediction.status,
    recommendation: resolveRouteRecommendationStatus({
      dataStatus: observed,
      selectedCount: params.selectedCount,
      selectedPredictedCount: params.prediction.selectedCount,
      predictionStatus: params.prediction.status,
      routeGeometryMode: params.routeGeometryMode,
    }),
  };
}
