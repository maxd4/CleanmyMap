import type { ActionPreparationData } from "../../../lib/actions/types";
import { resolveFinalActionGeometry } from "../../../lib/actions/geometry/final-geometry";
import { resolveActionRouteTopology } from "../../../lib/actions/route-topology";
import { resolveRouteTargetDistance } from "../../../lib/actions/route-target-distance";
import { formatWasteGuidanceLines } from "../../../lib/waste";
import type { FinalActionGeometry } from "../../../lib/actions/geometry/final-geometry";
import type { FormState } from "./model";
import { buildVolunteerParticipationFromForm } from "./payload-measurements";
import { toOptionalNumber } from "./payload-numbers";
import { normalizeVolunteerParticipation } from "../../../lib/actions/volunteer-participation";

function buildPreparationRouteFields(
  form: FormState,
  routeTopology: ReturnType<typeof resolveActionRouteTopology>,
  finalGeometry: FinalActionGeometry | null,
  resolvedTarget: ReturnType<typeof resolveRouteTargetDistance>,
) {
  return {
    ...buildPreparationLocationFields(form, routeTopology),
    ...buildPreparationDistanceFields(form, resolvedTarget),
    ...buildPreparationGeometryFields(form, routeTopology, finalGeometry),
    routeCalibrationContext: form.routeCalibrationContext ?? undefined,
    operationalRoute: finalGeometry?.operationalRoute ?? undefined,
  };
}

function buildPreparationLocationFields(
  form: FormState,
  routeTopology: ReturnType<typeof resolveActionRouteTopology>,
) {
  return {
    zoneCiblePrevue:
      form.recordType !== "action"
        ? form.arrivalLocationLabel.trim() || undefined
        : routeTopology === "point_to_point"
          ? form.arrivalLocationLabel.trim() || undefined
          : undefined,
    routeTopology,
    actionDate: form.actionDate.trim() || undefined,
    meetingTime: form.meetingTime.trim() || undefined,
    departureTime: form.departureTime.trim() || undefined,
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

function buildPreparationGuidanceFields(
  form: FormState,
  guidance: ReturnType<typeof formatWasteGuidanceLines>,
) {
  const supplement = (manual: string, derived: string, title: string) => {
    const value = manual.trim();
    if (!derived) return value || undefined;
    const block = `${title}:\n${derived}`;
    return value ? `${value}\n\n${block}` : block;
  };
  return {
    accessibility: form.accessibility.trim() || undefined,
    safetyInstructions: supplement(
      form.safetyInstructions,
      [guidance.toAvoid, guidance.toReport].filter(Boolean).join("\n"),
      "Consignes dérivées du référentiel",
    ),
    recommendedMaterials: supplement(
      form.recommendedMaterials,
      guidance.toPrepare,
      "Matériel dérivé du référentiel",
    ),
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
  guidance: ReturnType<typeof formatWasteGuidanceLines>,
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
    ...buildPreparationGuidanceFields(form, guidance),
    participantMessage: form.participantMessage.trim() || undefined,
    logisticsNotes: form.logisticsNotes.trim() || undefined,
    checklistBeforeDeparture: form.checklistBeforeDeparture.trim() || undefined,
  };
}

function resolvePreparationContext(
  form: FormState,
  finalGeometry: FinalActionGeometry | null,
) {
  const wasteCategories = form.wasteCategories ?? [];
  const routeTopology = resolveActionRouteTopology({
    topology: form.routeTopology,
    arrivalLocationLabel: form.arrivalLocationLabel,
    recordType: form.recordType,
  });
  const volunteerParticipationInput = buildVolunteerParticipationFromForm(form);
  const volunteerParticipation = normalizeVolunteerParticipation(volunteerParticipationInput);
  const guidance = formatWasteGuidanceLines(wasteCategories);
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
    guidance,
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
    ...buildPreparationContentFields(form, context.guidance),
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
    actionDate: preparationData.actionDate ?? form.actionDate,
    meetingTime: preparationData.meetingTime ?? form.meetingTime,
    departureTime: preparationData.departureTime ?? form.departureTime,
    durationMinutes:
      typeof preparationData.estimatedDurationMinutes === "number"
        ? String(preparationData.estimatedDurationMinutes)
        : form.durationMinutes,
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
    safetyInstructions: preparationData.safetyInstructions ?? form.safetyInstructions,
    recommendedMaterials: preparationData.recommendedMaterials ?? form.recommendedMaterials,
    participantMessage: preparationData.participantMessage ?? form.participantMessage,
    logisticsNotes: preparationData.logisticsNotes ?? form.logisticsNotes,
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
    durationMinutes: preparationData.estimatedDurationMinutes ?? form.durationMinutes,
    routeTargetDistanceKm: preparationData.routeTargetDistanceKm,
    routeTargetDistanceSource: preparationData.routeTargetDistanceSource,
  });

  return {
    ...form,
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
