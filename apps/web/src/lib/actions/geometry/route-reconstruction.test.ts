import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

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
    vi.unstubAllGlobals();
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
      routeTargetDistanceSource: "manual",
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

  it("respects a loop midpoint before returning to the departure", async () => {
    const midpoint: [number, number] = [48.86, 2.36];
    routeProviderMock.mockResolvedValueOnce({
      ...networkGeometry,
      coordinates: [[48.85, 2.35], midpoint, [48.85, 2.35]],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: String(midpoint[0]), lon: String(midpoint[1]) }],
    }));

    const result = await reconstructActionRoute({
      topology: "loop",
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      midpointLocationLabel: "Mi-parcours, Paris",
      durationMinutes: 60,
    });

    expect(routeProviderMock.mock.calls[0]?.[0]).toEqual([
      [48.85, 2.35],
      midpoint,
      [48.85, 2.35],
    ]);
    expect(result?.drawing.coordinates[1]).toEqual(midpoint);
    expect(result?.drawing.coordinates[0]).toEqual(result?.drawing.coordinates.at(-1));
  });

  it("keeps a point-to-point route open and ordered", async () => {
    const arrival: [number, number] = [48.87, 2.37];
    routeProviderMock.mockResolvedValueOnce({
      ...networkGeometry,
      isLoop: false,
      origin: [48.85, 2.35],
      returnLeg: null,
      coordinates: [[48.85, 2.35], arrival],
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: String(arrival[0]), lon: String(arrival[1]) }],
    }));

    const result = await reconstructActionRoute({
      topology: "point_to_point",
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      arrivalLocationLabel: "Arrivée, Paris",
      durationMinutes: 60,
    });

    expect(routeProviderMock.mock.calls[0]?.[0]).toEqual([
      [48.85, 2.35],
      arrival,
    ]);
    expect(result?.routeGeometry?.isLoop).toBe(false);
    expect(result?.drawing.coordinates[0]).toEqual([48.85, 2.35]);
    expect(result?.drawing.coordinates.at(-1)).toEqual(arrival);
  });

  it("preserves the midpoint order for point-to-point routes", async () => {
    const midpoint: [number, number] = [48.86, 2.36];
    const arrival: [number, number] = [48.87, 2.37];
    routeProviderMock.mockResolvedValueOnce({
      ...networkGeometry,
      isLoop: false,
      origin: [48.85, 2.35],
      returnLeg: null,
      coordinates: [[48.85, 2.35], midpoint, arrival],
    });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: String(midpoint[0]), lon: String(midpoint[1]) }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: String(arrival[0]), lon: String(arrival[1]) }],
      }));

    await reconstructActionRoute({
      topology: "point_to_point",
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      midpointLocationLabel: "Mi-parcours, Paris",
      arrivalLocationLabel: "Arrivée, Paris",
      durationMinutes: 60,
    });

    expect(routeProviderMock.mock.calls[0]?.[0]).toEqual([
      [48.85, 2.35],
      midpoint,
      arrival,
    ]);
  });

  it("does not geocode route endpoints when selected coordinates are already known", async () => {
    const midpoint: [number, number] = [48.86, 2.36];
    const arrival: [number, number] = [48.87, 2.37];
    routeProviderMock.mockResolvedValueOnce({
      ...networkGeometry,
      isLoop: false,
      returnLeg: null,
      coordinates: [[48.85, 2.35], midpoint, arrival],
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await reconstructActionRoute({
      topology: "point_to_point",
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      midpointLocationLabel: "Mi-parcours, Paris",
      midpointCoordinates: { latitude: midpoint[0], longitude: midpoint[1] },
      arrivalLocationLabel: "Arrivée, Paris",
      arrivalCoordinates: { latitude: arrival[0], longitude: arrival[1] },
      durationMinutes: 60,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(routeProviderMock.mock.calls[0]?.[0]).toEqual([
      [48.85, 2.35],
      midpoint,
      arrival,
    ]);
  });

  it("uses the deterministic reference fallback when free geocoding times out", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<never>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("timeout")));
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const routePromise = reconstructActionRoute({
        locationLabel: "Jardin du Luxembourg",
        departureLocationLabel: "Jardin du Luxembourg",
        durationMinutes: 60,
      });
      await vi.advanceTimersByTimeAsync(4_000);

      await expect(routePromise).resolves.toMatchObject({
        geometrySource: "reference",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects a point-to-point route without an arrival explicitly", async () => {
    await expect(reconstructActionRoute({
      topology: "point_to_point",
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      durationMinutes: 60,
    })).rejects.toMatchObject({
      fieldErrors: { arrivalLocationLabel: expect.any(Array) },
    });
    expect(routeProviderMock).not.toHaveBeenCalled();
  });

  it("does not treat a clean-place complement as a route arrival", async () => {
    routeProviderMock.mockResolvedValueOnce(networkGeometry);

    const result = await reconstructActionRoute({
      recordType: "clean_place",
      topology: "point_to_point",
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      arrivalLocationLabel: "Complément du lieu",
      durationMinutes: 60,
    });

    expect(result?.drawing.coordinates[0]).toEqual([48.85, 2.35]);
    expect(result?.drawing.coordinates.at(-1)).toEqual([48.85, 2.35]);
    expect(routeProviderMock.mock.calls[0]?.[0][0]).toEqual([48.85, 2.35]);
    expect(routeProviderMock.mock.calls[0]?.[0].at(-1)).toEqual([48.85, 2.35]);
  });

  it("keeps routing providers out of the client location form", () => {
    const source = readFileSync(
      new URL("../../../components/actions/action-declaration/steps/ActionStepLocation.tsx", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/fossgis|osrm-routing|routePolylineThrough/i);
  });
});
