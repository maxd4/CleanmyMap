import type {
  TrashSpotterSafety,
  TrashSpotterSpecializationReason,
} from "@/lib/actions/trash-spotter-actionable-candidates";
import type { RoutePredictedEvidence } from "./route-predicted-targets";

/**
 * This is an evidence vector, not a physical quantity or a duration model.
 * Its version must change when the interpretation of either component changes.
 */
export const CLEANUP_WORKLOAD_MODEL_VERSION = "route-cleanup-workload-v1" as const;

export type CleanupWorkloadStatus =
  | "relative_estimate"
  | "presence_only"
  | "unavailable"
  | "excluded";

export type CleanupWorkloadExclusionReason =
  | "missing_categories"
  | "specialized_waste"
  | "no_pickup_waste"
  | "unsafe_predicted_candidate"
  | "unknown_predicted_safety";

export type CleanupWorkloadAxis = {
  relativePressure: number | null;
  observedPresence: boolean | null;
  confidence: number | null;
};

export type CleanupWorkloadConfidence = {
  ordinaryWaste: number | null;
  cigaretteButts: number | null;
};

export type CleanupWorkloadProvenance = {
  source: "trash_spotter_spots" | "urban-pressure-model" | null;
  evidenceFamily: "observed" | "predicted" | null;
  observedAt: string | null;
  zoneId: string | null;
  sourceModelVersion: string | null;
  snapshotId: string | null;
  sourceProvenance: readonly RoutePredictedEvidence["provenance"][number][];
};

export type CleanupWorkload = {
  modelVersion: typeof CLEANUP_WORKLOAD_MODEL_VERSION;
  candidateId: string;
  family: "observed" | "predicted";
  status: CleanupWorkloadStatus;
  ordinaryWaste: CleanupWorkloadAxis;
  cigaretteButts: CleanupWorkloadAxis;
  confidence: CleanupWorkloadConfidence;
  provenance: CleanupWorkloadProvenance;
  exclusionReason: CleanupWorkloadExclusionReason | null;
};

export type CleanupWorkloadObservedInput = {
  family: "observed";
  id: string;
  source: "trash_spotter_spots";
  observedAt: string;
  wasteCategories: readonly string[];
  safety: Pick<TrashSpotterSafety, "volunteerEligibility" | "specializationReason">;
};

export type CleanupWorkloadPredictedInput = {
  family: "predicted";
  id: string;
  evidence: Pick<RoutePredictedEvidence, "source"> &
    Partial<
      Pick<
        RoutePredictedEvidence,
        | "modelVersion"
        | "zoneId"
        | "snapshot"
        | "provenance"
        | "wasteRisk"
        | "cigaretteButtRisk"
        | "confidence"
      >
    >;
  volunteerSafety?: { status: "safe" | "unknown" | "excluded" };
};

export type CleanupWorkloadInput =
  | CleanupWorkloadObservedInput
  | CleanupWorkloadPredictedInput
  // Older planner fixtures/callers can omit canonical evidence. Keep them
  // representable without turning missing evidence into a quantity.
  | { family?: undefined; id: string };

function emptyAxis(): CleanupWorkloadAxis {
  return {
    relativePressure: null,
    observedPresence: null,
    confidence: null,
  };
}

function emptyConfidence(): CleanupWorkloadConfidence {
  return { ordinaryWaste: null, cigaretteButts: null };
}

function finiteRisk(value: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

function finiteConfidence(value: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null;
}

function observedProvenance(
  candidate: CleanupWorkloadObservedInput,
): CleanupWorkloadProvenance {
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

function predictedProvenance(
  evidence: CleanupWorkloadPredictedInput["evidence"],
): CleanupWorkloadProvenance {
  return {
    source: evidence.source,
    evidenceFamily: "predicted",
    observedAt: null,
    zoneId: evidence.zoneId ?? null,
    sourceModelVersion: evidence.modelVersion ?? null,
    snapshotId: evidence.snapshot?.snapshotId ?? null,
    sourceProvenance: [...(evidence.provenance ?? [])],
  };
}

function observedExclusionReason(
  safety: CleanupWorkloadObservedInput["safety"],
): CleanupWorkloadExclusionReason {
  const reason: TrashSpotterSpecializationReason | null = safety.specializationReason;
  if (reason === "missing_categories") return "missing_categories";
  if (reason === "no_pickup") return "no_pickup_waste";
  return "specialized_waste";
}

function observedWorkload(
  candidate: CleanupWorkloadObservedInput,
): CleanupWorkload {
  const base = {
    modelVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
    candidateId: candidate.id,
    family: "observed" as const,
    provenance: observedProvenance(candidate),
  };

  if (candidate.safety.volunteerEligibility !== "eligible") {
    return {
      ...base,
      status: "excluded",
      ordinaryWaste: emptyAxis(),
      cigaretteButts: emptyAxis(),
      confidence: emptyConfidence(),
      exclusionReason: observedExclusionReason(candidate.safety),
    };
  }

  if (candidate.wasteCategories.length === 0) {
    return {
      ...base,
      status: "unavailable",
      ordinaryWaste: emptyAxis(),
      cigaretteButts: emptyAxis(),
      confidence: emptyConfidence(),
      exclusionReason: null,
    };
  }

  const cigaretteButtsPresent = candidate.wasteCategories.includes("cigarette_butt");
  const ordinaryWastePresent = candidate.wasteCategories.some(
    (category) => category !== "cigarette_butt",
  );
  return {
    ...base,
    status: "presence_only",
    ordinaryWaste: {
      relativePressure: null,
      observedPresence: ordinaryWastePresent,
      confidence: null,
    },
    cigaretteButts: {
      relativePressure: null,
      observedPresence: cigaretteButtsPresent,
      confidence: null,
    },
    confidence: emptyConfidence(),
    exclusionReason: null,
  };
}

function predictedWorkload(
  candidate: CleanupWorkloadPredictedInput,
): CleanupWorkload {
  const evidence = candidate.evidence;
  const ordinaryWastePressure = finiteRisk(evidence.wasteRisk ?? Number.NaN);
  const cigaretteButtPressure = finiteRisk(evidence.cigaretteButtRisk ?? Number.NaN);
  const confidence = {
    ordinaryWaste: finiteConfidence(evidence.confidence?.waste?.score ?? Number.NaN),
    cigaretteButts: finiteConfidence(
      evidence.confidence?.cigaretteButts?.score ?? Number.NaN,
    ),
  };
  const base = {
    modelVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
    candidateId: candidate.id,
    family: "predicted" as const,
    confidence,
    provenance: predictedProvenance(evidence),
  };

  if (candidate.volunteerSafety === undefined) {
    return {
      ...base,
      status: "excluded",
      ordinaryWaste: emptyAxis(),
      cigaretteButts: emptyAxis(),
      confidence: emptyConfidence(),
      exclusionReason: "unknown_predicted_safety",
    };
  }
  if (candidate.volunteerSafety.status !== "safe") {
    return {
      ...base,
      status: "excluded",
      ordinaryWaste: emptyAxis(),
      cigaretteButts: emptyAxis(),
      confidence: emptyConfidence(),
      exclusionReason: "unsafe_predicted_candidate",
    };
  }

  const ordinaryWaste = {
    relativePressure: ordinaryWastePressure,
    observedPresence: null,
    confidence: ordinaryWastePressure === null ? null : confidence.ordinaryWaste,
  };
  const cigaretteButts = {
    relativePressure: cigaretteButtPressure,
    observedPresence: null,
    confidence: cigaretteButtPressure === null ? null : confidence.cigaretteButts,
  };
  return {
    ...base,
    status:
      ordinaryWastePressure === null && cigaretteButtPressure === null
        ? "unavailable"
        : "relative_estimate",
    ordinaryWaste,
    cigaretteButts,
    exclusionReason: null,
  };
}

function unavailableWorkload(candidateId: string): CleanupWorkload {
  return {
    modelVersion: CLEANUP_WORKLOAD_MODEL_VERSION,
    candidateId,
    family: "observed",
    status: "unavailable",
    ordinaryWaste: emptyAxis(),
    cigaretteButts: emptyAxis(),
    confidence: emptyConfidence(),
    provenance: {
      source: null,
      evidenceFamily: null,
      observedAt: null,
      zoneId: null,
      sourceModelVersion: null,
      snapshotId: null,
      sourceProvenance: [],
    },
    exclusionReason: null,
  };
}

/**
 * Derives the versioned workload vector from a minimal evidence-shaped input.
 *
 * Observed categories prove presence only. Predicted risks preserve the
 * model's native 0-100 indexes. Neither branch estimates physical amounts,
 * kilograms, object counts, pickup permission, or minutes.
 */
export function buildCleanupWorkload(
  candidate: CleanupWorkloadInput,
): CleanupWorkload {
  if (candidate.family === "observed") return observedWorkload(candidate);
  if (candidate.family === "predicted") return predictedWorkload(candidate);
  return unavailableWorkload(candidate.id);
}
