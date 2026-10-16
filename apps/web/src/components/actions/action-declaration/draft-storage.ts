import type {
  ActionDrawing,
  ActionGpxImportMetadata,
  ActionLocationCoordinates,
} from "@/lib/actions/types";
import type { FormState } from "./types";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";
import { restoreDraftFields } from "./draft-storage-preparation";

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

function parseCoordinates(value: unknown): ActionLocationCoordinates | null {
  if (!isRecord(value)) return null;
  const latitude = value.latitude;
  const longitude = value.longitude;
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
    ? { latitude, longitude }
    : null;
}

function parseDrawing(value: unknown): ActionDrawing | null {
  if (!isRecord(value) || (value.kind !== "polyline" && value.kind !== "polygon") || !Array.isArray(value.coordinates)) {
    return null;
  }
  const coordinates = value.coordinates.filter(
    (coordinate): coordinate is [number, number] =>
      Array.isArray(coordinate) && coordinate.length === 2 &&
      typeof coordinate[0] === "number" && Number.isFinite(coordinate[0]) && coordinate[0] >= -90 && coordinate[0] <= 90 &&
      typeof coordinate[1] === "number" && Number.isFinite(coordinate[1]) && coordinate[1] >= -180 && coordinate[1] <= 180,
  );
  const minimumPoints = value.kind === "polygon" ? 3 : 2;
  return coordinates.length === value.coordinates.length && coordinates.length >= minimumPoints
    ? { kind: value.kind, coordinates }
    : null;
}

function parseGpxImport(value: unknown): ActionGpxImportMetadata | null {
  if (!isRecord(value) || value.source !== "gpx_import") return null;
  if (
    typeof value.observedDistanceKm !== "number" || !Number.isFinite(value.observedDistanceKm) || value.observedDistanceKm < 0 ||
    typeof value.pointCount !== "number" || !Number.isInteger(value.pointCount) || value.pointCount < 2 ||
    (value.inferredTopology !== "loop" && value.inferredTopology !== "point_to_point")
  ) {
    return null;
  }
  return {
    source: "gpx_import",
    observedDistanceKm: value.observedDistanceKm,
    pointCount: value.pointCount,
    inferredTopology: value.inferredTopology,
    ...(typeof value.fileName === "string" ? { fileName: value.fileName } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function scopedDraftKey(actionId: string | null): string {
  return actionId
    ? `${ACTION_DECLARATION_ACTION_DRAFT_KEY_PREFIX}${encodeURIComponent(actionId)}`
    : ACTION_DECLARATION_DRAFT_KEY;
}

function scopedDraftDateKey(actionId: string | null): string {
  return actionId
    ? `${ACTION_DECLARATION_ACTION_DRAFT_DATE_KEY_PREFIX}${encodeURIComponent(actionId)}`
    : ACTION_DECLARATION_DRAFT_DATE_KEY;
}

function getDraftSavedAtForAction(actionId: string | null): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(scopedDraftDateKey(actionId));
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

export function subscribeToDraftChanges(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === ACTION_DECLARATION_DRAFT_KEY ||
      event.key === ACTION_DECLARATION_DRAFT_DATE_KEY ||
      event.key?.startsWith(ACTION_DECLARATION_ACTION_DRAFT_KEY_PREFIX) ||
      event.key?.startsWith(ACTION_DECLARATION_ACTION_DRAFT_DATE_KEY_PREFIX)
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

export function clearDraft(actionId: string | null = null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(scopedDraftKey(actionId));
    window.localStorage.removeItem(scopedDraftDateKey(actionId));
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
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `action-create-${randomUuid}`;
  return `action-create-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function saveDraft(
  form: FormState,
  savedAt = new Date().toISOString(),
  geometry: ActionDeclarationDraftGeometry = null,
  actionId: string | null = null,
  creationRequestId: string | null = null,
): string | null {
  if (typeof window === "undefined") return null;
  const storageKey = scopedDraftKey(actionId);
  if (cachedDraftSnapshot?.storageKey === storageKey && cachedDraftSnapshot.readError) {
    return null;
  }
  const draftPayload: Record<string, unknown> = {};
  for (const key of FORM_STATE_KEYS) {
    draftPayload[key] = form[key];
  }
  if (form.midRouteCoordinates) draftPayload.midRouteCoordinates = form.midRouteCoordinates;
  if (form.arrivalCoordinates) draftPayload.arrivalCoordinates = form.arrivalCoordinates;

  const gpxImport = parseGpxImport(form.gpxImport);
  const drawing = geometry?.source === "gpx_import" ? parseDrawing(geometry.drawing) : null;
  if (gpxImport && drawing && gpxImport.pointCount === drawing.coordinates.length) {
    draftPayload.gpxImport = gpxImport;
    draftPayload.manualDrawing = drawing;
    draftPayload.manualDrawingSource = "gpx_import";
  }
  if (creationRequestId) draftPayload.creationRequestId = creationRequestId;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draftPayload));
    window.localStorage.setItem(scopedDraftDateKey(actionId), savedAt);
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

export function loadDraftSnapshotResult(
  fallback: FormState,
  recordTypeOverride: FormState["recordType"] | null = null,
  actionId: string | null = null,
): ActionDeclarationDraftLoadResult {
  if (typeof window === "undefined") {
    return { snapshot: null, readError: false };
  }

  const storageKey = scopedDraftKey(actionId);
  const cachedReadError = getCachedDraftLoadResult(storageKey);
  if (cachedReadError?.readError) {
    return cachedReadError;
  }
  try {
    const saved = window.localStorage.getItem(storageKey);
    const savedAt = getDraftSavedAtForAction(actionId);
    const cacheKey = buildDraftSnapshotCacheKey(
      fallback,
      recordTypeOverride,
      saved,
      savedAt,
      actionId,
    );
    const cached = getCachedDraftSnapshot(cacheKey);
    if (cached !== undefined) {
      return getCachedDraftLoadResult(storageKey) ?? { snapshot: cached, readError: false };
    }

    if (!saved) {
      return cacheDraftSnapshot(cacheKey, storageKey, null);
    }

    const parsed: unknown = JSON.parse(saved);
    if (!isRecord(parsed)) {
      return cacheDraftSnapshot(cacheKey, storageKey, null);
    }

    const next = { ...fallback } as FormState & Record<string, unknown>;

    restoreDraftFields(next, parsed, FORM_STATE_KEYS);

    next.midRouteCoordinates = parseCoordinates(parsed.midRouteCoordinates);
    next.arrivalCoordinates = parseCoordinates(parsed.arrivalCoordinates);
    const gpxImport = parseGpxImport(parsed.gpxImport);
    const manualDrawing = parseDrawing(parsed.manualDrawing);
    const hasGpxPair = Boolean(
      gpxImport &&
        manualDrawing &&
        parsed.manualDrawingSource === "gpx_import" &&
        gpxImport.pointCount === manualDrawing.coordinates.length,
    );
    next.gpxImport = hasGpxPair ? gpxImport : null;

    if (recordTypeOverride) {
      next.recordType = recordTypeOverride;
    }
    next.routeStyle = "souple";
    next.routeTopology = resolveActionRouteTopology({
      topology: next.routeTopology as FormState["routeTopology"],
      arrivalLocationLabel: next.arrivalLocationLabel,
      recordType: next.recordType,
    });

    return cacheDraftSnapshot(cacheKey, storageKey, {
      form: next as FormState,
      savedAt,
      actionId,
      creationRequestId:
        typeof parsed.creationRequestId === "string" && parsed.creationRequestId.trim()
          ? parsed.creationRequestId
          : null,
      ...(hasGpxPair && manualDrawing
        ? { manualDrawing, manualDrawingSource: "gpx_import" as const }
        : {}),
    });
  } catch {
    const cacheKey = buildDraftSnapshotCacheKey(
      fallback,
      recordTypeOverride,
      null,
      null,
      actionId,
    );
    return cacheDraftSnapshot(cacheKey, storageKey, null, true);
  }
}
