import type { ActionPhotoAsset, ActionVisionEstimate } from "@/lib/actions/types";
import { inferActionVisionEstimate } from "@/lib/actions/vision";

type VisionInferenceContext = {
  locationLabel: string;
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
  placeType?: string;
  volunteersCount?: number;
  durationMinutes?: number;
};

// Isolated entry point: replace this adapter when a dedicated vision model is introduced.
export async function runActionVisionEstimate(
  photos: ActionPhotoAsset[],
  context: VisionInferenceContext,
): Promise<ActionVisionEstimate> {
  return inferActionVisionEstimate(photos, context);
}
