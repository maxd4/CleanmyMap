import type {
  ActionImpactLevel,
  ActionMapResponse,
  ActionStatus,
} from "@/lib/actions/types";
import { buildDateFloor } from "@/lib/pilotage/overview.utils";
import type { MapViewportState } from "@/components/actions/map/map-export.types";
import type { ReportScopeKind } from "@/lib/reports/scope";
import {
  DEFAULT_REPORT_SCOPE,
  filterActionContractsByScope,
  normalizeReportScope,
  type ReportScope,
} from "@/lib/reports/scope";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors/app-errors";
import { buildActionInsights } from "./insights";
import { parseDrawingFromNotes } from "./drawing";
import { extractActionMetadataFromNotes } from "./metadata";
import { fetchActionPollutionScoreReferences } from "./pollution-score-references";
import {
  DEFAULT_POLLUTION_SCORE_REFERENCES,
  type PollutionScoreReferences,
} from "./pollution-score";
import type { ActionDataContract, ActionEntityType } from "./contract-model";
import { buildActionDataContract } from "./data-contract";
import { toActionMapItem } from "./contract-mappers";
import {
  clampInteger,
  normalizeQualityMin,
  resolveMapQueryStatus,
  resolveMapStatus,
  serializeTypes,
  setScopeQueryParams,
  toFiniteNumber,
  type ActionTypeFilter,
} from "./map-http-utils";

export type FetchMapActionsParams = {
  status?: ActionStatus | "all";
  limit?: number;
  days?: number;
  floorDate?: string | null;
  types?: ActionTypeFilter;
  association?: string | "all";
  scopeKind?: ReportScopeKind;
  scopeValue?: string | null;
  impact?: ActionImpactLevel;
  qualityMin?: number;
  viewport?: MapViewportState | null;
};

type ActionsMapFeedRow = {
  source: string;
  entity_type: string;
  id: string;
  created_at: string;
  updated_at: string | null;
  created_by_clerk_id: string | null;
  status: ActionStatus;
  observed_at: string;
  location_label: string;
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
};

type ActionsMapRpcResult = {
  data: unknown[] | null;
  error: {
    code?: string | null;
    message?: string | null;
  } | null;
};

type MapFetchConfig = {
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
};

function normalizeMapTypes(raw: ActionTypeFilter | undefined): ActionEntityType[] | null {
  if (!raw || raw === "all") {
    return null;
  }
  if (typeof raw === "string") {
    return [raw as ActionEntityType];
  }
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
    return normalizeReportScope({
      kind: params.scopeKind,
      value: params.scopeValue ?? null,
    });
  }

  if (
    typeof params.association === "string" &&
    params.association !== "all" &&
    params.association.trim().length > 0
  ) {
    return {
      kind: "association",
      value: params.association.trim(),
    };
  }

  return DEFAULT_REPORT_SCOPE;
}

function normalizeMapViewport(
  viewport: MapViewportState | null | undefined,
): {
  south: number | null;
  west: number | null;
  north: number | null;
  east: number | null;
  zoom: number | null;
} {
  if (!viewport) {
    return { south: null, west: null, north: null, east: null, zoom: null };
  }

  return {
    south: toFiniteNumber(viewport.bounds.south),
    west: toFiniteNumber(viewport.bounds.west),
    north: toFiniteNumber(viewport.bounds.north),
    east: toFiniteNumber(viewport.bounds.east),
    zoom: toFiniteNumber(viewport.zoom),
  };
}

function toActionEntityType(raw: string | null | undefined): ActionEntityType {
  if (raw === "clean_place" || raw === "spot") {
    return raw;
  }
  return "action";
}

function toActionContractFromMapFeedRow(row: ActionsMapFeedRow): ActionDataContract {
  const parsedDrawing = parseDrawingFromNotes(row.notes);
  const parsedMetadata = extractActionMetadataFromNotes(parsedDrawing.cleanNotes);

  return buildActionDataContract({
    id: row.id,
    type: toActionEntityType(row.entity_type),
    status: row.status,
    source: row.source,
    createdByClerkId: row.created_by_clerk_id,
    observedAt: row.observed_at,
    createdAt: row.created_at,
    importedAt: row.updated_at,
    locationLabel: row.location_label,
    latitude: toFiniteNumber(row.latitude),
    longitude: toFiniteNumber(row.longitude),
    wasteKg: toFiniteNumber(row.waste_kg),
    cigaretteButts: toFiniteNumber(row.cigarette_butts),
    volunteersCount: toFiniteNumber(row.volunteers_count),
    durationMinutes: toFiniteNumber(row.duration_minutes),
    actorName: null,
    associationName: parsedMetadata.associationName,
    groupJoinEnabled: parsedMetadata.groupJoinEnabled,
    placeType: parsedMetadata.placeType,
    departureLocationLabel: parsedMetadata.departureLocationLabel,
    arrivalLocationLabel: parsedMetadata.arrivalLocationLabel,
    routeStyle: parsedMetadata.routeStyle,
    routeAdjustmentMessage: parsedMetadata.routeAdjustmentMessage,
    notes: parsedMetadata.cleanNotes,
    notesPlain: parsedMetadata.cleanNotes,
    submissionMode: parsedMetadata.submissionMode,
    wasteBreakdown: parsedMetadata.wasteBreakdown,
    manualDrawing: parsedDrawing.manualDrawing,
    manualDrawingGeoJson: parsedDrawing.drawingJson,
    derivedGeometryKind: row.derived_geometry_kind as "point" | "polyline" | "polygon" | null,
    derivedGeometryGeoJson: row.derived_geometry_geojson,
    geometryConfidence: toFiniteNumber(row.geometry_confidence),
    geometrySource: row.geometry_source as
      | "manual"
      | "reference"
      | "routed"
      | "estimated_area"
      | "fallback_point"
      | null,
  });
}

function filterContractsByTypes(
  items: ActionDataContract[],
  types: ActionEntityType[] | null,
): ActionDataContract[] {
  if (!types || types.length === 0) {
    return items;
  }

  const allowed = new Set(types);
  return items.filter((item) => allowed.has(item.type));
}

function dedupeContractsByIdAndType(items: ActionDataContract[]): ActionDataContract[] {
  const seen = new Set<string>();
  const output: ActionDataContract[] = [];

  for (const item of items) {
    const key = `${item.id}::${item.type}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }

  return output;
}

function compareMapContracts(left: ActionDataContract, right: ActionDataContract): number {
  const observedComparison = right.dates.observedAt.localeCompare(left.dates.observedAt);
  if (observedComparison !== 0) {
    return observedComparison;
  }

  const createdComparison = (
    right.dates.createdAt ?? right.dates.importedAt ?? right.dates.observedAt
  ).localeCompare(left.dates.createdAt ?? left.dates.importedAt ?? left.dates.observedAt);
  if (createdComparison !== 0) {
    return createdComparison;
  }

  return right.id.localeCompare(left.id);
}

function buildMapContracts(
  remoteContracts: ActionDataContract[],
  localContracts: ActionDataContract[],
  scope: ReportScope,
  types: ActionEntityType[] | null,
): ActionDataContract[] {
  return dedupeContractsByIdAndType(
    filterContractsByTypes(
      filterActionContractsByScope([...remoteContracts, ...localContracts], scope),
      types,
    ),
  ).sort(compareMapContracts);
}

function buildMapItems(
  contracts: ActionDataContract[],
  pollutionScoreReferences: PollutionScoreReferences,
  impact: ActionImpactLevel | null,
  qualityMin: number | null,
  limit: number,
) {
  const now = new Date();

  return contracts
    .map((contract) => {
      const insights = buildActionInsights(contract, now);
      return toActionMapItem(contract, insights, pollutionScoreReferences);
    })
    .filter((item) => {
      if (impact && item.impact_level !== impact) {
        return false;
      }
      if (qualityMin === null) {
        return true;
      }
      return Number(item.quality_score ?? 0) >= qualityMin;
    })
    .slice(0, limit);
}

function buildMapSourceHealth(): NonNullable<ActionMapResponse["sourceHealth"]> {
  return {
    partial: false,
    failedSources: [],
    availableSources: ["actions", "spots"],
    warnings: [],
  };
}

function resolveMapFetchConfig(params: FetchMapActionsParams): MapFetchConfig {
  const limit = clampInteger(params.limit, 1, 300, 80);
  const days = clampInteger(params.days, 1, 3650, 30);
  const floorDate =
    typeof params.floorDate === "string"
      ? params.floorDate.trim().slice(0, 10)
      : params.floorDate === null
        ? null
        : buildDateFloor(days);

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
  };
}

function normalizeMapActionError(rpcPayload: ActionsMapRpcResult): AppError {
  const errorMessage =
    typeof rpcPayload.error?.message === "string" && rpcPayload.error.message.trim().length > 0
      ? rpcPayload.error.message.trim()
      : "Impossible de charger les points cartographiques.";

  return new AppError({
    kind: "server",
    message: errorMessage,
    code: typeof rpcPayload.error?.code === "string" ? rpcPayload.error.code : undefined,
    cause: rpcPayload.error,
  });
}

async function loadMapActionSources(config: MapFetchConfig) {
  const supabase = getSupabaseBrowserClient();

  return Promise.allSettled([
    supabase.rpc("actions_map_feed", {
      p_south: config.viewport.south,
      p_west: config.viewport.west,
      p_north: config.viewport.north,
      p_east: config.viewport.east,
      p_zoom: config.viewport.zoom,
      p_status: config.status,
      p_floor_date: config.floorDate,
      p_types: config.types,
      p_impact: config.impact,
      p_limit: config.rpcLimit,
    }),
    fetchActionPollutionScoreReferences(supabase),
  ] as const);
}

function unwrapMapRpcResult(
  rpcResult: PromiseSettledResult<ActionsMapRpcResult>,
): ActionsMapRpcResult {
  if (rpcResult.status === "rejected") {
    throw new AppError({
      kind: "server",
      message: "Impossible de charger les points cartographiques.",
      cause: rpcResult.reason,
    });
  }

  if (rpcResult.value.error) {
    throw normalizeMapActionError(rpcResult.value);
  }

  return rpcResult.value;
}

export function buildMapActionsQueryString(
  params: FetchMapActionsParams = {},
): string {
  const config = resolveMapFetchConfig(params);
  const resolvedStatus = resolveMapQueryStatus(params.status);
  const query = new URLSearchParams();
  query.set("limit", String(config.limit));

  if (typeof params.floorDate === "string") {
    query.set("floorDate", params.floorDate);
  } else if (params.floorDate === null) {
    query.set("floorDate", "all");
  } else {
    query.set("days", String(config.days));
  }

  query.set("types", serializeTypes(params.types, "all"));

  if (resolvedStatus !== "all") {
    query.set("status", resolvedStatus);
  }

  setScopeQueryParams(query, params);

  if (params.impact) {
    query.set("impact", params.impact);
  }

  if (params.viewport) {
    query.set("south", String(params.viewport.bounds.south));
    query.set("west", String(params.viewport.bounds.west));
    query.set("north", String(params.viewport.bounds.north));
    query.set("east", String(params.viewport.bounds.east));
    query.set("zoom", String(params.viewport.zoom));
  }

  if (config.qualityMin !== null) {
    query.set("qualityMin", String(config.qualityMin));
  }

  return query.toString();
}

export async function fetchMapActions(
  params: FetchMapActionsParams = {},
): Promise<ActionMapResponse> {
  const query = buildMapActionsQueryString(params);
  if (!params.viewport) {
    try {
      const response = await fetch(`/api/actions/map?${query}`, {
        method: "GET",
        cache: "no-store",
      });
      if (response.ok) {
        const body = (await response.json().catch(() => null)) as
          | ActionMapResponse
          | null;
        if (
          body &&
          typeof body === "object" &&
          Array.isArray(body.items) &&
          typeof body.count === "number"
        ) {
          return body;
        }
      }
    } catch {
      // Fallback below.
    }
  }

  const config = resolveMapFetchConfig(params);
  const [rpcResult, refsResult] = await loadMapActionSources(config);

  const rpcPayload = unwrapMapRpcResult(rpcResult);
  const pollutionScoreReferences: PollutionScoreReferences =
    refsResult.status === "fulfilled"
      ? refsResult.value
      : DEFAULT_POLLUTION_SCORE_REFERENCES;

  const remoteContracts = Array.isArray(rpcPayload.data)
    ? (rpcPayload.data as ActionsMapFeedRow[]).map((row) => toActionContractFromMapFeedRow(row))
    : [];

  const mergedContracts = buildMapContracts(
    remoteContracts,
    [],
    config.scope,
    config.types,
  );
  const items = buildMapItems(
    mergedContracts,
    pollutionScoreReferences,
    config.impact,
    config.qualityMin,
    config.limit,
  );

  return {
    status: "ok",
    count: items.length,
    daysWindow: config.floorDate === null ? null : config.days,
    items,
    partialSource: false,
    sourceHealth: buildMapSourceHealth(),
  };
}
