import { buildWasteFieldGuidance } from "@/lib/waste";
import type { ActionPreparationData } from "@/lib/actions/types";
import { ACTION_MATERIAL_SUGGESTIONS } from "@/lib/actions/preparation-contract";

export type PublicActionPracticalInformation = {
  accessibility: string | null;
  accessibilityStatus?: ActionPreparationData["accessibilityStatus"] | null;
  safetyInstructions: string | null;
  derivedSafetyRecommendations: string[];
  materialsToBring: string | null;
  derivedMaterials: string[];
  materialsProvided: string | null;
  suggestedMaterials?: string[];
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
  const suggestedMaterials = (preparationData?.suggestedMaterials ?? []).reduce<string[]>(
    (labels, value) => {
      const label = ACTION_MATERIAL_SUGGESTIONS.find((option) => option.value === value)?.label;
      if (label) labels.push(label);
      return labels;
    },
    [],
  );

  return {
    accessibility: readPublicText(preparationData?.accessibility),
    accessibilityStatus: preparationData?.accessibilityStatus ?? null,
    safetyInstructions: readPublicText(preparationData?.safetyInstructions),
    derivedSafetyRecommendations: [...guidance.toAvoid, ...guidance.toReport],
    materialsToBring: readPublicText(preparationData?.recommendedMaterials),
    derivedMaterials: guidance.toPrepare,
    materialsProvided: readPublicText(preparationData?.materialsProvided),
    suggestedMaterials,
    participantMessage: readPublicText(preparationData?.participantMessage),
  };
}
