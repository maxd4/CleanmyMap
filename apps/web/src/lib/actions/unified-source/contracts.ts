import { parseDrawingFromNotes, toGeoJsonString } from "@/lib/actions/drawing";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import {
  buildActionDataContract,
} from "@/lib/actions/data-contract";
import {
  auditActionData,
} from "@/lib/actions/data-quality";
import {
  parseWasteCategoriesFromNotes,
  stripWasteCategoryMarkersFromNotes,
} from "@/lib/waste";
import type { ActionContractCreatePayload } from "@/lib/actions/contract-builders";
import { normalizeCreatePayload } from "@/lib/actions/contract-builders";
import type {
  ActionDataContract,
  ActionEntityType,
} from "@/lib/actions/data-contract";
import type {
  ActionMapViewportQuery,
  ActionSourceName,
  ActionStatus,
} from "@/lib/actions/types";
import type { StoredAction } from "@/lib/actions/store";

export type UnifiedActionContractsParams = {
  limit: number;
  status: ActionStatus | null;
  floorDate: string | null;
  requireCoordinates: boolean;
  types: ActionEntityType[] | null;
  viewport?: ActionMapViewportQuery;
};

export type UnifiedSourceHealth = {
  partial: boolean;
  failedSources: ActionSourceName[];
  availableSources: ActionSourceName[];
  warnings: string[];
};

export type TrashSpotterSpotRow = {
  id: string;
  created_at: string;
  created_by_clerk_id?: string | null;
  label: string;
  spot_type: string | null;
  latitude: number | null;
  longitude: number | null;
  derived_geometry_kind?: "point" | "polyline" | "polygon" | null;
  derived_geometry_geojson?: string | null;
  geometry_confidence?: number | null;
  geometry_source?: "manual" | "reference" | "routed" | "estimated_area" | "fallback_point" | null;
  status: "new" | "validated" | "cleaned";
  notes: string | null;
};

export type UnifiedActionSourceLoadResult = {
  remoteRows: StoredAction[];
  remoteSpots: TrashSpotterSpotRow[];
  localContracts: ActionDataContract[];
  failedSources: ActionSourceName[];
  availableSources: ActionSourceName[];
};

export type UnifiedContractOrigin = "remote" | "local";

export type UnifiedContractCandidate = {
  contract: ActionDataContract;
  origin: UnifiedContractOrigin;
};

export function normalizeExternalActionImport(
  payload: ActionContractCreatePayload,
): {
  payload: ReturnType<typeof normalizeCreatePayload>;
  dataQuality: ReturnType<typeof auditActionData>;
} {
  const normalizedPayload = normalizeCreatePayload(payload);
  return {
    payload: normalizedPayload,
    dataQuality: auditActionData({
      observedAt: payload.dates.observedAt,
      locationLabel: payload.location.label,
      latitude: payload.location.latitude,
      longitude: payload.location.longitude,
      wasteKg: payload.metadata.wasteKg,
      cigaretteButts: payload.metadata.cigaretteButts,
      volunteersCount: payload.metadata.volunteersCount,
      durationMinutes: payload.metadata.durationMinutes,
      visionEstimate: payload.metadata.visionEstimate,
    }),
  };
}

export function mapActionStatusToSpotStatuses(
  status: ActionStatus | null,
): TrashSpotterSpotRow["status"][] | null {
  if (!status) {
    return null;
  }
  if (status === "pending") {
    return ["new"];
  }
  if (status === "approved") {
    return ["validated", "cleaned"];
  }
  return [];
}

function mapSpotStatusToActionStatus(
  status: TrashSpotterSpotRow["status"],
): ActionStatus {
  if (status === "validated" || status === "cleaned") {
    return "approved";
  }
  return "pending";
}

function mapCanonicalSpotTypeToEntityType(
  spotType: string | null,
): ActionEntityType {
  return (spotType ?? "").trim().toLowerCase() === "spot"
    ? "spot"
    : "clean_place";
}

function toActionContractFromRow(row: StoredAction): ActionDataContract {
  const parsedNotes = parseDrawingFromNotes(row.notes);
  const parsedMetadata = extractActionMetadataFromNotes(parsedNotes.cleanNotes);
  const contract = buildActionDataContract({
    id: row.id,
    type: "action",
    status: row.status,
    source: "actions",
    sourceStatus: row.status,
    createdByClerkId: row.created_by_clerk_id,
    observedAt: row.action_date,
    createdAt: row.created_at,
    importedAt: row.updated_at ?? null,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    derivedGeometryKind: row.derived_geometry_kind ?? null,
    derivedGeometryGeoJson: row.derived_geometry_geojson ?? null,
    geometryConfidence: row.geometry_confidence ?? null,
    geometrySource: row.geometry_source ?? null,
    wasteKg: row.waste_kg,
    cigaretteButts: row.cigarette_butts,
    volunteersCount: row.volunteers_count,
    durationMinutes: row.duration_minutes,
    actorName: row.actor_name,
    associationName: parsedMetadata.associationName,
    groupJoinEnabled: parsedMetadata.groupJoinEnabled,
    actionPhase: row.action_phase ?? "post_action_complete",
    preparationData: row.preparation_data ?? {},
    placeType: parsedMetadata.placeType,
    departureLocationLabel: parsedMetadata.departureLocationLabel,
    arrivalLocationLabel: parsedMetadata.arrivalLocationLabel,
    routeStyle: parsedMetadata.routeStyle,
    routeAdjustmentMessage: parsedMetadata.routeAdjustmentMessage,
    notes: parsedMetadata.cleanNotes,
    notesPlain: parsedMetadata.cleanNotes,
    submissionMode: parsedMetadata.submissionMode,
    wasteBreakdown: parsedMetadata.wasteBreakdown,
    manualDrawing: parsedNotes.manualDrawing,
    manualDrawingGeoJson: toGeoJsonString(parsedNotes.manualDrawing),
  });

  return {
    ...contract,
    dataQuality: auditActionData({
      observedAt: row.action_date,
      locationLabel: row.location_label,
      latitude: row.latitude,
      longitude: row.longitude,
      wasteKg: row.waste_kg,
      cigaretteButts: row.cigarette_butts,
      volunteersCount: row.volunteers_count,
      durationMinutes: row.duration_minutes,
      geometrySource: row.geometry_source ?? contract.geometry.geometrySource,
      geometryConfidence: row.geometry_confidence ?? contract.geometry.confidence,
      hasGeometry: contract.geometry.coordinates.length > 0,
    }),
  };
}

function toSpotContractFromRow(row: TrashSpotterSpotRow): ActionDataContract {
  const type = mapCanonicalSpotTypeToEntityType(row.spot_type);
  const wasteCategories =
    type === "spot" ? parseWasteCategoriesFromNotes(row.notes) : [];
  const geometry = {
    kind: row.derived_geometry_kind,
    geojson: row.derived_geometry_geojson,
    confidence: row.geometry_confidence,
    source: row.geometry_source,
  };
  const contract = buildActionDataContract({
    id: row.id,
    type,
    status: mapSpotStatusToActionStatus(row.status),
    source: "trash_spotter_spots",
    sourceStatus: row.status,
    createdByClerkId: row.created_by_clerk_id,
    observedAt: row.created_at,
    createdAt: row.created_at,
    locationLabel: row.label,
    latitude: row.latitude,
    longitude: row.longitude,
    derivedGeometryKind: geometry.kind ?? null,
    derivedGeometryGeoJson: geometry.geojson ?? null,
    geometryConfidence: geometry.confidence ?? null,
    geometrySource: geometry.source ?? null,
    notes: stripWasteCategoryMarkersFromNotes(row.notes) ?? null,
    wasteCategories,
  });

  return {
    ...contract,
    dataQuality: auditActionData({
      observedAt: row.created_at,
      locationLabel: row.label,
      latitude: row.latitude,
      longitude: row.longitude,
      geometrySource: geometry.source ?? contract.geometry.geometrySource,
      geometryConfidence: geometry.confidence ?? contract.geometry.confidence,
      hasGeometry: contract.geometry.coordinates.length > 0,
    }),
  };
}

export function toActionContract(row: StoredAction): ActionDataContract {
  return toActionContractFromRow(row);
}

export function toCanonicalSpotContract(row: TrashSpotterSpotRow): ActionDataContract {
  return toSpotContractFromRow(row);
}
