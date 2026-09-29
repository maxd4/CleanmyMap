import type { ActionVisionEstimate } from"@/lib/actions/types";

const VISION_WASTE_CONFIDENCE_THRESHOLD = 0.55;

type WasteSuggestionSource ="vision" |"heuristic";

export type WasteSuggestion = {
 estimatedWasteKg: number;
 estimatedWasteKgInterval: [number, number] | null;
 estimatedWasteKgConfidence: number | null;
 source: WasteSuggestionSource;
};

type ResolveWasteSuggestionParams = {
 heuristicEstimateKg: number;
 visionEstimate: ActionVisionEstimate | null;
};

export function resolveWasteSuggestion({
 heuristicEstimateKg,
 visionEstimate,
}: ResolveWasteSuggestionParams): WasteSuggestion {
 const confidence = visionEstimate?.wasteKg.confidence ?? null;
 const interval = visionEstimate?.wasteKg.interval ?? null;
 if (
 visionEstimate &&
 visionEstimate.wasteKg.confidence >= VISION_WASTE_CONFIDENCE_THRESHOLD
 ) {
 return {
 estimatedWasteKg: visionEstimate.wasteKg.value,
 estimatedWasteKgInterval: interval,
 estimatedWasteKgConfidence: confidence,
 source:"vision",
 };
 }
 return {
 estimatedWasteKg: heuristicEstimateKg,
 estimatedWasteKgInterval: interval,
 estimatedWasteKgConfidence: confidence,
 source:"heuristic",
 };
}
