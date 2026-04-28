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
 ActionVisionEstimate,
 CreateActionPayload,
} from"../../../lib/actions/types";
import { computeButtsCount } from"../../../lib/actions/data-contract";
import type { DeclarationMode, FormState } from"./types";
import { normalizeActionDrawing } from"../map/actions-map-geometry.utils";

export const PARK_PLACE_TYPE ="Bois/Parc/Jardin/Square/Sentier";

export const associationOptionLabels: Record<string, string> = {
  "Action spontanée":
    "Action spontanée - bénévole non rattaché à une association",
  Entreprise: "Entreprise - participation dans un cadre RSE",
};

const BASE_FORM_STATE: FormState = {
 actorName:"",
 associationName: ASSOCIATION_SELECTION_OPTIONS[0],
 enterpriseName:"",
 actionDate: new Date().toISOString().slice(0, 10),
 locationLabel:"",
 departureLocationLabel:"",
 arrivalLocationLabel:"",
 routeStyle:"souple",
 routeAdjustmentMessage:"",
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

export function createInitialFormState(actorName: string): FormState {
 return { ...BASE_FORM_STATE, actorName };
}

export function getFormResetState(previous: FormState): FormState {
 return {
 ...BASE_FORM_STATE,
 actorName: previous.actorName,
 associationName: previous.associationName,
 actionDate: previous.actionDate,
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
 const quickMode = declarationMode ==="quick";

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
 : form.associationName;

 return {
 actorName: form.actorName.trim() || undefined,
 associationName,
 actionDate: form.actionDate,
 locationLabel: routeLocationLabel,
 departureLocationLabel: departureLocationLabel || undefined,
 arrivalLocationLabel: arrivalLocationLabel || undefined,
 routeStyle: form.routeStyle,
 routeAdjustmentMessage: form.routeAdjustmentMessage.trim() || undefined,
 latitude: quickMode ? undefined : latitude,
 longitude: quickMode ? undefined : longitude,
 wasteKg: toRequiredNumber(form.wasteKg, 0),
 cigaretteButts: quickMode
 ? 0
 : computeButtsCount(
 toRequiredNumber(form.wasteMegotsKg, 0),
 form.wasteMegotsCondition,
 ),
 cigaretteButtsCount: toOptionalNumber(form.cigaretteButtsCount),
 volunteersCount: Math.max(
 1,
 Math.trunc(toRequiredNumber(form.volunteersCount, 1)),
 ),
 durationMinutes: quickMode
 ? 0
 : Math.max(0, Math.trunc(toRequiredNumber(form.durationMinutes, 0))),
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
 wasteBreakdown: quickMode
 ? undefined
 : {
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
