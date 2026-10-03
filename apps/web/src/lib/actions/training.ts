import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import { env } from "@/lib/env";
import { logWarning } from "@/lib/logging/failure-log";

type TrainingExampleStatus =
  | "pending_label"
  | "labelled"
  | "needs_review"
  | "no_photo";

export type TrainingExampleInsert = {
  action_id: string;
  photos: ActionPhotoAsset[] | null;
  poids_reel: number | null;
  poids_estime: number | null;
  intervalle: [number, number] | null;
  confiance: number | null;
  metadata: Record<string, unknown>;
  model_version: string;
  status: TrainingExampleStatus;
};

function isVisionTrainingEnabled(): boolean {
  return env.VISION_TRAINING_ENABLED === true;
}

function resolveTrainingExampleStatus(
  visionEstimate: ActionVisionEstimate | null,
): TrainingExampleStatus {
  if (!visionEstimate) {
    return "pending_label";
  }
  return visionEstimate.provisional ? "needs_review" : "labelled";
}

function buildTrainingVisionSignals(
  visionEstimate: ActionVisionEstimate,
): Record<string, unknown> {
  return {
    bagsCount: visionEstimate.bagsCount.value,
    fillLevel: visionEstimate.fillLevel.value,
    density: visionEstimate.density.value,
  };
}

function buildTrainingExamplePayload(params: {
  actionId: string;
  photos: ActionPhotoAsset[];
  realWeightKg: number | null;
  visionEstimate: ActionVisionEstimate | null;
  metadata: Record<string, unknown> | undefined;
}): TrainingExampleInsert {
  const visionEstimate = params.visionEstimate;
  const visionSignals = visionEstimate
    ? buildTrainingVisionSignals(visionEstimate)
    : null;

  return {
    action_id: params.actionId,
    photos: params.photos,
    poids_reel: params.realWeightKg,
    poids_estime: visionEstimate?.wasteKg.value ?? null,
    intervalle: visionEstimate?.wasteKg.interval ?? null,
    confiance: visionEstimate?.wasteKg.confidence ?? null,
    metadata: {
      ...(params.metadata ?? {}),
      trainingObjective: "predict_waste_mass_from_bag_photos",
      labelSource: "form_real_weight",
      visionSignals,
      photoCount: params.photos.length,
    },
    model_version: visionEstimate?.modelVersion ?? "vision-hybrid-v1",
    status: resolveTrainingExampleStatus(visionEstimate),
  };
}

export function buildTrainingExampleInsert(params: {
  actionId: string;
  photos?: ActionPhotoAsset[] | null;
  realWeightKg: number | null;
  visionEstimate?: ActionVisionEstimate | null;
  metadata?: Record<string, unknown>;
}): TrainingExampleInsert | null {
  if (!isVisionTrainingEnabled()) {
    return null;
  }

  const photos = params.photos ?? null;
  const visionEstimate = params.visionEstimate ?? null;
  if (!photos || photos.length === 0) {
    return null;
  }

  return buildTrainingExamplePayload({
    actionId: params.actionId,
    photos,
    realWeightKg: params.realWeightKg,
    visionEstimate,
    metadata: params.metadata,
  });
}

export async function recordTrainingExample(
  supabase: SupabaseClient,
  insert: TrainingExampleInsert | null,
): Promise<void> {
  if (!isVisionTrainingEnabled()) {
    return;
  }
  if (!insert) {
    return;
  }
  try {
    const result = await supabase.from("training_examples").insert(insert);
    if (result.error) {
      logWarning("Training", "Training example persistence skipped", {
        actionId: insert.action_id,
        reason: result.error.message,
      });
    }
  } catch (error) {
    logWarning("Training", "Training example persistence skipped", {
      actionId: insert.action_id,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}
