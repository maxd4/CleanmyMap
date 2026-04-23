import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";

export type TrainingExampleStatus =
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

export type VisionTrainingMetrics = {
  count: number;
  labelledCount: number;
  mae: number | null;
  rmse: number | null;
  latestModelVersion: string | null;
  lowDataWarning: boolean;
  statusCounts: Record<TrainingExampleStatus, number>;
};

export function buildTrainingExampleInsert(params: {
  actionId: string;
  photos?: ActionPhotoAsset[] | null;
  realWeightKg: number | null;
  visionEstimate?: ActionVisionEstimate | null;
  metadata?: Record<string, unknown>;
}): TrainingExampleInsert | null {
  const photos = params.photos ?? null;
  const visionEstimate = params.visionEstimate ?? null;
  if (!photos || photos.length === 0) {
    return null;
  }

  const confidence = visionEstimate?.wasteKg.confidence ?? null;
  const estimated = visionEstimate?.wasteKg.value ?? null;
  const interval = visionEstimate?.wasteKg.interval ?? null;
  const status: TrainingExampleStatus = visionEstimate
    ? visionEstimate.provisional
      ? "needs_review"
      : "labelled"
    : "pending_label";

  return {
    action_id: params.actionId,
    photos,
    poids_reel: params.realWeightKg,
    poids_estime: estimated,
    intervalle: interval,
    confiance: confidence,
    metadata: {
      ...(params.metadata ?? {}),
      trainingObjective: "predict_waste_mass_from_bag_photos",
      labelSource: "form_real_weight",
      visionSignals: visionEstimate
        ? {
            bagsCount: visionEstimate.bagsCount.value,
            fillLevel: visionEstimate.fillLevel.value,
            density: visionEstimate.density.value,
          }
        : null,
      photoCount: photos.length,
    },
    model_version: visionEstimate?.modelVersion ?? "vision-hybrid-v1",
    status: status,
  };
}

export async function recordTrainingExample(
  supabase: SupabaseClient,
  insert: TrainingExampleInsert | null,
): Promise<void> {
  if (!insert) {
    return;
  }
  try {
    const result = await supabase.from("training_examples").insert(insert);
    if (result.error) {
      console.warn("Training example persistence skipped", {
        actionId: insert.action_id,
        message: result.error.message,
      });
    }
  } catch (error) {
    console.warn("Training example persistence skipped", {
      actionId: insert.action_id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function loadVisionTrainingMetrics(
  supabase: SupabaseClient,
): Promise<VisionTrainingMetrics> {
  const fallback: VisionTrainingMetrics = {
    count: 0,
    labelledCount: 0,
    mae: null,
    rmse: null,
    latestModelVersion: null,
    lowDataWarning: true,
    statusCounts: {
      pending_label: 0,
      labelled: 0,
      needs_review: 0,
      no_photo: 0,
    },
  };

  const result = await supabase
    .from("training_examples")
    .select("poids_reel, poids_estime, model_version, status, created_at");

  if (result.error || !result.data) {
    return fallback;
  }

  let totalAbsError = 0;
  let totalSquaredError = 0;
  let labelledCount = 0;
  let latestModelVersion: string | null = null;
  let latestTimestamp = 0;
  const statusCounts: VisionTrainingMetrics["statusCounts"] = {
    pending_label: 0,
    labelled: 0,
    needs_review: 0,
    no_photo: 0,
  };

  for (const row of result.data as Array<{
    poids_reel: number | null;
    poids_estime: number | null;
    model_version: string | null;
    status: TrainingExampleStatus | null;
    created_at: string | null;
  }>) {
    if (row.status && row.status in statusCounts) {
      statusCounts[row.status] += 1;
    }
    if (row.model_version && row.created_at) {
      const timestamp = Date.parse(row.created_at);
      if (Number.isFinite(timestamp) && timestamp >= latestTimestamp) {
        latestTimestamp = timestamp;
        latestModelVersion = row.model_version;
      }
    }
    if (
      typeof row.poids_reel === "number" &&
      typeof row.poids_estime === "number"
    ) {
      const error = row.poids_reel - row.poids_estime;
      totalAbsError += Math.abs(error);
      totalSquaredError += error * error;
      labelledCount += 1;
    }
  }

  return {
    count: result.data.length,
    labelledCount,
    mae: labelledCount > 0 ? totalAbsError / labelledCount : null,
    rmse:
      labelledCount > 0
        ? Math.sqrt(totalSquaredError / labelledCount)
        : null,
    latestModelVersion,
    lowDataWarning: result.data.length < 20,
    statusCounts,
  };
}
