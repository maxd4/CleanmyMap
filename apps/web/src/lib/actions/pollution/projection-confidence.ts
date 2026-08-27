import { GEOMETRY_CONFIDENCE } from "../geometry/geometry-core";

export const PROJECTION_CONFIDENCE_CONSTANTS = {
  reliableGeometryMinimum: GEOMETRY_CONFIDENCE.PERSISTED_IMPORTED,
  documentedGeometryMinimum: GEOMETRY_CONFIDENCE.REFERENCE_GEOMETRY,
  minimumSolidEvidenceForMedium: 2,
} as const;

export type ProjectionConfidenceLevel = "low" | "medium" | "high";

export type ProjectionConfidenceGeometryFactor =
  | "reliable"
  | "documented"
  | "approximate"
  | "unknown";

export type ProjectionConfidenceReason =
  | "reliable_geometry"
  | "documented_geometry"
  | "approximate_or_unknown_geometry"
  | "measured_post_action_score"
  | "model_baseline_post_action_score"
  | "sufficient_local_history"
  | "insufficient_local_history"
  | "complete_history"
  | "incomplete_history";

export type ProjectionConfidenceLocalCalibration = {
  provenance: "generic" | "local_history";
  validIntervalsCount: number;
  sourceCompleteness: "complete" | "partial";
};

export type ProjectionConfidenceInput = {
  geometryConfidence: number | null | undefined;
  postActionScoreSource: "measured" | "model_baseline";
  localCalibration?: ProjectionConfidenceLocalCalibration | null;
  sourceCompleteness: "complete" | "partial";
};

export type ProjectionConfidenceFactors = {
  geometry: ProjectionConfidenceGeometryFactor;
  postActionScore: "measured" | "model_baseline";
  localHistory: "sufficient" | "insufficient";
  history: "complete" | "partial";
};

export type ProjectionConfidence = {
  level: ProjectionConfidenceLevel;
  factors: ProjectionConfidenceFactors;
  reasons: readonly ProjectionConfidenceReason[];
};

function resolveGeometryFactor(
  confidence: number | null | undefined,
): ProjectionConfidenceGeometryFactor {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
    return "unknown";
  }

  if (confidence >= PROJECTION_CONFIDENCE_CONSTANTS.reliableGeometryMinimum) {
    return "reliable";
  }

  if (confidence >= PROJECTION_CONFIDENCE_CONSTANTS.documentedGeometryMinimum) {
    return "documented";
  }

  return "approximate";
}

/**
 * Local calibration owns the override rule. Confidence only describes the
 * provenance already resolved by calibration and must not recalculate its
 * activation threshold.
 */
function hasSufficientLocalHistory(
  input: ProjectionConfidenceInput,
): boolean {
  const calibration = input.localCalibration;
  return (
    input.sourceCompleteness === "complete" &&
    calibration?.sourceCompleteness === "complete" &&
    calibration.provenance === "local_history"
  );
}

export function resolveProjectionConfidence(
  input: ProjectionConfidenceInput,
): ProjectionConfidence {
  const geometry = resolveGeometryFactor(input.geometryConfidence);
  const postActionScore = input.postActionScoreSource;
  const localHistory = hasSufficientLocalHistory(input);
  const history =
    input.sourceCompleteness === "complete" &&
    (input.localCalibration === null ||
      input.localCalibration === undefined ||
      input.localCalibration.sourceCompleteness === "complete")
      ? "complete"
      : "partial";
  const geometryReliable = geometry === "reliable";
  const geometryDocumented = geometry === "documented";
  const postActionMeasured = postActionScore === "measured";
  const solidEvidenceCount = [
    geometryReliable || geometryDocumented,
    postActionMeasured,
    localHistory,
  ].filter(Boolean).length;
  const level: ProjectionConfidenceLevel =
    geometryReliable &&
    postActionMeasured &&
    localHistory &&
    history === "complete"
      ? "high"
      : solidEvidenceCount >=
          PROJECTION_CONFIDENCE_CONSTANTS.minimumSolidEvidenceForMedium
        ? "medium"
        : "low";

  const reasons: ProjectionConfidenceReason[] = [];
  if (geometry === "reliable") {
    reasons.push("reliable_geometry");
  } else if (geometry === "documented") {
    reasons.push("documented_geometry");
  } else {
    reasons.push("approximate_or_unknown_geometry");
  }
  reasons.push(
    postActionMeasured
      ? "measured_post_action_score"
      : "model_baseline_post_action_score",
  );
  reasons.push(
    localHistory ? "sufficient_local_history" : "insufficient_local_history",
  );
  reasons.push(history === "complete" ? "complete_history" : "incomplete_history");

  return {
    level,
    factors: {
      geometry,
      postActionScore,
      localHistory: localHistory ? "sufficient" : "insufficient",
      history,
    },
    reasons,
  };
}

export function formatProjectionConfidenceLabel(
  level: ProjectionConfidenceLevel,
): string {
  switch (level) {
    case "high":
      return "Confiance élevée";
    case "medium":
      return "Confiance moyenne";
    default:
      return "Confiance faible";
  }
}
