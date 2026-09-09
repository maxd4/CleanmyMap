import { describe, expect, it } from "vitest";
import type { RoutePlannerCandidate } from "./route-planner";
import type { RoutePredictedEvidence } from "./route-predicted-targets";
import { buildCleanupWorkload, CLEANUP_WORKLOAD_MODEL_VERSION } from "./route-cleanup-workload";

function observedCandidate(
  wasteCategories: RoutePlannerCandidate extends infer Candidate
    ? Candidate extends { family: "observed"; wasteCategories: infer Categories }
      ? Categories
      : never
    : never,
  safety: { volunteerEligibility: "eligible" | "specialized_required"; specializationReason: "trained_only" | "no_pickup" | "missing_categories" | "unknown_categories" | null } = {
    volunteerEligibility: "eligible",
    specializationReason: null,
  },
): RoutePlannerCandidate {
  return {
    id: "observed-1",
    label: "Spot observé",
    latitude: 48.85,
    longitude: 2.35,
    observedAt: "2026-09-01T10:00:00.000Z",
    wasteCategories,
    source: "trash_spotter_spots",
    sourceStatus: "validated",
    safety,
    contract: {} as never,
    score: 80,
    reason: "fixture",
    family: "observed",
    evidence: {
      family: "observed",
      source: "trash_spotter_spots",
      proof: "validated",
      observedAt: "2026-09-01T10:00:00.000Z",
    },
  } as RoutePlannerCandidate;
}

function predictedEvidence(overrides: Partial<RoutePredictedEvidence> = {}): RoutePredictedEvidence {
  return {
    family: "predicted",
    source: "urban-pressure-model",
    modelVersion: "paris-pressure-risk-v3-urban-morphology",
    zoneId: "zone-1",
    zoneLabel: "Zone prédite",
    geographicLevel: "grid",
    centroid: { latitude: 48.85, longitude: 2.35 },
    radiusKm: 0.2,
    areaKm2: 0.1,
    distanceToCorridorKm: 0.1,
    planningCorridor: {
      source: "origin_only",
      pointCount: 1,
      isNetworkGeometry: false,
      note: "fixture",
    },
    detourDistanceKm: 0,
    detourMinutes: 0,
    riskFocus: "all",
    dominantRisk: "waste",
    wasteRisk: 18,
    cigaretteButtRisk: 72,
    confidence: {
      waste: {
        dataCompleteness: 0.8,
        sourceCompleteness: 0.8,
        cleanlinessCorrectionCompleteness: 0.8,
        cleanlinessCorrectionSourceReliability: 0.8,
        score: 0.8,
        level: "high",
        availableFactors: 8,
        totalFactors: 10,
        missingFactors: [],
      },
      cigaretteButts: {
        dataCompleteness: 0.6,
        sourceCompleteness: 0.6,
        cleanlinessCorrectionCompleteness: 0.6,
        cleanlinessCorrectionSourceReliability: 0.6,
        score: 0.6,
        level: "medium",
        availableFactors: 6,
        totalFactors: 10,
        missingFactors: [],
      },
    },
    contributions: { waste: [], cigaretteButts: [] },
    cleanlinessCorrection: { waste: {} as never, cigaretteButts: {} as never },
    urbanMorphologyPrior: { waste: {} as never, cigaretteButts: {} as never },
    snapshot: {
      snapshotId: "snapshot-1",
      schemaVersion: "paris-pressure-v1",
      generatedAt: "2026-09-01T00:00:00.000Z",
      refreshedAt: "2026-09-01T00:00:00.000Z",
    },
    provenance: [],
    contextProvenance: [],
    provenanceGaps: [],
    ...overrides,
  };
}

function predictedCandidate(
  evidence: RoutePredictedEvidence,
  volunteerSafety: RoutePlannerCandidate extends infer Candidate
    ? Candidate extends { family: "predicted"; volunteerSafety?: infer Safety }
      ? Safety
      : never
    : never = { status: "safe", suitability: 1, confidence: 1 },
): RoutePlannerCandidate {
  return {
    id: evidence.zoneId,
    label: evidence.zoneLabel,
    latitude: evidence.centroid.latitude,
    longitude: evidence.centroid.longitude,
    score: 80,
    reason: "fixture",
    family: "predicted",
    evidence,
    volunteerSafety,
  } as RoutePlannerCandidate;
}

describe("cleanup workload contract", () => {
  it("preserves low and high predicted risks in separate native index units", () => {
    const workload = buildCleanupWorkload(predictedCandidate(predictedEvidence()));

    expect(workload).toMatchObject({
      modelVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
      status: "available",
      ordinaryWasteUnits: 18,
      cigaretteButtUnits: 72,
      unitBasis: {
        ordinaryWaste: "native_risk_index_0_100",
        cigaretteButts: "native_risk_index_0_100",
      },
      confidence: { ordinaryWaste: 0.8, cigaretteButts: 0.6 },
    });
  });

  it("derives observed category presence without pretending to know quantity", () => {
    const workload = buildCleanupWorkload(
      observedCandidate(["cigarette_butt", "plastic"]),
    );

    expect(workload).toMatchObject({
      status: "available",
      ordinaryWasteUnits: 1,
      cigaretteButtUnits: 1,
      unitBasis: {
        ordinaryWaste: "canonical_category_presence",
        cigaretteButts: "canonical_category_presence",
      },
      confidence: { ordinaryWaste: 1, cigaretteButts: 1 },
      provenance: {
        source: "trash_spotter_spots",
        evidenceFamily: "observed",
        observedAt: "2026-09-01T10:00:00.000Z",
      },
    });
  });

  it("keeps missing predicted data explicit and partial", () => {
    const workload = buildCleanupWorkload(
      predictedCandidate(predictedEvidence({ wasteRisk: Number.NaN })),
    );

    expect(workload).toMatchObject({
      status: "partial",
      ordinaryWasteUnits: null,
      cigaretteButtUnits: 72,
      confidence: { ordinaryWaste: null, cigaretteButts: 0.6 },
    });
  });

  it("excludes observed waste that volunteers cannot pick up", () => {
    const workload = buildCleanupWorkload(
      observedCandidate(["sharps"], {
        volunteerEligibility: "specialized_required",
        specializationReason: "no_pickup",
      }),
    );

    expect(workload).toMatchObject({
      status: "excluded",
      ordinaryWasteUnits: null,
      cigaretteButtUnits: null,
      exclusionReason: "no_pickup_waste",
    });
  });

  it("excludes a dangerous or safety-unknown predicted candidate", () => {
    const dangerous = buildCleanupWorkload(
      predictedCandidate(predictedEvidence(), {
        status: "excluded",
        suitability: 0,
        confidence: 1,
        exclusionReasons: ["active_roadway"],
      }),
    );
    const unknown = buildCleanupWorkload(
      predictedCandidate(predictedEvidence(), {
        status: "unknown",
        suitability: null,
        confidence: 0,
      }),
    );

    expect(dangerous).toMatchObject({
      status: "excluded",
      ordinaryWasteUnits: null,
      cigaretteButtUnits: null,
      exclusionReason: "unsafe_predicted_candidate",
    });
    expect(unknown.exclusionReason).toBe("unsafe_predicted_candidate");
  });

  it("is deterministic and preserves source version/provenance", () => {
    const candidate = predictedCandidate(predictedEvidence({
      zoneId: "zone-deterministic",
      provenance: [],
    }));

    expect(buildCleanupWorkload(candidate)).toEqual(buildCleanupWorkload(candidate));
    expect(buildCleanupWorkload(candidate).provenance).toMatchObject({
      zoneId: "zone-deterministic",
      sourceModelVersion: "paris-pressure-risk-v3-urban-morphology",
      snapshotId: "snapshot-1",
    });
  });
});
