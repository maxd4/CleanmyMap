import type { FormState } from "./types";

export const ACTION_DECLARATION_DRAFT_KEY = "cmm_action_draft";
export const ACTION_DECLARATION_DRAFT_DATE_KEY = "cmm_action_draft_date";

export type ActionDeclarationDraftSnapshot = {
  form: FormState;
  savedAt: string | null;
};

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

export function saveDraft(form: FormState, savedAt = new Date().toISOString()): string | null {
  if (typeof window === "undefined") return null;
  window.localStorage.setItem(ACTION_DECLARATION_DRAFT_KEY, JSON.stringify(form));
  window.localStorage.setItem(ACTION_DECLARATION_DRAFT_DATE_KEY, savedAt);
  return savedAt;
}

export function loadDraftSnapshot(fallback: FormState): ActionDeclarationDraftSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(ACTION_DECLARATION_DRAFT_KEY);
    if (!saved) {
      return null;
    }

    const parsed: unknown = JSON.parse(saved);
    if (!isRecord(parsed)) {
      return null;
    }

    const next = { ...fallback } as Record<keyof FormState, string>;

    for (const key of FORM_STATE_KEYS) {
      const value = parsed[key];
      if (typeof value === "string") {
        next[key] = value;
      }
    }

    next.routeStyle = "souple";

    return {
      form: next as FormState,
      savedAt: getDraftSavedAt(),
    };
  } catch {
    return null;
  }
}

export function loadDraft(fallback: FormState): FormState {
  return loadDraftSnapshot(fallback)?.form ?? fallback;
}
