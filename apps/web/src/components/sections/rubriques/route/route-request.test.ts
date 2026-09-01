import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ROUTE_OPTIONS } from "./route-draft-storage";
import {
  createRouteRecommendationRequest,
  fetchRouteRecommendation,
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
      priorityVsDistance: 20,
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
});
