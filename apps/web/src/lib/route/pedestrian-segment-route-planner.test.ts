import { describe, expect, it } from "vitest";
import type { PedestrianRiskProjectionSnapshot } from "@/lib/geo/pedestrian-risk-projection";
import type { PedestrianNetworkEdge, PedestrianNetworkGraph } from "./pedestrian-network";
import type { RoutePlannerCandidate, RoutePlannerOrigin } from "./route-planner";
import {
  planPredictedPedestrianSegmentRoutes,
} from "./pedestrian-segment-route-planner";

const origin: RoutePlannerOrigin = {
  latitude: 48,
  longitude: 2,
  source: "planner",
};

function edge(
  edgeKey: string,
  fromNodeId: string,
  toNodeId: string,
  start: [number, number],
  end: [number, number],
  name: string,
): PedestrianNetworkEdge {
  return {
    edgeKey,
    osmWayId: edgeKey,
    segmentIndex: 0,
    direction: "forward",
    fromNodeId,
    toNodeId,
    highway: "footway",
    name,
    accessStatus: "allowed",
    lengthM: 111,
    coordinates: [start, end],
    tags: { foot: "yes" },
  };
}

const graph: PedestrianNetworkGraph = {
  versionId: "network-v1",
  networkKey: "test-network",
  sourceRetrievedAt: "2026-11-04T00:00:00.000Z",
  bounds: { south: 47.99, west: 1.99, north: 48.01, east: 2.01 },
  edges: [
    edge("e-ab", "a", "b", [48, 2], [48.001, 2], "Rue A"),
    edge("e-bc", "b", "c", [48.001, 2], [48.001, 2.001], "Rue B"),
    edge("e-cd", "c", "d", [48.001, 2.001], [48, 2.001], "Rue C"),
    edge("e-da", "d", "a", [48, 2.001], [48, 2], "Rue D"),
  ],
};

function candidate(
  id: string,
  segmentId: string,
  wasteRisk: number,
  cigaretteButtRisk: number,
  score = (wasteRisk + cigaretteButtRisk) / 2,
): RoutePlannerCandidate {
  return {
    family: "predicted",
    id,
    label: id,
    latitude: 48,
    longitude: 2,
    score,
    reason: "projection test",
    volunteerSafety: { status: "unknown", suitability: null, confidence: 0, evidenceIds: [] },
    evidence: {
      family: "predicted",
      source: "urban-pressure-model",
      modelVersion: "test-model",
      zoneId: id,
      zoneLabel: id,
      segmentId,
      effectiveResolution: "iris",
      calibrationStatus: "not_calibrated_theoretical",
      geographicLevel: "iris",
      centroid: [48, 2],
      radiusKm: 0.01,
      areaKm2: null,
      distanceToCorridorKm: 0,
      planningCorridor: { source: "origin_only", pointCount: 1, isNetworkGeometry: false, note: "test" },
      detourDistanceKm: 0,
      detourMinutes: 0,
      riskFocus: "all",
      dominantRisk: wasteRisk >= cigaretteButtRisk ? "waste" : "cigaretteButts",
      wasteRisk,
      cigaretteButtRisk,
      mixedRisk: (wasteRisk + cigaretteButtRisk) / 2,
      confidence: { waste: {} as never, cigaretteButts: {} as never },
      contributions: { waste: [], cigaretteButts: [] },
      cleanlinessCorrection: { waste: {} as never, cigaretteButts: {} as never },
      urbanMorphologyPrior: { waste: {} as never, cigaretteButts: {} as never },
      snapshot: { snapshotId: "snapshot", schemaVersion: "paris-pressure-v1", generatedAt: "2026-11-04", refreshedAt: "2026-11-04" },
      provenance: [],
      contextProvenance: [],
      provenanceGaps: [],
    },
  } as unknown as RoutePlannerCandidate;
}

function observedCandidate(id: string, latitude = 48.001, longitude = 2.001): RoutePlannerCandidate {
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
    safety: { volunteerEligibility: "eligible", specializationReason: null },
    contract: {} as never,
    score: 90,
    reason: "validated observation",
    evidence: { family: "observed", source: "trash_spotter_spots", proof: "validated", observedAt: "2026-11-03T00:00:00.000Z" },
  } as RoutePlannerCandidate;
}

function projection(ids: string[]): PedestrianRiskProjectionSnapshot {
  const edges = graph.edges;
  return {
    schemaVersion: "paris-pedestrian-risk-projection-v1",
    projectionKey: "paris-pantheon-jardin-des-plantes",
    policyVersion: "segment-zonal-neutral-v1",
    projectionVersionId: "projection-v1",
    networkVersionId: "network-v1",
    sourceVersions: {} as never,
    generatedAt: "2026-11-04T00:00:00.000Z",
    counts: { sourceEdges: edges.length, projectedSegments: edges.length, predictedSegments: edges.length, unavailableSegments: 0, zonesIntersected: edges.length },
    segments: edges.map((item, index) => ({
      projectionSegmentId: ids[index] ?? `s-${index}`,
      edgeKey: item.edgeKey,
      osmWayId: item.osmWayId,
      segmentIndex: 0,
      direction: "forward",
      fromNodeId: item.fromNodeId,
      toNodeId: item.toNodeId,
      lengthM: item.lengthM,
      intersectionLengthM: item.lengthM,
      coordinates: item.coordinates,
      midpoint: item.coordinates[0]!,
      zoneId: `zone-${index}`,
      intersectedZoneIds: [`zone-${index}`],
      effectiveResolution: "iris",
      riskStatus: "predicted",
      wasteRisk: 50,
      cigaretteButtRisk: 50,
      mixedRisk: 50,
      wasteConfidence: {} as never,
      cigaretteButtConfidence: {} as never,
      wasteFactors: {} as never,
      cigaretteButtFactors: {} as never,
      availableFactors: { waste: [], cigaretteButts: [] },
      missingFactors: { waste: [], cigaretteButts: [] },
      serviceability: null,
      sourceVersions: {} as never,
      provenance: [],
      notes: [],
    })),
  } as PedestrianRiskProjectionSnapshot;
}

function plan(
  candidates: RoutePlannerCandidate[],
  focus: "all" | "waste" | "cigaretteButts",
  overrides: Partial<Parameters<typeof planPredictedPedestrianSegmentRoutes>[0]> = {},
) {
  return planPredictedPedestrianSegmentRoutes({
    origin,
    routeTopology: "loop",
    candidates,
    projection: projection(candidates.map((item) =>
      item.family === "predicted" ? item.evidence.segmentId! : "unknown",
    )),
    pedestrianNetwork: graph,
    travelBudgetMinutes: 20,
    maxStops: 2,
    priorityVsTravel: 100,
    volunteers: 1,
    groupCount: 1,
    effectiveRiskFocus: focus,
    ...overrides,
  });
}

describe("pedestrian segment route planner", () => {
  it.each([
    ["waste", "a", [90, 20, 30, 40], [20, 20, 30, 40]],
    ["cigaretteButts", "b", [20, 20, 30, 40], [90, 100, 30, 40]],
  ] as const)("follows the %s prediction without changing the other preference", (focus, expectedId, wasteByEdge, cigaretteByEdge) => {
    const result = plan([
      candidate("a", "s-0", wasteByEdge[0], cigaretteByEdge[0]),
      candidate("b", "s-1", wasteByEdge[1], cigaretteByEdge[1]),
      candidate("c", "s-2", wasteByEdge[2], 30),
      candidate("d", "s-3", wasteByEdge[3], 40),
    ], focus, { maxStops: 1 });
    expect(result?.plannedStops[0]?.candidate.id).toBe(expectedId);
  });

  it("uses both categories for balanced coverage instead of max", () => {
    const result = plan([
      candidate("waste-only", "s-0", 100, 0),
      candidate("balanced", "s-1", 65, 65),
      candidate("butt-only", "s-2", 0, 100),
      candidate("low", "s-3", 20, 20),
    ], "all", { maxStops: 1 });
    expect(result?.plannedStops[0]?.candidate.id).toBe("balanced");
  });

  it("returns closed network geometry within the travel budget and records unknown safety", () => {
    const result = plan([
      candidate("a", "s-0", 90, 20),
      candidate("b", "s-1", 80, 20),
    ], "waste", { travelBudgetMinutes: 8, maxStops: 2 });
    expect(result).not.toBeNull();
    expect(result!.routeGeometry.mode).toBe("network");
    expect(result!.routeGeometry.coordinates[0]).toEqual(result!.routeGeometry.coordinates.at(-1));
    expect(result!.routeGeometry.durationMinutes).toBeLessThanOrEqual(8);
    expect(result!.metrics.safetyStatus).toBe("network_access_allowed_safety_unknown");
  });

  it("resolves a nearby requested origin to a verified network node without inventing a connector", () => {
    const result = plan([candidate("nearby", "s-0", 90, 90)], "all", {
      origin: { ...origin, latitude: 48.0002 },
      maxStops: 1,
    });

    expect(result).not.toBeNull();
    expect(result!.routeGeometry.mode).toBe("network");
    expect(result!.metrics.originResolution).toBe("nearest_verified_node");
    expect(result!.metrics.originSnapDistanceM).toBeGreaterThan(0);
    expect(result!.metrics.originSnapDistanceM).toBeLessThan(50);
    expect(result!.routeGeometry.coordinates[0]).toEqual([48, 2]);
  });

  it("splits two groups into distinct predicted segments and does not count a street twice", () => {
    const candidates = [
      candidate("a", "s-0", 90, 30),
      candidate("b", "s-1", 80, 30),
      candidate("c", "s-2", 70, 30),
      candidate("d", "s-3", 60, 30),
    ];
    const result = plan(candidates, "waste", {
      volunteers: 10,
      groupCount: 2,
      maxStops: 2,
    });
    expect(result).not.toBeNull();
    expect(result!.groupRoutes).toHaveLength(2);
    const first = new Set(result!.groupRoutes[0]!.stops.map((stop) => stop.id));
    const second = new Set(result!.groupRoutes[1]!.stops.map((stop) => stop.id));
    expect([...first].some((id) => second.has(id))).toBe(false);
    expect(result!.metrics.selectedSegments).toBe(first.size + second.size);
    expect(result!.metrics.groupCount).toBe(2);
  });

  it("skips unavailable projection segments and duplicate street candidates deterministically", () => {
    const sameStreet = candidate("same-street", "s-0", 100, 100);
    const duplicate = candidate("duplicate-street", "s-0", 20, 20);
    const result = plan([sameStreet, duplicate], "all", { maxStops: 2 });
    expect(result).not.toBeNull();
    expect(result!.metrics.duplicateStreetCandidatesSkipped).toBe(1);
    expect(result!.metrics.consideredSegments).toBe(2);
    expect(result!.metrics.selectedSegments).toBeGreaterThan(0);
  });

  it("removes a selected candidate when its directed component cannot be reached", () => {
    const disconnectedEdge = edge("e-xy", "x", "y", [48.01, 2.01], [48.011, 2.01], "Rue Isolée");
    const disconnectedGraph: PedestrianNetworkGraph = {
      ...graph,
      edges: [...graph.edges, disconnectedEdge],
    };
    const disconnectedProjection = projection(["s-0", "s-1", "s-2", "s-3"]);
    disconnectedProjection.segments[0] = {
      ...disconnectedProjection.segments[0]!,
      edgeKey: disconnectedEdge.edgeKey,
      fromNodeId: disconnectedEdge.fromNodeId,
      toNodeId: disconnectedEdge.toNodeId,
      coordinates: disconnectedEdge.coordinates,
    };
    const result = plan([
      candidate("blocked", "s-0", 100, 100),
      candidate("reachable", "s-1", 50, 50),
    ], "all", {
      pedestrianNetwork: disconnectedGraph,
      projection: disconnectedProjection,
      maxStops: 2,
    });

    expect(result).not.toBeNull();
    expect(result!.plannedStops.map(({ candidate: item }) => item.id)).toEqual(["reachable"]);
    expect(result!.excludedCandidateIds).toEqual(["blocked"]);
    expect(result!.degraded).toBe(true);
  });

  it("skips a selected directed dead end and keeps an admissible loop", () => {
    const deadEnd = edge("e-ax", "a", "x", [48, 2], [48.0015, 2.0005], "Rue Impasse");
    const directedGraph: PedestrianNetworkGraph = {
      ...graph,
      edges: [...graph.edges, deadEnd],
    };
    const directedProjection = projection(["s-0", "s-1", "s-2", "s-3"]);
    directedProjection.segments[0] = {
      ...directedProjection.segments[0]!,
      edgeKey: deadEnd.edgeKey,
      fromNodeId: deadEnd.fromNodeId,
      toNodeId: deadEnd.toNodeId,
      coordinates: deadEnd.coordinates,
    };
    const result = plan([
      candidate("dead-end", "s-0", 100, 100),
      candidate("loop", "s-1", 60, 60),
    ], "all", {
      pedestrianNetwork: directedGraph,
      projection: directedProjection,
      maxStops: 2,
    });

    expect(result).not.toBeNull();
    expect(result!.plannerResult.stops.map(({ candidate: item }) => item.id)).toContain("dead-end");
    expect(result!.plannedStops.map(({ candidate: item }) => item.id)).toEqual(["loop"]);
    expect(result!.excludedCandidateIds).toEqual(["dead-end"]);
    expect(result!.partition.audit.assignments.map(({ candidateId }) => candidateId)).toEqual(["loop"]);
    expect(result!.partition.metrics.coverageGain).toBe(0.6);
    expect(result!.routeGeometry.coordinates[0]).toEqual(result!.routeGeometry.coordinates.at(-1));
  });

  it("returns no segment plan when every selected candidate blocks loop closure", () => {
    const deadEnd = edge("e-ax", "a", "x", [48, 2], [48.0015, 2.0005], "Rue Impasse");
    const directedGraph: PedestrianNetworkGraph = {
      ...graph,
      edges: [...graph.edges, deadEnd],
    };
    const directedProjection = projection(["s-0", "s-1", "s-2", "s-3"]);
    directedProjection.segments[0] = {
      ...directedProjection.segments[0]!,
      edgeKey: deadEnd.edgeKey,
      fromNodeId: deadEnd.fromNodeId,
      toNodeId: deadEnd.toNodeId,
      coordinates: deadEnd.coordinates,
    };

    expect(plan([candidate("dead-end", "s-0", 100, 100)], "all", {
      pedestrianNetwork: directedGraph,
      projection: directedProjection,
      maxStops: 1,
    })).toBeNull();
  });

  it("does not create a network route for an origin outside the graph", () => {
    const result = plan([candidate("candidate", "s-0", 90, 90)], "all", {
      origin: { ...origin, latitude: 48.005 },
    });
    expect(result).toBeNull();
  });

  it("keeps loop distance equal to the verified directed edges", () => {
    const result = plan([candidate("candidate", "s-0", 90, 90)], "all", { maxStops: 1 });
    expect(result).not.toBeNull();
    expect(result!.routeGeometry.mode).toBe("network");
    expect(result!.routeGeometry.distanceKm).toBeCloseTo(0.444, 2);
    expect(result!.routeGeometry.coordinates[0]).toEqual(result!.routeGeometry.coordinates.at(-1));
  });

  it("counts selected projection portions rather than only their OSM edge keys", () => {
    const result = plan([
      candidate("first-portion", "iris-a", 90, 90),
      candidate("second-portion", "iris-b", 80, 80),
    ], "all", {
      maxStops: 2,
      projection: {
        ...projection(["iris-a", "iris-b", "s-2", "s-3"]),
        segments: projection(["iris-a", "iris-b", "s-2", "s-3"]).segments.map((segment, index) =>
          index < 2 ? { ...segment, edgeKey: "e-ab" } : segment,
        ),
      } as never,
    });

    expect(result).not.toBeNull();
    expect(result!.metrics.selectedProjectionSegmentIds).toEqual(["iris-a"]);
    expect(result!.metrics.selectedSegments).toBe(1);
  });

  it("rejects a risk projection attached to another active graph version", () => {
    const result = plan([candidate("candidate", "s-0", 90, 90)], "all", {
      projection: { ...projection(["s-0", "s-1", "s-2", "s-3"]), networkVersionId: "network-v2" },
    });
    expect(result).toBeNull();
  });

  it("enriches the graph route with a validated observation after selecting predicted segments", () => {
    const result = plan([
      candidate("predicted", "s-0", 90, 90),
      observedCandidate("observed"),
    ], "all", { maxStops: 2, travelBudgetMinutes: 20 });
    expect(result).not.toBeNull();
    expect(result!.plannedStops.map(({ candidate: item }) => item.id)).toContain("predicted");
    expect(result!.plannedStops.map(({ candidate: item }) => item.id)).toContain("observed");
    expect(result!.observedEnrichment.acceptedCandidateIds).toEqual(["observed"]);
    expect(result!.observedEnrichment.observedDoesNotReplacePrediction).toBe(true);
  });
});
