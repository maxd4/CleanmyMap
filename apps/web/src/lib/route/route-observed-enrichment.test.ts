import { describe, expect, it } from "vitest";
import type { PedestrianNetworkGraph } from "./pedestrian-network";
import { routeThroughPedestrianNetwork } from "./pedestrian-network";
import type { RoutePlannerCandidate, RoutePlannerOrigin } from "./route-planner";
import { enrichTheoreticalRouteWithObservedCandidates } from "./route-observed-enrichment";
import { createRouteRoutingOperationBudget } from "./route-routing-operation-budget";

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

const graphWithAlternativeConnectors: PedestrianNetworkGraph = {
  ...graph,
  edges: [
    ...graph.edges,
    { edgeKey: "ce", osmWayId: "ce", segmentIndex: 0, direction: "forward", fromNodeId: "c", toNodeId: "e", highway: "footway", name: "Rue E", accessStatus: "allowed", lengthM: 111, coordinates: [[48.001, 2.001], [48.0015, 2.001]], tags: {} },
    { edgeKey: "ea", osmWayId: "ea", segmentIndex: 0, direction: "forward", fromNodeId: "e", toNodeId: "a", highway: "footway", name: "Rue F", accessStatus: "allowed", lengthM: 111, coordinates: [[48.0015, 2.001], [48, 2]], tags: {} },
  ],
};

const graphWithoutPredictiveEdge: PedestrianNetworkGraph = {
  ...graph,
  edges: [
    ...graph.edges.filter((edge) => edge.edgeKey !== "bc"),
    { edgeKey: "be", osmWayId: "be", segmentIndex: 0, direction: "forward", fromNodeId: "b", toNodeId: "e", highway: "footway", name: "Rue E", accessStatus: "allowed", lengthM: 111, coordinates: [[48.001, 2], [48.0015, 2.001]], tags: {} },
    { edgeKey: "ea", osmWayId: "ea", segmentIndex: 0, direction: "forward", fromNodeId: "e", toNodeId: "a", highway: "footway", name: "Rue F", accessStatus: "allowed", lengthM: 111, coordinates: [[48.0015, 2.001], [48, 2]], tags: {} },
  ],
};

const predicted: RoutePlannerCandidate = {
  family: "predicted",
  id: "predicted-b",
  label: "Segment B",
  latitude: 48.0005,
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
      predictiveEdgeKeys: ["bc"],
      pedestrianNetwork: graph,
      travelBudgetMinutes: 20,
      maxObserved: 2,
    });

    expect(result.metrics.acceptedCandidateIds).toEqual(["observed-c"]);
    expect(result.candidates.map((candidate) => candidate.family)).toEqual(["predicted", "observed"]);
    expect(result.routeGeometry.provider).toBe("stored-network");
    expect(result.routeGeometry.coordinates.at(-1)).toEqual([48, 2]);
    expect(result.metrics.observedDoesNotReplacePrediction).toBe(true);
    expect(result.routeGeometry.legs.flatMap((leg) => leg.steps ?? []).map((step) => step.segmentReference)).toEqual(["ab", "bc", "cd", "da"]);
  });

  it("accepts an observed point off-node while keeping the predictive loop edges", () => {
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [observed("observed-mid-edge", 48.001, 2.0005)],
      baseGeometry: baseGeometry(),
      predictiveEdgeKeys: ["bc"],
      pedestrianNetwork: graph,
      travelBudgetMinutes: 20,
      maxObserved: 2,
    });

    expect(result.metrics.acceptedCandidateIds).toEqual(["observed-mid-edge"]);
    expect(result.metrics.rejectedByReason.network_unreachable).toBeUndefined();
    expect(result.routeGeometry.legs.flatMap((leg) => leg.steps ?? []).map((step) => step.segmentReference)).toEqual(["ab", "bc", "cd", "da"]);
  });

  it("accepts alternative connectors when the selected predictive edge remains in order", () => {
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [observed("observed-e", 48.0015, 2.001)],
      baseGeometry: baseGeometry(),
      predictiveEdgeKeys: ["bc"],
      pedestrianNetwork: graphWithAlternativeConnectors,
      travelBudgetMinutes: 20,
      maxObserved: 2,
    });

    expect(result.metrics.acceptedCandidateIds).toEqual(["observed-e"]);
    expect(result.routeGeometry.legs.flatMap((leg) => leg.steps ?? []).map((step) => step.segmentReference))
      .toEqual(["ab", "bc", "ce", "ea"]);
  });

  it("rejects an observation whose network detour exceeds the remaining budget", () => {
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [observed("observed-c", 48.001, 2.001)],
      baseGeometry: baseGeometry(),
      predictiveEdgeKeys: ["bc"],
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
      predictiveEdgeKeys: ["bc"],
      pedestrianNetwork: graph,
      travelBudgetMinutes: 20,
      maxObserved: 2,
    });

    expect(result.metrics.accepted).toBe(0);
    expect(result.metrics.rejectedByReason.unsafe_or_ineligible).toBe(1);
    expect(result.metrics.rejectedByReason.outside_corridor).toBe(1);
  });

  it("measures successive detours from successive geometries and totals only the final delta", () => {
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [
        observed("observed-b", 48.001, 2.0004),
        observed("observed-c", 48.0006, 2.001),
      ],
      baseGeometry: baseGeometry(),
      predictiveEdgeKeys: ["bc"],
      pedestrianNetwork: graph,
      travelBudgetMinutes: 20,
      maxObserved: 2,
    });
    const accepted = result.metrics.evaluations.filter((evaluation) => evaluation.accepted);

    expect(accepted).toHaveLength(2);
    expect(accepted[0]?.detourMinutes).toBeGreaterThanOrEqual(0);
    expect(accepted[1]?.detourMinutes).toBeGreaterThanOrEqual(0);
    expect(result.metrics.totalDetourDistanceKm).toBeCloseTo(
      Math.max(0, result.routeGeometry.distanceKm - baseGeometry().distanceKm),
      2,
    );
    expect(result.metrics.totalDetourMinutes).toBe(
      Math.max(0, result.routeGeometry.durationMinutes - baseGeometry().durationMinutes),
    );
  });

  it("stops observed reconstructions at the shared routing quota", () => {
    const routingBudget = createRouteRoutingOperationBudget({ limit: 2 });
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [
        observed("observed-1", 48.001, 2.001),
        observed("observed-2", 48.001, 2.001),
        observed("observed-3", 48.001, 2.001),
      ],
      baseGeometry: baseGeometry(),
      predictiveEdgeKeys: ["bc"],
      pedestrianNetwork: graph,
      travelBudgetMinutes: 20,
      maxObserved: 3,
      routingBudget,
    });

    expect(routingBudget.consumed).toBe(2);
    expect(result.metrics.acceptedCandidateIds).toHaveLength(2);
    expect(result.metrics.rejectedByReason.routing_quota_exhausted).toBe(1);
    expect(result.metrics.evaluations.at(-1)?.reason).toBe("routing_quota_exhausted");
  });

  it("does not consume the shared budget when the first observed reconstruction is blocked", () => {
    const routingBudget = createRouteRoutingOperationBudget({ limit: 1, consumed: 1 });
    const base = baseGeometry();
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [observed("blocked", 48.001, 2.001)],
      baseGeometry: base,
      predictiveEdgeKeys: ["bc"],
      pedestrianNetwork: graph,
      travelBudgetMinutes: 20,
      maxObserved: 1,
      routingBudget,
    });

    expect(routingBudget.consumed).toBe(1);
    expect(result.routeGeometry).toBe(base);
    expect(result.metrics.rejectedByReason.routing_quota_exhausted).toBe(1);
  });

  it("rejects a candidate whose reconstructed route would drop a predictive edge", () => {
    const reducedGraph = { ...graph, edges: graph.edges.filter((edge) => edge.edgeKey !== "cd") };
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [observed("observed-b", 48.001, 2.0004)],
      baseGeometry: baseGeometry(),
      predictiveEdgeKeys: ["bc"],
      pedestrianNetwork: reducedGraph,
      travelBudgetMinutes: 20,
      maxObserved: 2,
    });

    expect(result.metrics.accepted).toBe(0);
    expect(result.metrics.rejectedByReason.network_unreachable ?? 0).toBeGreaterThan(0);
  });

  it("rejects an accessible reconstruction that removes the selected predictive edge", () => {
    const result = enrichTheoreticalRouteWithObservedCandidates({
      origin,
      routeTopology: "loop",
      baseCandidates: [predicted],
      observedCandidates: [observed("observed-e", 48.0015, 2.001)],
      baseGeometry: baseGeometry(),
      predictiveEdgeKeys: ["bc"],
      pedestrianNetwork: graphWithoutPredictiveEdge,
      travelBudgetMinutes: 20,
      maxObserved: 2,
    });

    expect(result.metrics.accepted).toBe(0);
    expect(result.metrics.rejectedByReason.predictive_route_not_preserved).toBe(1);
    expect(result.metrics.evaluations[0]?.reason).toBe("predictive_route_not_preserved");
  });
});
