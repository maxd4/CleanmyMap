import { buildWasteFieldGuidance } from "@/lib/waste";
import type { ActionPreparationData } from "@/lib/actions/types";

export type PublicActionPracticalInformation = {
  accessibility: string | null;
  safetyInstructions: string | null;
  derivedSafetyRecommendations: string[];
  materialsToBring: string | null;
  derivedMaterials: string[];
  materialsProvided: string | null;
  participantMessage: string | null;
};

function readPublicText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Projects only the practical information that a volunteer needs before a
 * published action. Private preparation fields deliberately have no mapping
 * here, even when they are present in the persisted JSON.
 */
export function buildPublicActionPracticalInformation(
  preparationData: ActionPreparationData | null | undefined,
): PublicActionPracticalInformation {
  const guidance = buildWasteFieldGuidance(preparationData?.expectedWasteCategories);

  return {
    accessibility: readPublicText(preparationData?.accessibility),
    safetyInstructions: readPublicText(preparationData?.safetyInstructions),
    derivedSafetyRecommendations: [...guidance.toAvoid, ...guidance.toReport],
    materialsToBring: readPublicText(preparationData?.recommendedMaterials),
    derivedMaterials: guidance.toPrepare,
    materialsProvided: null,
    participantMessage: readPublicText(preparationData?.participantMessage),
  };
}
