import {
  ActionRecordType,
  ActionStatus,
  ActionSubmissionMode,
  ActionWasteBreakdown,
  ActionPhotoAsset,
  ActionVisionEstimate,
  ActionDrawing,
  ActionGeometryKind,
  ActionGeometrySource,
  ActionGeometryOrigin,
} from "./types";
import {
  buildPersistedGeometryFromStoredFields,
  type PersistedDerivedGeometry,
} from "./derived-geometry";

export type ActionEntityType = ActionRecordType;

export type ActionDataLocation = {
  label: string;
  latitude: number | null;
  longitude: number | null;
};

export type ActionDataGeometry = {
  kind: ActionGeometryKind;
  coordinates: [number, number][];
  geojson: string | null;
  confidence: number | null;
  geometrySource: ActionGeometrySource;
  origin: ActionGeometryOrigin;
};

export type ActionDataDates = {
  observedAt: string;
  createdAt: string | null;
  importedAt: string | null;
  validatedAt: string | null;
};

export type ActionDataMetadata = {
  actorName: string | null;
  associationName: string | null;
  placeType: string | null;
  departureLocationLabel: string | null;
  arrivalLocationLabel: string | null;
  routeStyle: "direct" | "souple" | null;
  routeAdjustmentMessage: string | null;
  notes: string | null;
  notesPlain: string | null;
  submissionMode: ActionSubmissionMode | null;
  wasteBreakdown: ActionWasteBreakdown | null;
  photos: ActionPhotoAsset[] | null;
  visionEstimate: ActionVisionEstimate | null;
  wasteKg: number;
  cigaretteButts: number;
  volunteersCount: number;
  durationMinutes: number;
  manualDrawing: ActionDrawing | null;
};

export type ActionDataContract = {
  id: string;
  type: ActionEntityType;
  status: ActionStatus;
  source: string;
  createdByClerkId?: string | null;
  location: ActionDataLocation;
  geometry: ActionDataGeometry;
  dates: ActionDataDates;
  metadata: ActionDataMetadata;
};

export type BuildActionContractParams = {
  id: string;
  type: ActionEntityType;
  status: ActionStatus;
  source: string;
  createdByClerkId?: string | null;
  observedAt: string;
  createdAt?: string | null;
  importedAt?: string | null;
  validatedAt?: string | null;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  wasteKg?: number | null;
  cigaretteButts?: number | null;
  volunteersCount?: number | null;
  durationMinutes?: number | null;
  actorName?: string | null;
  associationName?: string | null;
  placeType?: string | null;
  departureLocationLabel?: string | null;
  arrivalLocationLabel?: string | null;
  routeStyle?: "direct" | "souple" | null;
  routeAdjustmentMessage?: string | null;
  notes?: string | null;
  notesPlain?: string | null;
  submissionMode?: ActionSubmissionMode | null;
  wasteBreakdown?: ActionWasteBreakdown | null;
  photos?: ActionPhotoAsset[] | null;
  visionEstimate?: ActionVisionEstimate | null;
  manualDrawing?: ActionDrawing | null;
  manualDrawingGeoJson?: string | null;
  derivedGeometryKind?: ActionGeometryKind | null;
  derivedGeometryGeoJson?: string | null;
  geometryConfidence?: number | null;
  geometrySource?: ActionGeometrySource | null;
};

function toFiniteNumber(
  value: number | null | undefined,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return value;
}

function normalizeObservedDate(raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

/**
 * Construit un objet ActionDataContract standardisé à partir de données brutes (souvent issues de Supabase).
 */
export function buildActionDataContract(
  params: BuildActionContractParams,
): ActionDataContract {
  const manualDrawing = params.manualDrawing ?? null;
  const latitude =
    params.latitude === null || params.latitude === undefined
      ? null
      : toFiniteNumber(params.latitude, 0);
  const longitude =
    params.longitude === null || params.longitude === undefined
      ? null
      : toFiniteNumber(params.longitude, 0);

  const persistedGeometry: PersistedDerivedGeometry =
    buildPersistedGeometryFromStoredFields({
      derivedGeometryKind: params.derivedGeometryKind ?? null,
      derivedGeometryGeoJson: params.derivedGeometryGeoJson ?? null,
      geometrySource: params.geometrySource ?? null,
      geometryConfidence: params.geometryConfidence ?? null,
      manualDrawing,
      manualDrawingGeoJson: params.manualDrawingGeoJson ?? null,
      latitude,
      longitude,
      locationLabel: params.locationLabel,
      departureLocationLabel: params.departureLocationLabel ?? null,
      arrivalLocationLabel: params.arrivalLocationLabel ?? null,
      routeStyle: params.routeStyle ?? null,
    });

  return {
    id: params.id,
    type: params.type,
    status: params.status,
    source: params.source,
    createdByClerkId: params.createdByClerkId ?? null,
    location: {
      label: params.locationLabel,
      latitude,
      longitude,
    },
    geometry: persistedGeometry,
    dates: {
      observedAt: normalizeObservedDate(params.observedAt),
      createdAt: params.createdAt ?? null,
      importedAt: params.importedAt ?? null,
      validatedAt: params.validatedAt ?? null,
    },
    metadata: {
      actorName: params.actorName ?? null,
      associationName: params.associationName ?? null,
      placeType: params.placeType ?? null,
      departureLocationLabel: params.departureLocationLabel ?? null,
      arrivalLocationLabel: params.arrivalLocationLabel ?? null,
      routeStyle: params.routeStyle ?? null,
      routeAdjustmentMessage: params.routeAdjustmentMessage ?? null,
      notes: params.notes ?? null,
      notesPlain: params.notesPlain ?? null,
      submissionMode: params.submissionMode ?? null,
      wasteBreakdown: params.wasteBreakdown ?? null,
      photos: params.photos ?? null,
      visionEstimate: params.visionEstimate ?? null,
      wasteKg:
        params.wasteKg === undefined || params.wasteKg === null
          ? 0
          : toFiniteNumber(params.wasteKg, 0),
      cigaretteButts:
        params.cigaretteButts === undefined || params.cigaretteButts === null
          ? 0
          : Math.max(0, Math.trunc(toFiniteNumber(params.cigaretteButts, 0))),
      volunteersCount: Math.max(
        0,
        Math.trunc(toFiniteNumber(params.volunteersCount, 0)),
      ),
      durationMinutes: Math.max(
        0,
        Math.trunc(toFiniteNumber(params.durationMinutes, 0)),
      ),
      manualDrawing,
    },
  };
}
