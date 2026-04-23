import type { ActionDrawing, ActionMegotsCondition } from "@/lib/actions/types";
import {
  ASSOCIATION_SELECTION_OPTIONS,
} from "@/lib/actions/association-options";
import { PLACE_TYPE_OPTIONS } from "@/lib/actions/place-type-options";

export type FormState = {
  actorName: string;
  associationName: string;
  enterpriseName: string;
  actionDate: string;
  locationLabel: string;
  departureLocationLabel: string;
  arrivalLocationLabel: string;
  routeStyle: "direct" | "souple";
  routeAdjustmentMessage: string;
  latitude: string;
  longitude: string;
  wasteKg: string;
  cigaretteButts: string;
  volunteersCount: string;
  durationMinutes: string;
  notes: string;
  wasteMegotsKg: string;
  wasteMegotsCondition: ActionMegotsCondition;
  wastePlastiqueKg: string;
  wasteVerreKg: string;
  wasteMetalKg: string;
  wasteMixteKg: string;
  triQuality: "faible" | "moyenne" | "elevee";
  placeType: string;
  visionBagsCount: string;
  visionFillLevel: "" | "25" | "50" | "75" | "100";
  visionDensity: "" | "sec" | "humide_dense" | "mouille";
};

export const initialState: FormState = {
  actorName: "",
  associationName: ASSOCIATION_SELECTION_OPTIONS[0],
  enterpriseName: "",
  actionDate: new Date().toISOString().slice(0, 10),
  locationLabel: "",
  departureLocationLabel: "",
  arrivalLocationLabel: "",
  routeStyle: "souple",
  routeAdjustmentMessage: "",
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
  visionBagsCount: "",
  visionFillLevel: "",
  visionDensity: "",
};

export type SubmissionState = "idle" | "pending" | "success" | "error";
export type DeclarationMode = "quick" | "complete";

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
  if (!drawing) {
    return false;
  }
  const minPoints = drawing.kind === "polygon" ? 3 : 2;
  return drawing.coordinates.length >= minPoints;
}

export type ValidationIssue = {
  field:
    | "associationName"
    | "enterpriseName"
    | "actionDate"
    | "locationLabel"
    | "wasteKg"
    | "volunteersCount";
  message: string;
};
