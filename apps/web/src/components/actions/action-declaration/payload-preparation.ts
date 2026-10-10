import type { ActionPreparationData } from "../../../lib/actions/types";
import { resolveFinalActionGeometry } from "../../../lib/actions/geometry/final-geometry";
import { resolveActionRouteTopology } from "../../../lib/actions/route-topology";
import { resolveRouteTargetDistance } from "../../../lib/actions/route-target-distance";
import type { FinalActionGeometry } from "../../../lib/actions/geometry/final-geometry";
import type { FormState } from "./model";
import { buildVolunteerParticipationFromForm } from "./payload-measurements";
import { toOptionalNumber } from "./payload-numbers";
import { normalizeVolunteerParticipation } from "../../../lib/actions/volunteer-participation";
import {
  buildPreparationGuidanceFields,
  stripHistoricalDerivedGuidance,
} from "./payload-preparation-guidance";
import {
  normalizeAccessibilityStatus,
  normalizePreparationChecklist,
  normalizeSuggestedMaterials,
} from "../../../lib/actions/preparation-contract";
import { normalizeActionInterventionMode } from "@/lib/actions/intervention-mode";

function buildPreparationRouteFields(
  form: FormState,
  routeTopology: ReturnType<typeof resolveActionRouteTopology>,
  finalGeometry: FinalActionGeometry | null,
  resolvedTarget: ReturnType<typeof resolveRouteTargetDistance>,
) {
  const interventionMode = normalizeActionInterventionMode(form.interventionMode);
  if (interventionMode?.mode === "fixed_area") {
    return {
      interventionMode,
      ...buildPreparationLocationFields(form, routeTopology, false),
    };
  }
  return {
    ...(interventionMode ? { interventionMode } : {}),
    ...buildPreparationLocationFields(form, routeTopology, true),
    ...buildPreparationDistanceFields(form, resolvedTarget),
    ...buildPreparationGeometryFields(form, routeTopology, finalGeometry),
    routeCalibrationContext: form.routeCalibrationContext ?? undefined,
    operationalRoute: finalGeometry?.operationalRoute ?? undefined,
  };
}

function buildPreparationLocationFields(
  form: FormState,
  routeTopology: ReturnType<typeof resolveActionRouteTopology>,
  includesRoute: boolean,
) {
  return {
    ...(includesRoute ? { zoneCiblePrevue:
      form.recordType !== "action"
        ? form.arrivalLocationLabel.trim() || undefined
        : routeTopology === "point_to_point"
          ? form.arrivalLocationLabel.trim() || undefined
          : undefined } : {}),
    ...(includesRoute ? { routeTopology } : {}),
    actionDate: form.actionDate.trim() || undefined,
    meetingTime: form.meetingTime.trim() || undefined,
    departureTime: form.departureTime.trim() || undefined,
    ...(includesRoute ? { durationMinutesDeclared: form.durationMinutes.trim() !== "" } : {}),
  };
}

function buildPreparationDistanceFields(
  form: FormState,
  resolvedTarget: ReturnType<typeof resolveRouteTargetDistance>,
) {
  return {
    routeTargetDistanceKm: resolvedTarget.distanceKm,
    routeTargetDistanceSource: resolvedTarget.source,
    ...(resolvedTarget.source === "derived"
      ? { routeTargetDistancePolicyVersion: resolvedTarget.policyVersion }
      : {}),
    midRouteCoordinates: form.midRouteCoordinates ?? undefined,
  };
}

function buildPreparationGeometryFields(
  form: FormState,
  routeTopology: ReturnType<typeof resolveActionRouteTopology>,
  finalGeometry: FinalActionGeometry | null,
) {
  return {
    arrivalCoordinates:
      form.recordType === "action" && routeTopology === "point_to_point"
        ? form.arrivalCoordinates ?? undefined
        : undefined,
    routeObservedDistanceKm:
      finalGeometry?.source === "gpx_import" ? form.gpxImport?.observedDistanceKm : undefined,
    gpxImport:
      finalGeometry?.source === "gpx_import" ? form.gpxImport ?? undefined : undefined,
  };
}

function buildPreparationParticipationFields(
  form: FormState,
  volunteerParticipationInput: ReturnType<typeof buildVolunteerParticipationFromForm>,
  volunteerParticipation: ReturnType<typeof normalizeVolunteerParticipation>,
) {
  return {
    volunteersExpected:
      volunteerParticipation.participantsCount ?? toOptionalNumber(form.volunteersCount),
    volunteerParticipation:
      volunteerParticipationInput as ActionPreparationData["volunteerParticipation"],
    groupJoinEnabled: form.groupJoinEnabled,
    expectedWasteCategories:
      form.wasteCategories && form.wasteCategories.length > 0
        ? [...form.wasteCategories]
        : undefined,
  };
}

function buildPreparationContentFields(
  form: FormState,
) {
  return {
    actionTitle: form.actionTitle.trim() || undefined,
    shortDescription: form.shortDescription.trim() || undefined,
    communeZoneLabel: form.communeZoneLabel.trim() || undefined,
    pointDeRendezVous: form.departureLocationLabel.trim() || undefined,
    midRouteLocationLabel: form.midRouteLocationLabel?.trim() || undefined,
    ...(form.plannedObjective ? { plannedObjective: form.plannedObjective } : {}),
    ...(form.placeType ? { placeType: form.placeType } : {}),
    ...(form.estimatedDifficulty ? { estimatedDifficulty: form.estimatedDifficulty } : {}),
    ...buildPreparationGuidanceFields(form),
    accessibilityStatus: form.accessibilityStatus,
    formalitiesContext: form.formalitiesContext ?? undefined,
    materialsProvided: form.materialsProvided.trim() || undefined,
    suggestedMaterials: form.suggestedMaterials.length > 0 ? [...form.suggestedMaterials] : undefined,
    participantMessage: form.participantMessage.trim() || undefined,
    logisticsNotes: form.logisticsNotes.trim() || undefined,
    preparationChecklist:
      form.preparationChecklist.length > 0 ? [...form.preparationChecklist] : undefined,
    checklistBeforeDeparture: form.checklistBeforeDeparture.trim() || undefined,
  };
}

function resolvePreparationContext(
  form: FormState,
  finalGeometry: FinalActionGeometry | null,
) {
  const routeTopology = resolveActionRouteTopology({
    topology: form.routeTopology,
    arrivalLocationLabel: form.arrivalLocationLabel,
    recordType: form.recordType,
  });
  const volunteerParticipationInput = buildVolunteerParticipationFromForm(form);
  const volunteerParticipation = normalizeVolunteerParticipation(volunteerParticipationInput);
  const targetSource: "derived" | "manual" = form.routeTargetDistanceKmManuallySet ? "manual" : "derived";
  const resolvedTarget = resolveRouteTargetDistance({
    durationMinutes: form.durationMinutes,
    routeTargetDistanceKm: form.routeTargetDistanceKm,
    routeTargetDistanceSource: targetSource,
  });
  return {
    routeTopology,
    volunteerParticipationInput,
    volunteerParticipation,
    resolvedTarget,
    finalGeometry,
  };
}

export function buildPreparationDataFromForm(
  form: FormState,
  finalGeometry: FinalActionGeometry | null = resolveFinalActionGeometry({
    gpxImport: form.gpxImport,
    operationalRoute: form.operationalRoute,
  }),
): ActionPreparationData {
  const context = resolvePreparationContext(form, finalGeometry);
  return {
    ...buildPreparationContentFields(form),
    ...buildPreparationRouteFields(
      form,
      context.routeTopology,
      context.finalGeometry,
      context.resolvedTarget,
    ),
    ...buildPreparationParticipationFields(
      form,
      context.volunteerParticipationInput,
      context.volunteerParticipation,
    ),
  };
}

function buildHydratedLocationFields(
  form: FormState,
  preparationData: ActionPreparationData,
  routeTopology: ReturnType<typeof resolveActionRouteTopology>,
) {
  return {
    actionTitle: preparationData.actionTitle ?? form.actionTitle,
    shortDescription: preparationData.shortDescription ?? form.shortDescription,
    communeZoneLabel: preparationData.communeZoneLabel ?? form.communeZoneLabel,
    departureLocationLabel: preparationData.pointDeRendezVous ?? form.departureLocationLabel,
    midRouteLocationLabel: preparationData.midRouteLocationLabel ?? form.midRouteLocationLabel,
    arrivalLocationLabel:
      form.recordType === "action" && routeTopology === "loop"
        ? ""
        : preparationData.zoneCiblePrevue ?? form.arrivalLocationLabel,
    routeTopology,
  };
}

function buildHydratedTimingFields(
  form: FormState,
  preparationData: ActionPreparationData,
  resolvedTarget: ReturnType<typeof resolveRouteTargetDistance>,
) {
  return {
    actionDate: form.actionDate.trim() || preparationData.actionDate || "",
    meetingTime: form.meetingTime.trim() || preparationData.meetingTime || "",
    departureTime: form.departureTime.trim() || preparationData.departureTime || "",
    durationMinutes:
      form.durationMinutes.trim() ||
      (typeof preparationData.estimatedDurationMinutes === "number"
        ? String(preparationData.estimatedDurationMinutes)
        : ""),
    routeTargetDistanceKm: String(resolvedTarget.distanceKm),
    routeTargetDistanceKmManuallySet: resolvedTarget.source === "manual",
  };
}

function buildHydratedDescriptionFields(
  form: FormState,
  preparationData: ActionPreparationData,
) {
  return {
    plannedObjective: preparationData.plannedObjective ?? form.plannedObjective,
    placeType: preparationData.placeType ?? form.placeType,
    estimatedDifficulty: preparationData.estimatedDifficulty ?? form.estimatedDifficulty,
    accessibility: preparationData.accessibility ?? form.accessibility,
    accessibilityStatus:
      normalizeAccessibilityStatus(preparationData.accessibilityStatus) ?? form.accessibilityStatus,
    formalitiesContext: preparationData.formalitiesContext ?? form.formalitiesContext,
    safetyInstructions:
      stripHistoricalDerivedGuidance(
        preparationData.safetyInstructions,
        "safetyInstructions",
      ) ?? form.safetyInstructions,
    recommendedMaterials:
      stripHistoricalDerivedGuidance(
        preparationData.recommendedMaterials,
        "recommendedMaterials",
      ) ?? form.recommendedMaterials,
    materialsProvided: preparationData.materialsProvided ?? form.materialsProvided,
    suggestedMaterials:
      normalizeSuggestedMaterials(preparationData.suggestedMaterials) ?? form.suggestedMaterials,
    participantMessage: preparationData.participantMessage ?? form.participantMessage,
    logisticsNotes: preparationData.logisticsNotes ?? form.logisticsNotes,
    preparationChecklist:
      normalizePreparationChecklist(preparationData.preparationChecklist) ?? form.preparationChecklist,
    checklistBeforeDeparture: preparationData.checklistBeforeDeparture ?? form.checklistBeforeDeparture,
  };
}

function buildHydratedParticipationFields(
  form: FormState,
  preparationData: ActionPreparationData,
) {
  const participation = preparationData.volunteerParticipation;
  return {
    volunteersCount:
      typeof preparationData.volunteersExpected === "number"
        ? String(preparationData.volunteersExpected)
        : form.volunteersCount,
    childrenCount:
      participation?.childrenCount !== null && participation?.childrenCount !== undefined
        ? String(participation.childrenCount)
        : form.childrenCount,
    adultCount:
      participation?.adultCount !== null && participation?.adultCount !== undefined
        ? String(participation.adultCount)
        : form.adultCount,
    retiredCount:
      participation?.retiredCount !== null && participation?.retiredCount !== undefined
        ? String(participation.retiredCount)
        : form.retiredCount,
    groupJoinEnabled:
      typeof preparationData.groupJoinEnabled === "boolean"
        ? preparationData.groupJoinEnabled
        : form.groupJoinEnabled,
    wasteCategories: preparationData.expectedWasteCategories ?? form.wasteCategories,
  };
}

export function applyPreparationDataToForm(
  form: FormState,
  preparationData: ActionPreparationData | null | undefined,
): FormState {
  if (!preparationData) return form;

  const routeTopology = resolveActionRouteTopology({
    topology: preparationData.routeTopology,
    arrivalLocationLabel: preparationData.zoneCiblePrevue ?? form.arrivalLocationLabel,
    recordType: form.recordType,
  });

  const resolvedTarget = resolveRouteTargetDistance({
    durationMinutes:
      form.durationMinutes.trim() || preparationData.estimatedDurationMinutes,
    routeTargetDistanceKm: preparationData.routeTargetDistanceKm,
    routeTargetDistanceSource: preparationData.routeTargetDistanceSource,
  });
  const storedInterventionMode = normalizeActionInterventionMode(preparationData.interventionMode);
  const legacyPlannerRoute = Boolean(preparationData.operationalRoute || preparationData.routeCalibrationContext);

  return {
    ...form,
    interventionMode: storedInterventionMode ?? (legacyPlannerRoute ? null : form.interventionMode),
    ...buildHydratedLocationFields(form, preparationData, routeTopology),
    ...buildHydratedTimingFields(form, preparationData, resolvedTarget),
    midRouteCoordinates: preparationData.midRouteCoordinates ?? form.midRouteCoordinates,
    arrivalCoordinates: preparationData.arrivalCoordinates ?? form.arrivalCoordinates,
    gpxImport: preparationData.gpxImport ?? form.gpxImport,
    ...buildHydratedDescriptionFields(form, preparationData),
    ...buildHydratedParticipationFields(form, preparationData),
    operationalRoute: preparationData.operationalRoute ?? form.operationalRoute,
    routeCalibrationContext: preparationData.routeCalibrationContext ?? form.routeCalibrationContext,
  };
}
