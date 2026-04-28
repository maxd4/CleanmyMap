import type { FormState } from "./types";

export const ACTION_DECLARATION_DRAFT_KEY = "cmm_action_draft";

const FORM_STATE_KEYS = [
  "actorName",
  "associationName",
  "enterpriseName",
  "actionDate",
  "locationLabel",
  "departureLocationLabel",
  "arrivalLocationLabel",
  "routeStyle",
  "routeAdjustmentMessage",
  "latitude",
  "longitude",
  "wasteKg",
  "cigaretteButts",
  "cigaretteButtsCount",
  "cigaretteButtsCondition",
  "volunteersCount",
  "durationMinutes",
  "notes",
  "wasteMegotsKg",
  "wasteMegotsCondition",
  "wastePlastiqueKg",
  "wasteVerreKg",
  "wasteMetalKg",
  "wasteMixteKg",
  "triQuality",
  "placeType",
  "visionBagsCount",
  "visionFillLevel",
  "visionDensity",
] as const satisfies readonly (keyof FormState)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function hydrateActionDeclarationDraft(fallback: FormState): FormState {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const saved = window.localStorage.getItem(ACTION_DECLARATION_DRAFT_KEY);
    if (!saved) {
      return fallback;
    }

    const parsed: unknown = JSON.parse(saved);
    if (!isRecord(parsed)) {
      return fallback;
    }

    const next = { ...fallback };

    for (const key of FORM_STATE_KEYS) {
      const value = parsed[key];
      if (typeof value === "string") {
        next[key] = value;
      }
    }

    return next;
  } catch {
    return fallback;
  }
}
