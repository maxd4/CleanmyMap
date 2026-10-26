import { vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  availableSourceHealth,
  fallbackGeometry,
  plannedStop,
} from "./route.test.fixtures";
import type { RoutePredictionSummary } from "@/lib/route/route-predicted-targets-types";
import type { RoutePlannerResult } from "@/lib/route/route-planner";

export { candidate, fallbackGeometry, plannedStop, predictedCandidate, request } from "./route.test.fixtures";

const getSafeAuthSessionMock = vi.hoisted(() => vi.fn<typeof import("@/lib/auth/safe-session").getSafeAuthSession>());
const verifyRateLimitMock = vi.hoisted(() => vi.fn<typeof import("@/lib/rate-limit/server").verifyRateLimit>());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn<typeof import("@/lib/rate-limit/server").createServerRateLimitResponse>());
const loadRouteRecommendationSourceMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-recommendation-loader").loadRouteRecommendationSource>());
const buildTrashSpotterActionableCandidatesMock = vi.hoisted(() => vi.fn<typeof import("@/lib/actions/trash-spotter-actionable-candidates").buildTrashSpotterActionableCandidates>());
const getCurrentUserLocationPreferenceMock = vi.hoisted(() => vi.fn<typeof import("@/lib/auth/user-location").getCurrentUserLocationPreference>());
const trackRouteRecommendationUseMock = vi.hoisted(() => vi.fn<typeof import("@/lib/gamification/progression").trackRouteRecommendationUse>());
const buildTrashSpotterRouteCandidatesMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/trash-spotter-recommendation").buildTrashSpotterRouteCandidates>());
const applyOriginRouteGeometryLegsMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-contract").applyOriginRouteGeometryLegs>());
const createFallbackRouteGeometryMock = vi.hoisted(() => vi.fn<typeof import("@/lib/geo/osrm-routing").createFallbackRouteGeometry>());
const routePolylineThroughFossgisFootMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/fossgis-foot-routing").routePolylineThroughFossgisFoot>());
const buildHotspotsMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/recommendation-assistant").buildHotspots>());
const buildProactiveAssistantMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/recommendation-assistant").buildProactiveAssistant>());
const defaultRouteAssistantPayloadMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/recommendation-assistant").defaultRouteAssistantPayload>());
const defaultRouteRecommendationFloorDateMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/recommendation-assistant").defaultRouteRecommendationFloorDate>());
const loadCachedEventPressureByArrondissementMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/recommendation-assistant").loadCachedEventPressureByArrondissement>());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn<typeof import("@/lib/supabase/server").getSupabaseServerClient>());
const getTerritoryArrondissementCenterMock = vi.hoisted(() => vi.fn<typeof import("@/lib/geo/paris-arrondissements").getTerritoryArrondissementCenter>());
const planRouteMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-planner").planRoute>());
const fallbackRoutePrefixWithinBudgetMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-planner").fallbackRoutePrefixWithinBudget>());
const loadParisPressureSnapshotMock = vi.hoisted(() => vi.fn<typeof import("@/lib/geo/paris-pressure-loader").loadParisPressureSnapshot>());
const loadMunicipalCleaningServiceabilitySnapshotMock = vi.hoisted(() => vi.fn<typeof import("@/lib/geo/municipal-cleaning-serviceability-loader").loadMunicipalCleaningServiceabilitySnapshot>());
const applyParisPressureToCandidatesMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/paris-pressure-route-adapter").applyParisPressureToCandidates>());
const buildPredictedRouteCandidatesMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-predicted-targets").buildPredictedRouteCandidates>());
const buildRoutePlannerCandidatePoolMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-predicted-targets").buildRoutePlannerCandidatePool>());
const applyRoutePredictionPoolAuditMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-predicted-targets").applyRoutePredictionPoolAudit>());
const applyRoutePredictionPlannerBudgetAuditMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-predicted-targets").applyRoutePredictionPlannerBudgetAudit>());
const applyRoutePredictionFinalRoutingBudgetAuditMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-predicted-targets").applyRoutePredictionFinalRoutingBudgetAudit>());
const resolveRouteDataStatusMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-data-status").resolveRouteDataStatus>());
const resolveRouteDataLayersMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-data-status").resolveRouteDataLayers>());
const routeEventSignalContextMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-event-pressure-loader").loadCachedRouteEventSignalContext>());
const loadRouteEventCenteredAnchorMock = vi.hoisted(() => vi.fn<typeof import("@/lib/route/route-event-centered-loader").loadRouteEventCenteredAnchor>());
const supabaseServerClientFixture = createClient(
  "https://example.supabase.co",
  "test-anon-key-for-route-recommendation-harness",
);

export {
  loadRouteRecommendationSourceMock,
  getCurrentUserLocationPreferenceMock,
  trackRouteRecommendationUseMock,
  buildTrashSpotterRouteCandidatesMock,
  applyOriginRouteGeometryLegsMock,
  createFallbackRouteGeometryMock,
  routePolylineThroughFossgisFootMock,
  loadCachedEventPressureByArrondissementMock,
  getTerritoryArrondissementCenterMock,
  planRouteMock,
  fallbackRoutePrefixWithinBudgetMock,
  buildPredictedRouteCandidatesMock,
  buildRoutePlannerCandidatePoolMock,
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
  isRoutePlannerCandidateEligible: vi.fn<typeof import("@/lib/route/route-planner").isRoutePlannerCandidateEligible>(() => true),
  planRoute: planRouteMock,
  ROUTE_PLANNER_ENGINE_VERSION: "route-planner-v2",
  routeDistanceKm: vi.fn<typeof import("@/lib/route/route-planner").routeDistanceKm>(() => 1),
  travelMinutesForDistance: vi.fn<typeof import("@/lib/route/route-planner").travelMinutesForDistance>(() => 5),
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

export function plannerAudit(stops: ReturnType<typeof plannedStop>[]): RoutePlannerResult["audit"] {
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
    ],
  };
}

function createEmptyPredictionSummary(): RoutePredictionSummary {
  return {
    status: "unavailable",
    source: "urban-pressure-model",
    modelVersion: null,
    snapshot: null,
    riskFocus: "all",
    zonesConsidered: 0,
    candidatesConsidered: 0,
    admitted: 0,
    selected: 0,
    selectedCandidateIds: [],
    passedToPlanner: 0,
    excludedByPreselection: 0,
    excludedByPlannerBudget: 0,
    admittedCandidateIds: [],
    preselectionExcludedCandidateIds: [],
    preselectionExclusionReasons: {},
    excludedByFinalRoutingBudget: 0,
    finalRoutingBudgetExcludedCandidateIds: [],
    excludedByCorridor: 0,
    deduplicated: 0,
    warnings: [],
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
  getSupabaseServerClientMock.mockReturnValue(supabaseServerClientFixture);
  getCurrentUserLocationPreferenceMock.mockResolvedValue({
    arrondissement: 4,
    locationType: "residence",
  });
  getTerritoryArrondissementCenterMock.mockReturnValue({ lat: 48.86, lng: 2.36 });
  defaultRouteRecommendationFloorDateMock.mockReturnValue("2026-01-01");
  loadParisPressureSnapshotMock.mockReturnValue(null);
  applyParisPressureToCandidatesMock.mockImplementation((values) => values);
  const emptyPredictionSummary = createEmptyPredictionSummary();
  buildPredictedRouteCandidatesMock.mockReturnValue({ candidates: [], summary: emptyPredictionSummary });
  buildRoutePlannerCandidatePoolMock.mockImplementation(({ observedCandidates, predictedCandidates, maxCandidates, effectiveRiskFocus }) => {
    const candidates = [...observedCandidates, ...predictedCandidates].slice(0, maxCandidates);
    return {
      candidates,
      audit: {
        effectiveRiskFocus: effectiveRiskFocus ?? "all",
        admittedCandidateIds: candidates.map((item) => item.id),
        passedToPlannerCandidateIds: candidates.map((item) => item.id),
        excludedByPreselectionCandidateIds: [],
        excludedByPreselectionReasons: {},
      },
    };
  });
  applyRoutePredictionPoolAuditMock.mockImplementation((summary) => summary);
  applyRoutePredictionPlannerBudgetAuditMock.mockImplementation((summary) => summary);
  applyRoutePredictionFinalRoutingBudgetAuditMock.mockImplementation((summary, excludedIds) => ({
    ...summary,
    excludedByFinalRoutingBudget: excludedIds.length,
    finalRoutingBudgetExcludedCandidateIds: [...excludedIds],
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
      .map((item, index) => plannedStop(item, index));
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
