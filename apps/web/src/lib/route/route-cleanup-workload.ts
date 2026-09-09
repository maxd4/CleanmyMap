import {
  isVolunteerRouteEligible,
  type TrashSpotterActionableCandidate,
} from "@/lib/actions/trash-spotter-actionable-candidates";
import type { ParisPressureProvenance } from "@/lib/geo/paris-pressure-contract";
import type { RoutePlannerCandidate } from "./route-planner";
import type { RoutePredictedEvidence } from "./route-predicted-targets";

/**
 * This is an evidence vector, not a physical quantity or a duration model.
 * Its version must change when the interpretation of either component changes.
 */
export const CLEANUP_WORKLOAD_MODEL_VERSION = "cleanup-workload-v1" as const;

export type CleanupWorkloadStatus =
  | "available"
  | "partial"
  | "unavailable"
  | "excluded";

export type CleanupWorkloadExclusionReason =
  | "missing_categories"
  | "specialized_waste"
  | "no_pickup_waste"
  | "unsafe_predicted_candidate"
  | "unknown_predicted_safety";

export type CleanupWorkloadUnitBasis =
  | "canonical_category_presence"
  | "native_risk_index_0_100";

export type CleanupWorkloadConfidence = {
  ordinaryWaste: number | null;
  cigaretteButts: number | null;
};

export type CleanupWorkloadProvenance = {
  source: "trash_spotter_spots" | "urban-pressure-model";
  evidenceFamily: "observed" | "predicted";
  observedAt: string | null;
  zoneId: string | null;
  sourceModelVersion: string | null;
  snapshotId: string | null;
  sourceProvenance: readonly ParisPressureProvenance[];
};

export type CleanupWorkload = {
  modelVersion: typeof CLEANUP_WORKLOAD_MODEL_VERSION;
  candidateId: string;
  family: "observed" | "predicted";
  status: CleanupWorkloadStatus;
  ordinaryWasteUnits: number | null;
  cigaretteButtUnits: number | null;
  unitBasis: {
    ordinaryWaste: CleanupWorkloadUnitBasis;
    cigaretteButts: CleanupWorkloadUnitBasis;
  };
  confidence: CleanupWorkloadConfidence;
  provenance: CleanupWorkloadProvenance;
  exclusionReason: CleanupWorkloadExclusionReason | null;
};

function emptyConfidence(): CleanupWorkloadConfidence {
  return { ordinaryWaste: null, cigaretteButts: null };
}

function finiteRisk(value: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

function finiteConfidence(value: number, available: boolean): number | null {
  return available && Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
}

function observedProvenance(candidate: TrashSpotterActionableCandidate): CleanupWorkloadProvenance {
  return {
    source: candidate.source,
    evidenceFamily: "observed",
    observedAt: candidate.observedAt,
    zoneId: null,
    sourceModelVersion: null,
    snapshotId: null,
    sourceProvenance: [],
  };
}

function predictedProvenance(evidence: RoutePredictedEvidence): CleanupWorkloadProvenance {
  return {
    source: evidence.source,
    evidenceFamily: "predicted",
    observedAt: null,
    zoneId: evidence.zoneId,
    sourceModelVersion: evidence.modelVersion,
    snapshotId: evidence.snapshot.snapshotId,
    sourceProvenance: [...evidence.provenance],
  };
}

function observedExclusionReason(
  candidate: TrashSpotterActionableCandidate,
): CleanupWorkloadExclusionReason {
  if (candidate.safety.specializationReason === "missing_categories") {
    return "missing_categories";
  }
  if (candidate.safety.specializationReason === "no_pickup") {
    return "no_pickup_waste";
  }
  return "specialized_waste";
}

function observedWorkload(candidate: Extract<RoutePlannerCandidate, { family: "observed" }>): CleanupWorkload {
  const categories = [...new Set(candidate.wasteCategories)].sort();
  const provenance = observedProvenance(candidate);
  const base = {
    modelVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
    candidateId: candidate.id,
    family: "observed" as const,
    unitBasis: {
      ordinaryWaste: "canonical_category_presence" as const,
      cigaretteButts: "canonical_category_presence" as const,
    },
    provenance,
  };

  if (!isVolunteerRouteEligible(candidate)) {
    return {
      ...base,
      status: "excluded",
      ordinaryWasteUnits: null,
      cigaretteButtUnits: null,
      confidence: emptyConfidence(),
      exclusionReason: observedExclusionReason(candidate),
    };
  }

  if (categories.length === 0) {
    return {
      ...base,
      status: "unavailable",
      ordinaryWasteUnits: null,
      cigaretteButtUnits: null,
      confidence: emptyConfidence(),
      exclusionReason: null,
    };
  }

  const cigaretteButtUnits = categories.filter((category) => category === "cigarette_butt").length;
  const ordinaryWasteUnits = categories.length - cigaretteButtUnits;
  return {
    ...base,
    status: "available",
    ordinaryWasteUnits,
    cigaretteButtUnits,
    confidence: {
      ordinaryWaste: ordinaryWasteUnits > 0 ? 1 : null,
      cigaretteButts: cigaretteButtUnits > 0 ? 1 : null,
    },
    exclusionReason: null,
  };
}

function predictedWorkload(candidate: Extract<RoutePlannerCandidate, { family: "predicted" }>): CleanupWorkload {
  const evidence = candidate.evidence;
  const ordinaryWasteUnits = finiteRisk(evidence.wasteRisk);
  const cigaretteButtUnits = finiteRisk(evidence.cigaretteButtRisk);
  const confidence = {
    ordinaryWaste: finiteConfidence(evidence.confidence.waste.score, ordinaryWasteUnits !== null),
    cigaretteButts: finiteConfidence(evidence.confidence.cigaretteButts.score, cigaretteButtUnits !== null),
  };
  const base = {
    modelVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
    candidateId: candidate.id,
    family: "predicted" as const,
    unitBasis: {
      ordinaryWaste: "native_risk_index_0_100" as const,
      cigaretteButts: "native_risk_index_0_100" as const,
    },
    confidence,
    provenance: predictedProvenance(evidence),
  };

  if (candidate.volunteerSafety === undefined) {
    return {
      ...base,
      status: "excluded",
      ordinaryWasteUnits: null,
      cigaretteButtUnits: null,
      confidence: emptyConfidence(),
      exclusionReason: "unknown_predicted_safety",
    };
  }
  if (candidate.volunteerSafety.status !== "safe") {
    return {
      ...base,
      status: "excluded",
      ordinaryWasteUnits: null,
      cigaretteButtUnits: null,
      confidence: emptyConfidence(),
      exclusionReason: "unsafe_predicted_candidate",
    };
  }

  const availableComponents = [ordinaryWasteUnits, cigaretteButtUnits].filter(
    (value): value is number => value !== null,
  ).length;
  return {
    ...base,
    status:
      availableComponents === 0
        ? "unavailable"
        : availableComponents === 2
          ? "available"
          : "partial",
    ordinaryWasteUnits,
    cigaretteButtUnits,
    exclusionReason: null,
  };
}

/**
 * Derives the versioned workload vector from route evidence only.
 *
 * Observed units count distinct canonical category evidence. Predicted units
 * preserve the model's native 0-100 risk indexes. Neither branch estimates
 * physical amounts, kilograms, object counts, pickup permission, or minutes.
 */
export function buildCleanupWorkload(candidate: RoutePlannerCandidate): CleanupWorkload {
  return candidate.family === "observed"
    ? observedWorkload(candidate)
    : predictedWorkload(candidate);
}
