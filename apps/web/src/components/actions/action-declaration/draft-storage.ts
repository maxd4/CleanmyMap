import type {
  ActionDrawing,
  ActionGpxImportMetadata,
  ActionLocationCoordinates,
} from "@/lib/actions/types";
import type { FormState } from "./types";
import { resolveActionRouteTopology } from "@/lib/actions/route-topology";

export const ACTION_DECLARATION_DRAFT_KEY = "cmm_action_draft";
export const ACTION_DECLARATION_DRAFT_DATE_KEY = "cmm_action_draft_date";

export type ActionDeclarationDraftSnapshot = {
  form: FormState;
  savedAt: string | null;
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
  "routeTopology",
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
  "visionBagsCount",
  "visionFillLevel",
  "visionDensity",
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

export function saveDraft(
  form: FormState,
  savedAt = new Date().toISOString(),
  geometry: ActionDeclarationDraftGeometry = null,
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

  window.localStorage.setItem(ACTION_DECLARATION_DRAFT_KEY, JSON.stringify(draftPayload));
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
      if (key === "routeTargetDistanceKmManuallySet") {
        if (typeof value === "boolean") {
          Object.assign(next, { routeTargetDistanceKmManuallySet: value });
        }
        continue;
      }

      if (typeof value === "string") {
        Object.assign(next, { [key]: value });
      }
    }

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
    );
    return cacheDraftSnapshot(cacheKey, null);
  }
}

export function loadDraft(fallback: FormState): FormState {
  return loadDraftSnapshot(fallback)?.form ?? fallback;
}
