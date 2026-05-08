import type { FormState } from "./types";

export const ACTION_DECLARATION_DRAFT_KEY = "cmm_action_draft";
export const ACTION_DECLARATION_DRAFT_DATE_KEY = "cmm_action_draft_date";

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
  "recordType",
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

export function getDraftSavedAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTION_DECLARATION_DRAFT_DATE_KEY);
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTION_DECLARATION_DRAFT_KEY);
  window.localStorage.removeItem(ACTION_DECLARATION_DRAFT_DATE_KEY);
}

export function loadDraft(fallback: FormState): FormState {
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

    const next = { ...fallback } as Record<keyof FormState, string>;

    for (const key of FORM_STATE_KEYS) {
      const value = parsed[key];
      if (typeof value === "string") {
        next[key] = value;
      }
    }

    return next as FormState;
  } catch {
    return fallback;
  }
}
