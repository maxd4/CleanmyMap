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
  manualDrawing?: ActionDrawing;
  manualDrawingSource?: "gpx_import";
};

export type ActionDeclarationDraftGeometry = {
  drawing: ActionDrawing;
  source: "gpx_import";
} | null;

type DraftSnapshotCacheEntry = {
  key: string;
  snapshot: ActionDeclarationDraftSnapshot | null;
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
  window.localStorage.removeItem(scopedDraftKey(actionId));
  window.localStorage.removeItem(scopedDraftDateKey(actionId));
  cachedDraftSnapshot = null;
  emitDraftChange();
}

export function saveDraft(
  form: FormState,
  savedAt = new Date().toISOString(),
  geometry: ActionDeclarationDraftGeometry = null,
  actionId: string | null = null,
): string | null {
  if (typeof window === "undefined") return null;
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

  try {
    window.localStorage.setItem(scopedDraftKey(actionId), JSON.stringify(draftPayload));
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
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storageKey = scopedDraftKey(actionId);
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
      return cached;
    }

    if (!saved) {
      return cacheDraftSnapshot(cacheKey, null);
    }

    const parsed: unknown = JSON.parse(saved);
    if (!isRecord(parsed)) {
      return cacheDraftSnapshot(cacheKey, null);
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

    return cacheDraftSnapshot(cacheKey, {
      form: next as FormState,
      savedAt,
      actionId,
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
    return cacheDraftSnapshot(cacheKey, null);
  }
}
