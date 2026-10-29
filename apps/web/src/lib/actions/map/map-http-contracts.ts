import type {
  ActionGeometrySource,
  ActionImpactLevel,
  ActionSourceName,
  ActionStatus,
} from "@/lib/actions/types";
import { buildDateFloor } from "@/lib/pilotage/overview.utils";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import type { ReportScopeKind } from "@/lib/reports/scope";
import {
  DEFAULT_REPORT_SCOPE,
  filterActionContractsByScope,
  normalizeReportScope,
  type ReportScope,
} from "@/lib/reports/scope";
import { parseDrawingFromNotes } from "../geometry/drawing";
import { extractActionMetadataFromNotes } from "../metadata";
import type { ActionDataContract, ActionEntityType } from "../contracts/contract-model";
import { buildActionDataContract } from "../contracts/contract-model";
import { parseWasteCategoriesFromNotes } from "@/lib/waste";
import {
  matchesActionContextFilter,
  normalizeActionContextFilter,
  type ActionContextFilter,
} from "@/lib/actions/action-context";
import { buildPublicMapItems } from "./public-map-items";
import { parsePublicObservedPreparationData } from "./public-observed-coverage";
import {
  clampInteger,
  normalizeQualityMin,
  resolveMapStatus,
  toFiniteNumber,
  type ActionTypeFilter,
} from "./map-http-utils";

export type ActionsMapFeedRow = {
  source: string;
  entity_type: string;
  id: string;
  created_at: string;
  updated_at: string | null;
  status: string;
  observed_at: string;
  location_label: string;
  department_code?: string | null;
  department_name?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  waste_kg: number | string | null;
  cigarette_butts: number | string | null;
  volunteers_count: number | string | null;
  duration_minutes: number | string | null;
  notes: string | null;
  derived_geometry_kind: string | null;
  derived_geometry_geojson: string | null;
  geometry_confidence: number | string | null;
  geometry_source: string | null;
  action_context?: "citizen" | "company" | "school" | null;
  action_context_source?: "explicit" | "automatic_children_ratio" | null;
  school_context_confirmed?: boolean | null;
  observed_coverage?: unknown;
  public_preparation_data?: unknown;
};

export type ActionsMapRpcResult = {
  data: unknown[] | null;
  error: { code?: string | null; message?: string | null } | null;
};

export type MapFetchConfig = {
  limit: number;
  days: number;
  floorDate: string | null;
  rpcLimit: number;
  types: ActionEntityType[] | null;
  scope: ReportScope;
  viewport: {
    south: number | null;
    west: number | null;
    north: number | null;
    east: number | null;
    zoom: number | null;
  };
  status: ActionStatus | null;
  impact: ActionImpactLevel | null;
  qualityMin: number | null;
  contextFilter: ActionContextFilter;
};

function normalizeMapTypes(raw: ActionTypeFilter | undefined): ActionEntityType[] | null {
  if (!raw || raw === "all") return null;
  if (typeof raw === "string") return [raw as ActionEntityType];
  const deduped = [...new Set(raw)].filter(
    (value): value is ActionEntityType =>
      value === "action" || value === "clean_place" || value === "spot",
  );
  return deduped.length > 0 ? deduped : null;
}

function resolveMapScope(params: {
  association?: string | "all";
  scopeKind?: ReportScopeKind;
  scopeValue?: string | null;
}): ReportScope {
  if (params.scopeKind && params.scopeKind !== "global") {
    return normalizeReportScope({ kind: params.scopeKind, value: params.scopeValue ?? null });
  }
  if (typeof params.association === "string" && params.association !== "all" && params.association.trim().length > 0) {
    return { kind: "association", value: params.association.trim() };
  }
  return DEFAULT_REPORT_SCOPE;
}

function normalizeMapViewport(viewport: MapViewportState | null | undefined): MapFetchConfig["viewport"] {
  if (!viewport) return { south: null, west: null, north: null, east: null, zoom: null };
  return {
    south: toFiniteNumber(viewport.bounds.south),
    west: toFiniteNumber(viewport.bounds.west),
    north: toFiniteNumber(viewport.bounds.north),
    east: toFiniteNumber(viewport.bounds.east),
    zoom: toFiniteNumber(viewport.zoom),
  };
}

function toActionEntityType(raw: string | null | undefined): ActionEntityType {
  return raw === "clean_place" || raw === "spot" ? raw : "action";
}

function toActionStatusFromMapFeedRow(entityType: string | null | undefined, rawStatus: string): ActionStatus {
  if (entityType === "spot") return rawStatus === "validated" || rawStatus === "cleaned" ? "approved" : "pending";
  return rawStatus === "pending" || rawStatus === "rejected" ? rawStatus : "approved";
}

function isPublicMapFeedRow(row: ActionsMapFeedRow): boolean {
  if (row.source === "actions" && row.entity_type === "action") return row.status === "approved";
  return row.source === "trash_spotter_spots" && row.entity_type !== "action" && (row.status === "validated" || row.status === "cleaned");
}

function toActionContractFromMapFeedRow(row: ActionsMapFeedRow): ActionDataContract {
  const parsedDrawing = parseDrawingFromNotes(row.notes);
  const parsedMetadata = extractActionMetadataFromNotes(parsedDrawing.cleanNotes);
  const type = toActionEntityType(row.entity_type);
  return buildActionDataContract({
    id: row.id,
    type,
    status: toActionStatusFromMapFeedRow(row.entity_type, row.status),
    source: row.source,
    sourceStatus: row.status,
    createdByClerkId: null,
    observedAt: row.observed_at,
    createdAt: row.created_at,
    importedAt: row.updated_at,
    locationLabel: row.location_label,
    latitude: toFiniteNumber(row.latitude),
    longitude: toFiniteNumber(row.longitude),
    departmentCode: row.department_code ?? null,
    departmentName: row.department_name ?? null,
    wasteKg: toFiniteNumber(row.waste_kg),
    cigaretteButtsKg: parsedMetadata.cigaretteButtsKg,
    cigaretteButts: toFiniteNumber(row.cigarette_butts),
    volunteersCount: row.volunteers_count === null ? null : toFiniteNumber(row.volunteers_count),
    durationMinutes: toFiniteNumber(row.duration_minutes),
    actorName: null,
    associationName: parsedMetadata.associationName,
    groupJoinEnabled: parsedMetadata.groupJoinEnabled,
    preparationData: parsePublicObservedPreparationData(row),
    placeType: parsedMetadata.placeType,
    departureLocationLabel: parsedMetadata.departureLocationLabel,
    arrivalLocationLabel: parsedMetadata.arrivalLocationLabel,
    routeStyle: parsedMetadata.routeStyle,
    routeAdjustmentMessage: parsedMetadata.routeAdjustmentMessage,
    notes: parsedMetadata.cleanNotes,
    notesPlain: parsedMetadata.cleanNotes,
    wasteCategories: type === "spot" ? parseWasteCategoriesFromNotes(row.notes) : [],
    submissionMode: parsedMetadata.submissionMode,
    wasteBreakdown: parsedMetadata.wasteBreakdown,
    wasteMeasurementMethod: parsedMetadata.wasteMeasurementMethod,
    manualDrawing: parsedDrawing.manualDrawing,
    manualDrawingGeoJson: parsedDrawing.drawingJson,
    derivedGeometryKind: row.derived_geometry_kind as "point" | "polyline" | "polygon" | "multiline" | null,
    derivedGeometryGeoJson: row.derived_geometry_geojson,
    geometryConfidence: toFiniteNumber(row.geometry_confidence),
    geometrySource: row.geometry_source as ActionGeometrySource | null,
    actionContext: row.action_context ?? null,
    actionContextSource: row.action_context_source ?? null,
    schoolContextConfirmed: row.school_context_confirmed ?? null,
  });
}

function filterContractsByTypes(items: ActionDataContract[], types: ActionEntityType[] | null): ActionDataContract[] {
  if (!types || types.length === 0) return items;
  const allowed = new Set(types);
  return items.filter((item) => allowed.has(item.type));
}

function dedupeContractsByIdAndType(items: ActionDataContract[]): ActionDataContract[] {
  const seen = new Set<string>();
  const output: ActionDataContract[] = [];
  for (const item of items) {
    const key = `${item.id}::${item.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function compareMapContracts(left: ActionDataContract, right: ActionDataContract): number {
  const observedComparison = right.dates.observedAt.localeCompare(left.dates.observedAt);
  if (observedComparison !== 0) return observedComparison;
  const createdComparison = (right.dates.createdAt ?? right.dates.importedAt ?? right.dates.observedAt).localeCompare(left.dates.createdAt ?? left.dates.importedAt ?? left.dates.observedAt);
  if (createdComparison !== 0) return createdComparison;
  return right.id.localeCompare(left.id);
}

function buildMapContracts(remoteContracts: ActionDataContract[], localContracts: ActionDataContract[], scope: ReportScope, types: ActionEntityType[] | null): ActionDataContract[] {
  return dedupeContractsByIdAndType(
    filterContractsByTypes(filterActionContractsByScope([...remoteContracts, ...localContracts], scope), types),
  ).sort(compareMapContracts);
}

export function buildMapSourceHealth() {
  return { partial: false, failedSources: [], availableSources: ["actions", "spots"] as ActionSourceName[], warnings: [] };
}

export function resolveMapFetchConfig(params: {
  limit?: number;
  days?: number;
  floorDate?: string | null;
  types?: ActionTypeFilter;
  association?: string | "all";
  scopeKind?: ReportScopeKind;
  scopeValue?: string | null;
  status?: ActionStatus | "all";
  impact?: ActionImpactLevel;
  qualityMin?: number;
  contextFilter?: ActionContextFilter;
  viewport?: MapViewportState | null;
}): MapFetchConfig {
  const limit = clampInteger(params.limit, 1, 300, 80);
  const days = clampInteger(params.days, 1, 3650, 30);
  const floorDate = typeof params.floorDate === "string" ? params.floorDate.trim().slice(0, 10) : params.floorDate === null ? null : buildDateFloor(days);
  return {
    limit,
    days,
    floorDate,
    rpcLimit: Math.max(limit * 4, limit),
    types: normalizeMapTypes(params.types),
    scope: resolveMapScope(params),
    viewport: normalizeMapViewport(params.viewport),
    status: resolveMapStatus(params.status),
    impact: params.impact ?? null,
    qualityMin: normalizeQualityMin(params.qualityMin),
    contextFilter: normalizeActionContextFilter(params.contextFilter),
  };
}

export function mapFeedRowsToPublicContracts(rows: ActionsMapFeedRow[]): ActionDataContract[] {
  return rows.filter(isPublicMapFeedRow).map(toActionContractFromMapFeedRow);
}

export function buildMapResponseItems(params: {
  remoteContracts: ActionDataContract[];
  scope: ReportScope;
  types: ActionEntityType[] | null;
  pollutionScoreReferences: Parameters<typeof buildPublicMapItems>[1];
  impact: ActionImpactLevel | null;
  qualityMin: number | null;
  contextFilter: ActionContextFilter;
  limit: number;
}) {
  const mergedContracts = buildMapContracts(params.remoteContracts, [], params.scope, params.types)
    .filter((contract) =>
      matchesActionContextFilter(contract.metadata.actionContext, params.contextFilter),
    );
  return buildPublicMapItems(
    mergedContracts,
    params.pollutionScoreReferences,
    params.impact,
    params.qualityMin,
    params.limit + 1,
  );
}
