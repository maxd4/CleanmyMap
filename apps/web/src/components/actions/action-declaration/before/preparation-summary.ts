import type { ActionPreparationData } from "@/lib/actions/types";

export function buildPreparationSummaryDetails(preparation: ActionPreparationData): string {
  const details = [
    preparation.materialsProvided
      ? `Matériel fourni : ${preparation.materialsProvided.trim()}`
      : null,
    preparation.recommendedMaterials
      ? `À apporter (suggestions) : ${preparation.recommendedMaterials.trim()}`
      : null,
    preparation.suggestedMaterials && preparation.suggestedMaterials.length > 0
      ? `Suggestions rapides : ${preparation.suggestedMaterials.join(", ")}`
      : null,
    buildChecklistSummary(preparation),
  ];

  return details.filter(Boolean).join(" · ");
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
