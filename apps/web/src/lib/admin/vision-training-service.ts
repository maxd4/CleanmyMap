import { env } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  computeVisionTrainingMetrics,
  type VisionTrainingExampleRow,
  type VisionTrainingMetrics,
} from "./vision-training-metrics";

const VISION_TRAINING_READ_LIMIT = 1000;

export async function loadVisionTrainingMetrics(): Promise<VisionTrainingMetrics> {
  const paused = env.VISION_TRAINING_ENABLED !== true;

  try {
    const { data, error } = await getSupabaseServerClient(true)
      .from("training_examples")
      .select("created_at, poids_reel, poids_estime, model_version, status")
      .order("created_at", { ascending: false })
      .limit(VISION_TRAINING_READ_LIMIT);

    if (error || !data) {
      return computeVisionTrainingMetrics([], paused);
    }

    return computeVisionTrainingMetrics(
      data as VisionTrainingExampleRow[],
      paused,
    );
  } catch {
    return computeVisionTrainingMetrics([], paused);
  }
}
