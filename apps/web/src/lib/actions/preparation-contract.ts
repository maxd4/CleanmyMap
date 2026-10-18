import { normalizeActionInterventionMode } from "./intervention-mode";

export const ACTION_ACCESSIBILITY_STATUSES = [
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

export const ACTION_EQUIPMENT_INVENTORY = [
  { key: "glovesPairs", label: "Paires de gants", kind: "quantity" },
  { key: "garbageBags", label: "Sacs poubelles", kind: "quantity" },
  { key: "cigaretteButtBags", label: "Sachets à mégots", kind: "quantity" },
  { key: "grabbers", label: "Pinces de ramassage", kind: "quantity" },
  { key: "highVisibilityVests", label: "Gilets haute visibilité", kind: "quantity" },
  { key: "luggageScaleAvailable", label: "Pèse-bagage", kind: "availability" },
  { key: "firstAidKitAvailable", label: "Trousse de premiers secours", kind: "availability" },
] as const;

export type ActionEquipmentQuantityKey = Extract<
  (typeof ACTION_EQUIPMENT_INVENTORY)[number],
  { kind: "quantity" }
>["key"];
export type ActionEquipmentAvailabilityKey = Extract<
  (typeof ACTION_EQUIPMENT_INVENTORY)[number],
  { kind: "availability" }
>["key"];
export type ActionEquipmentInventory = Partial<Record<ActionEquipmentQuantityKey, number>> &
  Partial<Record<ActionEquipmentAvailabilityKey, boolean>>;

export const ACTION_REFRESHMENT_OPTIONS = [
  { key: "waterDuringAction", label: "Eau fournie pendant l'action" },
  { key: "drinksAfterAction", label: "Boissons prévues après l'action" },
  { key: "snackAfterAction", label: "Collation prévue après l'action" },
] as const;

export type ActionRefreshmentsProvided = Partial<
  Record<(typeof ACTION_REFRESHMENT_OPTIONS)[number]["key"], boolean>
>;

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

export function isActionMaterialSuggestion(value: unknown): value is ActionMaterialSuggestion {
  return typeof value === "string" && VALID_MATERIAL_SUGGESTIONS.has(value as ActionMaterialSuggestion);
}

export function normalizeAccessibilityStatus(value: unknown): ActionAccessibilityStatus | undefined {
  return typeof value === "string" && ACTION_ACCESSIBILITY_STATUSES.includes(value as ActionAccessibilityStatus)
    ? value as ActionAccessibilityStatus
    : undefined;
}

export function normalizeSuggestedMaterials(value: unknown): ActionMaterialSuggestion[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value.filter(
    (item): item is ActionMaterialSuggestion =>
      isActionMaterialSuggestion(item),
  );
  return [...new Set(normalized)];
}

export function normalizeEquipmentInventory(value: unknown): ActionEquipmentInventory | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const normalized: ActionEquipmentInventory = {};
  for (const option of ACTION_EQUIPMENT_INVENTORY) {
    const raw = candidate[option.key];
    if (option.kind === "quantity") {
      if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= 10_000) {
        normalized[option.key] = raw;
      }
    } else if (typeof raw === "boolean") {
      normalized[option.key] = raw;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeRefreshmentsProvided(value: unknown): ActionRefreshmentsProvided | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const normalized: ActionRefreshmentsProvided = {};
  for (const option of ACTION_REFRESHMENT_OPTIONS) {
    if (typeof candidate[option.key] === "boolean") {
      normalized[option.key] = candidate[option.key] as boolean;
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
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
  if ("interventionMode" in next) {
    const interventionMode = normalizeActionInterventionMode(next["interventionMode"]);
    if (interventionMode) next["interventionMode"] = interventionMode;
    else delete next["interventionMode"];
  }
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
  if ("equipmentInventory" in next) {
    const equipmentInventory = normalizeEquipmentInventory(next["equipmentInventory"]);
    if (equipmentInventory) next["equipmentInventory"] = equipmentInventory;
    else delete next["equipmentInventory"];
  }
  if ("refreshmentsProvided" in next) {
    const refreshmentsProvided = normalizeRefreshmentsProvided(next["refreshmentsProvided"]);
    if (refreshmentsProvided) next["refreshmentsProvided"] = refreshmentsProvided;
    else delete next["refreshmentsProvided"];
  }
  if ("preparationChecklist" in next) {
    const preparationChecklist = normalizePreparationChecklist(next["preparationChecklist"]);
    if (preparationChecklist && preparationChecklist.length > 0) next["preparationChecklist"] = preparationChecklist;
    else delete next["preparationChecklist"];
  }
  return next as T;
}
