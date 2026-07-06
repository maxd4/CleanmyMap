import {
  ActionRecordType,
  ActionStatus,
  ActionSubmissionMode,
  ActionPhase,
  ActionPreparationData,
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
  groupJoinEnabled: boolean;
  actionPhase: ActionPhase;
  preparationData: ActionPreparationData | null;
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
  groupJoinEnabled?: boolean | null;
  actionPhase?: ActionPhase | null;
  preparationData?: ActionPreparationData | null;
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

function normalizeCoordinate(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return toFiniteNumber(value, 0);
}

function normalizeCount(value: number | null | undefined): number {
  return Math.max(0, Math.trunc(toFiniteNumber(value, 0)));
}

function buildPersistedActionGeometry(params: BuildActionContractParams): PersistedDerivedGeometry {
  const manualDrawing = params.manualDrawing ?? null;
  const latitude = normalizeCoordinate(params.latitude);
  const longitude = normalizeCoordinate(params.longitude);

  return buildPersistedGeometryFromStoredFields({
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
}

function buildActionDates(params: BuildActionContractParams): ActionDataDates {
  return {
    observedAt: normalizeObservedDate(params.observedAt),
    createdAt: params.createdAt ?? null,
    importedAt: params.importedAt ?? null,
    validatedAt: params.validatedAt ?? null,
  };
}

function buildActionIdentityMetadata(
  params: BuildActionContractParams,
): Pick<
  ActionDataMetadata,
  "actorName" | "associationName" | "groupJoinEnabled" | "actionPhase" | "preparationData"
> {
  return {
    actorName: params.actorName ?? null,
    associationName: params.associationName ?? null,
    groupJoinEnabled: params.groupJoinEnabled ?? true,
    actionPhase: params.actionPhase ?? "post_action_complete",
    preparationData: params.preparationData ?? null,
  };
}

function buildActionRouteMetadata(
  params: BuildActionContractParams,
): Pick<
  ActionDataMetadata,
  | "placeType"
  | "departureLocationLabel"
  | "arrivalLocationLabel"
  | "routeStyle"
  | "routeAdjustmentMessage"
> {
  return {
    placeType: params.placeType ?? null,
    departureLocationLabel: params.departureLocationLabel ?? null,
    arrivalLocationLabel: params.arrivalLocationLabel ?? null,
    routeStyle: params.routeStyle ?? null,
    routeAdjustmentMessage: params.routeAdjustmentMessage ?? null,
  };
}

function buildActionNoteMetadata(
  params: BuildActionContractParams,
): Pick<
  ActionDataMetadata,
  "notes" | "notesPlain" | "submissionMode" | "wasteBreakdown"
> {
  return {
    notes: params.notes ?? null,
    notesPlain: params.notesPlain ?? null,
    submissionMode: params.submissionMode ?? null,
    wasteBreakdown: params.wasteBreakdown ?? null,
  };
}

function buildActionMediaMetadata(
  params: BuildActionContractParams,
): Pick<ActionDataMetadata, "photos" | "visionEstimate" | "manualDrawing"> {
  return {
    photos: params.photos ?? null,
    visionEstimate: params.visionEstimate ?? null,
    manualDrawing: params.manualDrawing ?? null,
  };
}

function buildActionMeasureMetadata(
  params: BuildActionContractParams,
): Pick<
  ActionDataMetadata,
  "wasteKg" | "cigaretteButts" | "volunteersCount" | "durationMinutes"
> {
  return {
    wasteKg: normalizeOptionalNumber(params.wasteKg),
    cigaretteButts: normalizeCount(params.cigaretteButts),
    volunteersCount: normalizeCount(params.volunteersCount),
    durationMinutes: normalizeCount(params.durationMinutes),
  };
}

function normalizeOptionalNumber(value: number | null | undefined): number {
  return value === undefined || value === null ? 0 : toFiniteNumber(value, 0);
}

function buildActionMetadata(
  params: BuildActionContractParams,
): ActionDataMetadata {
  return {
    ...buildActionIdentityMetadata(params),
    ...buildActionRouteMetadata(params),
    ...buildActionNoteMetadata(params),
    ...buildActionMediaMetadata(params),
    ...buildActionMeasureMetadata(params),
  };
}

/**
 * Construit un objet ActionDataContract standardisé à partir de données brutes (souvent issues de Supabase).
 */
export function buildActionDataContract(
  params: BuildActionContractParams,
): ActionDataContract {
  const latitude = normalizeCoordinate(params.latitude);
  const longitude = normalizeCoordinate(params.longitude);
  const persistedGeometry = buildPersistedActionGeometry(params);

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
    dates: buildActionDates(params),
    metadata: buildActionMetadata(params),
  };
}
