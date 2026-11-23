import { buildWasteFieldGuidance } from "@/lib/waste";
import type { ActionPreparationData } from "@/lib/actions/types";
import {
  ACTION_EQUIPMENT_INVENTORY,
  ACTION_MATERIAL_SUGGESTIONS,
  ACTION_REFRESHMENT_OPTIONS,
  isActionEquipmentProvided,
} from "@/lib/actions/preparation-contract";
import {
  deriveActionVolunteerChecklist,
  projectActionVolunteerChecklistForPublic,
  type ActionWeatherState,
  type ActionVolunteerChecklistPublic,
} from "@/lib/actions/action-preparation-checklist";
import type {
  PlannerWeatherContext,
  PlannerWeatherContextRequest,
} from "@/lib/weather/planner-weather";
import { getPublicOperationalRouteSegments } from "@/lib/route/route-operational";

export type PublicActionPracticalInformation = {
  /** Read-only projection used to render the canonical safety guide. */
  wasteCategories?: ActionPreparationData["expectedWasteCategories"];
  accessibility: string | null;
  accessibilityStatus?: ActionPreparationData["accessibilityStatus"] | null;
  accessibilityAlternativeRoute?: {
    versionId: string;
    appliedAt: string;
    isCurrentVersion: boolean;
    routeCount: number;
    routes: ReturnType<typeof getPublicOperationalRouteSegments>;
  } | null;
  safetyInstructions: string | null;
  derivedSafetyRecommendations: string[];
  materialsToBring: string | null;
  derivedMaterials: string[];
  materialsProvided: string | null;
  suggestedMaterials?: string[];
  equipmentProvided: string[];
  equipmentNotProvided?: string[];
  refreshmentsProvided: string[];
  volunteerChecklist?: ActionVolunteerChecklistPublic;
  participantMessage: string | null;
};

export type PublicActionParticipantProfile = {
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
};

export type PublicActionParticipantVisibility = {
  registeredCount: number;
  profiles: PublicActionParticipantProfile[];
};

/** Accepts only the explicit public SQL projection; account and roster IDs never cross this boundary. */
export function projectPublicActionParticipantVisibility(value: unknown): PublicActionParticipantVisibility {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object" || Array.isArray(row)) return { registeredCount: 0, profiles: [] };
  const record = row as Record<string, unknown>;
  const count = Number(record.registered_count ?? record.registeredCount);
  const rawProfiles = Array.isArray(record.profiles) ? record.profiles : [];
  const profiles = rawProfiles.slice(0, 100).flatMap((raw): PublicActionParticipantProfile[] => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const profile = raw as Record<string, unknown>;
    const displayName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
    const handle = typeof profile.handle === "string" ? profile.handle.trim() : "";
    const avatarUrl = typeof profile.avatarUrl === "string" ? profile.avatarUrl.trim() : "";
    if (!displayName) return [];
    return [{
      displayName: displayName.slice(0, 80),
      handle: handle ? handle.slice(0, 40) : null,
      avatarUrl: /^https:\/\//iu.test(avatarUrl) ? avatarUrl.slice(0, 500) : null,
    }];
  });
  return {
    registeredCount: Number.isSafeInteger(count) && count > 0 ? count : 0,
    profiles,
  };
}

function readPublicText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildPublicEquipment(preparationData: ActionPreparationData | null | undefined): string[] {
  const inventory = preparationData?.equipmentInventory;
  if (!inventory) return [];
  return ACTION_EQUIPMENT_INVENTORY.flatMap((option) => {
    const value = inventory[option.key];
    if (!isActionEquipmentProvided(option, value)) return [];
    return option.kind === "quantity" ? [`${option.label} : ${value}`] : [option.label];
  });
}

function buildPublicEquipmentNotProvided(preparationData: ActionPreparationData | null | undefined): string[] {
  const inventory = preparationData?.equipmentInventory;
  if (!inventory) return [];
  return ACTION_EQUIPMENT_INVENTORY.flatMap((option) => {
    const value = inventory[option.key];
    return option.kind === "quantity" && value === 0
      ? [`${option.label} : aucune unité fournie`]
      : [];
  });
}

function buildPublicRefreshments(preparationData: ActionPreparationData | null | undefined): string[] {
  const refreshments = preparationData?.refreshmentsProvided;
  if (!refreshments) return [];
  return ACTION_REFRESHMENT_OPTIONS.flatMap((option) => refreshments[option.key] ? [option.label] : []);
}

function preparationWeatherContext(
  preparationData: ActionPreparationData | null | undefined,
): PlannerWeatherContext | null {
  return preparationData?.routeVersioning?.active?.calculation.weatherContext ??
    preparationData?.routeCalibrationContext?.plannerSnapshot?.weatherContext ??
    null;
}

/**
 * Projects only the practical information that a volunteer needs before a
 * published action. Private preparation fields deliberately have no mapping
 * here, even when they are present in the persisted JSON.
 */
export function buildPublicActionPracticalInformation(
  preparationData: ActionPreparationData | null | undefined,
  options: {
    confirmedParticipants?: number | null;
    weatherContext?: PlannerWeatherContext | null;
    weatherRequest?: PlannerWeatherContextRequest | null;
    weatherState?: ActionWeatherState;
  } = {},
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
  const internalVolunteerChecklist = deriveActionVolunteerChecklist({
    preparation: preparationData,
    confirmedParticipants: options.confirmedParticipants,
    weatherContext: options.weatherContext ?? preparationWeatherContext(preparationData),
    weatherRequest: options.weatherRequest,
    weatherState: options.weatherState ?? "idle",
  });
  const volunteerChecklist = projectActionVolunteerChecklistForPublic(internalVolunteerChecklist);

  return {
    wasteCategories: guidance.definitions.map((category) => category.slug),
    accessibility: readPublicText(preparationData?.accessibility),
    accessibilityStatus: preparationData?.accessibilityStatus ?? null,
    accessibilityAlternativeRoute: (() => {
      const selectedId = preparationData?.accessibilityAlternativeRouteVersionId;
      const version = preparationData?.routeVersioning?.history?.find((item) => item.versionId === selectedId);
      if (!version) return null;
      const routes = getPublicOperationalRouteSegments(version.operationalRoute);
      return routes.length > 0
        ? { versionId: version.versionId, appliedAt: version.appliedAt, isCurrentVersion: preparationData?.routeVersioning?.active?.versionId === version.versionId, routeCount: routes.length, routes }
        : null;
    })(),
    safetyInstructions: readPublicText(preparationData?.safetyInstructions),
    derivedSafetyRecommendations: [...guidance.toAvoid, ...guidance.toReport],
    materialsToBring: readPublicText(preparationData?.recommendedMaterials),
    derivedMaterials: guidance.toPrepare,
    materialsProvided: readPublicText(preparationData?.materialsProvided),
    suggestedMaterials,
    equipmentProvided: buildPublicEquipment(preparationData),
    equipmentNotProvided: buildPublicEquipmentNotProvided(preparationData),
    refreshmentsProvided: buildPublicRefreshments(preparationData),
    volunteerChecklist,
    participantMessage: readPublicText(preparationData?.participantMessage),
  };
}
