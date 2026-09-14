import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  availableSourceHealth,
  candidate,
  fallbackGeometry,
  plannedStop,
  request,
} from "./route.test.fixtures";

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

function plannerAudit(stops: Array<ReturnType<typeof plannedStop>>) {
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


describe("POST /api/route/recommend", () => {
  beforeEach(() => {
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
  });

  it("uses the effective authenticated session before route work", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
    }));

    expect(response.status).toBe(200);
    expect(getSafeAuthSessionMock).toHaveBeenCalledOnce();
    expect(loadRouteRecommendationSourceMock).toHaveBeenCalledOnce();
  });

  it("propagates the effective predictive focus to the response and trace", async () => {
    const summary = {
      status: "unavailable" as const,
      source: "urban-pressure-model" as const,
      modelVersion: null,
      snapshot: null,
      riskFocus: "all" as const,
      zonesConsidered: 0,
      candidatesConsidered: 0,
      admitted: 0,
      admittedCandidateIds: [],
      passedToPlanner: 0,
      excludedByPreselection: 0,
      excludedByPlannerBudget: 0,
      excludedByFinalRoutingBudget: 0,
      preselectionExcludedCandidateIds: [],
      preselectionExclusionReasons: {},
      finalRoutingBudgetExcludedCandidateIds: [],
      selected: 0,
      selectedCandidateIds: [],
      excludedByCorridor: 0,
      deduplicated: 0,
      excludedZoneIds: [],
      deduplicatedZoneIds: [],
      warnings: [],
    };
    buildPredictedRouteCandidatesMock.mockImplementation(({ effectiveRiskFocus }) => ({
      candidates: [],
      summary: { ...summary, riskFocus: effectiveRiskFocus },
    }));

    const { POST } = await import("./route");
    const wasteResponse = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      pickupPreference: "waste",
      riskFocus: "cigaretteButts",
    }));
    const cigaretteResponse = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      pickupPreference: "cigarette_butts",
      riskFocus: "waste",
    }));
    const wastePayload = await wasteResponse.json();
    const cigarettePayload = await cigaretteResponse.json();

    expect(wastePayload.prediction.riskFocus).toBe("waste");
    expect(wastePayload.trace.prediction.riskFocus).toBe("waste");
    expect(wastePayload.trace.parameters.effectiveRiskFocus).toBe("waste");
    expect(cigarettePayload.prediction.riskFocus).toBe("cigaretteButts");
    expect(cigarettePayload.trace.prediction.riskFocus).toBe("cigaretteButts");
    expect(cigarettePayload.trace.parameters.effectiveRiskFocus).toBe("cigaretteButts");
    expect(buildPredictedRouteCandidatesMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ effectiveRiskFocus: "waste" }),
    );
    expect(buildPredictedRouteCandidatesMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ effectiveRiskFocus: "cigaretteButts" }),
    );
  });

  it("returns 401 for an anonymous effective session before reading the source", async () => {
    getSafeAuthSessionMock.mockResolvedValueOnce({
      userId: null,
      clerkReachable: true,
      state: "anonymous",
    });

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
    }));

    expect(response.status).toBe(401);
    expect(verifyRateLimitMock).not.toHaveBeenCalled();
    expect(loadRouteRecommendationSourceMock).not.toHaveBeenCalled();
  });

  it("uses the local bypass identity for the route and best-effort tracking", async () => {
    getSafeAuthSessionMock.mockResolvedValueOnce({
      userId: "dev-benevole",
      clerkReachable: true,
      state: "authenticated",
    });
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
    }));

    expect(response.status).toBe(200);
    expect(trackRouteRecommendationUseMock).toHaveBeenCalledWith(
      {},
      { userId: "dev-benevole" },
    );
  });

  it("uses the authenticated expensive-route quota and returns 429 when exceeded", async () => {
    verifyRateLimitMock
      .mockResolvedValueOnce({ allowed: true, limit: 6, remaining: 5, reset: 1_000 })
      .mockResolvedValueOnce({ allowed: false, limit: 6, remaining: 0, reset: 1_000, retryAfter: 60 });

    const { POST } = await import("./route");
    const first = await POST(request());
    const second = await POST(request());

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(verifyRateLimitMock).toHaveBeenNthCalledWith(
      1,
      expect.any(Request),
      { limit: 6, window: 60 },
    );
    expect(loadRouteRecommendationSourceMock).toHaveBeenCalledWith(
      {},
      { limit: 600, floorDate: "2026-01-01" },
    );
    expect(loadRouteRecommendationSourceMock).toHaveBeenCalledTimes(1);
  });

  it("accepts the multi-group contract while stripping removed legacy fields", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({
        availableMinutes: 240,
        volunteers: 8,
        groupCount: 2,
        accessibility: "strict",
        security: "renforced",
        weather: "rain",
        impactVsDistance: 15,
        priorityVsDistance: 35,
        maxStops: 4,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.constraintsApplied).toEqual({ pickupPreference: "balanced" });
    expect(payload.volunteers).toBe(8);
    expect(payload.groupCount).toBe(2);
    expect(payload.groups).toHaveLength(2);
    expect(payload.scoreBreakdown).toEqual({ priority: 0, distance: 0 });
    expect(buildTrashSpotterRouteCandidatesMock).toHaveBeenCalledWith(
      [],
      expect.any(Date),
      expect.any(Map),
    );
  });

  it("accepts priorityVsDistance as a temporary alias and maxStops = 1", async () => {
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      priorityVsDistance: 20,
      maxStops: 1,
    }));

    expect(response.status).toBe(200);
    expect(planRouteMock).toHaveBeenCalledWith(
      expect.objectContaining({ priorityVsTravel: 20, maxStops: 1 }),
    );
  });

  it("returns the planner diagnostics and budget-safe output fields", async () => {
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);
    const diagnosticPlannerResult = {
      stops: [plannedStop()],
      diagnostics: { excludedUnsafe: 1, excludedByTravelBudget: 2 },
      audit: plannerAudit([plannedStop()]),
    };
    planRouteMock
      .mockReturnValueOnce(diagnosticPlannerResult)
      .mockReturnValueOnce(diagnosticPlannerResult);
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce(fallbackGeometry([], 8));

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      travelBudgetMinutes: 10,
    }));
    const payload = await response.json();

    expect(payload).toEqual(expect.objectContaining({
      status: "degraded",
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      travelDistanceKm: expect.any(Number),
      travelMinutes: expect.any(Number),
      travelBudgetMinutes: 10,
      withinBudget: true,
      serviceMinutesEstimate: null,
      totalMinutesEstimate: null,
      engineVersion: "route-planner-v2",
      generatedAt: expect.any(String),
    }));
    expect(payload.diagnostics).toEqual(expect.objectContaining({
      loaded: 0,
      eligible: 1,
      excluded: 0,
      selected: 1,
      sourcePartial: false,
      truncated: false,
      excludedUnsafe: 1,
      excludedByTravelBudget: 2,
    }));
    expect(payload.travelMinutes).toBeLessThanOrEqual(payload.travelBudgetMinutes);
  });

  it("returns empty, partial and unavailable source states distinctly", async () => {
    const { POST } = await import("./route");

    const emptyResponse = await POST(request());
    expect((await emptyResponse.json())).toEqual(
      expect.objectContaining({ status: "empty", dataStatus: "empty" }),
    );

    loadRouteRecommendationSourceMock.mockResolvedValueOnce({
      items: ["spot"],
      isTruncated: true,
      sourceHealth: availableSourceHealth,
    });
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);
    const partialResponse = await POST(request());
    const partialPayload = await partialResponse.json();
    expect(partialPayload.status).toBe("degraded");
    expect(partialPayload.dataStatus).toBe("partial");
    expect(partialPayload.isTruncated).toBe(true);

    loadRouteRecommendationSourceMock.mockResolvedValueOnce({
      items: [],
      isTruncated: false,
      sourceHealth: {
        partial: true,
        failedSources: ["spots"],
        availableSources: [],
        warnings: ["Partial data: source(s) unavailable (spots)."],
      },
    });
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([]);
    const unavailableResponse = await POST(request());
    const unavailablePayload = await unavailableResponse.json();
    expect(unavailablePayload.status).toBe("degraded");
    expect(unavailablePayload.dataStatus).toBe("unavailable");
    expect(unavailablePayload.sourceHealth.failedSources).toEqual(["spots"]);
  });
});
