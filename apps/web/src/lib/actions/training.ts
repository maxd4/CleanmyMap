import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import { env } from "@/lib/env";
import { logWarning } from "@/lib/logging/failure-log";

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
  paused: boolean;
  statusCounts: Record<TrainingExampleStatus, number>;
};

export function isVisionTrainingEnabled(): boolean {
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

type TrainingMetricsAccumulator = {
  totalAbsError: number;
  totalSquaredError: number;
  labelledCount: number;
  latestModelVersion: string | null;
  latestTimestamp: number;
  statusCounts: VisionTrainingMetrics["statusCounts"];
};

function createTrainingStatusCounts(): VisionTrainingMetrics["statusCounts"] {
  return {
    pending_label: 0,
    labelled: 0,
    needs_review: 0,
    no_photo: 0,
  };
}

function buildTrainingMetricsAccumulator(): TrainingMetricsAccumulator {
  return {
    totalAbsError: 0,
    totalSquaredError: 0,
    labelledCount: 0,
    latestModelVersion: null,
    latestTimestamp: 0,
    statusCounts: createTrainingStatusCounts(),
  };
}

function updateTrainingStatusCounts(
  statusCounts: VisionTrainingMetrics["statusCounts"],
  status: TrainingExampleStatus | null,
): void {
  if (status && status in statusCounts) {
    statusCounts[status] += 1;
  }
}

function updateTrainingLatestModelVersion(
  accumulator: TrainingMetricsAccumulator,
  row: {
    model_version: string | null;
    created_at: string | null;
  },
): void {
  if (!row.model_version || !row.created_at) {
    return;
  }
  const timestamp = Date.parse(row.created_at);
  if (Number.isFinite(timestamp) && timestamp >= accumulator.latestTimestamp) {
    accumulator.latestTimestamp = timestamp;
    accumulator.latestModelVersion = row.model_version;
  }
}

function accumulateTrainingError(
  accumulator: TrainingMetricsAccumulator,
  row: {
    poids_reel: number | null;
    poids_estime: number | null;
  },
): void {
  if (
    typeof row.poids_reel !== "number" ||
    typeof row.poids_estime !== "number"
  ) {
    return;
  }
  const error = row.poids_reel - row.poids_estime;
  accumulator.totalAbsError += Math.abs(error);
  accumulator.totalSquaredError += error * error;
  accumulator.labelledCount += 1;
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
    paused: !isVisionTrainingEnabled(),
    statusCounts: {
      pending_label: 0,
      labelled: 0,
      needs_review: 0,
      no_photo: 0,
    },
  };

  if (!isVisionTrainingEnabled()) {
    return fallback;
  }

  const result = await supabase
    .from("training_examples")
    .select("poids_reel, poids_estime, model_version, status, created_at");

  if (result.error || !result.data) {
    return fallback;
  }

  const accumulator = buildTrainingMetricsAccumulator();

  for (const row of result.data as Array<{
    poids_reel: number | null;
    poids_estime: number | null;
    model_version: string | null;
    status: TrainingExampleStatus | null;
    created_at: string | null;
  }>) {
    updateTrainingStatusCounts(accumulator.statusCounts, row.status);
    updateTrainingLatestModelVersion(accumulator, row);
    accumulateTrainingError(accumulator, row);
  }

  return {
    count: result.data.length,
    labelledCount: accumulator.labelledCount,
    mae:
      accumulator.labelledCount > 0
        ? accumulator.totalAbsError / accumulator.labelledCount
        : null,
    rmse:
      accumulator.labelledCount > 0
        ? Math.sqrt(accumulator.totalSquaredError / accumulator.labelledCount)
        : null,
    latestModelVersion: accumulator.latestModelVersion,
    lowDataWarning: result.data.length < 20,
    paused: result.data.length === 0,
    statusCounts: accumulator.statusCounts,
  };
}
