import { afterEach, describe, expect, it, vi } from "vitest";
import type { PedestrianNetworkGraph } from "./pedestrian-network";
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
    edges: distancesKm.map((distanceKm, index) => {
      const latitude = center.latitude + distanceKm / 111.32;
      const fromNodeId = `node-${index}`;
      const toNodeId = `node-${index}-end`;
      return {
        edgeKey: `edge-${index}`,
        osmWayId: `way-${index}`,
        segmentIndex: 0,
        direction: "forward" as const,
        fromNodeId,
        toNodeId,
        highway: "footway",
        name: `Rue ${index}`,
        accessStatus: "allowed" as const,
        lengthM: 80,
        coordinates: [[latitude, center.longitude], [latitude + 0.0001, center.longitude]],
        tags: { highway: "footway" },
      };
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
    expect(result.search.limitations.some((limitation) => limitation.includes("ont échoué"))).toBe(true);
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
