const ACTION_ACCESSIBILITY_STATUSES = [
  "not_evaluated",
  "conditions_reported",
  "obstacles_identified",
  "to_confirm",
] as const;

export type ActionAccessibilityStatus = (typeof ACTION_ACCESSIBILITY_STATUSES)[number];

export const ACTION_MATERIAL_SUGGESTIONS = [
  { value: "gloves", label: "Gants" },
  { value: "bags", label: "Sacs" },
  { value: "grabbers", label: "Pinces" },
  { value: "visibility_vest", label: "Gilet visible" },
] as const;

export type ActionMaterialSuggestion = (typeof ACTION_MATERIAL_SUGGESTIONS)[number]["value"];

export const ACTION_PREPARATION_CHECKLIST_DEFAULTS = [
  { key: "materials_checked", label: "Matériel vérifié", checked: false },
  { key: "meeting_point_confirmed", label: "Point de rendez-vous confirmé", checked: false },
  { key: "participants_informed", label: "Participants informés", checked: false },
  { key: "instructions_shared", label: "Consignes communiquées", checked: false },
] as const;

export type ActionPreparationChecklistItem = {
  key: string;
  label: string;
  checked: boolean;
};

const VALID_MATERIAL_SUGGESTIONS = new Set<ActionMaterialSuggestion>(
  ACTION_MATERIAL_SUGGESTIONS.map(({ value }) => value),
);

export function normalizeAccessibilityStatus(value: unknown): ActionAccessibilityStatus | undefined {
  return typeof value === "string" && ACTION_ACCESSIBILITY_STATUSES.includes(value as ActionAccessibilityStatus)
    ? value as ActionAccessibilityStatus
    : undefined;
}

export function normalizeSuggestedMaterials(value: unknown): ActionMaterialSuggestion[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value.filter(
    (item): item is ActionMaterialSuggestion =>
      typeof item === "string" && VALID_MATERIAL_SUGGESTIONS.has(item as ActionMaterialSuggestion),
  );
  return [...new Set(normalized)];
}

export function normalizePreparationChecklist(
  value: unknown,
): ActionPreparationChecklistItem[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const seen = new Set<string>();
  const normalized: ActionPreparationChecklistItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
    const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
    if (!key || !label || label.length > 120 || key.length > 64 || seen.has(key) || typeof candidate.checked !== "boolean") {
      continue;
    }
    seen.add(key);
    normalized.push({ key, label, checked: candidate.checked });
    if (normalized.length >= 12) break;
  }
  return normalized;
}

export function normalizeActionPreparationContract<T extends object>(data: T): T {
  const next = { ...data } as Record<string, unknown>;
  if ("accessibilityStatus" in next) {
    const accessibilityStatus = normalizeAccessibilityStatus(next["accessibilityStatus"]);
    if (accessibilityStatus) next["accessibilityStatus"] = accessibilityStatus;
    else delete next["accessibilityStatus"];
  }
  if ("suggestedMaterials" in next) {
    const suggestedMaterials = normalizeSuggestedMaterials(next["suggestedMaterials"]);
    if (suggestedMaterials && suggestedMaterials.length > 0) next["suggestedMaterials"] = suggestedMaterials;
    else delete next["suggestedMaterials"];
  }
  if ("preparationChecklist" in next) {
    const preparationChecklist = normalizePreparationChecklist(next["preparationChecklist"]);
    if (preparationChecklist && preparationChecklist.length > 0) next["preparationChecklist"] = preparationChecklist;
    else delete next["preparationChecklist"];
  }
  return next as T;
}
