import { beforeEach, describe, expect, it, vi } from "vitest";

const routeProviderMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/route/fossgis-foot-routing", () => ({
  routePolylineThroughFossgisFoot: routeProviderMock,
}));

import {
  buildClosedLoopWaypoints,
  reconstructActionRoute,
} from "./route-reconstruction";

const networkGeometry = {
  isLoop: true,
  origin: [48.85, 2.35] as [number, number],
  returnLeg: { fromStopIndex: 3, toStopIndex: 4, distanceKm: 0.25, estimatedMinutes: 4 },
  coordinates: [
    [48.85, 2.35],
    [48.852, 2.35],
    [48.852, 2.354],
    [48.85, 2.354],
    [48.85, 2.35],
  ] as [number, number][],
  distanceKm: 1.02,
  durationMinutes: 14,
  legs: [],
  provider: "fossgis-osrm" as const,
  profile: "foot" as const,
  mode: "network" as const,
  estimated: false,
};

describe("server-side action route reconstruction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a bounded closed loop whose target is passed to the network provider", async () => {
    routeProviderMock.mockResolvedValueOnce(networkGeometry);

    const result = await reconstructActionRoute({
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      durationMinutes: 60,
    });

    const requestedWaypoints = routeProviderMock.mock.calls[0]?.[0] as [number, number][];
    expect(requestedWaypoints).toHaveLength(5);
    expect(requestedWaypoints[0]).toEqual([48.85, 2.35]);
    expect(requestedWaypoints.at(-1)).toEqual([48.85, 2.35]);
    expect(result).toMatchObject({
      geometrySource: "routed",
      origin: [48.85, 2.35],
      routeGeometry: { mode: "network", estimated: false, distanceKm: 1.02 },
      drawing: { kind: "polyline" },
    });
    expect(result?.drawing.coordinates.at(-1)).toEqual([48.85, 2.35]);
  });

  it("uses the explicit target without changing the measured provider distance", async () => {
    routeProviderMock.mockResolvedValueOnce(networkGeometry);

    await reconstructActionRoute({
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      durationMinutes: 60,
      routeTargetDistanceKm: 1.5,
    });

    const requestedWaypoints = routeProviderMock.mock.calls[0]?.[0] as [number, number][];
    expect(requestedWaypoints[1][0]).toBeGreaterThan(48.852);
    expect(networkGeometry.distanceKm).toBe(1.02);
  });

  it("marks a provider fallback as an estimated route and keeps the loop", async () => {
    routeProviderMock.mockResolvedValueOnce({
      ...networkGeometry,
      mode: "fallback",
      provider: "none",
      profile: null,
      estimated: true,
      distanceKm: 0.98,
    });

    const result = await reconstructActionRoute({
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      durationMinutes: 90,
    });

    expect(result?.geometrySource).toBe("estimated_route");
    expect(result?.routeGeometry).toMatchObject({
      mode: "fallback",
      provider: "none",
      estimated: true,
      distanceKm: 0.98,
    });
    expect(result?.drawing.coordinates[0]).toEqual(result?.drawing.coordinates.at(-1));
  });

  it("generates exactly one origin loop without a client routing fallback", () => {
    const waypoints = buildClosedLoopWaypoints([48.85, 2.35], 1);
    expect(waypoints).toHaveLength(5);
    expect(waypoints[0]).toEqual(waypoints.at(-1));
  });
});
