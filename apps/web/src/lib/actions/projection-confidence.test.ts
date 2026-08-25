import { describe, expect, it } from "vitest";
import {
  formatProjectionConfidenceLabel,
  PROJECTION_CONFIDENCE_CONSTANTS,
  resolveProjectionConfidence,
} from "./projection-confidence";
import { LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS } from "./local-repollution-calibration";

const completeLocalCalibration = {
  provenance: "local_history" as const,
  validIntervalsCount:
    LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.minimumIntervalsForOverride,
  sourceCompleteness: "complete" as const,
};

describe("projection confidence", () => {
  it("defaults to low for a generic projection with weak evidence", () => {
    const result = resolveProjectionConfidence({
      geometryConfidence: 0.58,
      postActionScoreSource: "model_baseline",
      sourceCompleteness: "partial",
    });

    expect(result.level).toBe("low");
    expect(result.factors).toEqual({
      geometry: "approximate",
      postActionScore: "model_baseline",
      localHistory: "insufficient",
      history: "partial",
    });
    expect(result.reasons).toEqual([
      "approximate_or_unknown_geometry",
      "model_baseline_post_action_score",
      "insufficient_local_history",
      "incomplete_history",
    ]);
  });

  it("returns medium when several solid proofs exist without complete local history", () => {
    const result = resolveProjectionConfidence({
      geometryConfidence: PROJECTION_CONFIDENCE_CONSTANTS.documentedGeometryMinimum,
      postActionScoreSource: "measured",
      sourceCompleteness: "partial",
    });

    expect(result.level).toBe("medium");
    expect(result.factors.geometry).toBe("documented");
    expect(result.factors.postActionScore).toBe("measured");
    expect(result.factors.history).toBe("partial");
  });

  it("returns high only with reliable geometry, measured S_post and complete local history", () => {
    const result = resolveProjectionConfidence({
      geometryConfidence: PROJECTION_CONFIDENCE_CONSTANTS.reliableGeometryMinimum,
      postActionScoreSource: "measured",
      localCalibration: completeLocalCalibration,
      sourceCompleteness: "complete",
    });

    expect(result.level).toBe("high");
    expect(result.factors).toEqual({
      geometry: "reliable",
      postActionScore: "measured",
      localHistory: "sufficient",
      history: "complete",
    });
  });

  it("never infers high confidence from incomplete local history", () => {
    const result = resolveProjectionConfidence({
      geometryConfidence: 1,
      postActionScoreSource: "measured",
      localCalibration: {
        ...completeLocalCalibration,
        sourceCompleteness: "partial",
      },
      sourceCompleteness: "partial",
    });

    expect(result.level).toBe("medium");
    expect(result.factors.localHistory).toBe("insufficient");
    expect(result.factors.history).toBe("partial");
    expect(result.reasons).toContain("incomplete_history");
  });

  it("keeps confidence presentation neutral and deterministic", () => {
    expect(formatProjectionConfidenceLabel("low")).toBe("Confiance faible");
    expect(formatProjectionConfidenceLabel("medium")).toBe("Confiance moyenne");
    expect(formatProjectionConfidenceLabel("high")).toBe("Confiance élevée");

    const input = {
      geometryConfidence: 0.72,
      postActionScoreSource: "measured" as const,
      sourceCompleteness: "complete" as const,
    };
    expect(resolveProjectionConfidence(input)).toEqual(
      resolveProjectionConfidence(input),
    );
  });
});
