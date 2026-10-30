import type { ActionDrawing } from "@/lib/actions/types";
import type { FormState } from "./types";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import { restoreDraftFields } from "./draft-storage-preparation";
import {
  hasValidGpxPair,
  isRecord,
  parseCoordinates,
  parseDrawing,
  parseGpxImport,
} from "./draft-storage-geometry";

export const ACTION_DECLARATION_DRAFT_KEY = "cmm_action_draft";
export const ACTION_DECLARATION_DRAFT_DATE_KEY = "cmm_action_draft_date";
const ACTION_DECLARATION_ACTION_DRAFT_KEY_PREFIX = `${ACTION_DECLARATION_DRAFT_KEY}:action:`;
const ACTION_DECLARATION_ACTION_DRAFT_DATE_KEY_PREFIX = `${ACTION_DECLARATION_DRAFT_DATE_KEY}:action:`;

export type ActionDeclarationDraftSnapshot = {
  form: FormState;
  savedAt: string | null;
  actionId?: string | null;
  creationRequestId?: string | null;
  manualDrawing?: ActionDrawing;
  manualDrawingSource?: "gpx_import";
};

export type ActionDeclarationDraftLoadResult = {
  snapshot: ActionDeclarationDraftSnapshot | null;
  readError: boolean;
};

export type ActionDeclarationDraftGeometry = {
  drawing: ActionDrawing;
  source: "gpx_import";
} | null;

type DraftSnapshotCacheEntry = {
  key: string;
  storageKey: string;
  snapshot: ActionDeclarationDraftSnapshot | null;
  readError: boolean;
  result: ActionDeclarationDraftLoadResult;
};

const FORM_STATE_KEYS = [
  "actorName",
  "associationName",
  "organizerType",
  "organizerId",
  "organizerName",
  "actionContext",
  "schoolContextConfirmed",
  "organizerAccounts",
  "participantAccounts",
  "groupJoinEnabled",
  "accessMode",
  "actionTitle",
  "shortDescription",
  "communeZoneLabel",
  "actionDate",
  "meetingTime",
  "departureTime",
  "locationLabel",
  "departureLocationLabel",
  "arrivalLocationLabel",
  "routeTopology",
  "routeStyle",
  "routeAdjustmentMessage",
  "plannedObjective",
  "estimatedDifficulty",
  "accessibility",
  "accessibilityStatus",
  "formalitiesContext",
  "safetyInstructions",
  "recommendedMaterials",
  "materialsProvided",
  "suggestedMaterials",
  "equipmentInventory",
  "refreshmentsProvided",
  "participantMessage",
  "logisticsNotes",
  "preparationChecklist",
  "checklistBeforeDeparture",
  "recordType",
  "latitude",
  "longitude",
  "wasteKg",
  "wasteMeasurementMethod",
  "wasteRecyclablesKg",
  "wasteGlassKg",
  "wasteHouseholdKg",
  "wasteOtherKg",
  "wasteUnusualObjects",
  "wasteSpecialHandlingWaste",
  "cigaretteButts",
  "cigaretteButtsCount",
  "cigaretteButtsInputSource",
  "cigaretteButtsCountProvenance",
  "cigaretteButtsMassProvenance",
  "cigaretteButtsVolumeProvenance",
  "cigaretteButtsConversionFormulaVersion",
  "cigaretteButtsCondition",
  "cigaretteButtsVolumeLiters",
  "volunteersCount",
  "childrenCount",
  "adultCount",
  "retiredCount",
  "durationMinutes",
  "routeTargetDistanceKm",
  "routeTargetDistanceKmManuallySet",
  "notes",
  "wasteMegotsKg",
  "wasteMegotsCondition",
  "wastePlastiqueKg",
  "wasteVerreKg",
  "wasteMetalKg",
  "wasteMixteKg",
  "triQuality",
  "placeType",
] as const satisfies readonly (keyof FormState)[];

type DraftStorageKeys = {
  storageKey: string;
  dateKey: string;
};

function resolveDraftStorageKeys(actionId: string | null): DraftStorageKeys {
  if (!actionId) {
    return {
      storageKey: ACTION_DECLARATION_DRAFT_KEY,
      dateKey: ACTION_DECLARATION_DRAFT_DATE_KEY,
    };
  }

  const encodedActionId = encodeURIComponent(actionId);
  return {
    storageKey: `${ACTION_DECLARATION_ACTION_DRAFT_KEY_PREFIX}${encodedActionId}`,
    dateKey: `${ACTION_DECLARATION_ACTION_DRAFT_DATE_KEY_PREFIX}${encodedActionId}`,
  };
}

type DraftStorageReadResult = {
  saved: string | null;
  savedAt: string | null;
  readError: boolean;
};

function readDraftStorage(actionId: string | null): DraftStorageReadResult {
  const { storageKey, dateKey } = resolveDraftStorageKeys(actionId);
  try {
    return {
      saved: window.localStorage.getItem(storageKey),
      savedAt: window.localStorage.getItem(dateKey),
      readError: false,
    };
  } catch {
    return { saved: null, savedAt: null, readError: true };
  }
}

const ACTION_DECLARATION_DRAFT_CHANGE_EVENT = "cmm-action-declaration-draft-change";
const DRAFT_SNAPSHOT_CACHE_VERSION = "1";

let cachedDraftSnapshot: DraftSnapshotCacheEntry | null = null;

function buildDraftSnapshotCacheKey(
  fallback: FormState,
  recordTypeOverride: FormState["recordType"] | null,
  saved: string | null,
  savedAt: string | null,
  actionId: string | null,
): string {
  return [
    DRAFT_SNAPSHOT_CACHE_VERSION,
    actionId ?? "",
    saved ?? "",
    savedAt ?? "",
    JSON.stringify(fallback),
    recordTypeOverride ?? "",
  ].join("::");
}

function cacheDraftSnapshot(
  key: string,
  storageKey: string,
  snapshot: ActionDeclarationDraftSnapshot | null,
  readError = false,
): ActionDeclarationDraftLoadResult {
  const result = { snapshot, readError };
  cachedDraftSnapshot = { key, storageKey, snapshot, readError, result };
  return result;
}

function getCachedDraftSnapshot(
  key: string,
): ActionDeclarationDraftSnapshot | null | undefined {
  if (cachedDraftSnapshot?.key === key) {
    return cachedDraftSnapshot.snapshot;
  }
  return undefined;
}

function getCachedDraftLoadResult(
  storageKey: string,
): ActionDeclarationDraftLoadResult | undefined {
  return cachedDraftSnapshot?.storageKey === storageKey
    ? cachedDraftSnapshot.result
    : undefined;
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

function isDraftStorageKey(key: string | null): boolean {
  return Boolean(
    key && (
      key === ACTION_DECLARATION_DRAFT_KEY ||
      key === ACTION_DECLARATION_DRAFT_DATE_KEY ||
      key.startsWith(ACTION_DECLARATION_ACTION_DRAFT_KEY_PREFIX) ||
      key.startsWith(ACTION_DECLARATION_ACTION_DRAFT_DATE_KEY_PREFIX)
    ),
  );
}

export function subscribeToDraftChanges(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (isDraftStorageKey(event.key)) callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ACTION_DECLARATION_DRAFT_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ACTION_DECLARATION_DRAFT_CHANGE_EVENT, callback);
  };
}

export function clearDraft(actionId: string | null = null): void {
  if (typeof window === "undefined") return;
  const { storageKey, dateKey } = resolveDraftStorageKeys(actionId);
  try {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(dateKey);
  } catch {
    // Clearing a local draft is best effort and must not turn a successful server save into an error.
  } finally {
    cachedDraftSnapshot = null;
    emitDraftChange();
  }
}

export function retryDraftLoad(): void {
  cachedDraftSnapshot = null;
  emitDraftChange();
}

export function createActionCreationRequestId(): string {
  const cryptoApi = globalThis.crypto;
  const randomUuid = cryptoApi?.randomUUID?.();
  if (randomUuid) return `action-create-${randomUuid}`;

  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new Error("Impossible de générer un identifiant d’action sécurisé : API crypto indisponible.");
  }

  const bytes = new Uint8Array(16);
  try {
    cryptoApi.getRandomValues(bytes);
  } catch (error) {
    throw new Error("Impossible de générer un identifiant d’action sécurisé.", { cause: error });
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return `action-create-${uuid}`;
}

function buildPersistedGpxFields(
  form: FormState,
  geometry: ActionDeclarationDraftGeometry,
): Record<string, unknown> {
  if (geometry?.source !== "gpx_import") return {};

  const gpxImport = parseGpxImport(form.gpxImport);
  const drawing = parseDrawing(geometry.drawing);
  const representativePointCount = gpxImport?.files?.flatMap((file) => file.segments)[0]?.pointCount ?? gpxImport?.pointCount;
  if (!gpxImport || !drawing || representativePointCount !== drawing.coordinates.length) {
    return {};
  }

  return {
    gpxImport,
    manualDrawing: drawing,
    manualDrawingSource: "gpx_import" as const,
  };
}

function buildDraftPayload(
  form: FormState,
  geometry: ActionDeclarationDraftGeometry,
  creationRequestId: string | null,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const key of FORM_STATE_KEYS) {
    payload[key] = form[key];
  }
  if (form.midRouteCoordinates) payload.midRouteCoordinates = form.midRouteCoordinates;
  if (form.arrivalCoordinates) payload.arrivalCoordinates = form.arrivalCoordinates;
  Object.assign(payload, buildPersistedGpxFields(form, geometry));
  if (creationRequestId) payload.creationRequestId = creationRequestId;
  return payload;
}

export function saveDraft(
  form: FormState,
  savedAt = new Date().toISOString(),
  geometry: ActionDeclarationDraftGeometry = null,
  actionId: string | null = null,
  creationRequestId: string | null = null,
): string | null {
  if (typeof window === "undefined") return null;
  const { storageKey, dateKey } = resolveDraftStorageKeys(actionId);
  if (cachedDraftSnapshot?.storageKey === storageKey && cachedDraftSnapshot.readError) {
    return null;
  }
  const draftPayload = buildDraftPayload(form, geometry, creationRequestId);

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draftPayload));
    window.localStorage.setItem(dateKey, savedAt);
    cachedDraftSnapshot = null;
    emitDraftChange();
    return savedAt;
  } catch {
    return null;
  }
}

export function loadDraftSnapshot(
  fallback: FormState,
  recordTypeOverride: FormState["recordType"] | null = null,
  actionId: string | null = null,
): ActionDeclarationDraftSnapshot | null {
  return loadDraftSnapshotResult(fallback, recordTypeOverride, actionId).snapshot;
}

function parseStoredDraft(saved: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(saved);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function restoreDraftForm(
  fallback: FormState,
  parsed: Record<string, unknown>,
  recordTypeOverride: FormState["recordType"] | null,
): {
  form: FormState;
  manualDrawing: ActionDrawing | null;
  manualDrawingSource: "gpx_import" | null;
  creationRequestId: string | null;
} {
  const next = { ...fallback } as FormState & Record<string, unknown>;
  restoreDraftFields(next, parsed, FORM_STATE_KEYS);
  next.midRouteCoordinates = parseCoordinates(parsed.midRouteCoordinates);
  next.arrivalCoordinates = parseCoordinates(parsed.arrivalCoordinates);

  const gpxImport = parseGpxImport(parsed.gpxImport);
  const manualDrawing = parseDrawing(parsed.manualDrawing);
  const completeGpxPair = hasValidGpxPair(parsed, gpxImport, manualDrawing);
  next.gpxImport = completeGpxPair ? gpxImport : null;
  if (recordTypeOverride) next.recordType = recordTypeOverride;

  next.routeStyle = "souple";
  next.routeTopology = resolveActionRouteTopology({
    topology: next.routeTopology as FormState["routeTopology"],
    arrivalLocationLabel: next.arrivalLocationLabel,
    recordType: next.recordType,
  });

  const creationRequestId =
    typeof parsed.creationRequestId === "string" && parsed.creationRequestId.trim()
      ? parsed.creationRequestId
      : null;

  return {
    form: next as FormState,
    manualDrawing: completeGpxPair ? manualDrawing : null,
    manualDrawingSource: completeGpxPair ? "gpx_import" : null,
    creationRequestId,
  };
}

export function loadDraftSnapshotResult(
  fallback: FormState,
  recordTypeOverride: FormState["recordType"] | null = null,
  actionId: string | null = null,
): ActionDeclarationDraftLoadResult {
  if (typeof window === "undefined") {
    return { snapshot: null, readError: false };
  }

  const { storageKey } = resolveDraftStorageKeys(actionId);
  const cachedReadError = getCachedDraftLoadResult(storageKey);
  if (cachedReadError?.readError) {
    return cachedReadError;
  }
  const storageRead = readDraftStorage(actionId);
  if (storageRead.readError) {
    const cacheKey = buildDraftSnapshotCacheKey(
      fallback,
      recordTypeOverride,
      null,
      null,
      actionId,
    );
    return cacheDraftSnapshot(cacheKey, storageKey, null, true);
  }

  const cacheKey = buildDraftSnapshotCacheKey(
    fallback,
    recordTypeOverride,
    storageRead.saved,
    storageRead.savedAt,
    actionId,
  );
  const cached = getCachedDraftSnapshot(cacheKey);
  if (cached !== undefined) {
    return getCachedDraftLoadResult(storageKey) ?? { snapshot: cached, readError: false };
  }
  if (!storageRead.saved) {
    return cacheDraftSnapshot(cacheKey, storageKey, null);
  }

  const parsed = parseStoredDraft(storageRead.saved);
  if (!parsed) {
    return cacheDraftSnapshot(cacheKey, storageKey, null);
  }

  const restored = restoreDraftForm(fallback, parsed, recordTypeOverride);
  return cacheDraftSnapshot(cacheKey, storageKey, {
    form: restored.form,
    savedAt: storageRead.savedAt,
    actionId,
    creationRequestId: restored.creationRequestId,
    ...(restored.manualDrawing && restored.manualDrawingSource
      ? {
          manualDrawing: restored.manualDrawing,
          manualDrawingSource: restored.manualDrawingSource,
        }
      : {}),
  });
}
