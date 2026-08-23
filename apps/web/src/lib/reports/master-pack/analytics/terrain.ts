import { buildRouteSteps, computeMapCoverageMetrics } from "@/lib/reports/report-model";
import type { ActionMapItem } from "@/lib/actions/types";

export function computeTerrainMetrics(mapItems: ActionMapItem[]) {
  const mapApproved = mapItems.filter((item) => item.status === "approved");
  const coverage = computeMapCoverageMetrics(mapApproved, { includeGeometryCounts: false });

  // Route logic
  const mapApprovedActions = mapApproved.filter((item) => (item.record_type ?? item.contract?.type) === "action");
  const routeSteps = buildRouteSteps(mapApprovedActions, 10); // More steps for Master Pack
  const routeDistance = routeSteps.reduce((sum, step) => sum + step.segmentKm, 0);

  return {
    coverage: {
      geolocatedCount: coverage.geolocatedCount,
      traceCount: coverage.traceCount,
      geoCoverage: coverage.geoCoverage,
      traceCoverage: coverage.traceCoverage,
    },
    routing: {
      steps: routeSteps,
      totalDistance: routeDistance,
    },
    status: {
      actionCount: mapApprovedActions.length,
      spotCount: mapApproved.filter((item) => (item.record_type ?? item.contract?.type) === "spot").length,
      cleanPlaceCount: mapApproved.filter((item) => (item.record_type ?? item.contract?.type) === "clean_place").length,
    }
  };
}
