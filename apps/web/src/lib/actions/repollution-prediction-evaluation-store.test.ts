import { describe, expect, it, vi } from "vitest";
import {
  persistRepollutionPredictionEvaluation,
  toRepollutionPredictionEvaluationInsert,
} from "./repollution-prediction-evaluation-store";
import type { RepollutionPredictionEvaluationRecord } from "./repollution-prediction-evaluation";

const evaluation: RepollutionPredictionEvaluationRecord = {
  evaluationObservationType: "action",
  evaluationObservationId: "00000000-0000-0000-0000-000000000002",
  evaluationObservedAt: "2026-02-10",
  previousObservationType: "action",
  previousObservationId: "00000000-0000-0000-0000-000000000001",
  previousObservedAt: "2026-01-01",
  historicalScore: 100,
  postActionScore: 0,
  postActionScoreSource: "model_baseline",
  t80Days: 28,
  projectionProvenance: "generic",
  calibrationConfidence: "insufficient",
  projectedScore: 80,
  observedScore: 90,
  signedError: 10,
  absoluteError: 10,
  squaredError: 100,
  elapsedDays: 40,
  modelVersion: "action-repollution-projection-v1",
  modelSnapshot: { version: "action-repollution-projection-v1" },
  spatialMatchDistanceM: 12,
  spatialMatchMethod: "distance_only",
  evaluationMode: "online_frozen",
  derivedPlaceKeySnapshot: "derived-place:diagnostic-only",
};

describe("repollution prediction evaluation store", () => {
  it("uses an idempotent insert conflict key and does not write non-evaluable results", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "evaluation-1" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const upsert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ upsert });
    const supabase = { from };

    const stored = await persistRepollutionPredictionEvaluation(supabase as never, {
      status: "evaluable",
      evaluation,
    });

    expect(stored).toBe("evaluation-1");
    expect(upsert).toHaveBeenCalledWith(
      toRepollutionPredictionEvaluationInsert(evaluation),
      {
        onConflict:
          "evaluation_observation_type,evaluation_observation_id,model_version",
        ignoreDuplicates: true,
      },
    );
    expect(
      await persistRepollutionPredictionEvaluation(supabase as never, {
        status: "not_evaluable",
        observationType: "spot",
        observationId: "spot-1",
        observedAt: "2026-02-10",
        reason: "observation_unscored",
      }),
    ).toBeNull();
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
