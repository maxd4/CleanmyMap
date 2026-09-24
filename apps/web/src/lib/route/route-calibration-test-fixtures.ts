import type { RouteGeometry } from "./route-contract";

function routeGeometry(distanceKm: number): RouteGeometry {
  return {
    isLoop: true,
    origin: [48.85, 2.35],
    returnLeg: null,
    coordinates: [],
    distanceKm,
    durationMinutes: distanceKm === 0 ? 0 : 20,
    legs: [],
    provider: "none",
    profile: null,
    mode: "fallback",
    estimated: true,
  };
}

export function createRoutePlannerSnapshotInput(
  distanceKm = 0,
): Parameters<typeof import("./route-calibration").buildRoutePlannerSnapshot>[0] {
  const geometry = routeGeometry(distanceKm);
  const travelMinutes = distanceKm === 0 ? 0 : 20;

  return {
    generatedAt: "2026-09-01T09:00:00.000Z",
    engineVersion: "route-planner-v2",
    selectedCandidates: [],
    selectedStops: [],
    origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
    planningMode: { type: "free" },
    travelBudgetMinutes: 60,
    maxStops: 3,
    priorityVsTravel: 65,
    pickupPreference: "balanced",
    effectiveRiskFocus: "all",
    volunteers: 3,
    groupCount: 1,
    routeGeometry: geometry,
    travelDistanceKm: distanceKm,
    travelMinutes,
    returnDistanceKm: 0,
    returnMinutes: 0,
    groups: [{
      groupIndex: 1,
      volunteerCount: 3,
      candidateIds: [],
      reservedCandidateIds: [],
      targetCount: 0,
      travelDistanceKm: distanceKm,
      travelMinutes,
      travelBudgetMinutes: 60,
      withinBudget: true,
      routeGeometry: geometry,
      operationalBudget: null,
    }],
    dataStatus: "empty",
    dataLayers: { observed: "empty", prediction: "unavailable", recommendation: "empty" },
    sourceHealth: {
      partial: false,
      failedSources: [],
      availableSources: ["spots"],
      warnings: [],
    },
    prediction: null,
  };
}
