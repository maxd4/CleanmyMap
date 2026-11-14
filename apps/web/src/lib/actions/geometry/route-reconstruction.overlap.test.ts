import { beforeEach, describe, expect, it, vi } from "vitest";

const routeProviderMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/route/fossgis-foot-routing", () => ({
  routePolylineThroughFossgisFoot: routeProviderMock,
}));

import { reconstructActionRoute } from "./route-reconstruction";

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

describe("route reconstruction overlap handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects identical routes even when the second route has denser sampling", async () => {
    const sparse = [
      [48.85, 2.35],
      [48.852, 2.35],
      [48.852, 2.354],
      [48.85, 2.354],
      [48.85, 2.35],
    ] as [number, number][];
    const dense = [
      [48.85, 2.35], [48.851, 2.35], [48.852, 2.35],
      [48.852, 2.352], [48.852, 2.354], [48.851, 2.354],
      [48.85, 2.354], [48.85, 2.352], [48.85, 2.35],
    ] as [number, number][];
    let callIndex = 0;
    routeProviderMock.mockImplementation(async () => ({
      ...networkGeometry,
      coordinates: callIndex++ < 4 ? sparse : dense,
      distanceKm: 3,
    }));

    const result = await reconstructActionRoute({
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      durationMinutes: 60,
      participantsCount: 10,
    });

    expect(result?.simulatedRouteCoverage).toBeUndefined();
    expect(result?.simulationUnavailableReason).toContain("recouvrent trop");
  });

  it("tries a less precise but distinct network candidate after rejecting the closest one", async () => {
    let callIndex = 0;
    let firstRoute: [number, number][] | null = null;
    routeProviderMock.mockImplementation(async (waypoints: [number, number][]) => {
      const currentCall = callIndex++;
      if (currentCall === 0) firstRoute = waypoints;
      if (currentCall === 4 && firstRoute) {
        return { ...networkGeometry, coordinates: firstRoute, distanceKm: 3 };
      }
      return {
        ...networkGeometry,
        coordinates: waypoints,
        distanceKm: currentCall === 0 ? 3 : currentCall === 5 ? 3.2 : 3.4,
      };
    });

    const result = await reconstructActionRoute({
      latitude: 48.85,
      longitude: 2.35,
      locationLabel: "Rue de test, Paris",
      durationMinutes: 60,
      participantsCount: 10,
    });

    expect(result?.simulatedRouteCoverage).toMatchObject({
      groupCount: 2,
      individualSimulatedDistancesKm: [3, 3.2],
    });
    expect(result?.simulationUnavailableReason).toBeUndefined();
  });
});
