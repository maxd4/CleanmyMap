import type { ActionPreparationData } from "@/lib/actions/types";
import { ACTION_MATERIAL_SUGGESTIONS } from "@/lib/actions/preparation-contract";

export function buildPreparationSummaryDetails(preparation: ActionPreparationData): string {
  const details = [
    preparation.materialsProvided
      ? `Matériel fourni : ${preparation.materialsProvided.trim()}`
      : null,
    preparation.recommendedMaterials
      ? `À apporter (suggestions) : ${preparation.recommendedMaterials.trim()}`
      : null,
    formatSuggestedMaterials(preparation.suggestedMaterials),
    buildChecklistSummary(preparation),
  ];

  return details.filter(Boolean).join(" · ");
}

function formatSuggestedMaterials(values: ActionPreparationData["suggestedMaterials"]): string | null {
  const labels = (values ?? []).flatMap((value) => {
    const option = ACTION_MATERIAL_SUGGESTIONS.find((candidate) => candidate.value === value);
    return option ? [option.label] : [];
  });
  return labels.length > 0 ? `Suggestions rapides : ${labels.join(", ")}` : null;
}

function buildChecklistSummary(preparation: ActionPreparationData): string | null {
  if (preparation.preparationChecklist && preparation.preparationChecklist.length > 0) {
    const checked = preparation.preparationChecklist.filter((item) => item.checked).length;
    return `Checklist : ${checked}/${preparation.preparationChecklist.length} vérifiée(s)`;
  }
  return preparation.checklistBeforeDeparture
    ? `Note de checklist historique : ${preparation.checklistBeforeDeparture.trim()}`
    : null;
}
