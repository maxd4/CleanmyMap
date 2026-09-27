import type { LevelRequirementCondition } from "@/lib/gamification/progression-types";

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

export function formatProgressionRequirement(
  condition: LevelRequirementCondition,
  locale: string,
): string {
  const fr = locale === "fr";
  const labels = {
    minValidatedActions: fr ? "Actions validées" : "Validated actions",
    minDiversityTypes: fr ? "Diversité des contributions" : "Contribution diversity",
    minCollectiveEvents: fr ? "Implication collective" : "Collective involvement",
    minQualityAverage: fr ? "Qualité moyenne" : "Average quality",
    minValidationRatio: fr ? "Ratio de validation" : "Validation ratio",
  } as const;
  const current =
    condition.id === "minValidationRatio"
      ? `${Math.round(condition.current * 100)}%`
      : formatNumber(condition.current);
  const required =
    condition.id === "minValidationRatio"
      ? `${Math.round(condition.required * 100)}%`
      : formatNumber(condition.required);

  return `${labels[condition.id]}: ${current}/${required}`;
}
