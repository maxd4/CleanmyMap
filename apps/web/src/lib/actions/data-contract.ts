import type {
  ActionDrawing,
  ActionGeometryKind,
  ActionImpactLevel,
  ActionPhotoAsset,
  ActionListItem,
  ActionMapItem,
  ActionQualityBreakdown,
  ActionQualityGrade,
  ActionRecordType,
  ActionSubmissionMode,
  ActionStatus,
  ActionVisionEstimate,
  CreateActionPayload,
  LegacyActionRecordType,
  ActionWasteBreakdown,
  ActionMegotsCondition,
  ActionGeometryOrigin,
  ActionGeometrySource,
} from "@/lib/actions/types";
import {
  buildPersistedGeometryFromStoredFields,
  isRenderableDrawing,
  resolveGeometryOriginFromConfidence,
  toGeoJsonString,
  type PersistedDerivedGeometry,
} from "@/lib/actions/derived-geometry";

export const BUTTS_PER_KG_REFERENCE = 2500;
export const CONDITION_WEIGHT_FACTORS: Record<ActionMegotsCondition, number> = {
  propre: 1.0,
  humide: 0.7,
  mouille: 0.4,
};

export function computeButtsCount(weightKg: number, condition: ActionMegotsCondition): number {
  return Math.round(weightKg * BUTTS_PER_KG_REFERENCE * CONDITION_WEIGHT_FACTORS[condition]);
}

export const ACTION_ENTITY_TYPES = [
  "action",
  "clean_place",
  "spot",
] as const satisfies readonly ActionRecordType[];
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

function toLegacyRecordType(type: ActionEntityType): LegacyActionRecordType {
  if (type === "spot") {
    return "other";
  }
  return type;
}

export type ActionContractCreatePayload = {
  type: ActionRecordType;
  source: string;
  createdByClerkId?: string | null;
  location: {
    label: string;
    latitude?: number;
    longitude?: number;
  };
  departureLocationLabel?: string;
  arrivalLocationLabel?: string;
  routeStyle?: "direct" | "souple";
  routeAdjustmentMessage?: string;
  geometry?: {
    kind: "polyline" | "polygon";
    coordinates: [number, number][];
  };
  dates: {
    observedAt: string;
  };
  metadata: {
    actorName?: string;
    associationName?: string;
    placeType?: string;
    wasteKg: number;
    cigaretteButts?: number;
    volunteersCount?: number;
    durationMinutes?: number;
    notes?: string;
    routeStyle?: "direct" | "souple";
    routeAdjustmentMessage?: string;
    submissionMode?: ActionSubmissionMode;
    wasteBreakdown?: ActionWasteBreakdown;
    departureLocationLabel?: string;
    arrivalLocationLabel?: string;
    photos?: ActionPhotoAsset[];
    visionEstimate?: ActionVisionEstimate | null;
  };
};

type BuildActionContractParams = {
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

type ActionInsightsLike = {
  qualityScore: number;
  qualityGrade: ActionQualityGrade;
  qualityFlags: string[];
  qualityBreakdown: ActionQualityBreakdown;
  toFixPriority: boolean;
  impactLevel: ActionImpactLevel;
};

export type GeometryPresentation = {
  origin: ActionGeometryOrigin;
  reality: "real" | "estimated" | "fallback";
  label: string;
  strokeStyle: "solid" | "dashed" | "point";
};

function toGeometryPresentationOrigin(
  item: ActionMapItem,
): ActionGeometryOrigin {
  const contractGeometry = item.contract?.geometry;
  const geometrySource =
    item.geometry_source ??
    contractGeometry?.geometrySource ??
    contractGeometry?.origin ??
    null;
  if (geometrySource) {
    return geometrySource;
  }
  return resolveGeometryOriginFromConfidence(
    contractGeometry?.confidence ?? item.geometry_confidence ?? null,
  );
}

export function getGeometryPresentation(
  item: ActionMapItem,
): GeometryPresentation {
  const origin = toGeometryPresentationOrigin(item);
  switch (origin) {
    case "manual":
    case "reference":
      return {
        origin,
        reality: "real",
        label:
          origin === "manual" ? "Géométrie réelle · manuelle" : "Géométrie réelle · référence",
        strokeStyle: "solid",
      };
    case "routed":
      return {
        origin,
        reality: "estimated",
        label: "Géométrie estimée · routée",
        strokeStyle: "dashed",
      };
    case "estimated_area":
      return {
        origin,
        reality: "estimated",
        label: "Géométrie estimée · zone",
        strokeStyle: "dashed",
      };
    case "fallback_point":
    default:
      return {
        origin: "fallback_point",
        reality: "fallback",
        label: "Point discret · fallback",
        strokeStyle: "point",
      };
  }
}

export function isRealGeometryOrigin(origin: ActionGeometryOrigin): boolean {
  return origin === "manual" || origin === "reference";
}

export function isEstimatedGeometryOrigin(origin: ActionGeometryOrigin): boolean {
  return origin === "routed" || origin === "estimated_area";
}

export type ActionOperationalContext = {
  placeType: string | null;
  routeStyle: "direct" | "souple" | null;
  routeAdjustmentMessage: string | null;
  volunteersCount: number;
  durationMinutes: number;
  engagementMinutes: number;
  engagementHours: number;
  placeTypeLabel: string;
  routeStyleLabel: string;
};

export type ActionOperationalContextSource = {
  metadata?: {
    placeType?: string | null;
    routeStyle?: "direct" | "souple" | null;
    routeAdjustmentMessage?: string | null;
    volunteersCount?: number | null;
    durationMinutes?: number | null;
  } | null;
} | null | undefined;

function normalizeContextText(value: string | null | undefined): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

export function formatRouteStyleLabel(
  routeStyle: "direct" | "souple" | null | undefined,
): string {
  if (routeStyle === "direct") {
    return "Trajet direct";
  }
  if (routeStyle === "souple") {
    return "Trajet souple";
  }
  return "Trajet non précisé";
}

export function getActionOperationalContext(
  contract: ActionOperationalContextSource,
): ActionOperationalContext {
  const metadata = contract?.metadata ?? null;
  const placeType = normalizeContextText(metadata?.placeType);
  const routeStyle = metadata?.routeStyle ?? null;
  const routeAdjustmentMessage = normalizeContextText(
    metadata?.routeAdjustmentMessage,
  );
  const volunteersCount = Math.max(
    0,
    Math.trunc(toFiniteNumber(metadata?.volunteersCount ?? null, 0)),
  );
  const durationMinutes = Math.max(
    0,
    Math.trunc(toFiniteNumber(metadata?.durationMinutes ?? null, 0)),
  );
  const engagementMinutes = volunteersCount * durationMinutes;

  return {
    placeType,
    routeStyle,
    routeAdjustmentMessage,
    volunteersCount,
    durationMinutes,
    engagementMinutes,
    engagementHours: Number((engagementMinutes / 60).toFixed(1)),
    placeTypeLabel: placeType ?? "Type de lieu non précisé",
    routeStyleLabel: formatRouteStyleLabel(routeStyle),
  };
}

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
      wasteKg: params.wasteKg === undefined || params.wasteKg === null ? 0 : toFiniteNumber(params.wasteKg, 0),
      cigaretteButts: params.cigaretteButts === undefined || params.cigaretteButts === null 
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

export function toActionMapItem(
  contract: ActionDataContract,
  insights?: ActionInsightsLike,
): ActionMapItem {
  return {
    id: contract.id,
    action_date: contract.dates.observedAt,
    location_label: contract.location.label,
    latitude: contract.location.latitude,
    longitude: contract.location.longitude,
    waste_kg: contract.metadata.wasteKg,
    cigarette_butts: contract.metadata.cigaretteButts,
    status: contract.status,
    record_type: toLegacyRecordType(contract.type),
    source: contract.source,
    created_by_clerk_id: contract.createdByClerkId ?? null,
    manual_drawing: contract.metadata.manualDrawing,
    manual_drawing_geojson: contract.metadata.manualDrawing
      ? toGeoJsonString(contract.metadata.manualDrawing)
      : null,
    geometry_confidence: contract.geometry.confidence,
    geometry_source: contract.geometry.geometrySource,
    submission_mode: contract.metadata.submissionMode,
    waste_breakdown: contract.metadata.wasteBreakdown,
    quality_score: insights?.qualityScore,
    quality_grade: insights?.qualityGrade,
    quality_flags: insights?.qualityFlags,
    quality_breakdown: insights?.qualityBreakdown,
    to_fix_priority: insights?.toFixPriority,
    impact_level: insights?.impactLevel,
    contract,
  };
}

export function toActionListItem(
  contract: ActionDataContract,
  insights?: ActionInsightsLike,
): ActionListItem {
  return {
    id: contract.id,
    created_at:
      contract.dates.createdAt ??
      contract.dates.importedAt ??
      contract.dates.observedAt,
    actor_name: contract.metadata.actorName,
    association_name: contract.metadata.associationName,
    action_date: contract.dates.observedAt,
    location_label: contract.location.label,
    latitude: contract.location.latitude,
    longitude: contract.location.longitude,
    waste_kg: contract.metadata.wasteKg,
    cigarette_butts: contract.metadata.cigaretteButts,
    volunteers_count: contract.metadata.volunteersCount,
    duration_minutes: contract.metadata.durationMinutes,
    notes: contract.metadata.notes,
    status: contract.status,
    record_type: toLegacyRecordType(contract.type),
    source: contract.source,
    created_by_clerk_id: contract.createdByClerkId ?? null,
    notes_plain: contract.metadata.notesPlain,
    observed_at: contract.dates.observedAt,
    geometry_kind: contract.geometry.kind,
    geometry_geojson: contract.geometry.geojson,
    geometry_confidence: contract.geometry.confidence,
    geometry_source: contract.geometry.geometrySource,
    manual_drawing: contract.metadata.manualDrawing,
    manual_drawing_geojson: contract.metadata.manualDrawing
      ? toGeoJsonString(contract.metadata.manualDrawing)
      : null,
    submission_mode: contract.metadata.submissionMode,
    waste_breakdown: contract.metadata.wasteBreakdown,
    quality_score: insights?.qualityScore,
    quality_grade: insights?.qualityGrade,
    quality_flags: insights?.qualityFlags,
    quality_breakdown: insights?.qualityBreakdown,
    to_fix_priority: insights?.toFixPriority,
    impact_level: insights?.impactLevel,
    contract,
  };
}

export function toContractCreatePayload(
  payload: CreateActionPayload,
): ActionContractCreatePayload {
  return {
    type: payload.recordType ?? "action",
    source: "web_form",
    location: {
      label: payload.locationLabel,
      latitude: payload.latitude,
      longitude: payload.longitude,
    },
    departureLocationLabel: payload.departureLocationLabel,
    arrivalLocationLabel: payload.arrivalLocationLabel,
    routeStyle: payload.routeStyle,
    routeAdjustmentMessage: payload.routeAdjustmentMessage,
    geometry: payload.manualDrawing
      ? {
          kind: payload.manualDrawing.kind,
          coordinates: payload.manualDrawing.coordinates,
        }
      : undefined,
    dates: {
      observedAt: payload.actionDate,
    },
    metadata: {
      actorName: payload.actorName,
      associationName: payload.associationName,
      placeType: payload.placeType,
      wasteKg: payload.wasteKg,
      cigaretteButts: payload.cigaretteButts,
      volunteersCount: payload.volunteersCount,
      durationMinutes: payload.durationMinutes,
      notes: payload.notes,
      routeStyle: payload.routeStyle,
      routeAdjustmentMessage: payload.routeAdjustmentMessage,
      submissionMode: payload.submissionMode,
      wasteBreakdown: payload.wasteBreakdown,
      photos: payload.photos,
      visionEstimate: payload.visionEstimate,
    },
  };
}

export function normalizeCreatePayload(
  payload: CreateActionPayload | ActionContractCreatePayload,
): CreateActionPayload {
  if ("actionDate" in payload) {
    return payload;
  }
  return {
    actorName: payload.metadata.actorName,
    associationName: payload.metadata.associationName,
    actionDate: payload.dates.observedAt,
    locationLabel: payload.location.label,
    departureLocationLabel:
      payload.departureLocationLabel ?? payload.metadata.departureLocationLabel ?? "",
    arrivalLocationLabel:
      payload.arrivalLocationLabel ?? payload.metadata.arrivalLocationLabel ?? "",
    routeStyle: payload.routeStyle ?? payload.metadata.routeStyle ?? undefined,
    routeAdjustmentMessage:
      payload.routeAdjustmentMessage ?? payload.metadata.routeAdjustmentMessage ?? undefined,
    latitude: payload.location.latitude,
    longitude: payload.location.longitude,
    wasteKg: payload.metadata.wasteKg,
    cigaretteButts: payload.metadata.cigaretteButts ?? 0,
    volunteersCount: payload.metadata.volunteersCount ?? 1,
    durationMinutes: payload.metadata.durationMinutes ?? 0,
    notes: payload.metadata.notes,
    submissionMode: payload.metadata.submissionMode ?? "complete",
    wasteBreakdown: payload.metadata.wasteBreakdown,
    photos: payload.metadata.photos ?? undefined,
    visionEstimate: payload.metadata.visionEstimate ?? undefined,
    manualDrawing: payload.geometry
      ? {
          kind: payload.geometry.kind,
          coordinates: payload.geometry.coordinates,
        }
      : undefined,
    placeType: payload.metadata.placeType ?? undefined,
  };
}

export function mapItemType(item: ActionMapItem): ActionEntityType {
  if (item.contract) {
    return item.contract.type;
  }
  if (item.record_type === "clean_place") {
    return "clean_place";
  }
  if (item.record_type === "other") {
    return "spot";
  }
  return "action";
}

export function mapItemWasteKg(item: ActionMapItem): number | null {
  const contract = item.contract;
  const rawValue = item.waste_kg;

  if (contract) {
    const provided = (contract.metadata as any).provided as string[] | undefined;
    if (provided && !provided.includes("waste_kg")) {
      return null;
    }
    return contract.metadata.wasteKg;
  }

  // Fallback for non-contract items (legacy)
  if (rawValue === 0 || rawValue === null) {
      // If we don't have a contract, we assume 0 is a placeholder unless we can prove otherwise
      // But for regularity with the new system, we'll return 0 if not sure.
      return rawValue;
  }
  return rawValue;
}

export function mapItemCigaretteButts(item: ActionMapItem): number | null {
  const contract = item.contract;
  const rawValue = item.cigarette_butts;

  if (contract) {
    const provided = (contract.metadata as any).provided as string[] | undefined;
    if (provided && !provided.includes("cigarette_butts")) {
      return null;
    }
    return contract.metadata.cigaretteButts;
  }

  return rawValue;
}

export function mapItemLocationLabel(item: ActionMapItem): string {
  return item.contract?.location.label ?? item.location_label;
}

export function mapItemCoordinates(item: ActionMapItem): {
  latitude: number | null;
  longitude: number | null;
} {
  return {
    latitude: item.contract?.location.latitude ?? item.latitude,
    longitude: item.contract?.location.longitude ?? item.longitude,
  };
}

export function mapItemObservedAt(item: ActionMapItem): string {
  return item.contract?.dates.observedAt ?? item.action_date;
}

export function mapItemDrawing(item: ActionMapItem): ActionDrawing | null {
  const contractGeometry = item.contract?.geometry;
  if (
    contractGeometry &&
    contractGeometry.kind !== "point" &&
    isRenderableDrawing({
      kind: contractGeometry.kind,
      coordinates: contractGeometry.coordinates,
    })
  ) {
    return {
      kind: contractGeometry.kind,
      coordinates: contractGeometry.coordinates,
    };
  }

  if (isRenderableDrawing(item.manual_drawing)) {
    return item.manual_drawing;
  }

  return null;
}

export function mapItemShouldRenderPoint(item: ActionMapItem): boolean {
  const { latitude, longitude } = mapItemCoordinates(item);
  if (latitude === null || longitude === null) {
    return false;
  }

  return mapItemDrawing(item) === null;
}
