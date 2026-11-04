import { describe, expect, it } from "vitest";
import type { PedestrianNetworkGraph } from "./pedestrian-network";
import { routeThroughPedestrianNetwork } from "./pedestrian-network";
import type { RoutePlannerCandidate, RoutePlannerOrigin } from "./route-planner";
import { enrichTheoreticalRouteWithObservedCandidates } from "./route-observed-enrichment";

const origin: RoutePlannerOrigin = { latitude: 48, longitude: 2, source: "planner" };

const graph: PedestrianNetworkGraph = {
  versionId: "network-v1",
  networkKey: "test-network",
  sourceRetrievedAt: "2026-11-04T00:00:00.000Z",
  bounds: { south: 47.99, west: 1.99, north: 48.01, east: 2.01 },
  edges: [
    { edgeKey: "ab", osmWayId: "ab", segmentIndex: 0, direction: "forward", fromNodeId: "a", toNodeId: "b", highway: "footway", name: "Rue A", accessStatus: "allowed", lengthM: 111, coordinates: [[48, 2], [48.001, 2]], tags: {} },
    { edgeKey: "bc", osmWayId: "bc", segmentIndex: 0, direction: "forward", fromNodeId: "b", toNodeId: "c", highway: "footway", name: "Rue B", accessStatus: "allowed", lengthM: 111, coordinates: [[48.001, 2], [48.001, 2.001]], tags: {} },
    { edgeKey: "cd", osmWayId: "cd", segmentIndex: 0, direction: "forward", fromNodeId: "c", toNodeId: "d", highway: "footway", name: "Rue C", accessStatus: "allowed", lengthM: 111, coordinates: [[48.001, 2.001], [48, 2.001]], tags: {} },
    { edgeKey: "da", osmWayId: "da", segmentIndex: 0, direction: "forward", fromNodeId: "d", toNodeId: "a", highway: "footway", name: "Rue D", accessStatus: "allowed", lengthM: 111, coordinates: [[48, 2.001], [48, 2]], tags: {} },
  ],
};

const predicted: RoutePlannerCandidate = {
  family: "predicted",
  id: "predicted-b",
  label: "Segment B",
  latitude: 48.001,
  longitude: 2,
  score: 80,
  reason: "predicted",
  evidence: {} as never,
  volunteerSafety: { status: "unknown", suitability: null, confidence: 0, evidenceIds: [] },
} as RoutePlannerCandidate;

function observed(
  id: string,
  latitude: number,
  longitude: number,
  safety: "eligible" | "specialized_required" = "eligible",
): RoutePlannerCandidate {
  return {
    family: "observed",
    id,
    label: id,
    latitude,
    longitude,
    observedAt: "2026-11-03T00:00:00.000Z",
    wasteCategories: ["other"],
    source: "trash_spotter_spots",
    sourceStatus: "validated",
    safety: { volunteerEligibility: safety, specializationReason: safety === "eligible" ? null : "trained_only" },
    contract: {} as never,
    score: 90,
    reason: "validated observation",
    evidence: { family: "observed", source: "trash_spotter_spots", proof: "validated", observedAt: "2026-11-03T00:00:00.000Z" },
  } as RoutePlannerCandidate;
}

function baseGeometry() {
  return routeThroughPedestrianNetwork(graph, [[48, 2], [48.001, 2], [48, 2]], { topology: "loop" })!;
}

describe("route observed enrichment", () => {
  it("adds a validated nearby observation on the pedestrian network and retains prediction", () => {
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [observed("observed-c", 48.001, 2.001)],
      baseGeometry: baseGeometry(),
      pedestrianNetwork: graph,
      travelBudgetMinutes: 20,
      maxObserved: 2,
    });

    expect(result.metrics.acceptedCandidateIds).toEqual(["observed-c"]);
    expect(result.candidates.map((candidate) => candidate.family)).toEqual(["predicted", "observed"]);
    expect(result.routeGeometry.provider).toBe("stored-network");
    expect(result.routeGeometry.coordinates.at(-1)).toEqual([48, 2]);
    expect(result.metrics.observedDoesNotReplacePrediction).toBe(true);
  });

  it("rejects an observation whose network detour exceeds the remaining budget", () => {
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [observed("observed-c", 48.001, 2.001)],
      baseGeometry: baseGeometry(),
      pedestrianNetwork: graph,
      travelBudgetMinutes: 3,
      maxObserved: 2,
    });

    expect(result.metrics.accepted).toBe(0);
    expect(result.metrics.rejectedByReason.detour_over_budget).toBe(1);
    expect(result.routeGeometry.distanceKm).toBe(baseGeometry().distanceKm);
  });

  it("does not treat an unsafe or distant report as a current route opportunity", () => {
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [
        observed("unsafe", 48.001, 2.001, "specialized_required"),
        observed("distant", 48.01, 2.01),
      ],
      baseGeometry: baseGeometry(),
      pedestrianNetwork: graph,
      travelBudgetMinutes: 20,
      maxObserved: 2,
    });

    expect(result.metrics.accepted).toBe(0);
    expect(result.metrics.rejectedByReason.unsafe_or_ineligible).toBe(1);
    expect(result.metrics.rejectedByReason.outside_corridor).toBe(1);
  });
});
