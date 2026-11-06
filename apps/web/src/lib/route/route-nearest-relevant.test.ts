import { afterEach, describe, expect, it, vi } from "vitest";
import { shortestPedestrianAccessFromSources, type PedestrianNetworkGraph } from "./pedestrian-network";
import {
  buildRouteNearestRelevantProbePoints,
  createRouteNearestRelevantReference,
  findNearestRelevantRoute,
  ROUTE_NEAREST_RELEVANT_RADII_KM,
} from "./route-nearest-relevant";
import type { RoutePollutionRelevanceAssessment } from "./route-pollution-relevance";

const center = { latitude: 48.8566, longitude: 2.3522 };

function graphAtDistances(distancesKm: readonly number[]): PedestrianNetworkGraph {
  return {
    versionId: "network-v1",
    networkKey: "paris-pilot",
    sourceRetrievedAt: "2026-11-04T00:00:00.000Z",
    bounds: { south: 48.8, west: 2.2, north: 48.9, east: 2.5 },
    edges: distancesKm.flatMap((distanceKm, index) => {
      const latitude = center.latitude + distanceKm / 111.32;
      const fromNodeId = `node-${index}`;
      const toNodeId = `node-${index}-end`;
      return [{
        edgeKey: `edge-${index}-access`,
        osmWayId: `way-${index}`,
        segmentIndex: 0,
        direction: "forward" as const,
        fromNodeId: "center",
        toNodeId: fromNodeId,
        highway: "footway",
        name: `Rue ${index}`,
        accessStatus: "allowed" as const,
        lengthM: distanceKm * 1000,
        coordinates: [[center.latitude, center.longitude], [latitude, center.longitude]],
        tags: { highway: "footway" },
      }, {
        edgeKey: `edge-${index}-tail`,
        osmWayId: `way-${index}`,
        segmentIndex: 1,
        direction: "forward" as const,
        fromNodeId,
        toNodeId,
        highway: "footway",
        name: `Rue ${index}`,
        accessStatus: "allowed" as const,
        lengthM: 80,
        coordinates: [[latitude, center.longitude], [latitude + 0.0001, center.longitude]],
        tags: { highway: "footway" },
      }];
    }),
  };
}

function assessment(score: number | null, confidence = 0.8, groupScores?: number[]): RoutePollutionRelevanceAssessment {
  const groups = (groupScores ?? [score]).map((groupScore, index) => ({
    groupIndex: index + 1,
    score: groupScore,
    status: groupScore === null ? "unavailable" as const : "available" as const,
    warning: groupScore === null ? "unavailable" as const : groupScore >= 65 ? "none" as const : "orange" as const,
    confidence: { level: confidence >= 0.75 ? "high" as const : "medium" as const, score: groupScore === null ? null : confidence, source: "segment_projection" as const },
    reason: null,
  }));
  return {
    schemaVersion: "route-pollution-relevance-v1",
    policyVersion: "route-pollution-relevance-v1",
    score,
    status: score === null ? "unavailable" : "evaluated",
    warning: score === null ? "unavailable" : score >= 65 ? "none" : "orange",
    reason: score === null ? "score_missing" : null,
    selectedCategory: "mixed",
    confidence: { level: score === null ? "unknown" : "high", score: score === null ? null : confidence, source: score === null ? "unavailable" : "segment_projection" },
    reference: null,
    groups,
    alternativeSearch: { relevant: score !== null && score < 65, reason: score !== null && score < 65 ? "warning" : "not_relevant" },
    policy: { version: "route-pollution-relevance-v1", warningRedBelow: 40, warningOrangeBelow: 65, minimumConfidenceScore: 0.5 },
    limitations: [],
  };
}

function reference() {
  return createRouteNearestRelevantReference({
    origin: { ...center, source: "map" },
  })!;
}

function zoneReference(centerPoint: { latitude: number; longitude: number }, radiusKm: number) {
  return createRouteNearestRelevantReference({
    zone: {
      label: "Zone de départ",
      center: centerPoint,
      radiusKm,
      bounds: {
        south: centerPoint.latitude - 0.03,
        west: centerPoint.longitude - 0.03,
        north: centerPoint.latitude + 0.03,
        east: centerPoint.longitude + 0.03,
      },
    },
  })!;
}

function evaluate(score: number | null, groups?: number[]) {
  return {
    relevance: assessment(score, 0.8, groups),
    withinBudget: true,
    loopVerified: true,
    routingStatus: "network" as const,
  };
}

describe("route nearest relevant search", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses the bounded Paris radii and keeps probe points inside Paris", () => {
    expect(ROUTE_NEAREST_RELEVANT_RADII_KM).toEqual([0.5, 1, 2, 3, 5]);
    expect(buildRouteNearestRelevantProbePoints(reference()).every((point) =>
      point.latitude >= 48.8156 && point.latitude <= 48.9022 &&
      point.longitude >= 2.2241 && point.longitude <= 2.4699,
    )).toBe(true);
  });

  it("selects the closest acceptable departure in the first successful radius", async () => {
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1, 0.4, 0.8, 1.2]),
      reference: reference(),
      baseline: evaluate(42),
      evaluate: async (origin) => evaluate(origin.latitude > center.latitude + 0.006 ? 80 : 70),
    });

    expect(result.search.status).toBe("found");
    expect(result.search.radiusKm).toBe(0.5);
    expect(result.search.scoreAfter).toBe(70);
    expect(result.selected?.accessDistanceKm).toBeLessThanOrEqual(0.5);
    expect(result.selected?.origin.source).toBe("planner");
  });

  it("uses a verified access node inside a zone whose center is off-network", async () => {
    const zone = zoneReference({ latitude: 48.855, longitude: 2.3522 }, 0.3);
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1]),
      reference: zone,
      baseline: evaluate(48),
      evaluate: async () => evaluate(80),
    });

    expect(result.search.status).toBe("found");
    expect(result.selected?.accessDistanceKm).toBe(0);
    expect(result.selected?.origin.latitude).toBeGreaterThan(48.856);
    expect(result.search.accessDurationMinutes).toBe(0);
  });

  it("routes to a rendezvous outside the zone from an access node inside it", async () => {
    const zone = zoneReference({ latitude: 48.855, longitude: 2.3522 }, 0.3);
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.4]),
      reference: zone,
      baseline: evaluate(48),
      evaluate: async (origin) => evaluate(origin.latitude > 48.859 ? 80 : 60),
    });

    expect(result.search.status).toBe("found");
    expect(result.selected?.origin.latitude).toBeGreaterThan(48.859);
    expect(result.selected?.accessDistanceKm).toBeGreaterThan(0);
    expect(result.selected?.accessDistanceKm).toBeLessThan(0.5);
  });

  it("requires every group to clear the threshold", async () => {
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1, 0.8]),
      reference: reference(),
      baseline: evaluate(60, [60, 60]),
      evaluate: async () => evaluate(80, [80, 64]),
    });

    expect(result.search.status).toBe("not_found");
    expect(result.search.reason).toBe("group_below_threshold");
    expect(result.search.bestAttempt?.score).toBe(80);
    expect(result.selected).toBeNull();
  });

  it("does not treat missing scores or confidence as a successful alternative", async () => {
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1]),
      reference: reference(),
      baseline: evaluate(null),
      evaluate: async () => ({ ...evaluate(null), routingStatus: "fallback" as const }),
    });

    expect(result.search.status).toBe("not_found");
    expect(result.search.reason).toBe("score_unavailable");
    expect(result.search.bestAttempt).toBeNull();
  });

  it("preserves a controlled failure when the pedestrian graph is unavailable", async () => {
    const result = await findNearestRelevantRoute({
      graph: null,
      reference: reference(),
      baseline: evaluate(48),
      evaluate: async () => evaluate(80),
    });

    expect(result.search.status).toBe("unavailable");
    expect(result.search.reason).toBe("network_unavailable");
    expect(result.search.limitations[0]).toContain("graphe piéton");
  });

  it("does not present a geodesic distance as pedestrian access across a barrier", async () => {
    const graph = graphAtDistances([0.1]);
    graph.edges = graph.edges.filter((edge) => edge.edgeKey !== "edge-0-access");
    const evaluateMock = vi.fn(async () => evaluate(80));
    const result = await findNearestRelevantRoute({
      graph,
      reference: reference(),
      baseline: evaluate(48),
      evaluate: evaluateMock,
    });

    expect(result.selected).toBeNull();
    expect(result.search.status).toBe("unavailable");
    expect(result.search.reason).toBe("network_unavailable");
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  it("rejects a precise origin snapped thirty metres away without a verified connector", async () => {
    const graph = graphAtDistances([0.1]);
    const offset: [number, number] = [center.latitude + 30 / 111_320, center.longitude];
    const access = graph.edges.find((edge) => edge.edgeKey === "edge-0-access")!;
    access.coordinates = [offset, access.coordinates[1]!];
    const evaluateMock = vi.fn(async () => evaluate(80));

    const result = await findNearestRelevantRoute({
      graph,
      reference: reference(),
      baseline: evaluate(48),
      evaluate: evaluateMock,
    });

    expect(result.selected).toBeNull();
    expect(result.search.reason).toBe("network_unavailable");
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  it("reports network unavailability when a zone access component cannot reach its candidates", async () => {
    const zone = zoneReference({ latitude: 48.855, longitude: 2.3522 }, 0.3);
    const disconnected = graphAtDistances([0.4]);
    disconnected.edges = disconnected.edges.filter((edge) => !edge.edgeKey.endsWith("-access"));
    const evaluateMock = vi.fn(async () => evaluate(80));
    const result = await findNearestRelevantRoute({
      graph: disconnected,
      reference: zone,
      baseline: evaluate(48),
      evaluate: evaluateMock,
    });

    expect(result.selected).toBeNull();
    expect(result.search.status).toBe("unavailable");
    expect(result.search.reason).toBe("network_unavailable");
    expect(result.search.scoreAfter).toBeNull();
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  it("rejects candidates inside the envelope but outside the Paris intra-muros geometry", async () => {
    const graph = graphAtDistances([0.1]);
    const outside: [number, number] = [48.8566, 2.45];
    const access = graph.edges.find((edge) => edge.edgeKey === "edge-0-access")!;
    const tail = graph.edges.find((edge) => edge.edgeKey === "edge-0-tail")!;
    access.coordinates = [[center.latitude, center.longitude], outside];
    tail.coordinates = [outside, [outside[0] + 0.0001, outside[1]]];
    const result = await findNearestRelevantRoute({
      graph,
      reference: reference(),
      baseline: evaluate(48),
      evaluate: async () => evaluate(80),
    });

    expect(result.selected).toBeNull();
  });

  it("counts the baseline in the global provider quota", async () => {
    const evaluateMock = vi.fn(async () => evaluate(80));
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1]),
      reference: reference(),
      baseline: { ...evaluate(48), providerCalls: 4 },
      evaluate: evaluateMock,
    });

    expect(result.selected).toBeNull();
    expect(evaluateMock).not.toHaveBeenCalled();
    expect(result.search.reason).toBe("quota_exhausted");
  });

  it("does not accept a two-call evaluation when only one provider call remains", async () => {
    const evaluateMock = vi.fn(async (_origin, _signal, budget) => {
      if (!budget.tryConsume(2)) return null;
      return { ...evaluate(80), providerCalls: 2 };
    });
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1]),
      reference: reference(),
      baseline: { ...evaluate(48), providerCalls: 3 },
      evaluate: evaluateMock,
    });

    expect(result.selected).toBeNull();
    expect(evaluateMock).toHaveBeenCalledTimes(1);
    expect(result.search.reason).toBe("quota_exhausted");
  });

  it("admits an alternative whose two operations fit after a one-operation baseline", async () => {
    const evaluateMock = vi.fn(async (_origin, _signal, budget) => {
      expect(budget.tryConsume(2)).toBe(true);
      return { ...evaluate(80), providerCalls: 2 };
    });
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1]),
      reference: reference(),
      baseline: { ...evaluate(48), providerCalls: 1 },
      evaluate: evaluateMock,
    });

    expect(result.selected).not.toBeNull();
    expect(result.search.plansEvaluated).toBe(1);
  });

  it("does not invoke routing when the search signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const evaluateMock = vi.fn(async () => evaluate(80));
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1]),
      reference: reference(),
      baseline: evaluate(48),
      evaluate: evaluateMock,
      signal: controller.signal,
    });

    expect(result.selected).toBeNull();
    expect(evaluateMock).not.toHaveBeenCalled();
  });

  it("isolates provider rejections, preserves the initial route and counts attempts", async () => {
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1, 0.2]),
      reference: reference(),
      baseline: evaluate(48),
      evaluate: async () => {
        throw new Error("provider unavailable");
      },
    });

    expect(result.selected).toBeNull();
    expect(result.search.status).toBe("not_found");
    expect(result.search.plansEvaluated).toBe(2);
    expect(result.search.reason).toBe("evaluation_failed");
    expect(result.search.limitations.some((limitation) => limitation.includes("ont échoué"))).toBe(true);
  });

  it("reports no candidate separately from an unavailable score", async () => {
    const noCandidate = await findNearestRelevantRoute({
      graph: graphAtDistances([6]),
      reference: reference(),
      baseline: evaluate(48),
      evaluate: vi.fn(async () => evaluate(80)),
    });
    expect(noCandidate.search.reason).toBe("no_candidate");

    const missingScore = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1, 0.2]),
      reference: reference(),
      baseline: evaluate(48),
      evaluate: async () => evaluate(null),
    });
    expect(missingScore.search.reason).toBe("score_unavailable");
  });

  it("computes one directed multi-source access search for many zone access nodes", () => {
    const graph = graphAtDistances(Array.from({ length: 24 }, (_, index) => 0.05 + index * 0.02));
    const result = shortestPedestrianAccessFromSources(
      graph,
      graph.edges.filter((edge) => edge.edgeKey.endsWith("-access")).map((edge) => edge.coordinates.at(-1)!),
      [graph.edges.find((edge) => edge.edgeKey === "edge-20-tail")!.coordinates.at(-1)!],
      { sourceNodeIds: graph.edges.filter((edge) => edge.edgeKey.endsWith("-access")).map((edge) => edge.toNodeId) },
    );
    expect(result.distancesM.get("node-20-end")).toBe(80);
    expect(result.inaccessibleTargetNodeIds).toEqual(new Set());
  });

  it("admits a precise origin in the middle of a directed edge without snapping", () => {
    const edge = graphAtDistances([0.1]).edges.find(({ edgeKey }) => edgeKey === "edge-0-access")!;
    const midpoint: [number, number] = [
      (edge.coordinates[0]![0] + edge.coordinates[1]![0]) / 2,
      edge.coordinates[0]![1],
    ];
    const result = shortestPedestrianAccessFromSources(
      { ...graphAtDistances([0.1]), edges: [edge] },
      [midpoint],
      [edge.coordinates[1]!],
      { maxSnapDistanceM: 0 },
    );

    expect(result.finalizedTargetNodeIds).toEqual(new Set([edge.toNodeId]));
    expect(result.distancesM.get(edge.toNodeId)).toBeGreaterThan(0);
    expect(result.distancesM.get(edge.toNodeId)).toBeLessThan(edge.lengthM);
  });

  it("does not publish a provisional target when the settled-node ceiling interrupts Dijkstra", () => {
    const graph = graphAtDistances([0.1]);
    const target = graph.edges.find(({ edgeKey }) => edgeKey === "edge-0-tail")!.coordinates.at(-1)!;
    const result = shortestPedestrianAccessFromSources(
      graph,
      [[center.latitude, center.longitude]],
      [target],
      { maxSettledNodes: 0 },
    );

    expect(result.timedOut).toBe(true);
    expect(result.finalizedTargetNodeIds).toEqual(new Set());
    expect(result.inaccessibleTargetNodeIds).toEqual(new Set(["node-0-end"]));
  });

  it("accounts for actual provider calls before admitting another evaluation", async () => {
    let startedOperations = 0;
    const planWithThreeCalls = vi.fn(async (_origin, _signal, budget) => {
      if (!budget.tryConsume(3)) return null;
      startedOperations += 3;
      return { ...evaluate(80), providerCalls: 3 };
    });
    const result = await findNearestRelevantRoute({
      graph: graphAtDistances([0.1, 0.2, 0.3]),
      reference: reference(),
      baseline: evaluate(48),
      evaluate: planWithThreeCalls,
    });

    expect(planWithThreeCalls).toHaveBeenCalledTimes(2);
    expect(result.search.plansEvaluated).toBe(2);
    expect(startedOperations).toBe(3);
    expect(startedOperations).toBeLessThanOrEqual(4);
  });

  it("counts expired attempts and stops at the global search budget", async () => {
    vi.useFakeTimers();
    const resultPromise = findNearestRelevantRoute({
      graph: graphAtDistances(Array.from({ length: 20 }, (_, index) => 0.1 + index * 0.2)),
      reference: reference(),
      baseline: evaluate(48),
      evaluate: (_origin, signal) => new Promise((resolve) => {
        signal.addEventListener("abort", () => resolve(null), { once: true });
      }),
    });

    await vi.advanceTimersByTimeAsync(12_000);
    const result = await resultPromise;

    expect(result.selected).toBeNull();
    expect(result.search.plansEvaluated).toBeGreaterThan(0);
    expect(result.search.plansEvaluated).toBeLessThanOrEqual(4);
    expect(result.search.limitations.some((limitation) => limitation.includes("expiré"))).toBe(true);
  });
});
