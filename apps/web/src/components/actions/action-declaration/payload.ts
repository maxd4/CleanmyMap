import { appendEventRefToNotes } from"../../../lib/actions/event-link";
import {
 ASSOCIATION_SELECTION_OPTIONS,
 buildEntrepriseAssociationName,
} from"../../../lib/actions/association-options";
import { PLACE_TYPE_OPTIONS } from"../../../lib/actions/place-type-options";
import { deriveAutoDrawingFromLocation } from"@/lib/actions/route-geometry";
import type {
 ActionDrawing,
 ActionPhotoAsset,
 ActionPreparationData,
 ActionVisionEstimate,
 CreateActionPayload,
} from"../../../lib/actions/types";
import { computeButtsCount } from"../../../lib/actions/impact-calculators";
import type { DeclarationMode, FormState } from"./types";
import { normalizeActionDrawing } from"../map/actions-map-geometry.utils";

export const PARK_PLACE_TYPE ="Bois/Parc/Jardin/Square/Sentier";
export const OTHER_VOLUNTEER_ASSOCIATION_VALUE = "__autre_benevole__";

export const associationOptionLabels: Record<string, string> = {
  "Action spontanée":
    "Action spontanée - bénévole non rattaché à une association",
  Entreprise: "Entreprise - participation dans un cadre RSE",
};

export function parseOrganizerAccounts(input: string): string[] {
 return [...new Set(
 input
 .split(/[,;\n]+/)
 .map((token) => token.trim())
 .map((token) => token.replace(/^@+/, ""))
 .filter((token) => token.length > 0),
 )];
}

const BASE_FORM_STATE: FormState = {
 actorName:"",
 associationName: ASSOCIATION_SELECTION_OPTIONS[0],
 enterpriseName:"",
 organizerAccounts:"",
 groupJoinEnabled: true,
 actionTitle:"",
 shortDescription:"",
 communeZoneLabel:"",
 actionDate: new Date().toISOString().slice(0, 10),
 meetingTime:"",
 departureTime:"",
 locationLabel:"",
 departureLocationLabel:"",
 arrivalLocationLabel:"",
 routeStyle:"souple",
 routeAdjustmentMessage:"",
 plannedObjective:"nettoyage",
 estimatedDifficulty:"moderee",
 accessibility:"",
 safetyInstructions:"",
 recommendedMaterials:"",
 participantMessage:"",
 creatorRole:"organisateur",
 preparationState:"brouillon",
 logisticsNotes:"",
 checklistBeforeDeparture:"",
 recordType:"action",
 latitude:"",
 longitude:"",
 wasteKg:"0",
 cigaretteButts:"0",
 cigaretteButtsCount:"", // Optionnel par défaut
 cigaretteButtsCondition:"propre", // État par défaut
 volunteersCount:"1",
 durationMinutes:"60",
 notes:"",
 wasteMegotsKg:"0",
 wasteMegotsCondition:"propre",
 wastePlastiqueKg:"",
 wasteVerreKg:"",
 wasteMetalKg:"",
 wasteMixteKg:"",
 triQuality:"moyenne",
 placeType: PLACE_TYPE_OPTIONS[0],
 visionBagsCount:"",
 visionFillLevel:"",
 visionDensity:"",
};

export function createInitialFormState(
 actorName: string,
 recordType: FormState["recordType"] = "action",
): FormState {
 return { ...BASE_FORM_STATE, actorName, recordType };
}

export function buildPreparationDataFromForm(
 form: FormState,
): ActionPreparationData {
 return {
  actionTitle: form.actionTitle.trim() || undefined,
  shortDescription: form.shortDescription.trim() || undefined,
  communeZoneLabel: form.communeZoneLabel.trim() || undefined,
  pointDeRendezVous: form.departureLocationLabel.trim() || undefined,
  zoneCiblePrevue: form.arrivalLocationLabel.trim() || undefined,
  actionDate: form.actionDate.trim() || undefined,
  meetingTime: form.meetingTime.trim() || undefined,
  departureTime: form.departureTime.trim() || undefined,
  estimatedDurationMinutes: toOptionalNumber(form.durationMinutes),
  plannedObjective: form.plannedObjective,
  placeType: form.placeType || undefined,
  estimatedDifficulty: form.estimatedDifficulty,
  accessibility: form.accessibility.trim() || undefined,
  safetyInstructions: form.safetyInstructions.trim() || undefined,
  recommendedMaterials: form.recommendedMaterials.trim() || undefined,
  participantMessage: form.participantMessage.trim() || undefined,
  creatorRole: form.creatorRole,
  preparationState: form.preparationState,
  logisticsNotes: form.logisticsNotes.trim() || undefined,
  checklistBeforeDeparture: form.checklistBeforeDeparture.trim() || undefined,
  volunteersExpected: toOptionalNumber(form.volunteersCount),
  groupJoinEnabled: form.groupJoinEnabled,
 };
}

export function applyPreparationDataToForm(
 form: FormState,
 preparationData: ActionPreparationData | null | undefined,
): FormState {
 if (!preparationData) {
  return form;
 }

 return {
  ...form,
  actionTitle: preparationData.actionTitle ?? form.actionTitle,
  shortDescription: preparationData.shortDescription ?? form.shortDescription,
  communeZoneLabel: preparationData.communeZoneLabel ?? form.communeZoneLabel,
  departureLocationLabel:
   preparationData.pointDeRendezVous ?? form.departureLocationLabel,
  arrivalLocationLabel: preparationData.zoneCiblePrevue ?? form.arrivalLocationLabel,
  actionDate: preparationData.actionDate ?? form.actionDate,
  meetingTime: preparationData.meetingTime ?? form.meetingTime,
  departureTime: preparationData.departureTime ?? form.departureTime,
  durationMinutes:
   typeof preparationData.estimatedDurationMinutes === "number"
    ? String(preparationData.estimatedDurationMinutes)
    : form.durationMinutes,
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
  groupJoinEnabled:
   typeof preparationData.groupJoinEnabled === "boolean"
    ? preparationData.groupJoinEnabled
    : form.groupJoinEnabled,
 };
}

export function getFormResetState(previous: FormState): FormState {
 return {
 ...BASE_FORM_STATE,
 actorName: previous.actorName,
 associationName: previous.associationName,
 organizerAccounts: previous.organizerAccounts,
 actionDate: previous.actionDate,
 recordType: previous.recordType,
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

export function buildCreateActionPayload(params: {
 form: FormState;
 declarationMode: DeclarationMode;
 effectiveManualDrawingEnabled: boolean;
 drawingIsValid: boolean;
 manualDrawing: ActionDrawing | null;
 isEntrepriseMode: boolean;
 linkedEventId?: string;
 photos?: ActionPhotoAsset[];
 visionEstimate?: ActionVisionEstimate | null;
 userMetadata?: {
 userId: string;
 username?: string;
 displayName?: string;
 email?: string;
 };
}): CreateActionPayload {
 const {
 form,
 declarationMode,
 effectiveManualDrawingEnabled,
 drawingIsValid,
 manualDrawing,
 isEntrepriseMode,
 linkedEventId,
 } = params;
 const departureLocationLabel = form.departureLocationLabel.trim();
 const arrivalLocationLabel = form.arrivalLocationLabel.trim();
 const routeLocationLabel =
 departureLocationLabel && arrivalLocationLabel
 ? `${departureLocationLabel} → ${arrivalLocationLabel}`
 : departureLocationLabel || form.locationLabel.trim();

 const fallbackLatitude = toOptionalNumber(form.latitude);
 const fallbackLongitude = toOptionalNumber(form.longitude);

 let latitude = fallbackLatitude;
 let longitude = fallbackLongitude;

 const normalizedManualDrawing = normalizeActionDrawing(manualDrawing);

 if (effectiveManualDrawingEnabled && drawingIsValid && normalizedManualDrawing) {
 const centroid = getDrawingCentroid(normalizedManualDrawing);
 latitude = centroid.latitude;
 longitude = centroid.longitude;
 }

 const associationName = isEntrepriseMode
 ? buildEntrepriseAssociationName(form.enterpriseName)
 : form.associationName === OTHER_VOLUNTEER_ASSOCIATION_VALUE
 ? "Action spontanée"
 : form.associationName;
 const isSpontaneousAction = associationName === "Action spontanée";
 const enteredButtsCount = toOptionalNumber(form.cigaretteButtsCount);
 const estimatedButtsFromWeight =
 toOptionalNumber(form.wasteMegotsKg) && toRequiredNumber(form.wasteMegotsKg, 0) > 0
 ? computeButtsCount(
 toRequiredNumber(form.wasteMegotsKg, 0),
 form.wasteMegotsCondition,
 )
 : undefined;

 return {
    actorName: form.actorName.trim() || undefined,
    associationName,
    groupJoinEnabled: form.groupJoinEnabled,
    actionPhase: declarationMode === "quick" ? "pre_action" : "post_action_complete",
    preparationData: buildPreparationDataFromForm(form),
    organizerAccounts: isSpontaneousAction
   ? undefined
   : (() => {
     const tokens = parseOrganizerAccounts(form.organizerAccounts);
     return tokens.length > 0 ? tokens : undefined;
   })(),
 actionDate: form.actionDate,
 locationLabel: routeLocationLabel,
 departureLocationLabel: departureLocationLabel || undefined,
 arrivalLocationLabel: arrivalLocationLabel || undefined,
 routeStyle: "souple",
 routeAdjustmentMessage: form.routeAdjustmentMessage.trim() || undefined,
 recordType: form.recordType,
 latitude,
 longitude,
 wasteKg: toRequiredNumber(form.wasteKg, 0),
 cigaretteButts: enteredButtsCount ?? estimatedButtsFromWeight ?? 0,
 cigaretteButtsCount: enteredButtsCount ?? estimatedButtsFromWeight,
 volunteersCount: Math.trunc(toRequiredNumber(form.volunteersCount, 0)),
 durationMinutes: Math.max(0, Math.trunc(toRequiredNumber(form.durationMinutes, 0))),
 notes: appendEventRefToNotes(
 form.notes.trim() || undefined,
 linkedEventId,
 ),
 manualDrawing:
 effectiveManualDrawingEnabled && drawingIsValid && normalizedManualDrawing
 ? normalizedManualDrawing
 : undefined,
 placeType: form.placeType,
 submissionMode: declarationMode,
 wasteBreakdown: {
 megotsKg: toOptionalNumber(form.wasteMegotsKg),
 megotsCondition: form.wasteMegotsCondition,
 plastiqueKg: toOptionalNumber(form.wastePlastiqueKg),
 verreKg: toOptionalNumber(form.wasteVerreKg),
 metalKg: toOptionalNumber(form.wasteMetalKg),
 mixteKg: toOptionalNumber(form.wasteMixteKg),
 triQuality: form.triQuality,
 },
 photos: params.photos ?? [],
 visionEstimate: params.visionEstimate ?? null,
 userMetadata: params.userMetadata,
 };
}

export async function prepareCreateActionPayload(params: {
 form: FormState;
 declarationMode: DeclarationMode;
 effectiveManualDrawingEnabled: boolean;
 drawingIsValid: boolean;
 manualDrawing: ActionDrawing | null;
 routePreviewDrawing?: ActionDrawing | null;
 isEntrepriseMode: boolean;
 linkedEventId?: string;
 photos?: ActionPhotoAsset[];
 visionEstimate?: ActionVisionEstimate | null;
 userMetadata?: {
 userId: string;
 username?: string;
 displayName?: string;
 email?: string;
 };
}): Promise<CreateActionPayload> {
 const payload = buildCreateActionPayload(params);

 if (payload.manualDrawing) {
 return payload;
 }

 const normalizedRoutePreview = normalizeActionDrawing(params.routePreviewDrawing);
 if (normalizedRoutePreview) {
 return {
 ...payload,
 manualDrawing: normalizedRoutePreview,
 };
 }

 const derivedDrawing = await deriveAutoDrawingFromLocation({
 locationLabel: payload.locationLabel,
 departureLocationLabel: payload.departureLocationLabel,
 arrivalLocationLabel: payload.arrivalLocationLabel,
 routeStyle: payload.routeStyle,
 });

 if (!derivedDrawing) {
 return payload;
 }

 return {
 ...payload,
 manualDrawing: derivedDrawing,
 };
}
