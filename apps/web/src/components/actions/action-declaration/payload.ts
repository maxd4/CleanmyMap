import { appendEventRefToNotes } from "@/lib/actions/event-link";
import {
  ASSOCIATION_SELECTION_OPTIONS,
  buildEntrepriseAssociationName,
} from "@/lib/actions/association-options";
import { PLACE_TYPE_OPTIONS } from "@/lib/actions/place-type-options";
import type { ActionDrawing, CreateActionPayload } from "@/lib/actions/types";
import { computeButtsCount } from "@/lib/actions/data-contract";
import type { DeclarationMode, FormState } from "./types";

export const PARK_PLACE_TYPE = "Bois/Parc/Jardin/Square/Sentier";

export const associationOptionLabels: Record<string, string> = {
  "Action spontanee":
    "Action spontanee - benevole non rattache a une association",
  Entreprise: "Entreprise - participation dans un cadre RSE",
};

const BASE_FORM_STATE: FormState = {
  actorName: "",
  associationName: ASSOCIATION_SELECTION_OPTIONS[0],
  enterpriseName: "",
  actionDate: new Date().toISOString().slice(0, 10),
  locationLabel: "",
  latitude: "",
  longitude: "",
  wasteKg: "0",
  cigaretteButts: "0",
  volunteersCount: "1",
  durationMinutes: "60",
  notes: "",
  wasteMegotsKg: "0",
  wasteMegotsCondition: "propre",
  wastePlastiqueKg: "",
  wasteVerreKg: "",
  wasteMetalKg: "",
  wasteMixteKg: "",
  triQuality: "moyenne",
  placeType: PLACE_TYPE_OPTIONS[0],
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
  drawing: ActionDrawing | null,
): drawing is ActionDrawing {
  if (!drawing) {
    return false;
  }
  const minPoints = drawing.kind === "polygon" ? 3 : 2;
  return drawing.coordinates.length >= minPoints;
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
  const quickMode = declarationMode === "quick";

  const fallbackLatitude = toOptionalNumber(form.latitude);
  const fallbackLongitude = toOptionalNumber(form.longitude);

  let latitude = fallbackLatitude;
  let longitude = fallbackLongitude;

  if (effectiveManualDrawingEnabled && drawingIsValid && manualDrawing) {
    const centroid = getDrawingCentroid(manualDrawing);
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
    locationLabel: form.locationLabel.trim(),
    latitude: quickMode ? undefined : latitude,
    longitude: quickMode ? undefined : longitude,
    wasteKg: toRequiredNumber(form.wasteKg, 0),
    cigaretteButts: quickMode
      ? 0
      : computeButtsCount(
          toRequiredNumber(form.wasteMegotsKg, 0),
          form.wasteMegotsCondition,
        ),
    volunteersCount: Math.max(
      1,
      Math.trunc(toRequiredNumber(form.volunteersCount, 1)),
    ),
    durationMinutes: quickMode
      ? 0
      : Math.max(0, Math.trunc(toRequiredNumber(form.durationMinutes, 0))),
    notes: appendEventRefToNotes(
      quickMode ? undefined : form.notes.trim() || undefined,
      linkedEventId,
    ),
    manualDrawing:
      effectiveManualDrawingEnabled && drawingIsValid && manualDrawing
        ? manualDrawing
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
  };
}
