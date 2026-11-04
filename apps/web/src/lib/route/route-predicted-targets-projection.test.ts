import { describe, expect, it } from "vitest";
import { buildPredictedRouteCandidates } from "./route-predicted-targets-selection";
import type { PedestrianRiskProjectionSnapshot, PedestrianRiskProjectionSegment } from "../geo/pedestrian-risk-projection";

function score(contributions: []) {
  return {
    baseRisk: 0,
    finalRisk: 0,
    contributions,
    cleanlinessCorrection: { normalizedPressure: null, points: 0, available: false, resolution: "unknown", resolutionReason: "missing_prior", sourceReliability: 0, explanation: "test" },
    urbanMorphologyPrior: { status: "not_applied", beforeRisk: 0, afterRisk: 0, appliedMalusPoints: 0, confidence: 0, source: null, compensatingSignals: [] },
  };
}

const segment = {
  projectionSegmentId: "edge:risk:000",
  edgeKey: "edge",
  osmWayId: "1",
  segmentIndex: 0,
  direction: "forward",
  fromNodeId: "1",
  toNodeId: "2",
  lengthM: 20,
  intersectionLengthM: 20,
  coordinates: [[48.855, 2.35], [48.855, 2.3502]],
  midpoint: [48.855, 2.3501],
  zoneId: "751050101",
  intersectedZoneIds: ["751050101"],
  effectiveResolution: "iris",
  riskStatus: "predicted",
  wasteRisk: 80,
  cigaretteButtRisk: 20,
  mixedRisk: 50,
  wasteConfidence: {},
  cigaretteButtConfidence: {},
  wasteFactors: score([]),
  cigaretteButtFactors: score([]),
  availableFactors: { waste: [], cigaretteButts: [] },
  missingFactors: { waste: [], cigaretteButts: [] },
  serviceability: null,
  sourceVersions: {} as never,
  provenance: [],
  notes: [],
} as unknown as PedestrianRiskProjectionSegment;

const projection = {
  schemaVersion: "paris-pedestrian-risk-projection-v1",
  projectionKey: "paris-pantheon-jardin-des-plantes",
  policyVersion: "segment-zonal-neutral-v1",
  projectionVersionId: "projection-v1",
  networkVersionId: "network-v1",
  sourceVersions: {
    pressureSnapshotId: "pressure-v1",
    pressureSchemaVersion: "paris-pressure-v1",
    pressureGeneratedAt: "2026-11-04T00:00:00.000Z",
    pressureRefreshedAt: "2026-11-04T00:00:00.000Z",
    riskModelVersion: "paris-pressure-risk-v3-urban-morphology",
  },
  counts: { sourceEdges: 1, projectedSegments: 1, predictedSegments: 1, unavailableSegments: 0, zonesIntersected: 1 },
  segments: [segment],
} as unknown as PedestrianRiskProjectionSnapshot;

describe("route prediction from materialized pedestrian projection", () => {
  const common = {
    snapshot: null,
    projection,
    origin: { latitude: 48.855, longitude: 2.3501 },
    travelBudgetMinutes: 30,
    effectiveRiskFocus: "all" as const,
  };

  it("uses the materialized mixed score instead of the maximum family score", () => {
    const mixed = buildPredictedRouteCandidates(common);
    const waste = buildPredictedRouteCandidates({ ...common, effectiveRiskFocus: "waste" });
    const butts = buildPredictedRouteCandidates({ ...common, effectiveRiskFocus: "cigaretteButts" });
    expect(mixed.candidates[0]?.evidence.mixedRisk).toBe(50);
    expect(waste.candidates[0]?.evidence.riskFocus).toBe("waste");
    expect(butts.candidates[0]?.evidence.riskFocus).toBe("cigaretteButts");
    expect(mixed.summary.projectionVersionId).toBe("projection-v1");
  });
});
