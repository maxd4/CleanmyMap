import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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
const loadCachedRouteEventSignalContextMock = vi.hoisted(() => vi.fn());
const loadRouteEventCenteredAnchorMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const getTerritoryArrondissementCenterMock = vi.hoisted(() => vi.fn());
const planRouteMock = vi.hoisted(() => vi.fn());
const longestNetworkPrefixWithinBudgetMock = vi.hoisted(() => vi.fn());
const fallbackRoutePrefixWithinBudgetMock = vi.hoisted(() => vi.fn());

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
vi.mock("@/lib/route/route-planner", async (importOriginal) => ({
  ...(await importOriginal()),
  fallbackRoutePrefixWithinBudget: fallbackRoutePrefixWithinBudgetMock,
  longestNetworkPrefixWithinBudget: longestNetworkPrefixWithinBudgetMock,
  planRoute: planRouteMock,
  ROUTE_PLANNER_ENGINE_VERSION: "route-planner-v1",
}));
vi.mock("@/lib/route/recommendation-assistant", () => ({
  buildHotspots: buildHotspotsMock,
  buildProactiveAssistant: buildProactiveAssistantMock,
  defaultRouteAssistantPayload: defaultRouteAssistantPayloadMock,
  defaultRouteRecommendationFloorDate: defaultRouteRecommendationFloorDateMock,
}));
vi.mock("@/lib/route/route-event-pressure-loader", () => ({
  loadCachedRouteEventSignalContext: loadCachedRouteEventSignalContextMock,
}));
vi.mock("@/lib/route/route-event-centered-loader", () => ({
  loadRouteEventCenteredAnchor: loadRouteEventCenteredAnchorMock,
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

const availableSourceHealth = {
  partial: false,
  failedSources: [],
  availableSources: ["spots"],
  warnings: [],
};

const candidate = {
  id: "spot-1",
  label: "Paris 4e",
  latitude: 48.85,
  longitude: 2.35,
  score: 80,
  reason: "Signalement récent",
};

const fallbackGeometry = (
  coordinates: [number, number][] = [],
  durationMinutes = 0,
) => ({
  coordinates,
  distanceKm: 1,
  durationMinutes,
  legs: [],
  provider: "none",
  profile: null,
  mode: "fallback",
  estimated: true,
});

function request(payload: unknown = {}) {
  return new Request("http://localhost/api/route/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function plannedStop(candidateValue = candidate, index = 0) {
  return {
    candidate: candidateValue,
    incrementalDistanceKm: index + 1,
    incrementalTravelMinutes: index + 5,
    cumulativeTravelMinutes: (index + 1) * 5,
  };
}

function plannerAudit(stops: ReturnType<typeof plannedStop>[]) {
  return {
    evaluations: [],
    selections: stops.map((stop, index) => ({
      candidateId: stop.candidate.id,
      step: index + 1,
      incrementalDistanceKm: stop.incrementalDistanceKm,
      incrementalTravelMinutes: stop.incrementalTravelMinutes,
      cumulativeTravelMinutes: stop.cumulativeTravelMinutes,
      normalizedPriority: stop.candidate.score / 100,
      normalizedTravel: 0.5,
      combinedScore: 0.5,
      feasible: true,
      selectionReason: `Étape ${index + 1}: test planner`,
    })),
    orderingCriteria: [
      "combined_score_desc",
      "priority_desc",
      "incremental_travel_asc",
      "id_lexicographic",
    ],
  } as const;
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
    loadCachedRouteEventSignalContextMock.mockResolvedValue({
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
      candidates: [
        expect.objectContaining({
          id: candidate.id,
          parisPressure: expect.objectContaining({ zoneId: expect.any(String) }),
        }),
      ],
      travelBudgetMinutes: 42,
      maxStops: 1,
      priorityVsTravel: 25,
    });
    expect((await response.json()).origin).toEqual(explicitOrigin);
  });

  it("passes event-centered planning through the canonical scoring and trace", async () => {
    const eventId = "11111111-1111-4111-8111-111111111111";
    const eventAnchor = {
      id: eventId,
      title: "Fête de quartier",
      eventDate: "2026-09-03",
      locationLabel: "Place de test",
      latitude: 48.8566,
      longitude: 2.3522,
    } as const;
    const farCandidate = { ...candidate, id: "far", score: 100, latitude: 48.91 };
    const nearCandidate = { ...candidate, id: "near", score: 40, latitude: 48.857 };
    loadRouteEventCenteredAnchorMock.mockResolvedValueOnce(eventAnchor);
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([
      farCandidate,
      nearCandidate,
    ]);

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      planningMode: { type: "event-centered", eventId },
      maxStops: 1,
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(loadRouteEventCenteredAnchorMock).toHaveBeenCalledWith({}, eventId);
    expect(planRouteMock).toHaveBeenCalledWith(expect.objectContaining({
      candidates: expect.arrayContaining([
        expect.objectContaining({ id: "near", eventCenteredInfluence: expect.any(Object) }),
      ]),
    }));
    expect(planRouteMock.mock.calls[0]?.[0].candidates[0].id).toBe("near");
    expect(payload.planningMode).toEqual({ type: "event-centered", eventId });
    expect(payload.trace.eventCentered).toEqual(expect.objectContaining({
      event: eventAnchor,
      role: "post_event_anchor",
      selectedCandidateIds: ["near"],
    }));
  });

  it("refuses event-centered calculation when the selected event has no precise location", async () => {
    const eventId = "22222222-2222-4222-8222-222222222222";
    loadRouteEventCenteredAnchorMock.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      planningMode: { type: "event-centered", eventId },
    }));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "A geolocated event is required for event-centered planning.",
    });
    expect(loadRouteRecommendationSourceMock).not.toHaveBeenCalled();
    expect(planRouteMock).not.toHaveBeenCalled();
  });

  it("keeps a future event explicit as an anticipation anchor", async () => {
    const eventId = "33333333-3333-4333-8333-333333333333";
    loadRouteEventCenteredAnchorMock.mockResolvedValueOnce({
      id: eventId,
      title: "Événement à venir",
      eventDate: "2026-09-06",
      locationLabel: "Parc de test",
      latitude: 48.8566,
      longitude: 2.3522,
    });

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
      planningMode: { type: "event-centered", eventId },
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.trace.eventCentered).toEqual(expect.objectContaining({
      temporalStatus: "future",
      role: "anticipation_anchor",
      ageDays: null,
    }));
  });

  it("forwards geospatial event pressure to the route candidate scoring step", async () => {
    const eventPressure = {
      combinedPressure: 0.75,
      scoreBoost: 15,
      contributions: [],
    };
    const pressureByCandidateId = new Map([[candidate.id, eventPressure]]);
    const actionableCandidate = {
      ...candidate,
      safety: { specializationReason: null },
    };
    buildTrashSpotterActionableCandidatesMock.mockReturnValueOnce([
      actionableCandidate,
    ]);
    loadCachedRouteEventSignalContextMock.mockResolvedValueOnce({
      candidatePressureById: pressureByCandidateId,
      completedEventsConsidered: 1,
      geolocatedCompletedEvents: 1,
      eventsWithoutCoordinates: 0,
      futureEventSignals: [],
      sourceAvailable: true,
      warnings: [],
    });
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);

    const { POST } = await import("./route");
    const response = await POST(request({
      origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
    }));

    expect(response.status).toBe(200);
    expect(buildTrashSpotterRouteCandidatesMock).toHaveBeenCalledWith(
      [actionableCandidate],
      expect.any(Date),
      pressureByCandidateId,
    );
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
    loadCachedRouteEventSignalContextMock.mockRejectedValueOnce(
      new Error("event source unavailable"),
    );
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);

    const { POST } = await import("./route");
    const response = await POST(request({ origin: { latitude: 48.85, longitude: 2.35, source: "browser" } }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.dataStatus).toBe("complete");
    expect(payload.proactiveAssistant.upcomingEvents).toEqual([]);
    expect(payload.trace.eventSignal).toEqual(expect.objectContaining({
      sourceAvailable: false,
    }));
    expect(payload.trace.fallbacks).toContain("event_signal_unavailable");
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

  it("reduces an over-budget network route without a second FOSSGIS call", async () => {
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
    routePolylineThroughFossgisFootMock.mockResolvedValueOnce(networkGeometry);
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
    expect(routePolylineThroughFossgisFootMock).toHaveBeenCalledOnce();
    expect(payload.stops).toHaveLength(1);
    expect(payload.travelMinutes).toBeLessThanOrEqual(payload.travelBudgetMinutes);
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
    planRouteMock.mockReturnValueOnce({
      stops: [plannedStop()],
      diagnostics: { excludedUnsafe: 1, excludedByTravelBudget: 2 },
      audit: plannerAudit([plannedStop()]),
    });
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
      trace: expect.objectContaining({
        engineVersion: "route-planner-v1",
        parameters: expect.objectContaining({
          travelBudgetMinutes: 10,
          maxStops: 6,
          priorityVsTravel: 65,
        }),
        origin: { latitude: 48.85, longitude: 2.35, source: "browser" },
        selectedStops: expect.any(Array),
      }),
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
    expect(unavailablePayload.trace.candidates.excludedByReason).toEqual(
      expect.objectContaining({ source_unavailable: 1 }),
    );
  });
});
