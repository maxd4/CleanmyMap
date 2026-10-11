import type { ActionRow } from "@/types/database";
import type { ActionPreparationData } from "./types";
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
  participantMessage: string;
  logisticsNotes: string;
  expectedWasteCategories: NonNullable<ActionPreparationData["expectedWasteCategories"]>;
  operationalRoute: ActionPreparationData["operationalRoute"] | null;
  routeCalibrationContext: ActionPreparationData["routeCalibrationContext"] | null;
  organizerType: ActionRow["organizer_type"];
  organizerId: string | null;
  organizerName: string;
  associationName: string;
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

export function buildActionDuplicatePrefill(action: ActionRow): ActionDuplicatePrefill {
  const preparation = normalizeActionPreparationData(action.preparation_data ?? {});
  const fixedArea = preparation.interventionMode?.mode === "fixed_area";
  const route = fixedArea
    ? { operationalRoute: null, routeCalibrationContext: null }
    : reusableRoute(preparation);
  return {
    title: text(preparation.actionTitle),
    shortDescription: text(preparation.shortDescription),
    locationLabel: text(action.location_label),
    communeZoneLabel: text(preparation.communeZoneLabel),
    meetingPoint: text(preparation.pointDeRendezVous) || text(action.location_label),
    departureLocationLabel: text(preparation.pointDeRendezVous) || text(action.location_label),
    midRouteLocationLabel: text(preparation.midRouteLocationLabel),
    arrivalLocationLabel: fixedArea ? "" : text(preparation.zoneCiblePrevue),
    latitude: typeof action.latitude === "number" && Number.isFinite(action.latitude) ? action.latitude : null,
    longitude: typeof action.longitude === "number" && Number.isFinite(action.longitude) ? action.longitude : null,
    arrivalCoordinates: fixedArea ? null : structuredClone(preparation.arrivalCoordinates ?? null),
    midRouteCoordinates: fixedArea ? null : structuredClone(preparation.midRouteCoordinates ?? null),
    interventionMode: preparation.interventionMode,
    routeTopology: fixedArea ? undefined : preparation.routeTopology,
    routeTargetDistanceKm: fixedArea ? null : (preparation.routeTargetDistanceKm ?? null),
    routeTargetDistanceSource: fixedArea ? undefined : preparation.routeTargetDistanceSource,
    plannedObjective: preparation.plannedObjective,
    placeType: text(preparation.placeType),
    estimatedDifficulty: preparation.estimatedDifficulty,
    accessibility: text(preparation.accessibility),
    accessibilityStatus: preparation.accessibilityStatus,
    safetyInstructions: text(preparation.safetyInstructions),
    recommendedMaterials: text(preparation.recommendedMaterials),
    materialsProvided: text(preparation.materialsProvided),
    suggestedMaterials: [...(preparation.suggestedMaterials ?? [])],
    participantMessage: text(preparation.participantMessage),
    logisticsNotes: text(preparation.logisticsNotes),
    expectedWasteCategories: [...(preparation.expectedWasteCategories ?? [])],
    operationalRoute: route.operationalRoute,
    routeCalibrationContext: route.routeCalibrationContext,
    organizerType: action.organizer_type ?? null,
    organizerId: action.organizer_id ?? null,
    organizerName: text(action.organizer_name),
    associationName: text(action.organizer_name) || text(preparation.communeZoneLabel),
  };
}
