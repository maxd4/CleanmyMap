import { describe, expect, it, vi } from "vitest";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import { routePartitionedGroups } from "./route-multi-route";
import { partitionRouteCandidates } from "./route-group-partition";
import { ROUTE_TERRITORIAL_GUIDED_VERSION } from "./route-planning-mode";

const routeProviderMock = vi.hoisted(() => vi.fn());

vi.mock("./fossgis-foot-routing", () => ({
  routePolylineThroughFossgisFoot: routeProviderMock,
  FOSSGIS_QUOTA_INTERVAL_MS: 1000,
}));

const guidedBudget = {
  totalMinutes: 90,
  organizationMarginMinutes: 15,
  minimumCollectionMinutes: 45,
  travelMaxMinutes: 30,
} as const;

function guidedPartitionFor(
  origin: { latitude: number; longitude: number; source: "browser" },
  sector: { center: { latitude: number; longitude: number }; radiusKm: number },
  waypoints: Array<{ id: string; label: string; latitude: number; longitude: number }>,
) {
  return partitionRouteCandidates({
    origin,
    candidates: [],
    volunteers: 5,
    groupCount: 1,
    travelBudgetMinutes: 60,
    maxStops: 6,
    priorityVsTravel: 65,
    planningMode: {
      type: "territorial-guided",
      version: ROUTE_TERRITORIAL_GUIDED_VERSION,
      budget: guidedBudget,
      groups: [{ sector, waypoints }],
    },
  });
}

function networkGeometryWithCoordinates(
  requestedCoordinates: [number, number][],
  routedCoordinates: [number, number][],
) {
  const base = createFallbackRouteGeometry(requestedCoordinates);
  const legs = requestedCoordinates.slice(1).map((_, index) => ({
    fromStopIndex: index,
    toStopIndex: index + 1,
    distanceKm: 1,
    estimatedMinutes: 5,
  }));
  return {
    ...base,
    coordinates: routedCoordinates,
    legs,
    returnLeg: legs.at(-1) ?? null,
    mode: "network" as const,
    provider: "fossgis-osrm" as const,
    profile: "foot" as const,
    estimated: false,
  };
}

function withStepGeometries(
  geometry: ReturnType<typeof createFallbackRouteGeometry>,
  stepsByLeg: Record<number, [number, number][][]>,
) {
  return {
    ...geometry,
    legs: geometry.legs.map((leg, index) => {
      const stepGeometries = stepsByLeg[index];
      return stepGeometries
        ? {
            ...leg,
            steps: stepGeometries.map((stepGeometry) => ({
              name: "Rue de test",
              distanceKm: 1,
              durationMinutes: 1,
              maneuver: null,
              geometry: stepGeometry,
            })),
          }
        : leg;
    }),
    mode: "network" as const,
    provider: "fossgis-osrm" as const,
    profile: "foot" as const,
    estimated: false,
  };
}

describe("guided sector geometry certification", () => {
  it("does not certify steps that contradict the final collection polyline", async () => {
    const origin = { latitude: 48.8566, longitude: 2.3522, source: "browser" as const };
    const waypoints = [
      { id: "one", label: "Un", latitude: 48.857, longitude: 2.3522 },
      { id: "two", label: "Deux", latitude: 48.8571, longitude: 2.3522 },
    ];
    const sector = { center: { latitude: 48.857, longitude: 2.3522 }, radiusKm: 0.1 };
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) => {
      const geometry = networkGeometryWithCoordinates(coordinates, [
        coordinates[0]!, coordinates[1]!, [48.86, 2.3522], coordinates[2]!, coordinates.at(-1)!,
      ]);
      return withStepGeometries(geometry, { 1: [[coordinates[1]!, coordinates[2]!]] });
    });

    const result = await routePartitionedGroups({
      origin,
      candidates: [],
      partition: guidedPartitionFor(origin, sector, waypoints),
      travelBudgetMinutes: 60,
      waitForQuotaInterval: vi.fn(async () => undefined),
    });

    expect(result.groupRoutes[0]?.guidedRouting).toEqual(expect.objectContaining({
      waypointOrderVerified: true,
      sectorStatus: "unknown",
      sectorWithinBounds: false,
      sectorDeviationKm: null,
    }));
  });

  it("does not certify steps that do not connect to their waypoints", async () => {
    const origin = { latitude: 48.8566, longitude: 2.3522, source: "browser" as const };
    const waypoints = [
      { id: "one", label: "Un", latitude: 48.857, longitude: 2.3522 },
      { id: "two", label: "Deux", latitude: 48.8571, longitude: 2.3522 },
    ];
    const sector = { center: { latitude: 48.857, longitude: 2.3522 }, radiusKm: 0.1 };
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) => {
      const geometry = networkGeometryWithCoordinates(coordinates, [
        coordinates[0]!, coordinates[1]!, [48.85705, 2.3522], coordinates[2]!, coordinates.at(-1)!,
      ]);
      return withStepGeometries(geometry, { 1: [[[48.8575, 2.3522], coordinates[2]!]] });
    });

    const result = await routePartitionedGroups({
      origin,
      candidates: [],
      partition: guidedPartitionFor(origin, sector, waypoints),
      travelBudgetMinutes: 60,
      waitForQuotaInterval: vi.fn(async () => undefined),
    });

    expect(result.groupRoutes[0]?.guidedRouting).toMatchObject({
      sectorStatus: "unknown",
      sectorWithinBounds: false,
      sectorDeviationKm: null,
    });
  });

  it("does not certify collection legs that are discontinuous at a waypoint", async () => {
    const origin = { latitude: 48.8566, longitude: 2.3522, source: "browser" as const };
    const waypoints = [
      { id: "one", label: "Un", latitude: 48.857, longitude: 2.3522 },
      { id: "two", label: "Deux", latitude: 48.8571, longitude: 2.3522 },
      { id: "three", label: "Trois", latitude: 48.8572, longitude: 2.3522 },
    ];
    const sector = { center: { latitude: 48.8571, longitude: 2.3522 }, radiusKm: 0.1 };
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) => {
      const geometry = networkGeometryWithCoordinates(coordinates, [
        coordinates[0]!, coordinates[1]!, coordinates[2]!, coordinates[3]!, coordinates.at(-1)!,
      ]);
      return withStepGeometries(geometry, {
        1: [[coordinates[1]!, [48.85715, 2.3522]]],
        2: [[[48.85705, 2.3522], coordinates[3]!]],
      });
    });

    const result = await routePartitionedGroups({
      origin,
      candidates: [],
      partition: guidedPartitionFor(origin, sector, waypoints),
      travelBudgetMinutes: 60,
      waitForQuotaInterval: vi.fn(async () => undefined),
    });

    expect(result.groupRoutes[0]?.guidedRouting).toMatchObject({
      sectorStatus: "unknown",
      sectorWithinBounds: false,
      sectorDeviationKm: null,
    });
  });

  it("certifies coherent complete steps against a denser final polyline", async () => {
    const origin = { latitude: 48.8566, longitude: 2.3522, source: "browser" as const };
    const waypoints = [
      { id: "one", label: "Un", latitude: 48.857, longitude: 2.3522 },
      { id: "two", label: "Deux", latitude: 48.8571, longitude: 2.3522 },
    ];
    const midpoint: [number, number] = [48.85705, 2.3522];
    const sector = { center: { latitude: 48.857, longitude: 2.3522 }, radiusKm: 0.1 };
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) => {
      const geometry = networkGeometryWithCoordinates(coordinates, [
        coordinates[0]!, coordinates[1]!, midpoint, coordinates[2]!, coordinates.at(-1)!,
      ]);
      return withStepGeometries(geometry, { 1: [[coordinates[1]!, midpoint, coordinates[2]!]] });
    });

    const result = await routePartitionedGroups({
      origin,
      candidates: [],
      partition: guidedPartitionFor(origin, sector, waypoints),
      travelBudgetMinutes: 60,
      waitForQuotaInterval: vi.fn(async () => undefined),
    });

    expect(result.groupRoutes[0]?.guidedRouting).toMatchObject({
      sectorStatus: "within",
      sectorWithinBounds: true,
      sectorDeviationKm: 0,
    });
  });
});
