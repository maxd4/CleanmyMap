import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";

export type RouteDataStatus = "complete" | "empty" | "partial" | "unavailable";

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
