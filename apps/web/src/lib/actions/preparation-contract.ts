import { normalizeActionInterventionMode } from "./intervention-mode";
import { isOrganizerType } from "./organizer-type";
import type { OrganizerType } from "./organizer-type";

export const ACTION_ACCESSIBILITY_STATUSES = [
  "not_evaluated",
  "conditions_reported",
  "obstacles_identified",
  "to_confirm",
] as const;

export type ActionAccessibilityStatus = (typeof ACTION_ACCESSIBILITY_STATUSES)[number];

export type ActionAccessibilityEvidenceKind = "organizer_observation" | "participant_feedback";
export type ActionAccessibilityObservedMeasure = {
  key: string;
  definitionHash: string;
  label: string;
  evidenceKind: ActionAccessibilityEvidenceKind;
  observedAt: string;
};

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

/** Presentation-only availability: zero is an explicit absence, not supplied stock. */
export function isActionEquipmentProvided(
  option: (typeof ACTION_EQUIPMENT_INVENTORY)[number],
  value: unknown,
): boolean {
  if (option.kind === "quantity") {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
  }
  return value === true;
}

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

export function normalizeAccessibilityObservedMeasures(value: unknown): ActionAccessibilityObservedMeasure[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const measures = value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
    const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
    const observedAt = typeof candidate.observedAt === "string" ? candidate.observedAt : "";
    const evidenceKind = candidate.evidenceKind;
    const definitionHash = typeof candidate.definitionHash === "string" ? candidate.definitionHash : "";
    if (!/^[a-z0-9][a-z0-9._:-]{0,127}$/i.test(key) || !/^[a-f0-9]{64}$/i.test(definitionHash)
      || !label || label.length > 120 || seen.has(key)) return [];
    if (evidenceKind !== "organizer_observation" && evidenceKind !== "participant_feedback") return [];
    if (!isValidCalendarDate(observedAt) || observedAt > new Date().toISOString().slice(0, 10)) return [];
    seen.add(key);
    return [{ key, definitionHash, label, evidenceKind, observedAt } as ActionAccessibilityObservedMeasure];
  }).slice(0, 20);
  return measures.length > 0 ? measures : undefined;
}

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
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
  if ("organizerReferenceStatus" in next && next.organizerReferenceStatus !== "referenced" && next.organizerReferenceStatus !== "declared_unreferenced") {
    delete next.organizerReferenceStatus;
  }
  if ("organizationalRelations" in next) {
    const relations = normalizeActionOrganizationalRelations(next.organizationalRelations);
    if (relations) next.organizationalRelations = relations;
    else delete next.organizationalRelations;
  }
  for (const field of ["accessibilityPausePlan", "accessibilityEarlyDeparturePlan"] as const) {
    const value = next[field];
    if (typeof value === "string" && value.trim().length > 0 && value.trim().length <= 500) next[field] = value.trim();
    else delete next[field];
  }
  if ("accessibilityAlternativeMissions" in next) {
    const value = next["accessibilityAlternativeMissions"];
    const missions = Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter((item) => item.length > 0 && item.length <= 120))].slice(0, 8)
      : [];
    if (missions.length > 0) next["accessibilityAlternativeMissions"] = missions;
    else delete next["accessibilityAlternativeMissions"];
  }
  if ("accessibilityConditionsSource" in next) {
    const source = next["accessibilityConditionsSource"];
    if (typeof source === "string" && source.trim().length > 0 && source.trim().length <= 160) next["accessibilityConditionsSource"] = source.trim();
    else delete next["accessibilityConditionsSource"];
  }
  if ("accessibilityConditionsVerifiedAt" in next) {
    const date = next["accessibilityConditionsVerifiedAt"];
    if (typeof date === "string" && isValidCalendarDate(date)) next["accessibilityConditionsVerifiedAt"] = date;
    else delete next["accessibilityConditionsVerifiedAt"];
  }
  if ("accessibilityObservedMeasures" in next) {
    const observedMeasures = normalizeAccessibilityObservedMeasures(next["accessibilityObservedMeasures"]);
    if (observedMeasures) next["accessibilityObservedMeasures"] = observedMeasures;
    else delete next["accessibilityObservedMeasures"];
  }
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
  if ("accessibilityAlternativeRouteVersionId" in next) {
    const selectedVersionId = next["accessibilityAlternativeRouteVersionId"];
    const versioning = next["routeVersioning"];
    const history = versioning && typeof versioning === "object" && !Array.isArray(versioning)
      ? (versioning as { history?: unknown }).history
      : null;
    const knownVersionIds = Array.isArray(history)
      ? history.flatMap((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return [];
          const versionId = (item as { versionId?: unknown }).versionId;
          return typeof versionId === "string" ? [versionId] : [];
        })
      : [];
    if (typeof selectedVersionId === "string" && knownVersionIds.includes(selectedVersionId)) {
      next["accessibilityAlternativeRouteVersionId"] = selectedVersionId;
    } else {
      delete next["accessibilityAlternativeRouteVersionId"];
    }
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
export type ActionOrganizationalInitiator =
  | { kind: "organizer" }
  | { kind: "external_structure"; organizerType: Exclude<OrganizerType, "spontaneous">; name: string };
export type ActionOrganizationalPartner = {
  organizerType: Exclude<OrganizerType, "spontaneous">;
  name: string;
  role: "material" | "logistics" | "funding" | "participants" | "other";
};
export type ActionParticipantOrigin = { category: string };
export type ActionOrganizationalRelations = {
  initiator?: ActionOrganizationalInitiator;
  partners?: ActionOrganizationalPartner[];
  participantOrigins?: ActionParticipantOrigin[];
};

const PARTNER_ROLES = new Set(["material", "logistics", "funding", "participants", "other"]);

export function normalizeActionOrganizationalRelations(value: unknown): ActionOrganizationalRelations | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const result: ActionOrganizationalRelations = {};
  const initiator = source.initiator;
  if (initiator && typeof initiator === "object" && !Array.isArray(initiator)) {
    const candidate = initiator as Record<string, unknown>;
    if (candidate.kind === "organizer") result.initiator = { kind: "organizer" };
    else if (candidate.kind === "external_structure" && isNonSpontaneousOrganizerType(candidate.organizerType) && typeof candidate.name === "string") {
      const name = candidate.name.trim();
      if (name.length > 0 && name.length <= 120) result.initiator = { kind: "external_structure", organizerType: candidate.organizerType, name };
    }
  }
  if (Array.isArray(source.partners)) {
    const partners = source.partners.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const candidate = item as Record<string, unknown>;
      if (!isNonSpontaneousOrganizerType(candidate.organizerType) || typeof candidate.name !== "string" || typeof candidate.role !== "string" || !PARTNER_ROLES.has(candidate.role)) return [];
      const name = candidate.name.trim();
      return name.length > 0 && name.length <= 120 ? [{ organizerType: candidate.organizerType, name, role: candidate.role as ActionOrganizationalPartner["role"] }] : [];
    }).slice(0, 10);
    if (partners.length) result.partners = partners;
  }
  if (Array.isArray(source.participantOrigins)) {
    const seenOrigins = new Set<string>();
    const participantOrigins = source.participantOrigins.flatMap((item) => {
      const category = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>).category : null;
      if (typeof category !== "string") return [];
      const normalized = category.trim();
      if (normalized.length === 0 || normalized.length > 80 || seenOrigins.has(normalized.toLocaleLowerCase())) return [];
      seenOrigins.add(normalized.toLocaleLowerCase());
      return [{ category: normalized }];
    }).slice(0, 12);
    if (participantOrigins.length) result.participantOrigins = participantOrigins;
  }
  return Object.keys(result).length ? result : undefined;
}

function isNonSpontaneousOrganizerType(value: unknown): value is Exclude<OrganizerType, "spontaneous"> {
  return isOrganizerType(value) && value !== "spontaneous";
}
