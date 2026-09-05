import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ROUTE_OPTIONS } from "./route-draft-storage";
import {
  createRouteRequestGate,
  createRouteRecommendationSubmission,
  fetchRouteRecommendation,
  isRouteOriginUnavailableError,
  resolveRouteRequestOrigin,
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
    loaded: 0,
    eligible: 0,
    excluded: 0,
    selected: 0,
    sourcePartial: false,
    truncated: false,
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
    const submitted = createRouteRecommendationSubmission(1, DEFAULT_ROUTE_OPTIONS);
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

  it("serializes only the shared HTTP fields, never the UI snapshot wrapper", async () => {
    const submitted = createRouteRecommendationSubmission(
      11,
      { priorityVsTravel: 23, travelBudgetMinutes: 42, maxStops: 4 },
    );
    const transport = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responsePayload), { status: 200 }),
    );

    await fetchRouteRecommendation(submitted, transport);

    const payload = JSON.parse(transport.mock.calls[0]?.[1]?.body as string);
    expect(payload).toEqual({
      priorityVsTravel: 23,
      travelBudgetMinutes: 42,
      maxStops: 4,
    });
    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("options");
  });

  it("performs one POST for each explicit calculation request", async () => {
    const transport = vi.fn().mockImplementation(
      async () => new Response(JSON.stringify(responsePayload), { status: 200 }),
    );

    await fetchRouteRecommendation(
      createRouteRecommendationSubmission(1, DEFAULT_ROUTE_OPTIONS),
      transport,
    );
    await fetchRouteRecommendation(
      createRouteRecommendationSubmission(
        2,
        { ...DEFAULT_ROUTE_OPTIONS, maxStops: 8 },
      ),
      transport,
    );

    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("transports an ephemeral browser origin alongside, not inside, the options", async () => {
    const origin = { latitude: 48.861, longitude: 2.361, source: "browser" } as const;
    const request = createRouteRecommendationSubmission(3, DEFAULT_ROUTE_OPTIONS, origin);
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

  it("omits origin from the HTTP payload when the submission has no origin", async () => {
    const transport = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responsePayload), { status: 200 }),
    );

    await fetchRouteRecommendation(
      createRouteRecommendationSubmission(12, DEFAULT_ROUTE_OPTIONS),
      transport,
    );

    expect(JSON.parse(transport.mock.calls[0]?.[1]?.body as string)).not.toHaveProperty("origin");
  });

  it("maps HTTP 422 to the origin-unavailable error", async () => {
    const transport = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "A route origin is required." }), { status: 422 }),
    );

    await expect(
      fetchRouteRecommendation(
        createRouteRecommendationSubmission(4, DEFAULT_ROUTE_OPTIONS),
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

  it("uses a selected map origin without invoking browser geolocation", async () => {
    const browserResolver = vi.fn();
    const mapOrigin = { latitude: 48.87, longitude: 2.37, source: "map" as const };

    await expect(
      resolveRouteRequestOrigin("map", mapOrigin, browserResolver),
    ).resolves.toEqual(mapOrigin);
    expect(browserResolver).not.toHaveBeenCalled();
  });

  it("resolves browser geolocation only for the browser origin mode", async () => {
    const browserOrigin = {
      latitude: 48.8566,
      longitude: 2.3522,
      source: "browser" as const,
    };
    const browserResolver = vi.fn().mockResolvedValue(browserOrigin);

    await expect(
      resolveRouteRequestOrigin("browser", null, browserResolver),
    ).resolves.toEqual(browserOrigin);
    expect(browserResolver).toHaveBeenCalledOnce();
  });
});
