import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RepollutionPredictionEvaluation,
  RepollutionPredictionEvaluationRecord,
} from "./repollution-prediction-evaluation";

export type RepollutionPredictionEvaluationInsert = {
  evaluation_observation_type: "action" | "spot";
  evaluation_observation_id: string;
  evaluation_observed_at: string;
  previous_observation_type: "action" | "spot";
  previous_observation_id: string;
  previous_observed_at: string;
  predicted_score: number;
  observed_score: number;
  signed_error: number;
  absolute_error: number;
  squared_error: number;
  elapsed_days: number;
  historical_score: number;
  post_action_score: number;
  post_action_score_source: "measured" | "model_baseline";
  t80_days: number;
  projection_provenance: "generic" | "local_history";
  calibration_confidence: "insufficient" | "low" | "medium" | "high";
  model_version: string;
  model_snapshot: Record<string, unknown>;
  spatial_match_distance_m: number;
  spatial_match_method: "distance_only" | "distance_and_label";
  evaluation_mode: "online_frozen" | "retrospective_replay";
  derived_place_key_snapshot: string | null;
};

function toInsertRow(
  evaluation: RepollutionPredictionEvaluationRecord,
): RepollutionPredictionEvaluationInsert {
  return {
    evaluation_observation_type: evaluation.evaluationObservationType,
    evaluation_observation_id: evaluation.evaluationObservationId,
    evaluation_observed_at: evaluation.evaluationObservedAt,
    previous_observation_type: evaluation.previousObservationType,
    previous_observation_id: evaluation.previousObservationId,
    previous_observed_at: evaluation.previousObservedAt,
    predicted_score: evaluation.projectedScore,
    observed_score: evaluation.observedScore,
    signed_error: evaluation.signedError,
    absolute_error: evaluation.absoluteError,
    squared_error: evaluation.squaredError,
    elapsed_days: evaluation.elapsedDays,
    historical_score: evaluation.historicalScore,
    post_action_score: evaluation.postActionScore,
    post_action_score_source: evaluation.postActionScoreSource,
    t80_days: evaluation.t80Days,
    projection_provenance: evaluation.projectionProvenance,
    calibration_confidence: evaluation.calibrationConfidence,
    model_version: evaluation.modelVersion,
    model_snapshot: evaluation.modelSnapshot,
    spatial_match_distance_m: evaluation.spatialMatchDistanceM,
    spatial_match_method: evaluation.spatialMatchMethod,
    evaluation_mode: evaluation.evaluationMode,
    derived_place_key_snapshot: evaluation.derivedPlaceKeySnapshot,
  };
}

/**
 * Persists only evaluable results. The database unique constraint and this
 * ignore-duplicates upsert make retries safe for the same observation/model.
 */
export async function persistRepollutionPredictionEvaluation(
  supabase: SupabaseClient,
  result: RepollutionPredictionEvaluation,
): Promise<string | null> {
  if (result.status !== "evaluable") {
    return null;
  }

  const inserted = await supabase
    .from("action_pollution_prediction_evaluations")
    .upsert(toInsertRow(result.evaluation), {
      onConflict:
        "evaluation_observation_type,evaluation_observation_id,model_version",
      ignoreDuplicates: true,
    })
    .select("id")
    .maybeSingle();

  if (inserted.error) {
    throw inserted.error;
  }

  return (inserted.data as { id?: string } | null)?.id ?? null;
}

export function toRepollutionPredictionEvaluationInsert(
  evaluation: RepollutionPredictionEvaluationRecord,
): RepollutionPredictionEvaluationInsert {
  return toInsertRow(evaluation);
}
