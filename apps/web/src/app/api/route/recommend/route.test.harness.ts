import { vi } from "vitest";
import {
  availableSourceHealth,
  candidate,
  fallbackGeometry,
  plannedStop,
} from "./route.test.fixtures";

export { candidate, fallbackGeometry, plannedStop, request } from "./route.test.fixtures";

const getSafeAuthSessionMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());
const loadRouteRecommendationSourceMock = vi.hoisted(() => vi.fn());
const buildTrashSpotterActionableCandidatesMock = vi.hoisted(() => vi.fn());
const getCurrentUserLocationPreferenceMock = vi.hoisted(() => vi.fn());
const trackRouteRecommendationUseMock = vi.hoisted(() => vi.fn());
const buildTrashSpotterRouteCandidatesMock = vi.hoisted(() => vi.fn());
const applyOriginRouteGeometryLegsMock = vi.hoisted(() => vi.fn());
const createFallbackRouteGeometryMock = vi.hoisted(() => vi.fn());
const routePolylineThroughFossgisFootMock = vi.hoisted(() => vi.fn());
const buildHotspotsMock = vi.hoisted(() => vi.fn());
const buildProactiveAssistantMock = vi.hoisted(() => vi.fn());
const defaultRouteAssistantPayloadMock = vi.hoisted(() => vi.fn());
const defaultRouteRecommendationFloorDateMock = vi.hoisted(() => vi.fn());
const loadCachedEventPressureByArrondissementMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const getTerritoryArrondissementCenterMock = vi.hoisted(() => vi.fn());
const planRouteMock = vi.hoisted(() => vi.fn());
const fallbackRoutePrefixWithinBudgetMock = vi.hoisted(() => vi.fn());
const loadParisPressureSnapshotMock = vi.hoisted(() => vi.fn());
const loadMunicipalCleaningServiceabilitySnapshotMock = vi.hoisted(() => vi.fn());
const applyParisPressureToCandidatesMock = vi.hoisted(() => vi.fn());
const buildPredictedRouteCandidatesMock = vi.hoisted(() => vi.fn());
const buildRoutePlannerCandidatePoolMock = vi.hoisted(() => vi.fn());
const applyRoutePredictionPoolAuditMock = vi.hoisted(() => vi.fn());
const applyRoutePredictionPlannerBudgetAuditMock = vi.hoisted(() => vi.fn());
const applyRoutePredictionFinalRoutingBudgetAuditMock = vi.hoisted(() => vi.fn());
const resolveRouteDataStatusMock = vi.hoisted(() => vi.fn());
const resolveRouteDataLayersMock = vi.hoisted(() => vi.fn());
const routeEventSignalContextMock = vi.hoisted(() => vi.fn());
const loadRouteEventCenteredAnchorMock = vi.hoisted(() => vi.fn());

export {
  getSafeAuthSessionMock,
  verifyRateLimitMock,
  createServerRateLimitResponseMock,
  loadRouteRecommendationSourceMock,
  buildTrashSpotterActionableCandidatesMock,
  getCurrentUserLocationPreferenceMock,
  trackRouteRecommendationUseMock,
  buildTrashSpotterRouteCandidatesMock,
  applyOriginRouteGeometryLegsMock,
  createFallbackRouteGeometryMock,
  routePolylineThroughFossgisFootMock,
  buildHotspotsMock,
  buildProactiveAssistantMock,
  defaultRouteAssistantPayloadMock,
  defaultRouteRecommendationFloorDateMock,
  loadCachedEventPressureByArrondissementMock,
  getSupabaseServerClientMock,
  getTerritoryArrondissementCenterMock,
  planRouteMock,
  fallbackRoutePrefixWithinBudgetMock,
  loadParisPressureSnapshotMock,
  loadMunicipalCleaningServiceabilitySnapshotMock,
  applyParisPressureToCandidatesMock,
  buildPredictedRouteCandidatesMock,
  buildRoutePlannerCandidatePoolMock,
  applyRoutePredictionPoolAuditMock,
  applyRoutePredictionPlannerBudgetAuditMock,
  applyRoutePredictionFinalRoutingBudgetAuditMock,
  resolveRouteDataStatusMock,
  resolveRouteDataLayersMock,
  routeEventSignalContextMock,
  loadRouteEventCenteredAnchorMock,
};

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: getSafeAuthSessionMock,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
}));
vi.mock("@/lib/route/route-recommendation-loader", () => ({
  loadRouteRecommendationSource: loadRouteRecommendationSourceMock,
}));
vi.mock("@/lib/actions/trash-spotter-actionable-candidates", () => ({
  buildTrashSpotterActionableCandidates: buildTrashSpotterActionableCandidatesMock,
}));
vi.mock("@/lib/auth/user-location", () => ({
  getCurrentUserLocationPreference: getCurrentUserLocationPreferenceMock,
}));
vi.mock("@/lib/gamification/progression", () => ({
  trackRouteRecommendationUse: trackRouteRecommendationUseMock,
}));
vi.mock("@/lib/route/trash-spotter-recommendation", () => ({
  buildTrashSpotterRouteCandidates: buildTrashSpotterRouteCandidatesMock,
}));
vi.mock("@/lib/route/route-contract", () => ({
  applyOriginRouteGeometryLegs: applyOriginRouteGeometryLegsMock,
}));
vi.mock("@/lib/geo/osrm-routing", () => ({
  createFallbackRouteGeometry: createFallbackRouteGeometryMock,
}));
vi.mock("@/lib/route/fossgis-foot-routing", () => ({
  routePolylineThroughFossgisFoot: routePolylineThroughFossgisFootMock,
}));
vi.mock("@/lib/geo/paris-arrondissements", () => ({
  getTerritoryArrondissementCenter: getTerritoryArrondissementCenterMock,
}));
vi.mock("@/lib/route/route-planner", () => ({
  fallbackRoutePrefixWithinBudget: fallbackRoutePrefixWithinBudgetMock,
  isRoutePlannerCandidateEligible: vi.fn(() => true),
  planRoute: planRouteMock,
  ROUTE_PLANNER_ENGINE_VERSION: "route-planner-v2",
  routeDistanceKm: vi.fn(() => 1),
  travelMinutesForDistance: vi.fn(() => 5),
}));
vi.mock("@/lib/route/route-event-pressure-loader", () => ({
  loadCachedRouteEventSignalContext: routeEventSignalContextMock,
}));
vi.mock("@/lib/route/route-event-centered-loader", () => ({
  loadRouteEventCenteredAnchor: loadRouteEventCenteredAnchorMock,
}));
vi.mock("@/lib/geo/paris-pressure-loader", () => ({
  loadParisPressureSnapshot: loadParisPressureSnapshotMock,
}));
vi.mock("@/lib/geo/municipal-cleaning-serviceability-loader", () => ({
  loadMunicipalCleaningServiceabilitySnapshot: loadMunicipalCleaningServiceabilitySnapshotMock,
}));
vi.mock("@/lib/route/paris-pressure-route-adapter", () => ({
  applyParisPressureToCandidates: applyParisPressureToCandidatesMock,
}));
vi.mock("@/lib/route/route-predicted-targets", () => ({
  buildPredictedRouteCandidates: buildPredictedRouteCandidatesMock,
  buildRoutePlannerCandidatePool: buildRoutePlannerCandidatePoolMock,
  applyRoutePredictionPoolAudit: applyRoutePredictionPoolAuditMock,
  applyRoutePredictionPlannerBudgetAudit: applyRoutePredictionPlannerBudgetAuditMock,
  applyRoutePredictionFinalRoutingBudgetAudit: applyRoutePredictionFinalRoutingBudgetAuditMock,
}));
vi.mock("@/lib/route/route-data-status", () => ({
  resolveRouteDataStatus: resolveRouteDataStatusMock,
  resolveRouteDataLayers: resolveRouteDataLayersMock,
}));
vi.mock("@/lib/route/recommendation-assistant", () => ({
  buildHotspots: buildHotspotsMock,
  buildProactiveAssistant: buildProactiveAssistantMock,
  defaultRouteAssistantPayload: defaultRouteAssistantPayloadMock,
  defaultRouteRecommendationFloorDate: defaultRouteRecommendationFloorDateMock,
  loadCachedEventPressureByArrondissement: loadCachedEventPressureByArrondissementMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: () => new Response("unauthorized", { status: 401 }),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: (error: unknown) =>
    new Response(error instanceof Error ? error.message : "error", { status: 500 }),
}));

export function plannerAudit(stops: Array<ReturnType<typeof plannedStop>>) {
  return {
    evaluations: [],
    selections: stops.map(({ candidate: selectedCandidate, incrementalDistanceKm, incrementalTravelMinutes, cumulativeTravelMinutes, returnDistanceKm, returnTravelMinutes, loopDistanceKm, loopTravelMinutes }, index) => ({
      candidateId: selectedCandidate.id,
      step: index + 1,
      incrementalDistanceKm,
      incrementalTravelMinutes,
      cumulativeTravelMinutes,
      returnDistanceKm,
      returnTravelMinutes,
      loopDistanceKm,
      loopTravelMinutes,
      budgetAfterReturnMinutes: Math.max(0, 60 - loopTravelMinutes),
      normalizedPriority: selectedCandidate.score / 100,
      normalizedTravel: 0.9,
      combinedScore: selectedCandidate.score / 100,
      feasible: true,
      budgetBeforeMinutes: 60 - index * incrementalTravelMinutes,
      budgetAfterMinutes: Math.max(0, 60 - cumulativeTravelMinutes),
      selectionReason: "Sélectionné dans le budget.",
    })),
    orderingCriteria: [
      "combined_score_desc",
      "priority_desc",
      "incremental_travel_asc",
      "id_lexicographic",
    ] as const,
  };
}

export function resetRouteRecommendMocks() {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();

  getSafeAuthSessionMock.mockResolvedValue({
    userId: "user-1",
    clerkReachable: true,
    state: "authenticated",
  });
  verifyRateLimitMock.mockResolvedValue({
    allowed: true,
    limit: 6,
    remaining: 5,
    reset: 1_000,
    retryAfter: undefined,
  });
  createServerRateLimitResponseMock.mockImplementation(
    (allowed: boolean) => (allowed ? null : new Response("limited", { status: 429 })),
  );
  getSupabaseServerClientMock.mockReturnValue({});
  getCurrentUserLocationPreferenceMock.mockResolvedValue({
    arrondissement: 4,
    locationType: "residence",
  });
  getTerritoryArrondissementCenterMock.mockReturnValue({ lat: 48.86, lng: 2.36 });
  defaultRouteRecommendationFloorDateMock.mockReturnValue("2026-01-01");
  loadParisPressureSnapshotMock.mockReturnValue(null);
  applyParisPressureToCandidatesMock.mockImplementation((values) => values);
  const emptyPredictionSummary = {
    status: "unavailable",
    selected: 0,
    selectedCandidateIds: [],
    admittedCandidateIds: [],
    preselectionExcludedCandidateIds: [],
    excludedByFinalRoutingBudget: 0,
    finalRoutingBudgetExcludedCandidateIds: [],
  };
  buildPredictedRouteCandidatesMock.mockReturnValue({ candidates: [], summary: emptyPredictionSummary });
  buildRoutePlannerCandidatePoolMock.mockImplementation(({ observedCandidates, predictedCandidates, maxCandidates }) => {
    const candidates = [...observedCandidates, ...predictedCandidates].slice(0, maxCandidates);
    return {
      candidates,
      audit: {
        admittedCandidateIds: candidates.map((item) => item.id),
        passedToPlannerCandidateIds: candidates.map((item) => item.id),
        excludedByPreselectionCandidateIds: [],
      },
    };
  });
  applyRoutePredictionPoolAuditMock.mockImplementation((summary) => summary);
  applyRoutePredictionPlannerBudgetAuditMock.mockImplementation((summary) => summary);
  applyRoutePredictionFinalRoutingBudgetAuditMock.mockImplementation((summary, excludedIds) => ({
    ...summary,
    excludedByFinalRoutingBudget: excludedIds.length,
    finalRoutingBudgetExcludedCandidateIds: excludedIds,
  }));
  resolveRouteDataStatusMock.mockImplementation(({ candidateCount, isTruncated, sourceHealth }) => {
    if (sourceHealth.failedSources.length > 0 || sourceHealth.availableSources.length === 0) return "unavailable";
    if (isTruncated || sourceHealth.partial) return "partial";
    return candidateCount === 0 ? "empty" : "complete";
  });
  resolveRouteDataLayersMock.mockImplementation(({ observed, prediction, routeGeometryMode }) => ({
    observed: observed.candidateCount === 0 ? "empty" : "complete",
    prediction: prediction.status,
    recommendation: observed.sourceHealth.failedSources.length > 0 || observed.sourceHealth.partial || observed.isTruncated || routeGeometryMode === "fallback" || prediction.status !== "available" ? (observed.candidateCount === 0 && observed.sourceHealth.failedSources.length === 0 && !observed.sourceHealth.partial && !observed.isTruncated && prediction.status === "unavailable" ? "empty" : "degraded") : "ok",
  }));
  loadCachedEventPressureByArrondissementMock.mockResolvedValue({
    pressureByArrondissement: new Map(),
    eventSignals: [],
  });
  routeEventSignalContextMock.mockResolvedValue({
    candidatePressureById: new Map(),
    completedEventsConsidered: 0,
    geolocatedCompletedEvents: 0,
    eventsWithoutCoordinates: 0,
    futureEventSignals: [],
    sourceAvailable: true,
    warnings: [],
  });
  loadRouteEventCenteredAnchorMock.mockResolvedValue(null);
  loadRouteRecommendationSourceMock.mockResolvedValue({
    items: [],
    isTruncated: false,
    sourceHealth: availableSourceHealth,
  });
  buildTrashSpotterActionableCandidatesMock.mockReturnValue([]);
  buildTrashSpotterRouteCandidatesMock.mockReturnValue([]);
  createFallbackRouteGeometryMock.mockImplementation(
    (coordinates: [number, number][]) => fallbackGeometry(coordinates),
  );
  routePolylineThroughFossgisFootMock.mockResolvedValue(fallbackGeometry());
  applyOriginRouteGeometryLegsMock.mockImplementation((stops) => stops);
  defaultRouteAssistantPayloadMock.mockReturnValue({
    actNow: "",
    criticalNearby: "",
    mostUsefulAction: "",
    operationalSignalZones: [],
    upcomingEvents: [],
    hotspots: [],
  });
  planRouteMock.mockImplementation((input) => {
    const stops = input.candidates
      .slice(0, input.maxStops)
      .map((item: typeof candidate, index: number) => plannedStop(item, index));
    return {
      stops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(stops),
    };
  });
  fallbackRoutePrefixWithinBudgetMock.mockImplementation(
    (_origin, stops) => stops,
  );
  buildHotspotsMock.mockReturnValue([]);
  buildProactiveAssistantMock.mockReturnValue({
    actNow: "",
    criticalNearby: "",
    mostUsefulAction: "",
    operationalSignalZones: [],
    upcomingEvents: [],
    hotspots: [],
  });
  trackRouteRecommendationUseMock.mockResolvedValue(undefined);
}
