import type { FormState } from "./types";

export const ACTION_DECLARATION_DRAFT_KEY = "cmm_action_draft";
export const ACTION_DECLARATION_DRAFT_DATE_KEY = "cmm_action_draft_date";

export type ActionDeclarationDraftSnapshot = {
  form: FormState;
  savedAt: string | null;
};

type DraftSnapshotCacheEntry = {
  key: string;
  snapshot: ActionDeclarationDraftSnapshot | null;
};

const FORM_STATE_KEYS = [
  "actorName",
  "associationName",
  "enterpriseName",
  "organizerAccounts",
  "participantAccounts",
  "groupJoinEnabled",
  "actionTitle",
  "shortDescription",
  "communeZoneLabel",
  "actionDate",
  "meetingTime",
  "departureTime",
  "locationLabel",
  "departureLocationLabel",
  "arrivalLocationLabel",
  "routeStyle",
  "routeAdjustmentMessage",
  "plannedObjective",
  "estimatedDifficulty",
  "accessibility",
  "safetyInstructions",
  "recommendedMaterials",
  "participantMessage",
  "creatorRole",
  "preparationState",
  "logisticsNotes",
  "checklistBeforeDeparture",
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

const ACTION_DECLARATION_DRAFT_CHANGE_EVENT = "cmm-action-declaration-draft-change";
const DRAFT_SNAPSHOT_CACHE_VERSION = "1";

let cachedDraftSnapshot: DraftSnapshotCacheEntry | null = null;

function buildDraftSnapshotCacheKey(
  fallback: FormState,
  recordTypeOverride: FormState["recordType"] | null,
  saved: string | null,
  savedAt: string | null,
): string {
  return [
    DRAFT_SNAPSHOT_CACHE_VERSION,
    saved ?? "",
    savedAt ?? "",
    JSON.stringify(fallback),
    recordTypeOverride ?? "",
  ].join("::");
}

function cacheDraftSnapshot(
  key: string,
  snapshot: ActionDeclarationDraftSnapshot | null,
): ActionDeclarationDraftSnapshot | null {
  cachedDraftSnapshot = { key, snapshot };
  return snapshot;
}

function getCachedDraftSnapshot(
  key: string,
): ActionDeclarationDraftSnapshot | null | undefined {
  if (cachedDraftSnapshot?.key === key) {
    return cachedDraftSnapshot.snapshot;
  }
  return undefined;
}

function emitDraftChange(): void {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  ) {
    return;
  }
  window.dispatchEvent(new Event(ACTION_DECLARATION_DRAFT_CHANGE_EVENT));
}

export function subscribeToDraftChanges(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === ACTION_DECLARATION_DRAFT_KEY ||
      event.key === ACTION_DECLARATION_DRAFT_DATE_KEY
    ) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ACTION_DECLARATION_DRAFT_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ACTION_DECLARATION_DRAFT_CHANGE_EVENT, callback);
  };
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTION_DECLARATION_DRAFT_KEY);
  window.localStorage.removeItem(ACTION_DECLARATION_DRAFT_DATE_KEY);
  cachedDraftSnapshot = null;
  emitDraftChange();
}

export function saveDraft(form: FormState, savedAt = new Date().toISOString()): string | null {
  if (typeof window === "undefined") return null;
  window.localStorage.setItem(ACTION_DECLARATION_DRAFT_KEY, JSON.stringify(form));
  window.localStorage.setItem(ACTION_DECLARATION_DRAFT_DATE_KEY, savedAt);
  cachedDraftSnapshot = null;
  emitDraftChange();
  return savedAt;
}

export function loadDraftSnapshot(
  fallback: FormState,
  recordTypeOverride: FormState["recordType"] | null = null,
): ActionDeclarationDraftSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = window.localStorage.getItem(ACTION_DECLARATION_DRAFT_KEY);
    const savedAt = getDraftSavedAt();
    const cacheKey = buildDraftSnapshotCacheKey(
      fallback,
      recordTypeOverride,
      saved,
      savedAt,
    );
    const cached = getCachedDraftSnapshot(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    if (!saved) {
      return cacheDraftSnapshot(cacheKey, null);
    }

    const parsed: unknown = JSON.parse(saved);
    if (!isRecord(parsed)) {
      return cacheDraftSnapshot(cacheKey, null);
    }

    const next = { ...fallback } as FormState & Record<string, string | boolean>;

    for (const key of FORM_STATE_KEYS) {
      const value = parsed[key];
      if (key === "participantAccounts") {
        if (
          Array.isArray(value) &&
          value.every((token) => typeof token === "string")
        ) {
          Object.assign(next, {
            participantAccounts: value,
          });
        }
        continue;
      }
      if (key === "groupJoinEnabled") {
        if (typeof value === "boolean") {
          Object.assign(next, { groupJoinEnabled: value });
        }
        continue;
      }

      if (typeof value === "string") {
        Object.assign(next, { [key]: value });
      }
    }

    next.routeStyle = "souple";
    if (recordTypeOverride) {
      next.recordType = recordTypeOverride;
    }

    return cacheDraftSnapshot(cacheKey, {
      form: next as FormState,
      savedAt,
    });
  } catch {
    const cacheKey = buildDraftSnapshotCacheKey(
      fallback,
      recordTypeOverride,
      null,
      null,
    );
    return cacheDraftSnapshot(cacheKey, null);
  }
}

export function loadDraft(fallback: FormState): FormState {
  return loadDraftSnapshot(fallback)?.form ?? fallback;
}
