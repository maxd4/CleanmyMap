import { bench, vi } from "vitest";
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

const origin: RoutePlannerOrigin = { latitude: 48.8566, longitude: 2.3522, source: "browser" };

function candidate(id: string, latitude: number, longitude: number): RoutePlannerCandidate {
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
    score: 90,
    reason: `candidate ${id}`,
    family: "observed",
    evidence: { family: "observed", source: "trash_spotter_spots", proof: "validated", observedAt: "2026-08-25T10:00:00.000Z" },
  };
}

function densePolyline(segmentCount: number, longitudeOffset: number): [number, number][] {
  return Array.from({ length: segmentCount + 1 }, (_, index) => [
    48 + index * 0.00001,
    2 + index * 0.00001 + longitudeOffset,
  ]);
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

async function runDenseNetworkOverlap(segmentCount: number): Promise<void> {
  const left = densePolyline(segmentCount, 0);
  const right = densePolyline(segmentCount, 0.0001);
  const candidates = [candidate("north", 48.87, 2.36), candidate("south", 48.84, 2.34)];
  let providerIndex = 0;
  routeProviderMock.mockImplementation(async (coordinates: [number, number][]) => ({
    ...createFallbackRouteGeometry(coordinates),
    coordinates: providerIndex++ === 0 ? left : right,
    mode: "network" as const,
    provider: "fossgis-osrm" as const,
    profile: "foot" as const,
    estimated: false,
  }));
  const result = await routePartitionedGroups({
    origin,
    candidates,
    partition: partition(candidates),
    travelBudgetMinutes: 60,
  });
  if (result.metrics.sharedDistanceKm === null) {
    throw new Error("Expected network shared distance measurement");
  }
}

for (const segmentCount of [16, 64, 256, 512]) {
  bench(
    `network overlap with ${segmentCount} segments per route`,
    async () => runDenseNetworkOverlap(segmentCount),
    { iterations: 5, warmupIterations: 1 },
  );
}
