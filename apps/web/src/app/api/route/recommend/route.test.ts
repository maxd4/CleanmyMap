import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const buildTrashSpotterActionableCandidatesMock = vi.hoisted(() => vi.fn());
const getCurrentUserLocationPreferenceMock = vi.hoisted(() => vi.fn());
const trackRouteRecommendationUseMock = vi.hoisted(() => vi.fn());
const buildTrashSpotterRouteCandidatesMock = vi.hoisted(() => vi.fn());
const distanceKmMock = vi.hoisted(() => vi.fn());
const selectNextTrashSpotterStopMock = vi.hoisted(() => vi.fn());
const applyRouteGeometryLegsMock = vi.hoisted(() => vi.fn());
const createFallbackRouteGeometryMock = vi.hoisted(() => vi.fn());
const routePolylineThroughStreetNetworkMock = vi.hoisted(() => vi.fn());
const buildHotspotsMock = vi.hoisted(() => vi.fn());
const buildProactiveAssistantMock = vi.hoisted(() => vi.fn());
const defaultRouteAssistantPayloadMock = vi.hoisted(() => vi.fn());
const defaultRouteRecommendationFloorDateMock = vi.hoisted(() => vi.fn());
const loadCachedEventPressureByArrondissementMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
}));
vi.mock("@/lib/actions/unified-source", () => ({
  fetchUnifiedActionContracts: fetchUnifiedActionContractsMock,
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
  distanceKm: distanceKmMock,
  selectNextTrashSpotterStop: selectNextTrashSpotterStopMock,
}));
vi.mock("@/lib/route/route-contract", () => ({
  applyRouteGeometryLegs: applyRouteGeometryLegsMock,
}));
vi.mock("@/lib/geo/osrm-routing", () => ({
  createFallbackRouteGeometry: createFallbackRouteGeometryMock,
  routePolylineThroughStreetNetwork: routePolylineThroughStreetNetworkMock,
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

const fallbackGeometry = {
  coordinates: [],
  distanceKm: 0,
  durationMinutes: 0,
  legs: [],
  provider: "none",
  profile: null,
  mode: "fallback",
  estimated: true,
};

function request(payload: unknown = {}) {
  return new Request("http://localhost/api/route/recommend", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/route/recommend", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    authMock.mockResolvedValue({ userId: "user-1" });
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
    getCurrentUserLocationPreferenceMock.mockResolvedValue(null);
    defaultRouteRecommendationFloorDateMock.mockReturnValue("2026-01-01");
    loadCachedEventPressureByArrondissementMock.mockResolvedValue({
      pressureByArrondissement: new Map(),
      eventSignals: [],
    });
    fetchUnifiedActionContractsMock.mockResolvedValue({
      items: [],
      isTruncated: false,
      sourceHealth: availableSourceHealth,
    });
    buildTrashSpotterActionableCandidatesMock.mockReturnValue([]);
    buildTrashSpotterRouteCandidatesMock.mockReturnValue([]);
    createFallbackRouteGeometryMock.mockReturnValue(fallbackGeometry);
    distanceKmMock.mockReturnValue(1);
    selectNextTrashSpotterStopMock.mockReturnValue(null);
    routePolylineThroughStreetNetworkMock.mockResolvedValue(fallbackGeometry);
    applyRouteGeometryLegsMock.mockImplementation((stops) => stops);
    buildHotspotsMock.mockReturnValue([]);
    defaultRouteAssistantPayloadMock.mockReturnValue({
      actNow: "",
      criticalNearby: "",
      mostUsefulAction: "",
      operationalSignalZones: [],
      upcomingEvents: [],
      hotspots: [],
    });
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

  it("applies the authenticated expensive-route quota and returns 429 when exceeded", async () => {
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
    expect(fetchUnifiedActionContractsMock).toHaveBeenCalledTimes(1);
  });

  it("continues the main calculation when event pressure fails", async () => {
    loadCachedEventPressureByArrondissementMock.mockRejectedValueOnce(
      new Error("event source unavailable"),
    );
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);

    const { POST } = await import("./route");
    const response = await POST(request());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.dataStatus).toBe("complete");
    expect(payload.proactiveAssistant.upcomingEvents).toEqual([]);
    expect(trackRouteRecommendationUseMock).toHaveBeenCalledOnce();
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
    expect(buildTrashSpotterRouteCandidatesMock).toHaveBeenCalledWith([]);
  });

  it("returns empty, partial and unavailable source states distinctly", async () => {
    const { POST } = await import("./route");

    const emptyResponse = await POST(request());
    expect((await emptyResponse.json()).dataStatus).toBe("empty");

    fetchUnifiedActionContractsMock.mockResolvedValueOnce({
      items: ["spot"],
      isTruncated: true,
      sourceHealth: availableSourceHealth,
    });
    buildTrashSpotterRouteCandidatesMock.mockReturnValueOnce([candidate]);
    const partialResponse = await POST(request());
    const partialPayload = await partialResponse.json();
    expect(partialPayload.dataStatus).toBe("partial");
    expect(partialPayload.isTruncated).toBe(true);

    fetchUnifiedActionContractsMock.mockResolvedValueOnce({
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
    expect(unavailablePayload.dataStatus).toBe("unavailable");
    expect(unavailablePayload.sourceHealth.failedSources).toEqual(["spots"]);
  });
});
