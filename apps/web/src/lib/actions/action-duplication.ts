import type { ActionRow } from "@/types/database";
import type { ActionPreparationData } from "./types";
import type { ActionContext } from "./action-context";
import { normalizeActionPreparationData, normalizeOperationalRoute } from "@/lib/route/route-operational";
import { isRouteCalibrationContext, isServerVerifiedPlannerSnapshotContext } from "@/lib/route/route-calibration";

export type ActionDuplicatePrefill = {
  title: string;
  shortDescription: string;
  locationLabel: string;
  communeZoneLabel: string;
  meetingPoint: string;
  departureLocationLabel: string;
  midRouteLocationLabel: string;
  arrivalLocationLabel: string;
  latitude: number | null;
  longitude: number | null;
  arrivalCoordinates: ActionPreparationData["arrivalCoordinates"] | null;
  midRouteCoordinates: ActionPreparationData["midRouteCoordinates"] | null;
  interventionMode: ActionPreparationData["interventionMode"];
  routeTopology: ActionPreparationData["routeTopology"];
  routeTargetDistanceKm: number | null;
  routeTargetDistanceSource: ActionPreparationData["routeTargetDistanceSource"];
  plannedObjective: ActionPreparationData["plannedObjective"];
  placeType: string;
  estimatedDifficulty: ActionPreparationData["estimatedDifficulty"];
  accessibility: string;
  accessibilityStatus: ActionPreparationData["accessibilityStatus"];
  safetyInstructions: string;
  recommendedMaterials: string;
  materialsProvided: string;
  suggestedMaterials: NonNullable<ActionPreparationData["suggestedMaterials"]>;
  equipmentInventory: NonNullable<ActionPreparationData["equipmentInventory"]>;
  refreshmentsProvided: NonNullable<ActionPreparationData["refreshmentsProvided"]>;
  participantMessage: string;
  logisticsNotes: string;
  expectedWasteCategories: NonNullable<ActionPreparationData["expectedWasteCategories"]>;
  operationalRoute: ActionPreparationData["operationalRoute"] | null;
  routeCalibrationContext: ActionPreparationData["routeCalibrationContext"] | null;
  organizerType: ActionRow["organizer_type"];
  organizerId: string | null;
  organizerName: string;
  associationName: string;
  actionContext: ActionContext | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function reusableRoute(preparation: ActionPreparationData): Pick<ActionDuplicatePrefill, "operationalRoute" | "routeCalibrationContext"> {
  const operationalRoute = normalizeOperationalRoute(
    preparation.routeVersioning?.active?.operationalRoute ?? preparation.operationalRoute,
  );
  const context = preparation.routeCalibrationContext;
  if (!operationalRoute || !context || !isRouteCalibrationContext(context) || !isServerVerifiedPlannerSnapshotContext(context)) {
  return { operationalRoute: null, routeCalibrationContext: null };
  }
  return {
    operationalRoute,
    routeCalibrationContext: structuredClone(context),
  };
}

function buildDuplicateLocationFields(
  action: ActionRow,
  preparation: ActionPreparationData,
  fixedArea: boolean,
): Pick<ActionDuplicatePrefill, "locationLabel" | "communeZoneLabel" | "meetingPoint" | "departureLocationLabel" | "midRouteLocationLabel" | "arrivalLocationLabel" | "latitude" | "longitude" | "arrivalCoordinates" | "midRouteCoordinates"> {
  const locationLabel = text(action.location_label);
  return {
    locationLabel,
    communeZoneLabel: text(preparation.communeZoneLabel),
    meetingPoint: text(preparation.pointDeRendezVous) || locationLabel,
    departureLocationLabel: text(preparation.pointDeRendezVous) || locationLabel,
    midRouteLocationLabel: text(preparation.midRouteLocationLabel),
    arrivalLocationLabel: fixedArea ? "" : text(preparation.zoneCiblePrevue),
    latitude: typeof action.latitude === "number" && Number.isFinite(action.latitude) ? action.latitude : null,
    longitude: typeof action.longitude === "number" && Number.isFinite(action.longitude) ? action.longitude : null,
    arrivalCoordinates: fixedArea ? null : structuredClone(preparation.arrivalCoordinates ?? null),
    midRouteCoordinates: fixedArea ? null : structuredClone(preparation.midRouteCoordinates ?? null),
  };
}

function buildDuplicateRouteFields(
  preparation: ActionPreparationData,
  fixedArea: boolean,
): Pick<ActionDuplicatePrefill, "interventionMode" | "routeTopology" | "routeTargetDistanceKm" | "routeTargetDistanceSource" | "operationalRoute" | "routeCalibrationContext"> {
  const route = fixedArea ? { operationalRoute: null, routeCalibrationContext: null } : reusableRoute(preparation);
  return {
    interventionMode: preparation.interventionMode,
    routeTopology: fixedArea ? undefined : preparation.routeTopology,
    routeTargetDistanceKm: fixedArea ? null : (preparation.routeTargetDistanceKm ?? null),
    routeTargetDistanceSource: fixedArea ? undefined : preparation.routeTargetDistanceSource,
    operationalRoute: route.operationalRoute,
    routeCalibrationContext: route.routeCalibrationContext,
  };
}

function buildDuplicatePreparationFields(
  preparation: ActionPreparationData,
): Pick<ActionDuplicatePrefill, "title" | "shortDescription" | "plannedObjective" | "placeType" | "estimatedDifficulty" | "accessibility" | "accessibilityStatus" | "safetyInstructions" | "recommendedMaterials" | "materialsProvided" | "suggestedMaterials" | "equipmentInventory" | "refreshmentsProvided" | "participantMessage" | "logisticsNotes" | "expectedWasteCategories"> {
  return {
    title: text(preparation.actionTitle),
    shortDescription: text(preparation.shortDescription),
    plannedObjective: preparation.plannedObjective,
    placeType: text(preparation.placeType),
    estimatedDifficulty: preparation.estimatedDifficulty,
    accessibility: text(preparation.accessibility),
    accessibilityStatus: preparation.accessibilityStatus,
    safetyInstructions: text(preparation.safetyInstructions),
    recommendedMaterials: text(preparation.recommendedMaterials),
    materialsProvided: text(preparation.materialsProvided),
    suggestedMaterials: [...(preparation.suggestedMaterials ?? [])],
    equipmentInventory: structuredClone(preparation.equipmentInventory ?? {}),
    refreshmentsProvided: structuredClone(preparation.refreshmentsProvided ?? {}),
    participantMessage: text(preparation.participantMessage),
    logisticsNotes: text(preparation.logisticsNotes),
    expectedWasteCategories: [...(preparation.expectedWasteCategories ?? [])],
  };
}

function buildDuplicateOrganizerFields(
  action: ActionRow,
  preparation: ActionPreparationData,
): Pick<ActionDuplicatePrefill, "organizerType" | "organizerId" | "organizerName" | "associationName" | "actionContext"> {
  const organizerName = text(action.organizer_name);
  return {
    organizerType: action.organizer_type ?? null,
    organizerId: action.organizer_id ?? null,
    organizerName,
    associationName: organizerName || text(preparation.communeZoneLabel),
    actionContext: action.action_context_source === "explicit" ? action.action_context ?? null : null,
  };
}

export function buildActionDuplicatePrefill(action: ActionRow): ActionDuplicatePrefill {
  const preparation = normalizeActionPreparationData(action.preparation_data ?? {});
  const fixedArea = preparation.interventionMode?.mode === "fixed_area";
  return {
    ...buildDuplicatePreparationFields(preparation),
    ...buildDuplicateLocationFields(action, preparation, fixedArea),
    ...buildDuplicateRouteFields(preparation, fixedArea),
    ...buildDuplicateOrganizerFields(action, preparation),
  };
}
