import type { ActionEditorRecord } from "@/lib/actions/http";
import { resolveRouteTargetDistance } from "@/lib/actions/route-target-distance";
import {
  hydrateActionEditorGeometry,
  type HydratedActionGeometry,
} from "@/lib/actions/geometry/final-geometry";
import {
  applyPreparationDataToForm,
} from "../payload";
import type { FormState } from "../model";
import { parseOrganizerAccounts } from "../payload";
import { inferCigaretteButtsInputSource } from "@/lib/waste/cigarette-butts";

export type LoadedActionPhase =
  | "pre_action"
  | "post_action_draft"
  | "post_action_complete"
  | null;

export type ActionDeclarationHydration = {
  form: FormState;
  loadedActionPhase: LoadedActionPhase;
  geometry: HydratedActionGeometry;
};

function toFormNumber(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function clearPostActionMeasurements(form: FormState): void {
  form.wasteKg = "";
  form.wasteMeasurementMethod = "";
  form.wasteRecyclablesKg = "";
  form.wasteGlassKg = "";
  form.wasteHouseholdKg = "";
  form.wasteOtherKg = "";
  form.wasteUnusualObjects = "";
  form.wasteSpecialHandlingWaste = "";
  form.cigaretteButts = "";
  form.cigaretteButtsCount = "";
  form.cigaretteButtsInputSource = null;
  form.cigaretteButtsCountProvenance = "unknown";
  form.cigaretteButtsMassProvenance = "unknown";
  form.cigaretteButtsVolumeProvenance = "unknown";
  form.cigaretteButtsConversionFormulaVersion = null;
  form.cigaretteButtsVolumeLiters = "";
  form.wasteMegotsKg = "";
  form.wastePlastiqueKg = "";
  form.wasteVerreKg = "";
  form.wasteMetalKg = "";
  form.wasteMixteKg = "";
}

function getStoredBreakdown(action: ActionEditorRecord): Record<string, unknown> {
  return action.wasteBreakdown && typeof action.wasteBreakdown === "object"
    ? (action.wasteBreakdown as Record<string, unknown>)
    : {};
}

function buildIdentityFields(
  preparedForm: FormState,
  action: ActionEditorRecord,
): Partial<FormState> {
  return {
    actorName: action.actorName ?? preparedForm.actorName,
    associationName: action.associationName ?? preparedForm.associationName,
    organizerId: action.organizerId ?? preparedForm.organizerId,
    organizerName:
      action.organizerName ?? action.associationName ?? preparedForm.organizerName,
    organizerType: action.organizerType ?? preparedForm.organizerType,
    actionContext:
      action.actionContext === null || action.actionContext === undefined
        ? preparedForm.actionContext
        : action.actionContext,
    schoolContextConfirmed:
      action.schoolContextConfirmed ?? preparedForm.schoolContextConfirmed,
    organizerAccounts: parseOrganizerAccounts(
      action.organizerAccounts?.join(", ") ?? preparedForm.organizerAccounts,
    ).join(", "),
    participantAccounts: action.participantAccounts ?? preparedForm.participantAccounts,
    groupJoinEnabled: action.groupJoinEnabled,
    accessMode: action.accessMode ?? "public",
  };
}

function buildRouteFields(
  preparedForm: FormState,
  action: ActionEditorRecord,
): Partial<FormState> {
  return {
    actionDate: action.actionDate,
    locationLabel: action.locationLabel,
    departureLocationLabel:
      action.departureLocationLabel ?? preparedForm.departureLocationLabel,
    midRouteLocationLabel: preparedForm.midRouteLocationLabel,
    arrivalLocationLabel:
      action.arrivalLocationLabel ?? preparedForm.arrivalLocationLabel,
    routeStyle: action.routeStyle ?? preparedForm.routeStyle,
    routeAdjustmentMessage:
      action.routeAdjustmentMessage ?? preparedForm.routeAdjustmentMessage,
    notes: action.notes ?? preparedForm.notes,
    placeType: action.placeType ?? preparedForm.placeType,
  };
}

function buildParticipationFields(action: ActionEditorRecord): Partial<FormState> {
  return {
    volunteersCount: toFormNumber(action.volunteersCount),
    childrenCount:
      action.volunteerParticipation?.childrenCount == null
        ? ""
        : String(action.volunteerParticipation.childrenCount),
    adultCount:
      action.volunteerParticipation?.adultCount == null
        ? ""
        : String(action.volunteerParticipation.adultCount),
    retiredCount:
      action.volunteerParticipation?.retiredCount == null
        ? ""
        : String(action.volunteerParticipation.retiredCount),
    durationMinutes: String(action.durationMinutes),
  };
}

function resolveWasteMegotsKg(
  action: ActionEditorRecord,
  storedBreakdown: Record<string, unknown>,
): string {
  const measurements = action.cigaretteButtsMeasurements;
  if (measurements?.cigaretteButtsMassKg !== null && measurements?.cigaretteButtsMassKg !== undefined) {
    return String(measurements.cigaretteButtsMassKg);
  }
  if (action.cigaretteButtsKg !== undefined && action.cigaretteButtsKg !== null) {
    return String(action.cigaretteButtsKg);
  }
  return toFormNumber(storedBreakdown.megotsKg);
}

function buildCigaretteMeasurementFields(
  preparedForm: FormState,
  action: ActionEditorRecord,
  storedBreakdown: Record<string, unknown>,
): Partial<FormState> {
  const measurements = action.cigaretteButtsMeasurements;
  return {
    cigaretteButts: action.cigaretteButts === null ? "" : String(action.cigaretteButts),
    cigaretteButtsCount: measurements?.cigaretteButtsCount != null ? String(measurements.cigaretteButtsCount) : action.cigaretteButts === null ? "" : String(action.cigaretteButts),
    cigaretteButtsInputSource: inferCigaretteButtsInputSource(measurements),
    cigaretteButtsCountProvenance: measurements?.cigaretteButtsCountProvenance ?? "unknown",
    cigaretteButtsMassProvenance: measurements?.cigaretteButtsMassProvenance ?? "unknown",
    cigaretteButtsVolumeProvenance: measurements?.cigaretteButtsVolumeProvenance ?? "unknown",
    cigaretteButtsConversionFormulaVersion: measurements?.cigaretteButtsConversionFormulaVersion ?? null,
    cigaretteButtsCondition: measurements?.cigaretteButtsCondition ?? preparedForm.cigaretteButtsCondition,
    cigaretteButtsVolumeLiters: toFormNumber(measurements?.cigaretteButtsVolumeLiters),
    wasteMegotsKg: resolveWasteMegotsKg(action, storedBreakdown),
    wasteMegotsCondition: measurements?.cigaretteButtsCondition ?? preparedForm.wasteMegotsCondition,
  };
}

function buildCigaretteFields(
  preparedForm: FormState,
  action: ActionEditorRecord,
  storedBreakdown: Record<string, unknown>,
): Partial<FormState> {
  return buildCigaretteMeasurementFields(preparedForm, action, storedBreakdown);
}

function buildWasteFields(
  preparedForm: FormState,
  action: ActionEditorRecord,
  storedBreakdown: Record<string, unknown>,
): Partial<FormState> {
  return {
    wasteKg: action.wasteKg === null ? "" : String(action.wasteKg),
    ...buildCigaretteFields(preparedForm, action, storedBreakdown),
    wasteMeasurementMethod:
      action.wasteMeasurementMethod ?? preparedForm.wasteMeasurementMethod,
    wasteRecyclablesKg: toFormNumber(storedBreakdown.recyclablesKg),
    wasteGlassKg: toFormNumber(storedBreakdown.glassKg),
    wasteHouseholdKg: toFormNumber(storedBreakdown.householdWasteKg),
    wasteOtherKg: toFormNumber(storedBreakdown.otherWasteKg),
    wasteUnusualObjects:
      typeof storedBreakdown.unusualObjects === "string"
        ? storedBreakdown.unusualObjects
        : "",
    wasteSpecialHandlingWaste:
      typeof storedBreakdown.specialHandlingWaste === "string"
        ? storedBreakdown.specialHandlingWaste
        : "",
  };
}

function applyDerivedHydrationFields(
  form: FormState,
  action: ActionEditorRecord,
): void {
  if (typeof action.preparationData?.routeTargetDistanceKm !== "number") {
    form.routeTargetDistanceKm = String(
      resolveRouteTargetDistance({
        durationMinutes: action.durationMinutes,
        routeTargetDistanceSource: "derived",
      }).distanceKm,
    );
    form.routeTargetDistanceKmManuallySet = false;
  }

  if (action.actionPhase === "pre_action" || action.actionPhase === "post_action_draft") {
    clearPostActionMeasurements(form);
  }
}

export function buildActionEditorFormState(
  baseForm: FormState,
  action: ActionEditorRecord,
): FormState {
  const preparedForm = applyPreparationDataToForm(baseForm, action.preparationData);
  const storedBreakdown = getStoredBreakdown(action);
  const nextForm: FormState = {
    ...preparedForm,
    ...buildIdentityFields(preparedForm, action),
    ...buildRouteFields(preparedForm, action),
    ...buildParticipationFields(action),
    ...buildWasteFields(preparedForm, action, storedBreakdown),
    eventStartTime: action.eventStartTime ?? preparedForm.eventStartTime,
    eventEndTime: action.eventEndTime ?? preparedForm.eventEndTime,
  };
  applyDerivedHydrationFields(nextForm, action);
  return nextForm;
}

export function buildActionDeclarationHydration(
  baseForm: FormState,
  action: ActionEditorRecord,
): ActionDeclarationHydration {
  const form = buildActionEditorFormState(baseForm, action);
  return {
    form,
    loadedActionPhase: action.actionPhase,
    geometry: hydrateActionEditorGeometry({
      drawing: action.manualDrawing,
      geometrySource: action.geometrySource,
      gpxImport: form.gpxImport,
      operationalRoute: form.operationalRoute,
      geometryMethod: form.geometryMethod,
    }),
  };
}
