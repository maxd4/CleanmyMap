import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ROUTE_OPTIONS } from "./route-draft-storage";
import {
  createRouteRequestGate,
  createRouteRecommendationRequest,
  fetchRouteRecommendation,
  isRouteOriginUnavailableError,
} from "./route-request";

const responsePayload = {
  status: "ok",
  dataStatus: "empty",
  isTruncated: false,
  sourceHealth: {
    partial: false,
    failedSources: [],
    availableSources: ["spots"],
    warnings: [],
  },
  origin: {
    latitude: 48.86,
    longitude: 2.36,
    source: "approximate_saved_area",
  },
  travelDistanceKm: 2.4,
  travelMinutes: 32,
  travelBudgetMinutes: 60,
  withinBudget: true,
  serviceMinutesEstimate: null,
  totalMinutesEstimate: null,
  diagnostics: {
    excludedUnsafe: 0,
    excludedByTravelBudget: 1,
  },
  generatedAt: "2026-09-02T10:00:00.000Z",
  engineVersion: "route-planner-v1",
  stops: [],
  routeGeometry: {
    coordinates: [],
    distanceKm: 0,
    durationMinutes: 0,
    legs: [],
    provider: "none",
    profile: null,
    mode: "fallback",
    estimated: true,
  },
  scoreBreakdown: { priority: 0, distance: 0 },
  tradeoffs: [],
  proactiveAssistant: {
    actNow: "",
    criticalNearby: "",
    mostUsefulAction: "",
    operationalSignalZones: [],
    upcomingEvents: [],
    hotspots: [],
  },
} as const;

describe("route recommendation request gate", () => {
  it("keeps the submitted snapshot stable while the draft is edited", async () => {
    const submitted = createRouteRecommendationRequest(1, DEFAULT_ROUTE_OPTIONS);
    const editedOptions = {
      ...DEFAULT_ROUTE_OPTIONS,
      priorityVsTravel: 20,
    };
    const transport = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responsePayload), { status: 200 }),
    );

    await fetchRouteRecommendation(submitted, transport);

    expect(transport).toHaveBeenCalledOnce();
    expect(JSON.parse(transport.mock.calls[0]?.[1]?.body as string)).toEqual(
      DEFAULT_ROUTE_OPTIONS,
    );
    expect(submitted.options).not.toBe(editedOptions);
    expect(submitted.options).toEqual(DEFAULT_ROUTE_OPTIONS);
  });

  it("performs one POST for each explicit calculation request", async () => {
    const transport = vi.fn().mockImplementation(
      async () => new Response(JSON.stringify(responsePayload), { status: 200 }),
    );

    await fetchRouteRecommendation(
      createRouteRecommendationRequest(1, DEFAULT_ROUTE_OPTIONS),
      transport,
    );
    await fetchRouteRecommendation(
      createRouteRecommendationRequest(
        2,
        { ...DEFAULT_ROUTE_OPTIONS, maxStops: 8 },
      ),
      transport,
    );

    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("transports an ephemeral browser origin alongside, not inside, the options", async () => {
    const origin = { latitude: 48.861, longitude: 2.361, source: "browser" } as const;
    const request = createRouteRecommendationRequest(3, DEFAULT_ROUTE_OPTIONS, origin);
    const transport = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responsePayload), { status: 200 }),
    );

    await fetchRouteRecommendation(request, transport);

    expect(request.options).toEqual(DEFAULT_ROUTE_OPTIONS);
    expect(request.options).not.toHaveProperty("origin");
    expect(JSON.parse(transport.mock.calls[0]?.[1]?.body as string)).toEqual({
      ...DEFAULT_ROUTE_OPTIONS,
      origin,
    });
  });

  it("maps HTTP 422 to the origin-unavailable error", async () => {
    const transport = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "A route origin is required." }), { status: 422 }),
    );

    await expect(
      fetchRouteRecommendation(
        createRouteRecommendationRequest(4, DEFAULT_ROUTE_OPTIONS),
        transport,
      ),
    ).rejects.toSatisfy((error: unknown) => isRouteOriginUnavailableError(error));
  });

  it("allows only one request while the explicit calculation is in flight", () => {
    const gate = createRouteRequestGate();

    expect(gate.start()).toBe(true);
    expect(gate.start()).toBe(false);
    gate.finish();
    expect(gate.start()).toBe(true);
  });
});
