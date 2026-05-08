import { buildRouteSteps } from "@/components/reports/web-document/analytics";
import type { ActionMapItem } from "@/lib/actions/types";

export function computeTerrainMetrics(mapItems: ActionMapItem[]) {
  const mapApproved = mapItems.filter((item) => item.status === "approved");
  
  // Traces logic
  const geolocatedCount = mapApproved.filter((item) => {
    return item.latitude !== null && item.longitude !== null;
  }).length;

  const traceCount = mapApproved.filter((item) =>
    Boolean(item.manual_drawing || item.manual_drawing_geojson || item.contract?.geometry.kind !== "point"),
  ).length;

  const geoCoverage = mapApproved.length > 0 ? (geolocatedCount / mapApproved.length) * 100 : 0;
  const traceCoverage = mapApproved.length > 0 ? (traceCount / mapApproved.length) * 100 : 0;

  // Route logic
  const mapApprovedActions = mapApproved.filter((item) => (item.record_type ?? item.contract?.type) === "action");
  const routeSteps = buildRouteSteps(mapApprovedActions, 10); // More steps for Master Pack
  const routeDistance = routeSteps.reduce((sum, step) => sum + step.segmentKm, 0);

  return {
    coverage: {
      geolocatedCount,
      traceCount,
      geoCoverage,
      traceCoverage,
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
