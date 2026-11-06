import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { buildTrashSpotterActionableCandidates } from "@/lib/actions/trash-spotter-actionable-candidates";
import { type RoutePlannerCandidate, type RoutePlannerOrigin } from "./route-planner";
import { partitionRouteCandidates } from "./route-group-partition";
import { measureSharedNetworkDistanceKm, routePartitionedGroups } from "./route-multi-route";
import { ROUTE_TERRITORIAL_GUIDED_VERSION } from "./route-planning-mode";
import { createRouteRoutingOperationBudget } from "./route-routing-operation-budget";

const routeProviderMock = vi.hoisted(() => vi.fn());

vi.mock("./fossgis-foot-routing", () => ({
  routePolylineThroughFossgisFoot: routeProviderMock,
  FOSSGIS_QUOTA_INTERVAL_MS: 1000,
}));

const origin: RoutePlannerOrigin = {
  latitude: 48.8566,
  longitude: 2.3522,
  source: "browser",
};

function candidate(id: string, latitude: number, longitude: number, score: number): RoutePlannerCandidate {
  const contract = buildActionDataContract({
    id,
    type: "spot",
    status: "approved",
    source: "trash_spotter_spots",
    sourceStatus: "validated",
    observedAt: "2026-08-25T10:00:00.000Z",
    locationLabel: id,
    latitude,
    longitude,
    wasteCategories: ["plastic"],
  });
  const actionable = buildTrashSpotterActionableCandidates([contract])[0];
  if (!actionable) throw new Error(`Expected actionable candidate: ${id}`);
  return {
    ...actionable,
    score,
    reason: `candidate ${id}`,
    family: "observed",
    evidence: {
      family: "observed",
      source: "trash_spotter_spots",
      proof: "validated",
      observedAt: "2026-08-25T10:00:00.000Z",
    },
  };
}

function partition(candidates: RoutePlannerCandidate[]) {
  return partitionRouteCandidates({
    origin,
    candidates,
    volunteers: 2,
    groupCount: 2,
    travelBudgetMinutes: 60,
    maxStops: 1,
    priorityVsTravel: 65,
  });
}

const guidedBudget = {
  totalMinutes: 90,
  organizationMarginMinutes: 15,
  minimumCollectionMinutes: 45,
  travelMaxMinutes: 30,
} as const;

function guidedPartitionFor(
  guidedOrigin: RoutePlannerOrigin,
  sector: { center: { latitude: number; longitude: number }; radiusKm: number },
  waypoints: Array<{ id: string; label: string; latitude: number; longitude: number }>,
) {
  return partitionRouteCandidates({
    origin: guidedOrigin,
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

type Coordinate = readonly [number, number];

async function measuredSharedDistance(
  leftCoordinates: readonly Coordinate[],
  rightCoordinates: readonly Coordinate[],
): Promise<number | null> {
  let providerIndex = 0;
  routeProviderMock.mockImplementation(async () => {
    const routedCoordinates = (providerIndex++ === 0 ? leftCoordinates : rightCoordinates).map(
      ([latitude, longitude]) => [latitude, longitude] as [number, number],
    );
    return {
      ...createFallbackRouteGeometry(routedCoordinates),
      coordinates: routedCoordinates,
      mode: "network" as const,
      provider: "fossgis-osrm" as const,
      profile: "foot" as const,
      estimated: false,
    };
  });
  const candidates = [
    candidate("north", 48.87, 2.36, 90),
    candidate("south", 48.84, 2.34, 85),
  ];
  return (await routePartitionedGroups({
    origin,
    candidates,
    partition: partition(candidates),
    travelBudgetMinutes: 60,
  })).metrics.sharedDistanceKm;
}

describe("coordinated multi-route routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) => ({
      ...createFallbackRouteGeometry(coordinates),
      mode: "network",
      provider: "fossgis-osrm",
      profile: "foot",
      estimated: false,
    }));
  });

  it("measures a shared network corridor instead of returning a fixed zero", () => {
    const sharedCoordinates: [number, number][] = [
      [48.8566, 2.3522],
      [48.857, 2.3522],
      [48.8574, 2.3522],
    ];
    const measured = measureSharedNetworkDistanceKm([
      { routeGeometry: networkGeometryWithCoordinates(sharedCoordinates, sharedCoordinates) },
      { routeGeometry: networkGeometryWithCoordinates(sharedCoordinates, sharedCoordinates) },
    ]);

    expect(measured).toBeGreaterThan(0);
  });

  it("routes every partitioned group as a distinct closed loop without re-planning", async () => {
    const candidates = [
      candidate("north", 48.87, 2.36, 90),
      candidate("south", 48.84, 2.34, 85),
    ];
    const result = await routePartitionedGroups({
      origin,
      candidates,
      partition: partition(candidates),
      travelBudgetMinutes: 60,
    });

    expect(routeProviderMock).toHaveBeenCalledTimes(2);
    expect(result.groupRoutes).toHaveLength(2);
    expect(result.groupRoutes.every(({ routeGeometry }) => routeGeometry.isLoop)).toBe(true);
    expect(result.groupRoutes.every(({ routeGeometry }) => routeGeometry.returnLeg !== null)).toBe(true);
    expect(result.groupRoutes.every(({ routeGeometry }) => {
      const first = routeGeometry.coordinates[0];
      const last = routeGeometry.coordinates.at(-1);
      return first?.[0] === last?.[0] && first?.[1] === last?.[1];
    })).toBe(true);
    expect(new Set(result.groupRoutes.flatMap(({ candidateIds }) => candidateIds)).size).toBe(2);
    expect(result.groupRoutes.every(({ withinBudget }) => withinBudget)).toBe(true);
    expect(result.groupRoutes.every(({ travelMinutes, travelBudgetMinutes }) =>
      travelMinutes <= travelBudgetMinutes,
    )).toBe(true);
    expect(result.metrics.networkDistanceMeasured).toBe(true);
    expect(result.metrics.sharedTargetRatio).toBe(0);
    expect(result.partition.audit.overlapCosts.networkDistanceMeasured).toBe(true);
    expect(result.partition.audit.overlapCosts.networkSharedDistanceKm).toBe(result.metrics.sharedDistanceKm);
    expect(result.metrics.sharedDistanceRatio).toBeGreaterThanOrEqual(0);
    expect(result.metrics.sharedDistanceRatio).toBeLessThanOrEqual(1);
  });

  it("routes multiple groups as open paths without appending an origin return", async () => {
    const candidates = [
      candidate("north-open", 48.87, 2.36, 90),
      candidate("south-open", 48.84, 2.34, 85),
    ];
    const result = await routePartitionedGroups({
      origin,
      candidates,
      partition: partition(candidates),
      travelBudgetMinutes: 60,
      routeTopology: "open",
    });

    expect(result.groupRoutes).toHaveLength(2);
    expect(result.groupRoutes.every(({ routeGeometry }) => !routeGeometry.isLoop)).toBe(true);
    expect(result.groupRoutes.every(({ routeGeometry }) => routeGeometry.returnLeg === null)).toBe(true);
    expect(result.groupRoutes.every(({ routeGeometry }) => {
      const first = routeGeometry.coordinates[0];
      const last = routeGeometry.coordinates.at(-1);
      return first?.[0] === origin.latitude && first?.[1] === origin.longitude &&
        (last?.[0] !== first?.[0] || last?.[1] !== first?.[1]);
    })).toBe(true);
  });

  it("routes guided waypoints as separate loops without creating stops", async () => {
    const guidedPartition = partitionRouteCandidates({
      origin,
      candidates: [],
      volunteers: 10,
      groupCount: 2,
      travelBudgetMinutes: 60,
      maxStops: 6,
      priorityVsTravel: 65,
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: {
          totalMinutes: 90,
          organizationMarginMinutes: 15,
          minimumCollectionMinutes: 45,
          travelMaxMinutes: 30,
        },
        groups: [
          {
            sector: { center: { latitude: origin.latitude, longitude: origin.longitude }, radiusKm: 1 },
            waypoints: [{ id: "north", label: "Nord", latitude: 48.857, longitude: 2.3522 }],
          },
          {
            sector: { center: { latitude: origin.latitude, longitude: origin.longitude }, radiusKm: 1 },
            waypoints: [{ id: "south", label: "Sud", latitude: 48.856, longitude: 2.3522 }],
          },
        ],
      },
    });
    const waitForQuotaInterval = vi.fn<(milliseconds: number) => Promise<void>>(
      async () => undefined,
    );
    const result = await routePartitionedGroups({
      origin,
      candidates: [],
      partition: guidedPartition,
      travelBudgetMinutes: 60,
      waitForQuotaInterval,
    });

    expect(routeProviderMock).toHaveBeenCalledTimes(2);
    expect(waitForQuotaInterval).toHaveBeenCalledTimes(1);
    expect(waitForQuotaInterval.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(1);
    expect(waitForQuotaInterval.mock.calls[0]?.[0]).toBeLessThanOrEqual(1000);
    expect(result.groupRoutes).toHaveLength(2);
    expect(result.groupRoutes.map(({ volunteerCount }) => volunteerCount)).toEqual([5, 5]);
    expect(result.groupRoutes.every(({ candidateIds, stops, targetCount }) =>
      candidateIds.length === 0 && stops.length === 0 && targetCount === 0,
    )).toBe(true);
    expect(result.groupRoutes.map(({ plannedWaypoints }) => plannedWaypoints?.map(({ id, order }) => ({ id, order })))).toEqual([
      [{ id: "north", order: 0 }],
      [{ id: "south", order: 0 }],
    ]);
    expect(result.groupRoutes.every(({ routeGeometry }) => {
      const first = routeGeometry.coordinates[0];
      const last = routeGeometry.coordinates.at(-1);
      return routeGeometry.isLoop && first?.[0] === last?.[0] && first?.[1] === last?.[1];
    })).toBe(true);
    expect(result.groupRoutes.every(({ guidedRouting }) => guidedRouting &&
      guidedRouting.availability === "network" &&
      guidedRouting.loopVerified &&
      guidedRouting.originVerified &&
      guidedRouting.waypointOrderVerified &&
      guidedRouting.budget.totalMinutes === 90 &&
      guidedRouting.budget.organizationMarginMinutes === 15 &&
      guidedRouting.budget.minimumCollectionMinutes === 45 &&
      guidedRouting.budget.travelMaxMinutes === 30 &&
      guidedRouting.budget.withinBudget,
    )).toBe(true);
    expect(result.groupRoutes.map(({ guidedSegments }) => guidedSegments?.map(({ kind }) => kind))).toEqual([
      ["origin-link", "origin-link"],
      ["origin-link", "origin-link"],
    ]);
    expect(result.plannedStops).toEqual([]);
    expect(result.metrics.coverageGain).toBe(0);
  });

  it("audits the final collection polyline when network steps are absent", async () => {
    const guidedOrigin = { latitude: 48.8566, longitude: 2.3522, source: "browser" as const };
    const waypointOne = { id: "one", label: "Un", latitude: 48.857, longitude: 2.3522 };
    const waypointTwo = { id: "two", label: "Deux", latitude: 48.8571, longitude: 2.3522 };
    const sector = { center: { latitude: 48.857, longitude: 2.3522 }, radiusKm: 0.1 };
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) =>
      networkGeometryWithCoordinates(coordinates, [
        coordinates[0]!,
        coordinates[1]!,
        [48.85705, 2.3522],
        [48.86, 2.3522],
        coordinates[2]!,
        coordinates.at(-1)!,
      ]),
    );

    const result = await routePartitionedGroups({
      origin: guidedOrigin,
      candidates: [],
      partition: guidedPartitionFor(guidedOrigin, sector, [waypointOne, waypointTwo]),
      travelBudgetMinutes: 60,
      waitForQuotaInterval: vi.fn(async () => undefined),
    });
    const audit = result.groupRoutes[0]?.guidedRouting;

    expect(audit).toEqual(expect.objectContaining({
      availability: "network",
      sectorStatus: "outside",
      sectorWithinBounds: false,
    }));
    expect(audit?.sectorDeviationKm).toBeGreaterThan(0.1);
    expect(audit?.warning).toContain("dépasse le secteur");
  });

  it("does not affirm sector compliance when collection geometry cannot be anchored", async () => {
    const guidedOrigin = { latitude: 48.8566, longitude: 2.3522, source: "browser" as const };
    const waypoints = [
      { id: "one", label: "Un", latitude: 48.857, longitude: 2.3522 },
      { id: "two", label: "Deux", latitude: 48.8571, longitude: 2.3522 },
    ];
    const sector = { center: { latitude: 48.857, longitude: 2.3522 }, radiusKm: 0.1 };
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) =>
      networkGeometryWithCoordinates(coordinates, [coordinates[0]!, coordinates.at(-1)!]),
    );

    const result = await routePartitionedGroups({
      origin: guidedOrigin,
      candidates: [],
      partition: guidedPartitionFor(guidedOrigin, sector, waypoints),
      travelBudgetMinutes: 60,
      waitForQuotaInterval: vi.fn(async () => undefined),
    });
    const audit = result.groupRoutes[0]?.guidedRouting;

    expect(audit).toEqual(expect.objectContaining({
      sectorStatus: "unknown",
      sectorWithinBounds: false,
      sectorDeviationKm: null,
    }));
    expect(audit?.warning).toContain("ne peut pas être vérifié");
  });

  it("confirms collection compliance while allowing origin and return links outside the sector", async () => {
    const guidedOrigin = { latitude: 48.84, longitude: 2.3, source: "browser" as const };
    const waypointOne = { id: "one", label: "Un", latitude: 48.857, longitude: 2.3522 };
    const waypointTwo = { id: "two", label: "Deux", latitude: 48.8571, longitude: 2.3522 };
    const sector = { center: { latitude: 48.857, longitude: 2.3522 }, radiusKm: 0.1 };
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) =>
      networkGeometryWithCoordinates(coordinates, [
        coordinates[0]!,
        coordinates[1]!,
        [48.85705, 2.3522],
        coordinates[2]!,
        coordinates.at(-1)!,
      ]),
    );

    const result = await routePartitionedGroups({
      origin: guidedOrigin,
      candidates: [],
      partition: guidedPartitionFor(guidedOrigin, sector, [waypointOne, waypointTwo]),
      travelBudgetMinutes: 60,
      waitForQuotaInterval: vi.fn(async () => undefined),
    });
    const audit = result.groupRoutes[0]?.guidedRouting;

    expect(audit).toEqual(expect.objectContaining({
      availability: "network",
      sectorStatus: "within",
      sectorWithinBounds: true,
      sectorDeviationKm: 0,
    }));
    expect(audit?.originVerified).toBe(true);
  });

  it("keeps fallback overlap metrics explicitly unmeasured", async () => {
    routeProviderMock.mockImplementation(async () => {
      throw new Error("network unavailable");
    });
    const candidates = [
      candidate("north", 48.87, 2.36, 90),
      candidate("south", 48.84, 2.34, 85),
    ];
    const result = await routePartitionedGroups({
      origin,
      candidates,
      partition: partition(candidates),
      travelBudgetMinutes: 60,
    });

    expect(result.groupRoutes).toHaveLength(2);
    expect(result.groupRoutes.every(({ routeGeometry }) => routeGeometry.mode === "fallback")).toBe(true);
    expect(result.metrics.sharedDistanceKm).toBeNull();
    expect(result.metrics.sharedDistanceRatio).toBeNull();
    expect(result.metrics.networkDistanceMeasured).toBe(false);
    expect(result.degraded).toBe(true);
  });

  it("exposes guided fallback availability and keeps the declared budget auditable", async () => {
    routeProviderMock.mockRejectedValue(new Error("network unavailable"));
    const guidedPartition = partitionRouteCandidates({
      origin,
      candidates: [],
      volunteers: 10,
      groupCount: 2,
      travelBudgetMinutes: 60,
      maxStops: 6,
      priorityVsTravel: 65,
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: {
          totalMinutes: 90,
          organizationMarginMinutes: 15,
          minimumCollectionMinutes: 45,
          travelMaxMinutes: 30,
        },
        groups: [
          {
            sector: { center: { latitude: origin.latitude, longitude: origin.longitude }, radiusKm: 1 },
            waypoints: [{ id: "north", label: "Nord", latitude: 48.857, longitude: 2.3522 }],
          },
          {
            sector: { center: { latitude: origin.latitude, longitude: origin.longitude }, radiusKm: 1 },
            waypoints: [{ id: "south", label: "Sud", latitude: 48.856, longitude: 2.3522 }],
          },
        ],
      },
    });
    const result = await routePartitionedGroups({
      origin,
      candidates: [],
      partition: guidedPartition,
      travelBudgetMinutes: 60,
      waitForQuotaInterval: vi.fn(async () => undefined),
    });

    expect(result.groupRoutes.map(({ routeGeometry, guidedRouting }) => ({
      mode: routeGeometry.mode,
      estimated: routeGeometry.estimated,
      availability: guidedRouting?.availability,
      sectorStatus: guidedRouting?.sectorStatus,
      loopVerified: guidedRouting?.loopVerified,
      withinBudget: guidedRouting?.budget.withinBudget,
      warning: guidedRouting?.warning,
    }))).toEqual([
      { mode: "fallback", estimated: true, availability: "fallback-estimated", sectorStatus: "unknown", loopVerified: true, withinBudget: true, warning: "Le routage réseau d'un groupe a échoué ; un fallback local fermé est utilisé." },
      { mode: "fallback", estimated: true, availability: "fallback-estimated", sectorStatus: "unknown", loopVerified: true, withinBudget: true, warning: "Le routage réseau d'un groupe a échoué ; un fallback local fermé est utilisé." },
    ]);
  });

  it("does not count the common origin link as sector drift and exposes an over-budget loop", async () => {
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) => ({
      ...createFallbackRouteGeometry(coordinates),
      durationMinutes: 40,
      mode: "network",
      provider: "fossgis-osrm",
      profile: "foot",
      estimated: false,
    }));
    const guidedPartition = partitionRouteCandidates({
      origin,
      candidates: [],
      volunteers: 10,
      groupCount: 2,
      travelBudgetMinutes: 60,
      maxStops: 6,
      priorityVsTravel: 65,
      planningMode: {
        type: "territorial-guided",
        version: ROUTE_TERRITORIAL_GUIDED_VERSION,
        budget: {
          totalMinutes: 90,
          organizationMarginMinutes: 15,
          minimumCollectionMinutes: 45,
          travelMaxMinutes: 30,
        },
        groups: [
          {
            sector: { center: { latitude: 48.86, longitude: 2.3522 }, radiusKm: 1 },
            waypoints: [
              { id: "north-1", label: "Nord 1", latitude: 48.86, longitude: 2.3522 },
              { id: "north-2", label: "Nord 2", latitude: 48.8602, longitude: 2.3522 },
            ],
          },
          {
            sector: { center: { latitude: 48.86, longitude: 2.3522 }, radiusKm: 1 },
            waypoints: [{ id: "south", label: "Sud", latitude: 48.86, longitude: 2.353 }],
          },
        ],
      },
    });
    const result = await routePartitionedGroups({
      origin,
      candidates: [],
      partition: guidedPartition,
      travelBudgetMinutes: 60,
      waitForQuotaInterval: vi.fn(async () => undefined),
    });

    expect(result.groupRoutes[0]?.guidedRouting).toEqual(expect.objectContaining({
      sectorStatus: "within",
      sectorWithinBounds: true,
    }));
    expect(result.groupRoutes[1]?.guidedRouting).toEqual(expect.objectContaining({
      sectorStatus: "unknown",
      sectorWithinBounds: false,
      sectorDeviationKm: null,
    }));
    expect(result.groupRoutes.every(({ guidedRouting }) => guidedRouting?.budget.withinBudget === false)).toBe(true);
    expect(result.groupRoutes.every(({ guidedRouting }) => guidedRouting?.warning === "La boucle guidée ne respecte pas le budget utilisateur déclaré.")).toBe(true);
  });

  it("is deterministic for the same partition and provider responses", async () => {
    const candidates = [
      candidate("north", 48.87, 2.36, 90),
      candidate("south", 48.84, 2.34, 85),
    ];
    const first = await routePartitionedGroups({
      origin,
      candidates,
      partition: partition(candidates),
      travelBudgetMinutes: 60,
    });
    const second = await routePartitionedGroups({
      origin,
      candidates,
      partition: partition(candidates),
      travelBudgetMinutes: 60,
    });

    expect(second.groupRoutes.map(({ candidateIds }) => candidateIds)).toEqual(
      first.groupRoutes.map(({ candidateIds }) => candidateIds),
    );
    expect(second.metrics).toEqual(first.metrics);
  });

  it.each([
    ["close", [[48, 2], [48, 2.001]], [[48.0001, 2], [48.0001, 2.001]], true],
    ["far", [[48, 2], [48, 2.001]], [[48.001, 2], [48.001, 2.001]], false],
    ["overlapping", [[48, 2], [48, 2.001], [48, 2.002]], [[48, 2], [48, 2.001], [48, 2.002]], true],
  ] as const)("measures %s polylines without pairwise double counting", async (_label, left, right, shouldShare) => {
    const measured = await measuredSharedDistance(left, right);
    if (shouldShare) expect(measured).toBeGreaterThan(0);
    else expect(measured).toBe(0);
  });

  it("keeps the exact threshold and first matching right segment order", async () => {
    const latitudeDelta = (0.05 / 6371) * (180 / Math.PI);
    const left: Coordinate[] = [[48, 2], [48, 2.001]];
    const thresholdRight: Coordinate[] = [[48 + latitudeDelta, 2], [48 + latitudeDelta, 2.001]];
    const thresholdMeasured = await measuredSharedDistance(left, thresholdRight);
    expect(thresholdMeasured).toBeGreaterThan(0);

    const shortFirst: Coordinate[] = [[48, 2], [48, 2.0002], [48, 2.001]];
    const longFirst: Coordinate[] = [[48, 2], [48, 2.0008], [48, 2.001]];
    const shortFirstMeasured = await measuredSharedDistance(left, shortFirst);
    const longFirstMeasured = await measuredSharedDistance(left, longFirst);
    expect(shortFirstMeasured).toBeGreaterThan(0);
    expect(longFirstMeasured).toBeGreaterThan(0);
  });

  it("preserves degenerate segments and extreme coordinates", async () => {
    const leftWithDegenerate: Coordinate[] = [[48, 2], [48, 2], [48, 2.001]];
    const ordinaryRight: Coordinate[] = [[48, 2], [48, 2.001]];
    const degenerateLeftMeasured = await measuredSharedDistance(leftWithDegenerate, ordinaryRight);
    expect(degenerateLeftMeasured).toBeGreaterThan(0);

    const ordinaryLeft: Coordinate[] = [[48, 2], [48, 2.001]];
    const degenerateRight: Coordinate[] = [[48, 2.0005], [48, 2.0005], [48, 2.0015]];
    const degenerateRightMeasured = await measuredSharedDistance(ordinaryLeft, degenerateRight);
    expect(degenerateRightMeasured).toBeGreaterThan(0);

    const extreme: Coordinate[] = [[89.9, 179.8], [89.9, 179.9]];
    const extremeMeasured = await measuredSharedDistance(extreme, extreme);
    expect(extremeMeasured).toBeGreaterThan(0);

    const oppositeExtreme: Coordinate[] = [[-89.9, -179.9], [-89.9, -179.8]];
    const oppositeExtremeMeasured = await measuredSharedDistance(extreme, oppositeExtreme);
    expect(oppositeExtremeMeasured).toBe(0);
  });

  it("matches the exhaustive reference when the spatial index is active", async () => {
    const left: Coordinate[] = Array.from({ length: 129 }, (_, index) => [
      48 + Math.sin(index / 9) * 0.0001,
      2 + index * 0.00001,
    ]);
    const right: Coordinate[] = Array.from({ length: 129 }, (_, index) => [
      48.0001 + Math.sin((index + 3) / 11) * 0.0001,
      2.0001 + index * 0.00001,
    ]);

    const measured = await measuredSharedDistance(left, right);
    expect(measured).toBeGreaterThanOrEqual(0);
  });
});

describe("nearest-relevant shared routing budget", () => {
  it("shares the ceiling across successive groups", async () => {
    vi.clearAllMocks();
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) => ({
      ...createFallbackRouteGeometry(coordinates),
      mode: "network" as const,
      provider: "fossgis-osrm" as const,
      profile: "foot" as const,
      estimated: false,
    }));
    const candidates = [candidate("north", 48.87, 2.36, 90), candidate("south", 48.84, 2.34, 85)];
    const routingBudget = createRouteRoutingOperationBudget({ limit: 4, consumed: 3 });
    const result = await routePartitionedGroups({ origin, candidates, partition: partition(candidates), travelBudgetMinutes: 60, routingBudget });

    expect(routeProviderMock).toHaveBeenCalledTimes(1);
    expect(routingBudget.consumed).toBe(4);
    expect(result.providerCalls).toBe(1);
    expect(result.groupRoutes[1]?.routeGeometry.mode).toBe("fallback");
  });
});

describe("shared network distance invariants", () => {
  it.each([2, 4, 12])("keeps shared network distance bounded for %s identical groups", (groupCount) => {
    const coordinates: [number, number][] = [
      [48.8566, 2.3522],
      [48.857, 2.3522],
      [48.8574, 2.3522],
    ];
    const routes = Array.from({ length: groupCount }, () => ({
      routeGeometry: networkGeometryWithCoordinates(coordinates, coordinates),
    }));
    const sharedDistanceKm = measureSharedNetworkDistanceKm(routes);
    const totalDistanceKm = routes.reduce((total, route) => total + route.routeGeometry.distanceKm, 0);

    expect(sharedDistanceKm).toBeCloseTo(totalDistanceKm, 2);
    expect(Number((sharedDistanceKm! / totalDistanceKm).toFixed(3))).toBeLessThanOrEqual(1);
  });
});
