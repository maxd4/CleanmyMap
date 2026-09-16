import type { CreateActionPayload } from "@/lib/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTrainingExampleInsert,
  recordTrainingExample,
} from "@/lib/actions/training";
import { toActionContract } from "@/lib/actions/unified-source/contracts";
import { evaluateRepollutionPredictionBeforeObservation } from "@/lib/actions/pollution/repollution-prediction-evaluation";
import { persistRepollutionPredictionEvaluation } from "@/lib/actions/pollution/repollution-prediction-evaluation-store";
import { logFailure } from "@/lib/logging/failure-log";
import { fetchActionRowById, fetchActionRows } from "./store-queries";

export async function recordCreateActionTrainingExample(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    payload: CreateActionPayload;
  },
): Promise<void> {
  try {
    const trainingExample = buildTrainingExampleInsert({
      actionId: params.actionId,
      photos: params.payload.photos ?? null,
      realWeightKg: params.payload.wasteKg ?? null,
      visionEstimate: params.payload.visionEstimate ?? null,
      metadata: {
        departureLocationLabel: params.payload.departureLocationLabel ?? null,
        arrivalLocationLabel: params.payload.arrivalLocationLabel ?? null,
        placeType: params.payload.placeType ?? null,
        submissionMode: params.payload.submissionMode ?? null,
      },
    });
    await recordTrainingExample(supabase, trainingExample);
  } catch (trainingError) {
    logFailure("Actions/Create", "Training example creation failed", trainingError, {
      actionId: params.actionId,
    });
  }
}

/**
 * Records a prospective evaluation after an approved action reaches the
 * canonical store. The bounded read is deliberately marked partial: without
 * a completeness proof it can only use the generic projection fallback.
 */
export async function recordRepollutionPredictionEvaluationForAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<void> {
  try {
    const currentRow = await fetchActionRowById(supabase, actionId);
    if (!currentRow || currentRow.status !== "approved") {
      return;
    }

    const rows = await fetchActionRows(supabase, {
      limit: 1001,
      status: "approved",
      requireCoordinates: true,
    });
    const current = toActionContract(currentRow);
    const previous = [current, ...rows.map((row) => toActionContract(row))].filter(
      (observation, index, all) =>
        observation.id !== current.id ||
        index === all.findIndex((candidate) => candidate.id === current.id),
    );

    const result = evaluateRepollutionPredictionBeforeObservation({
      newObservation: current,
      previousObservations: previous.filter(
        (observation) => observation.id !== current.id,
      ),
      historyCompleteness: "partial",
    });

    await persistRepollutionPredictionEvaluation(supabase, result);
  } catch (error) {
    logFailure(
      "Actions/RepollutionEvaluation",
      "Prospective repollution evaluation could not be recorded",
      error,
      { actionId },
    );
  }
}
