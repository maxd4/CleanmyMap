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
const longestNetworkPrefixWithinBudgetMock = vi.hoisted(() => vi.fn());
const fallbackRoutePrefixWithinBudgetMock = vi.hoisted(() => vi.fn());
const loadParisPressureSnapshotMock = vi.hoisted(() => vi.fn());
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
  longestNetworkPrefixWithinBudget: longestNetworkPrefixWithinBudgetMock,
  planRoute: planRouteMock,
  ROUTE_PLANNER_ENGINE_VERSION: "route-planner-v1",
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
    selections: stops.map(({ candidate: selectedCandidate, incrementalDistanceKm, incrementalTravelMinutes, cumulativeTravelMinutes }, index) => ({
      candidateId: selectedCandidate.id,
      step: index + 1,
      incrementalDistanceKm,
      incrementalTravelMinutes,
      cumulativeTravelMinutes,
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
    longestNetworkPrefixWithinBudgetMock.mockReturnValue(0);
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

  it("ignores removed legacy route fields at the HTTP boundary", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({
        availableMinutes: 240,
        volunteers: 8,
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
    expect(payload.constraintsApplied).toBeUndefined();
    expect(payload.scoreBreakdown).toEqual({ priority: 0, distance: 0 });
    expect(buildTrashSpotterRouteCandidatesMock).toHaveBeenCalledWith(
      [],
      expect.any(Date),
      expect.any(Map),
    );
  });

  it("passes an explicit origin and all planner options to planRoute", async () => {
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);
    const explicitOrigin = { latitude: 48.9, longitude: 2.4, source: "map" } as const;

    const { POST } = await import("./route");
    const response = await POST(
      request({
        origin: explicitOrigin,
        travelBudgetMinutes: 42,
        maxStops: 1,
        priorityVsTravel: 25,
      }),
    );

    expect(response.status).toBe(200);
    expect(planRouteMock).toHaveBeenCalledWith({
      origin: explicitOrigin,
      candidates: [candidate],
      travelBudgetMinutes: 42,
      maxStops: 1,
      priorityVsTravel: 25,
    });
    expect((await response.json()).origin).toEqual(explicitOrigin);
  });

  it("falls back to the saved arrondissement center", async () => {
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);

    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(getTerritoryArrondissementCenterMock).toHaveBeenCalledWith(4);
    expect(planRouteMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: {
          latitude: 48.86,
          longitude: 2.36,
          source: "approximate_saved_area",
        },
      }),
    );
  });

  it("returns 422 when neither an explicit nor saved origin exists", async () => {
    getCurrentUserLocationPreferenceMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(loadRouteRecommendationSourceMock).not.toHaveBeenCalled();
    expect(planRouteMock).not.toHaveBeenCalled();
  });

  it("continues the main calculation when event pressure fails", async () => {
    loadCachedEventPressureByArrondissementMock.mockRejectedValueOnce(
      new Error("event source unavailable"),
    );
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);

    const { POST } = await import("./route");
    const response = await POST(request({ origin: { latitude: 48.85, longitude: 2.35, source: "browser" } }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.dataStatus).toBe("complete");
    expect(payload.proactiveAssistant.upcomingEvents).toEqual([]);
    expect(trackRouteRecommendationUseMock).toHaveBeenCalledOnce();
  });

  it("sends origin followed by stops to FOSSGIS and applies origin legs", async () => {
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);
    const networkGeometry = {
      ...fallbackGeometry(),
      coordinates: [[48.9, 2.4], [candidate.latitude, candidate.longitude]],
      distanceKm: 2,
      durationMinutes: 12,
      legs: [{ fromStopIndex: 0, toStopIndex: 1, distanceKm: 2, estimatedMinutes: 12 }],
      provider: "fossgis-osrm",
      profile: "foot",
      mode: "network",
      estimated: false,
    } as const;
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce(networkGeometry);
    const explicitOrigin = { latitude: 48.9, longitude: 2.4, source: "map" } as const;

    const { POST } = await import("./route");
    const response = await POST(request({ origin: explicitOrigin }));

    expect(response.status).toBe(200);
    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledWith(
      [[explicitOrigin.latitude, explicitOrigin.longitude], [candidate.latitude, candidate.longitude]],
      {},
    );
    expect(applyOriginRouteGeometryLegsMock).toHaveBeenCalledWith(
      expect.any(Array),
      networkGeometry,
    );
  });

  it("recalcule la géométrie réseau pour le préfixe final retenu", async () => {
    const secondCandidate = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(candidate), plannedStop(secondCandidate, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate, secondCandidate]);
    planRouteMock.mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    const networkGeometry = {
      ...fallbackGeometry(),
      durationMinutes: 70,
      mode: "network",
      legs: [
        { fromStopIndex: 0, toStopIndex: 1, distanceKm: 2, estimatedMinutes: 40 },
        { fromStopIndex: 1, toStopIndex: 2, distanceKm: 2, estimatedMinutes: 30 },
      ],
      provider: "fossgis-osrm",
      profile: "foot",
      estimated: false,
    } as const;
    const reconciledGeometry = {
      ...networkGeometry,
      coordinates: [[48.9, 2.4], [candidate.latitude, candidate.longitude]],
      distanceKm: 1.5,
      durationMinutes: 40,
      legs: [networkGeometry.legs[0]],
    } as const;
    routePolylineThroughFossgisFootMock
      .mockResolvedValueOnce(networkGeometry)
      .mockResolvedValueOnce(reconciledGeometry);
    longestNetworkPrefixWithinBudgetMock.mockReturnValueOnce(1);
    createFallbackRouteGeometryMock.mockImplementation(
      (coordinates: [number, number][]) => fallbackGeometry(coordinates, 8),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

    expect(longestNetworkPrefixWithinBudgetMock).toHaveBeenCalledWith(
      networkGeometry.legs,
      60,
    );
    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledTimes(2);
    expect(routePolylineThroughFossgisFootMock).toHaveBeenNthCalledWith(
      2,
      [[48.9, 2.4], [candidate.latitude, candidate.longitude]],
      {},
    );
    expect(payload.routeGeometry).toEqual(reconciledGeometry);
    expect(payload.stops).toHaveLength(1);
    expect(payload.travelMinutes).toBeLessThanOrEqual(payload.travelBudgetMinutes);
    expect(payload.trace.finalRoutingReconciliation).toEqual(expect.objectContaining({
      stopsBefore: 2,
      stopsAfter: 1,
      excludedCandidateIds: ["spot-2"],
      providerCalls: 2,
      degraded: false,
    }));
  });

  it("dégrade explicitement si la seconde mesure réseau échoue", async () => {
    const secondCandidate = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(candidate), plannedStop(secondCandidate, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate, secondCandidate]);
    planRouteMock.mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    const overBudgetNetwork = {
      ...fallbackGeometry(),
      durationMinutes: 70,
      mode: "network" as const,
      provider: "fossgis-osrm" as const,
      profile: "foot" as const,
      estimated: false,
      legs: [
        { fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 40 },
        { fromStopIndex: 1, toStopIndex: 2, distanceKm: 1, estimatedMinutes: 30 },
      ],
    };
    routePolylineThroughFossgisFootMock
      .mockResolvedValueOnce(overBudgetNetwork)
      .mockRejectedValueOnce(new Error("provider unavailable"));
    longestNetworkPrefixWithinBudgetMock.mockReturnValueOnce(1);
    fallbackRoutePrefixWithinBudgetMock.mockReturnValueOnce([plannedStops[0]]);
    createFallbackRouteGeometryMock.mockImplementation(
      (coordinates: [number, number][]) => fallbackGeometry(coordinates, 8),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledTimes(2);
    expect(payload.routeGeometry.mode).toBe("fallback");
    expect(payload.status).toBe("degraded");
    expect(payload.trace.finalRoutingReconciliation).toEqual(expect.objectContaining({
      providerCalls: 2,
      degraded: true,
      excludedCandidateIds: ["spot-2"],
    }));
    expect(payload.trace.warnings).toContain(
      "La seconde mesure réseau a échoué après la réduction au budget ; un fallback local est utilisé.",
    );
  });

  it("n'effectue pas de second appel lorsque le préfixe réseau est vide", async () => {
    const secondCandidate = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(candidate), plannedStop(secondCandidate, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate, secondCandidate]);
    planRouteMock.mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce({
      ...fallbackGeometry(),
      durationMinutes: 70,
      mode: "network",
      provider: "fossgis-osrm",
      profile: "foot",
      estimated: false,
      legs: [],
    });
    longestNetworkPrefixWithinBudgetMock.mockReturnValueOnce(0);

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledOnce();
    expect(payload.stops).toEqual([]);
    expect(payload.trace.finalRoutingReconciliation).toEqual(expect.objectContaining({
      stopsBefore: 2,
      stopsAfter: 0,
      providerCalls: 1,
    }));
  });

  it("audite une prédiction retirée uniquement par le budget réseau final", async () => {
    const predicted = {
      ...candidate,
      id: "predicted:zone-1",
      family: "predicted" as const,
      evidence: { family: "predicted" as const },
    };
    const observed = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(observed), plannedStop(predicted, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([observed]);
    buildPredictedRouteCandidatesMock.mockReturnValueOnce({
      candidates: [predicted],
      summary: {
        status: "available",
        selected: 0,
        selectedCandidateIds: [],
        admittedCandidateIds: [predicted.id],
        passedToPlanner: 1,
        excludedByPreselection: 0,
        excludedByPlannerBudget: 0,
        preselectionExcludedCandidateIds: [],
        excludedByFinalRoutingBudget: 0,
        finalRoutingBudgetExcludedCandidateIds: [],
      },
    });
    buildRoutePlannerCandidatePoolMock.mockReturnValueOnce({
      candidates: [predicted, observed],
      audit: {
        admittedCandidateIds: [predicted.id, observed.id],
        passedToPlannerCandidateIds: [predicted.id, observed.id],
        excludedByPreselectionCandidateIds: [],
      },
    });
    planRouteMock.mockReturnValueOnce({
      stops: [],
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit([]),
    }).mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    routePolylineThroughFossgisFootMock
      .mockResolvedValueOnce({
        ...fallbackGeometry(),
        durationMinutes: 70,
        mode: "network",
        provider: "fossgis-osrm",
        profile: "foot",
        estimated: false,
        legs: [
          { fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 40 },
          { fromStopIndex: 1, toStopIndex: 2, distanceKm: 1, estimatedMinutes: 30 },
        ],
      })
      .mockResolvedValueOnce({
        ...fallbackGeometry(),
        durationMinutes: 40,
        mode: "network",
        provider: "fossgis-osrm",
        profile: "foot",
        estimated: false,
        legs: [{ fromStopIndex: 0, toStopIndex: 1, distanceKm: 1, estimatedMinutes: 40 }],
      });
    longestNetworkPrefixWithinBudgetMock.mockReturnValueOnce(1);

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

    expect(payload.stops.map((stop: { id: string }) => stop.id)).toEqual([observed.id]);
    expect(payload.prediction.selected).toBe(0);
    expect(payload.prediction.excludedByFinalRoutingBudget).toBe(1);
    expect(payload.prediction.finalRoutingBudgetExcludedCandidateIds).toEqual([predicted.id]);
    expect(payload.prediction.excludedByPreselection).toBe(0);
    expect(payload.prediction.excludedByPlannerBudget).toBe(0);
  });

  it("reduces an over-budget fallback route locally", async () => {
    const secondCandidate = { ...candidate, id: "spot-2", latitude: 48.86 };
    const plannedStops = [plannedStop(candidate), plannedStop(secondCandidate, 1)];
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate, secondCandidate]);
    planRouteMock.mockReturnValueOnce({
      stops: plannedStops,
      diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 0 },
      audit: plannerAudit(plannedStops),
    });
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce(fallbackGeometry([], 70));
    fallbackRoutePrefixWithinBudgetMock.mockReturnValueOnce([plannedStops[0]]);
    createFallbackRouteGeometryMock.mockImplementation(
      (coordinates: [number, number][]) => fallbackGeometry(coordinates, 9),
    );

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.9, longitude: 2.4, source: "browser" },
      travelBudgetMinutes: 60,
    }));
    const payload = await response.json();

    expect(fallbackRoutePrefixWithinBudgetMock).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 48.9, longitude: 2.4 }),
      plannedStops.map(({ candidate: plannedCandidate }) => plannedCandidate),
      60,
      expect.any(Function),
    );
    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledOnce();
    expect(payload.stops).toHaveLength(1);
    expect(payload.travelMinutes).toBeLessThanOrEqual(60);
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
      engineVersion: "route-planner-v1",
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
