import type { ActionDrawing, ActionMegotsCondition } from"@/lib/actions/types";
import {
 ASSOCIATION_SELECTION_OPTIONS,
} from"@/lib/actions/association-options";
import { PLACE_TYPE_OPTIONS } from"@/lib/actions/place-type-options";
import { normalizeActionDrawing } from"./map/actions-map-geometry.utils";

export type FormState = {
 actorName: string;
 associationName: string;
 enterpriseName: string;
 actionDate: string;
 locationLabel: string;
 departureLocationLabel: string;
 arrivalLocationLabel: string;
 routeStyle:"direct" |"souple";
 routeAdjustmentMessage: string;
 latitude: string;
 longitude: string;
 wasteKg: string;
 cigaretteButts: string;
 cigaretteButtsCount: string; // Nouveau champ pour le nombre de mégots
 cigaretteButtsCondition: ActionMegotsCondition; // État des mégots pour conversion
 volunteersCount: string;
 durationMinutes: string;
 notes: string;
 wasteMegotsKg: string;
 wasteMegotsCondition: ActionMegotsCondition;
 wastePlastiqueKg: string;
 wasteVerreKg: string;
 wasteMetalKg: string;
 wasteMixteKg: string;
 triQuality:"faible" |"moyenne" |"elevee";
 placeType: string;
 visionBagsCount: string;
 visionFillLevel:"" |"25" |"50" |"75" |"100";
 visionDensity:"" |"sec" |"humide_dense" |"mouille";
};

export const initialState: FormState = {
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

export type SubmissionState ="idle" |"pending" |"success" |"error";
export type DeclarationMode ="quick" |"complete";

export type PostActionRetentionLoop = {
 summary: string;
 badge: string;
 share: {
 text: string;
 url: string;
 };
 nextActionSuggestion: string;
};

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

export function getDrawingCentroid(drawing: ActionDrawing): {
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
 drawing: ActionDrawing | null,
): drawing is ActionDrawing {
 return normalizeActionDrawing(drawing) !== null;
}

export type ValidationIssue = {
 field:
 |"associationName"
 |"enterpriseName"
 |"actionDate"
 |"locationLabel"
 |"manualDrawing"
 |"wasteKg"
 |"volunteersCount"
 |"durationMinutes";
 message: string;
};

// Constantes de conversion mégots -> masse (en grammes)
const CIGARETTE_BUTT_WEIGHTS = {
 propre: 0.2, // Mégot sec
 humide: 0.4, // Mégot humide
 mouille: 0.6, // Mégot mouillé
} as const;

// Fonction de conversion nombre de mégots -> masse en kg
export function convertCigaretteButtsToKg(
 count: number,
 condition: ActionMegotsCondition,
): number {
 const weightPerButt = CIGARETTE_BUTT_WEIGHTS[condition];
 return (count * weightPerButt) / 1000; // Conversion grammes -> kg
}
