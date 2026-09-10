import { describe, expect, it } from "vitest";
import type { RoutePredictedEvidence } from "./route-predicted-targets";
import {
  buildCleanupWorkload,
  CLEANUP_WORKLOAD_MODEL_VERSION,
} from "./route-cleanup-workload";

function observedCandidate(
  wasteCategories: readonly string[],
  safety: {
    volunteerEligibility: "eligible" | "specialized_required";
    specializationReason:
      | "trained_only"
      | "no_pickup"
      | "missing_categories"
      | "unknown_categories"
      | null;
  } = {
    volunteerEligibility: "eligible",
    specializationReason: null,
  },
) {
  return {
    id: "observed-1",
    family: "observed" as const,
    source: "trash_spotter_spots" as const,
    observedAt: "2026-09-01T10:00:00.000Z",
    wasteCategories,
    safety,
  };
}

function predictedEvidence(
  overrides: Partial<RoutePredictedEvidence> = {},
): RoutePredictedEvidence {
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
  volunteerSafety?: { status: "safe" | "unknown" | "excluded" },
) {
  return {
    id: evidence.zoneId,
    family: "predicted" as const,
    evidence,
    ...(volunteerSafety ? { volunteerSafety } : {}),
  };
}

describe("cleanup workload contract", () => {
  it("records observed cigarette-butt presence without numeric units or confidence", () => {
    const workload = buildCleanupWorkload(
      observedCandidate(["cigarette_butt"]),
    );

    expect(workload).toMatchObject({
      modelVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
      status: "presence_only",
      ordinaryWaste: {
        relativePressure: null,
        observedPresence: false,
        confidence: null,
      },
      cigaretteButts: {
        relativePressure: null,
        observedPresence: true,
        confidence: null,
      },
      confidence: { ordinaryWaste: null, cigaretteButts: null },
    });
    expect(workload).not.toHaveProperty("ordinaryWasteUnits");
    expect(workload).not.toHaveProperty("cigaretteButtUnits");
  });

  it("records ordinary-waste presence only", () => {
    const workload = buildCleanupWorkload(observedCandidate(["plastic"]));

    expect(workload.ordinaryWaste).toEqual({
      relativePressure: null,
      observedPresence: true,
      confidence: null,
    });
    expect(workload.cigaretteButts).toEqual({
      relativePressure: null,
      observedPresence: false,
      confidence: null,
    });
    expect(workload.status).toBe("presence_only");
  });

  it("records both observed presences without turning categories into quantities", () => {
    const workload = buildCleanupWorkload(
      observedCandidate(["cigarette_butt", "plastic", "glass"]),
    );

    expect(workload.ordinaryWaste.observedPresence).toBe(true);
    expect(workload.cigaretteButts.observedPresence).toBe(true);
    expect(workload.ordinaryWaste.relativePressure).toBeNull();
    expect(workload.cigaretteButts.relativePressure).toBeNull();
    expect(workload.confidence).toEqual({ ordinaryWaste: null, cigaretteButts: null });
  });

  it("preserves native predicted risks and axis confidence", () => {
    const workload = buildCleanupWorkload(
      predictedCandidate(predictedEvidence(), { status: "safe" }),
    );

    expect(workload).toMatchObject({
      modelVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
      status: "relative_estimate",
      ordinaryWaste: {
        relativePressure: 18,
        observedPresence: null,
        confidence: 0.8,
      },
      cigaretteButts: {
        relativePressure: 72,
        observedPresence: null,
        confidence: 0.6,
      },
    });
  });

  it("marks safe predicted data unavailable when both risks are missing", () => {
    const workload = buildCleanupWorkload(
      predictedCandidate(
        predictedEvidence({ wasteRisk: Number.NaN, cigaretteButtRisk: Number.NaN }),
        { status: "safe" },
      ),
    );

    expect(workload.status).toBe("unavailable");
    expect(workload.ordinaryWaste.relativePressure).toBeNull();
    expect(workload.cigaretteButts.relativePressure).toBeNull();
    expect(workload.ordinaryWaste.observedPresence).toBeNull();
    expect(workload.cigaretteButts.observedPresence).toBeNull();
  });

  it("excludes unsafe or unknown predicted candidates", () => {
    const unsafe = buildCleanupWorkload(
      predictedCandidate(predictedEvidence(), { status: "excluded" }),
    );
    const unknown = buildCleanupWorkload(predictedCandidate(predictedEvidence()));

    expect(unsafe).toMatchObject({
      status: "excluded",
      ordinaryWaste: { relativePressure: null, observedPresence: null, confidence: null },
      cigaretteButts: { relativePressure: null, observedPresence: null, confidence: null },
      exclusionReason: "unsafe_predicted_candidate",
    });
    expect(unknown.exclusionReason).toBe("unknown_predicted_safety");
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
      ordinaryWaste: { relativePressure: null, observedPresence: null, confidence: null },
      cigaretteButts: { relativePressure: null, observedPresence: null, confidence: null },
      exclusionReason: "no_pickup_waste",
    });
  });

  it("is deterministic and preserves predicted provenance", () => {
    const candidate = predictedCandidate(
      predictedEvidence({ zoneId: "zone-deterministic", provenance: [] }),
      { status: "safe" },
    );

    expect(buildCleanupWorkload(candidate)).toEqual(buildCleanupWorkload(candidate));
    expect(buildCleanupWorkload(candidate).provenance).toMatchObject({
      zoneId: "zone-deterministic",
      sourceModelVersion: "paris-pressure-risk-v3-urban-morphology",
      snapshotId: "snapshot-1",
    });
  });
});
