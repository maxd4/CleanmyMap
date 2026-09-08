import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { buildTrashSpotterActionableCandidates } from "@/lib/actions/trash-spotter-actionable-candidates";
import type { RoutePlannerCandidate, RoutePlannerOrigin } from "./route-planner";
import { partitionRouteCandidates } from "./route-group-partition";
import { routePartitionedGroups } from "./route-multi-route";

const routeProviderMock = vi.hoisted(() => vi.fn());

vi.mock("./fossgis-foot-routing", () => ({
  routePolylineThroughFossgisFoot: routeProviderMock,
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
    expect(result.groupRoutes.every(({ routeGeometry }) => {
      const first = routeGeometry.coordinates[0];
      const last = routeGeometry.coordinates.at(-1);
      return first?.[0] === last?.[0] && first?.[1] === last?.[1];
    })).toBe(true);
    expect(new Set(result.groupRoutes.flatMap(({ candidateIds }) => candidateIds)).size).toBe(2);
    expect(result.groupRoutes.every(({ withinBudget }) => withinBudget)).toBe(true);
    expect(result.metrics.networkDistanceMeasured).toBe(true);
    expect(result.metrics.sharedTargetRatio).toBe(0);
    expect(result.partition.audit.overlapCosts.networkDistanceMeasured).toBe(true);
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
});
