export const PREPARATION_FIELD_LIMITS = {
  accessibility: 1000,
  safetyInstructions: 2000,
  materialsProvided: 2000,
  recommendedMaterials: 2000,
  logisticsNotes: 2000,
  checklistBeforeDeparture: 2000,
  customChecklistLabel: 120,
} as const;

export function characterLimitHint(value: string, limit: number): string {
  return `${value.length}/${limit} caractères`;
}

export function characterLimitError(
  value: string,
  label: string,
  limit: number,
): string | undefined {
  return value.length > limit
    ? `${label} dépasse la limite de ${limit} caractères.`
    : undefined;
}
