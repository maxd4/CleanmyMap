import { appendEventRefToNotes } from"../../../lib/actions/event-link";
import type {
 ActionDrawing,
 ActionGeometrySource,
 ActionMegotsCondition,
 ActionPhotoAsset,
 ActionPreparationData,
 ActionRouteTopology,
 ActionVisionEstimate,
 CreateActionPayload,
} from"../../../lib/actions/types";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import {
 resolveFinalActionGeometry,
 type FinalActionGeometry,
} from "@/lib/actions/geometry/final-geometry";
import type { DeclarationMode, FormState } from"./types";
import { initialState } from "./model";
import { normalizeActionDrawing } from"../map/layers/actions-map-geometry.utils";
import { formatWasteGuidanceLines } from "@/lib/waste";
import {
 normalizeVolunteerParticipation,
} from "@/lib/actions/volunteer-participation";
import type { VolunteerParticipationInput } from "@/lib/actions/volunteer-participation";
import { buildOrganizerPayloadFields, resolveOrganizerPayload } from "./organizer-payload";
import {
 resolveRouteTargetDistance,
} from "@/lib/actions/route-target-distance";

export const OTHER_VOLUNTEER_ASSOCIATION_VALUE = "__autre_benevole__";

type CreateActionPayloadParams = {
 form: FormState;
 declarationMode: DeclarationMode;
 effectiveManualDrawingEnabled: boolean;
 drawingIsValid: boolean;
 manualDrawing: ActionDrawing | null;
 manualDrawingSource?: ActionGeometrySource | null;
 routePreviewDrawing?: ActionDrawing | null;
 routePreviewSource?: ActionGeometrySource | null;
 isEntrepriseMode: boolean;
 linkedEventId?: string;
 photos?: ActionPhotoAsset[];
 visionEstimate?: ActionVisionEstimate | null;
 userMetadata?: {
  userId: string;
  handle?: string;
  username?: string;
  displayName?: string;
  email?: string;
 };
};

function buildVolunteerParticipationFromForm(
 form: FormState,
): VolunteerParticipationInput {
 return {
  childrenCount: toOptionalNumber(form.childrenCount) ?? null,
  adultCount: toOptionalNumber(form.adultCount) ?? null,
  retiredCount: toOptionalNumber(form.retiredCount) ?? null,
 };
}

type CreateActionPayloadParts = {
 departureLocationLabel: string;
 arrivalLocationLabel: string;
 routeTopology: ActionRouteTopology;
 routeLocationLabel: string;
 latitude: number | null;
 longitude: number | null;
 finalGeometry: FinalActionGeometry | null;
 normalizedDrawing: ActionDrawing | null;
 resolvedManualDrawingSource: ActionGeometrySource | null;
 isSpontaneousAction: boolean;
 organizerName: string;
 associationName: string;
 enteredMegotsKg: number | null;
 enteredButtsCount: number | null;
 enteredVolumeLiters: number | null;
 cigaretteButtsCondition: ActionMegotsCondition;
 rawCigaretteButtsMeasurements: {
  cigaretteButtsCount: number | null;
  cigaretteButtsMassKg: number | null;
  cigaretteButtsVolumeLiters: number | null;
  cigaretteButtsCondition: ActionMegotsCondition;
 };
 volunteerParticipationInput: VolunteerParticipationInput;
 volunteerParticipation: ReturnType<typeof normalizeVolunteerParticipation>;
};

function resolveCreateActionRouteParts(
 params: CreateActionPayloadParams,
): Pick<
 CreateActionPayloadParts,
 | "departureLocationLabel"
 | "arrivalLocationLabel"
 | "routeTopology"
 | "routeLocationLabel"
 | "latitude"
 | "longitude"
 | "finalGeometry"
 | "normalizedDrawing"
 | "resolvedManualDrawingSource"
> {
 const { form, effectiveManualDrawingEnabled, manualDrawing, manualDrawingSource, routePreviewDrawing, routePreviewSource } = params;
 const departureLocationLabel = form.departureLocationLabel.trim();
 const arrivalLocationLabel = form.arrivalLocationLabel.trim();
 const routeTopology: ActionRouteTopology = resolveActionRouteTopology({
  topology: form.routeTopology,
  arrivalLocationLabel,
  recordType: form.recordType,
 });
 const routeLocationLabel =
  routeTopology === "point_to_point" && departureLocationLabel && arrivalLocationLabel
   ? `${departureLocationLabel} → ${arrivalLocationLabel}`
   : departureLocationLabel || form.locationLabel.trim();
 const fallbackLatitude = toOptionalNumber(form.latitude) ?? null;
 const fallbackLongitude = toOptionalNumber(form.longitude) ?? null;
 let latitude = fallbackLatitude;
 let longitude = fallbackLongitude;
 const normalizedManualDrawing = normalizeActionDrawing(manualDrawing);
 const finalGeometry = resolveFinalActionGeometry({
  gpxDrawing: form.gpxImport ? normalizedManualDrawing : null,
  gpxImport: form.gpxImport,
  manualDrawing: normalizedManualDrawing,
  manualDrawingSource,
  operationalRoute: form.operationalRoute,
  reconstructedDrawing: normalizeActionDrawing(routePreviewDrawing),
  reconstructedSource: routePreviewSource,
 });
 const normalizedDrawing = finalGeometry?.drawing ?? null;
 const resolvedManualDrawingSource = finalGeometry?.source ?? null;
 if (normalizedDrawing && (effectiveManualDrawingEnabled || finalGeometry?.operationalRoute || routePreviewDrawing)) {
  const centroid = getDrawingCentroid(normalizedDrawing);
  latitude = centroid.latitude;
  longitude = centroid.longitude;
 }
 return {
  departureLocationLabel,
  arrivalLocationLabel,
  routeTopology,
  routeLocationLabel,
  latitude,
  longitude,
  finalGeometry,
  normalizedDrawing,
  resolvedManualDrawingSource,
 };
}

function resolveCreateActionMeasurementParts(
 form: FormState,
 isEntrepriseMode: boolean,
): Pick<
 CreateActionPayloadParts,
 | "isSpontaneousAction"
 | "organizerName"
 | "associationName"
 | "enteredMegotsKg"
 | "enteredButtsCount"
 | "enteredVolumeLiters"
 | "cigaretteButtsCondition"
 | "rawCigaretteButtsMeasurements"
 | "volunteerParticipationInput"
 | "volunteerParticipation"
> {
 const { isSpontaneousAction, organizerName, associationName } = resolveOrganizerPayload(form, isEntrepriseMode);
 const enteredMegotsKg = toOptionalNumber(form.wasteMegotsKg) ?? null;
 const enteredButtsCount = toOptionalNumber(form.cigaretteButtsCount) ?? null;
 const enteredVolumeLiters = toOptionalNumber(form.cigaretteButtsVolumeLiters) ?? null;
 const cigaretteButtsCondition = form.wasteMegotsCondition === "propre"
  ? form.cigaretteButtsCondition
  : form.wasteMegotsCondition;
 const rawCigaretteButtsMeasurements = {
  cigaretteButtsCount: enteredButtsCount,
  cigaretteButtsMassKg: enteredMegotsKg,
  cigaretteButtsVolumeLiters: enteredVolumeLiters,
  cigaretteButtsCondition,
 };
 const volunteerParticipationInput = buildVolunteerParticipationFromForm(form);
 const volunteerParticipation = normalizeVolunteerParticipation(volunteerParticipationInput);
 return {
  isSpontaneousAction,
  organizerName,
  associationName,
  enteredMegotsKg,
  enteredButtsCount,
  enteredVolumeLiters,
  cigaretteButtsCondition,
  rawCigaretteButtsMeasurements,
  volunteerParticipationInput,
  volunteerParticipation,
 };
}

function resolveCreateActionPayloadParts(
 params: CreateActionPayloadParams,
): CreateActionPayloadParts {
 return {
  ...resolveCreateActionRouteParts(params),
  ...resolveCreateActionMeasurementParts(params.form, params.isEntrepriseMode),
 };
}

export function parseOrganizerAccounts(input: string): string[] {
 return [...new Set(
 input
 .split(/[,;\n]+/)
 .map((token) => token.trim())
 .map((token) => token.replace(/^@+/, ""))
 .filter((token) => token.length > 0),
 )];
}

export function normalizeParticipantAccounts(
 accounts: readonly string[] | null | undefined,
): string[] {
 return [
  ...new Set(
   (accounts ?? [])
    .map((token) => token.trim())
    .map((token) => token.replace(/^@+/, ""))
    .filter((token) => token.length > 0),
  ),
 ];
}

export function createInitialFormState(
 actorName: string,
 recordType: FormState["recordType"] = "action",
): FormState {
 return { ...initialState, actorName, recordType };
}

export function buildPreparationDataFromForm(
 form: FormState,
 finalGeometry: FinalActionGeometry | null = resolveFinalActionGeometry({
  gpxImport: form.gpxImport,
  operationalRoute: form.operationalRoute,
 }),
): ActionPreparationData {
 const wasteCategories = form.wasteCategories ?? [];
 const routeTopology = resolveActionRouteTopology({
  topology: form.routeTopology,
  arrivalLocationLabel: form.arrivalLocationLabel,
  recordType: form.recordType,
 });
 const volunteerParticipationInput = buildVolunteerParticipationFromForm(form);
 const volunteerParticipation = normalizeVolunteerParticipation(volunteerParticipationInput);
 const guidance = formatWasteGuidanceLines(wasteCategories);
 const targetSource: "derived" | "manual" = form.routeTargetDistanceKmManuallySet
  ? "manual"
  : "derived";
 const resolvedTarget = resolveRouteTargetDistance({
  durationMinutes: form.durationMinutes,
  routeTargetDistanceKm: form.routeTargetDistanceKm,
  routeTargetDistanceSource: targetSource,
 });
 const supplement = (manual: string, derived: string, title: string) => {
  const value = manual.trim();
  if (!derived) return value || undefined;
  const block = `${title}:\n${derived}`;
  return value ? `${value}\n\n${block}` : block;
 };
 return {
  actionTitle: form.actionTitle.trim() || undefined,
  shortDescription: form.shortDescription.trim() || undefined,
  communeZoneLabel: form.communeZoneLabel.trim() || undefined,
 pointDeRendezVous: form.departureLocationLabel.trim() || undefined,
  midRouteLocationLabel: form.midRouteLocationLabel?.trim() || undefined,
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
  routeTargetDistanceKm: resolvedTarget.distanceKm,
  routeTargetDistanceSource: resolvedTarget.source,
  ...(resolvedTarget.source === "derived"
    ? { routeTargetDistancePolicyVersion: resolvedTarget.policyVersion }
    : {}),
  midRouteCoordinates: form.midRouteCoordinates ?? undefined,
  arrivalCoordinates:
   form.recordType === "action" && routeTopology === "point_to_point"
    ? form.arrivalCoordinates ?? undefined
    : undefined,
  routeObservedDistanceKm:
   finalGeometry?.source === "gpx_import" ? form.gpxImport?.observedDistanceKm : undefined,
  gpxImport:
   finalGeometry?.source === "gpx_import" ? form.gpxImport ?? undefined : undefined,
  plannedObjective: form.plannedObjective,
  placeType: form.placeType || undefined,
  estimatedDifficulty: form.estimatedDifficulty,
  accessibility: form.accessibility.trim() || undefined,
  safetyInstructions: supplement(form.safetyInstructions, [guidance.toAvoid, guidance.toReport].filter(Boolean).join("\n"), "Consignes dérivées du référentiel"),
  recommendedMaterials: supplement(form.recommendedMaterials, guidance.toPrepare, "Matériel dérivé du référentiel"),
  participantMessage: form.participantMessage.trim() || undefined,
  creatorRole: form.creatorRole,
  preparationState: form.preparationState,
  logisticsNotes: form.logisticsNotes.trim() || undefined,
  checklistBeforeDeparture: form.checklistBeforeDeparture.trim() || undefined,
  volunteersExpected:
   volunteerParticipation.participantsCount ?? toOptionalNumber(form.volunteersCount),
  volunteerParticipation: volunteerParticipationInput as ActionPreparationData["volunteerParticipation"],
  groupJoinEnabled: form.groupJoinEnabled,
  expectedWasteCategories: wasteCategories.length > 0 ? [...wasteCategories] : undefined,
  routeCalibrationContext: form.routeCalibrationContext ?? undefined,
  operationalRoute: finalGeometry?.operationalRoute ?? undefined,
  };
}

export function applyPreparationDataToForm(
 form: FormState,
 preparationData: ActionPreparationData | null | undefined,
): FormState {
 if (!preparationData) {
  return form;
 }

 const routeTopology = resolveActionRouteTopology({
  topology: preparationData.routeTopology,
  arrivalLocationLabel: preparationData.zoneCiblePrevue ?? form.arrivalLocationLabel,
  recordType: form.recordType,
 });

  return {
  ...form,
  actionTitle: preparationData.actionTitle ?? form.actionTitle,
  shortDescription: preparationData.shortDescription ?? form.shortDescription,
  communeZoneLabel: preparationData.communeZoneLabel ?? form.communeZoneLabel,
  departureLocationLabel:
   preparationData.pointDeRendezVous ?? form.departureLocationLabel,
  midRouteLocationLabel:
   preparationData.midRouteLocationLabel ?? form.midRouteLocationLabel,
  arrivalLocationLabel:
   form.recordType === "action" && routeTopology === "loop"
    ? ""
    : preparationData.zoneCiblePrevue ?? form.arrivalLocationLabel,
  routeTopology,
  actionDate: preparationData.actionDate ?? form.actionDate,
  meetingTime: preparationData.meetingTime ?? form.meetingTime,
  departureTime: preparationData.departureTime ?? form.departureTime,
  durationMinutes:
   typeof preparationData.estimatedDurationMinutes === "number"
    ? String(preparationData.estimatedDurationMinutes)
    : form.durationMinutes,
  ...(() => {
    const resolvedTarget = resolveRouteTargetDistance({
      durationMinutes: preparationData.estimatedDurationMinutes ?? form.durationMinutes,
      routeTargetDistanceKm: preparationData.routeTargetDistanceKm,
      routeTargetDistanceSource: preparationData.routeTargetDistanceSource,
    });
    return {
      routeTargetDistanceKm: String(resolvedTarget.distanceKm),
      routeTargetDistanceKmManuallySet: resolvedTarget.source === "manual",
    };
  })(),
  midRouteCoordinates: preparationData.midRouteCoordinates ?? form.midRouteCoordinates,
  arrivalCoordinates: preparationData.arrivalCoordinates ?? form.arrivalCoordinates,
  gpxImport: preparationData.gpxImport ?? form.gpxImport,
  plannedObjective: preparationData.plannedObjective ?? form.plannedObjective,
  placeType: preparationData.placeType ?? form.placeType,
  estimatedDifficulty:
   preparationData.estimatedDifficulty ?? form.estimatedDifficulty,
  accessibility: preparationData.accessibility ?? form.accessibility,
  safetyInstructions:
   preparationData.safetyInstructions ?? form.safetyInstructions,
  recommendedMaterials:
   preparationData.recommendedMaterials ?? form.recommendedMaterials,
  participantMessage:
   preparationData.participantMessage ?? form.participantMessage,
  creatorRole: preparationData.creatorRole ?? form.creatorRole,
  preparationState: preparationData.preparationState ?? form.preparationState,
  logisticsNotes: preparationData.logisticsNotes ?? form.logisticsNotes,
  checklistBeforeDeparture:
   preparationData.checklistBeforeDeparture ?? form.checklistBeforeDeparture,
  volunteersCount:
   typeof preparationData.volunteersExpected === "number"
    ? String(preparationData.volunteersExpected)
    : form.volunteersCount,
  childrenCount:
   preparationData.volunteerParticipation?.childrenCount !== null &&
   preparationData.volunteerParticipation?.childrenCount !== undefined
    ? String(preparationData.volunteerParticipation.childrenCount)
    : form.childrenCount,
  adultCount:
   preparationData.volunteerParticipation?.adultCount !== null &&
   preparationData.volunteerParticipation?.adultCount !== undefined
    ? String(preparationData.volunteerParticipation.adultCount)
    : form.adultCount,
  retiredCount:
   preparationData.volunteerParticipation?.retiredCount !== null &&
   preparationData.volunteerParticipation?.retiredCount !== undefined
    ? String(preparationData.volunteerParticipation.retiredCount)
    : form.retiredCount,
  groupJoinEnabled:
   typeof preparationData.groupJoinEnabled === "boolean"
    ? preparationData.groupJoinEnabled
    : form.groupJoinEnabled,
  wasteCategories: preparationData.expectedWasteCategories ?? form.wasteCategories,
  operationalRoute: preparationData.operationalRoute ?? form.operationalRoute,
  routeCalibrationContext:
   preparationData.routeCalibrationContext ?? form.routeCalibrationContext,
 };
}

export function toOptionalNumber(input: string): number | undefined {
 const trimmed = input.trim();
 if (!trimmed) {
 return undefined;
 }
 const parsed = Number(trimmed);
 return Number.isFinite(parsed) ? parsed : undefined;
}

export function toRequiredNumber(input: string, fallback: number): number {
 const parsed = Number(input);
 return Number.isFinite(parsed) ? parsed : fallback;
}

function getDrawingCentroid(drawing: ActionDrawing): {
 latitude: number;
 longitude: number;
} {
 const points = drawing.coordinates;
 const total = points.reduce(
 (acc, [lat, lng]) => ({
 latitude: acc.latitude + lat,
 longitude: acc.longitude + lng,
 }),
 { latitude: 0, longitude: 0 },
 );
 return {
 latitude: Number((total.latitude / points.length).toFixed(6)),
 longitude: Number((total.longitude / points.length).toFixed(6)),
 };
}

export function isDrawingValid(
 drawing: ActionDrawing | null | undefined,
): drawing is ActionDrawing {
 return normalizeActionDrawing(drawing) !== null;
}

export function isLocationLikelyPark(value: string): boolean {
 const lower = value.toLowerCase();
 return [
"luxembourg",
"vincennes",
"boulogne",
"chaumont",
"tuileries",
"parc",
"jardin",
"square",
 ].some((keyword) => lower.includes(keyword));
}

export function buildCreateActionPayload(
 params: CreateActionPayloadParams,
): CreateActionPayload {
 return buildCreateActionPayloadResult(
  params,
  resolveCreateActionPayloadParts(params),
 );
}

function buildCreateActionPayloadIdentityFields(
 params: CreateActionPayloadParams,
 parts: CreateActionPayloadParts,
): Partial<CreateActionPayload> {
 const { form, declarationMode, linkedEventId } = params;
 const { departureLocationLabel, arrivalLocationLabel, routeTopology, routeLocationLabel } = parts;
 const organizerAccounts = parts.isSpontaneousAction
  ? undefined
  : parseOrganizerAccounts(form.organizerAccounts);

 return {
  actorName: form.actorName.trim() || undefined,
  associationName: parts.associationName,
  ...buildOrganizerPayloadFields(form, parts.organizerName),
  groupJoinEnabled: form.groupJoinEnabled,
  actionPhase: declarationMode === "quick" ? "pre_action" : "post_action_complete",
  actionDate: form.actionDate,
  locationLabel: routeLocationLabel,
  departureLocationLabel: departureLocationLabel || undefined,
  arrivalLocationLabel:
   form.recordType !== "action" || routeTopology === "point_to_point"
    ? arrivalLocationLabel || undefined
    : undefined,
  routeTopology,
  routeStyle: "souple",
  routeAdjustmentMessage: form.routeAdjustmentMessage.trim() || undefined,
  recordType: form.recordType,
  notes: appendEventRefToNotes(form.notes.trim() || undefined, linkedEventId),
  organizerAccounts: organizerAccounts?.length ? organizerAccounts : undefined,
  placeType: form.placeType,
  submissionMode: declarationMode,
 };
}

function buildCreateActionPayloadMeasurementFields(
 form: FormState,
 parts: CreateActionPayloadParts,
): Partial<CreateActionPayload> {
 const { enteredMegotsKg, enteredButtsCount, enteredVolumeLiters, cigaretteButtsCondition } = parts;
 return {
  wasteKg: toOptionalNumber(form.wasteKg) ?? null,
  cigaretteButtsMeasurements: parts.rawCigaretteButtsMeasurements,
  cigaretteButtsMassKg: enteredMegotsKg,
  cigaretteButtsVolumeLiters: enteredVolumeLiters,
  cigaretteButtsCondition,
  cigaretteButtsKg: enteredMegotsKg,
  cigaretteButts: enteredButtsCount,
  cigaretteButtsCount: enteredButtsCount,
  volunteerParticipation: parts.volunteerParticipationInput as CreateActionPayload["volunteerParticipation"],
  volunteersCount:
   parts.volunteerParticipation.participantsCount ??
   Math.trunc(toRequiredNumber(form.volunteersCount, 0)),
  durationMinutes: Math.max(0, Math.trunc(toRequiredNumber(form.durationMinutes, 0))),
  eventStartTime: form.eventStartTime.trim() || null,
  eventEndTime: form.eventEndTime.trim() || null,
  wasteMeasurementMethod: form.wasteMeasurementMethod || undefined,
  wasteBreakdown: {
   recyclablesKg: toOptionalNumber(form.wasteRecyclablesKg) ?? null,
   glassKg: toOptionalNumber(form.wasteGlassKg) ?? null,
   householdWasteKg: toOptionalNumber(form.wasteHouseholdKg) ?? null,
   otherWasteKg: toOptionalNumber(form.wasteOtherKg) ?? null,
   unusualObjects: form.wasteUnusualObjects.trim() || null,
   specialHandlingWaste: form.wasteSpecialHandlingWaste.trim() || null,
  },
 };
}

function buildCreateActionPayloadGeometryFields(
 params: CreateActionPayloadParams,
 parts: CreateActionPayloadParts,
): Partial<CreateActionPayload> {
 const hasManualGeometry = Boolean(
  parts.finalGeometry?.drawing &&
   (params.effectiveManualDrawingEnabled || parts.finalGeometry.operationalRoute || params.routePreviewDrawing),
 );
 return {
  latitude: parts.latitude ?? undefined,
  longitude: parts.longitude ?? undefined,
  preparationData: buildPreparationDataFromForm(params.form, parts.finalGeometry),
  plannerSnapshotProof: params.form.plannerProof ?? null,
  manualDrawing: hasManualGeometry ? parts.normalizedDrawing! : undefined,
  geometrySource: hasManualGeometry ? parts.resolvedManualDrawingSource : undefined,
 };
}

function buildCreateActionPayloadResult(
 params: CreateActionPayloadParams,
 parts: CreateActionPayloadParts,
): CreateActionPayload {
 return {
  ...buildCreateActionPayloadIdentityFields(params, parts),
  ...buildCreateActionPayloadMeasurementFields(params.form, parts),
  ...buildCreateActionPayloadGeometryFields(params, parts),
  photos: params.photos ?? [],
  visionEstimate: params.visionEstimate ?? null,
  userMetadata: params.userMetadata,
 } as CreateActionPayload;
}

export async function prepareCreateActionPayload(
 params: CreateActionPayloadParams,
): Promise<CreateActionPayload> {
 const payload = buildCreateActionPayload(params);
 const normalizedRoutePreview = normalizeActionDrawing(params.routePreviewDrawing);
 const finalGeometry = resolveFinalActionGeometry({
  gpxDrawing: payload.preparationData?.gpxImport ? payload.manualDrawing : null,
  gpxImport: payload.preparationData?.gpxImport,
  manualDrawing: payload.manualDrawing,
  manualDrawingSource: payload.geometrySource,
  operationalRoute: payload.preparationData?.operationalRoute,
  reconstructedDrawing: normalizedRoutePreview,
  reconstructedSource:
    params.routePreviewSource ??
    (normalizedRoutePreview?.kind === "polygon" ? "manual" : "routed"),
 });

 if (finalGeometry && (payload.manualDrawing || normalizedRoutePreview)) {
   return {
 ...payload,
 manualDrawing: finalGeometry.drawing,
 geometrySource: finalGeometry.source,
 };
 }

 // Location-only drafts stay free of derived coordinates; the server preserves geometry priority.
 return payload;
}
