import type {
  ActionImpactLevel,
  ActionListResponse,
  ActionMapResponse,
  ActionQualityGrade,
  ActionRecordType,
  ActionStatus,
  CreateActionPayload,
} from "@/lib/actions/types";
import { toContractCreatePayload } from "./data-contract";
import {
  buildActionDataContract,
  toActionMapItem,
  type ActionDataContract,
} from "./data-contract";
import { extractActionMetadataFromNotes } from "./metadata";
import { parseDrawingFromNotes } from "./drawing";
import { buildActionInsights } from "./insights";
import { loadLocalActionContracts } from "@/lib/data/map-records";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MapViewportState } from "@/components/actions/map/map-export.types";
import { buildDateFloor } from "@/lib/pilotage/overview.utils";
import type { ReportScopeKind } from "@/lib/reports/scope";
import { AppError, type AppErrorKind, defaultMessageForKind } from "@/lib/errors/app-errors";

type ActionTypeFilter = ActionRecordType | "all" | ActionRecordType[];

type FetchActionsParams = {
  status?: ActionStatus | "all";
  limit?: number;
  days?: number;
  types?: ActionTypeFilter;
  association?: string | "all";
  scopeKind?: ReportScopeKind;
  scopeValue?: string | null;
  qualityGrade?: ActionQualityGrade;
  toFixPriority?: boolean;
  impact?: ActionImpactLevel;
};

type FetchMapActionsParams = {
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

type MapFeedRpcRow = {
  id: string;
  source: string;
  entity_type: ActionRecordType;
  status: string;
  created_by_clerk_id: string | null;
  created_at: string;
  updated_at: string | null;
  observed_at: string;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  waste_kg: number | null;
  cigarette_butts: number | null;
  volunteers_count: number | null;
  duration_minutes: number | null;
  notes: string | null;
  derived_geometry_kind: string | null;
  derived_geometry_geojson: string | null;
  geometry_confidence: number | null;
  geometry_source: string | null;
};

type MapFeedRpcParams = {
  p_south: number | null;
  p_west: number | null;
  p_north: number | null;
  p_east: number | null;
  p_zoom: number | null;
  p_status: ActionStatus | null;
  p_floor_date: string | null;
  p_types: ActionRecordType[] | null;
  p_impact: ActionImpactLevel | null;
  p_limit: number;
};

function setScopeQueryParams(
  query: URLSearchParams,
  params: {
    association?: string | "all";
    scopeKind?: ReportScopeKind;
    scopeValue?: string | null;
  },
): void {
  if (params.scopeKind && params.scopeKind !== "global") {
    query.set("scopeKind", params.scopeKind);
    if (typeof params.scopeValue === "string" && params.scopeValue.trim()) {
      query.set("scopeValue", params.scopeValue.trim());
    }
    return;
  }
  if (
    typeof params.association === "string" &&
    params.association !== "all" &&
    params.association.trim().length > 0
  ) {
    query.set("association", params.association.trim());
  }
}

function clampInteger(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeMapTypes(raw: ActionTypeFilter | undefined): ActionRecordType[] | null {
  if (!raw || raw === "all") {
    return null;
  }
  return [...new Set(raw)] as ActionRecordType[];
}

function resolveMapStatus(raw: ActionStatus | "all" | undefined): ActionStatus | null {
  if (!raw || raw === "all") {
    return null;
  }
  return raw;
}

function resolveMapFloorDate(params: FetchMapActionsParams): string | null {
  if (typeof params.floorDate === "string") {
    return params.floorDate;
  }
  if (params.floorDate === null) {
    return null;
  }
  if (typeof params.days === "number") {
    return buildDateFloor(clampInteger(params.days, 1, 3650, 30));
  }
  return buildDateFloor(30);
}

function clampMapLimit(limit: number | undefined): number {
  return clampInteger(limit, 1, 300, 80);
}

export function buildMapFeedRpcParams(params: FetchMapActionsParams): MapFeedRpcParams {
  const viewport = params.viewport ?? null;
  return {
    p_south: viewport ? viewport.bounds.south : null,
    p_west: viewport ? viewport.bounds.west : null,
    p_north: viewport ? viewport.bounds.north : null,
    p_east: viewport ? viewport.bounds.east : null,
    p_zoom: viewport ? viewport.zoom : null,
    p_status: resolveMapStatus(params.status),
    p_floor_date: resolveMapFloorDate(params),
    p_types: normalizeMapTypes(params.types),
    p_impact: params.impact ?? null,
    p_limit: Math.min(
      300,
      Math.max(1, clampMapLimit(params.limit) * 3),
    ),
  };
}

function mapSpotStatusToActionStatus(status: string): ActionStatus {
  if (status === "validated" || status === "cleaned") {
    return "approved";
  }
  if (status === "rejected") {
    return "rejected";
  }
  return "pending";
}

function mapEntityTypeFromRow(row: MapFeedRpcRow): ActionRecordType {
  if (row.source === "trash_spotter_spots") {
    return row.entity_type === "spot" ? "spot" : "clean_place";
  }
  return row.entity_type;
}

function toActionContractFromMapRow(row: MapFeedRpcRow): ActionDataContract {
  const parsedNotes = parseDrawingFromNotes(row.notes);
  const parsedMetadata = extractActionMetadataFromNotes(parsedNotes.cleanNotes);

  return buildActionDataContract({
    id: row.id,
    type: mapEntityTypeFromRow(row),
    status:
      row.source === "trash_spotter_spots"
        ? mapSpotStatusToActionStatus(row.status)
        : (row.status as ActionStatus),
    source: row.source,
    createdByClerkId: row.created_by_clerk_id,
    observedAt: row.observed_at,
    createdAt: row.created_at,
    importedAt: null,
    validatedAt: row.updated_at,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    wasteKg: row.waste_kg,
    cigaretteButts: row.cigarette_butts,
    volunteersCount: row.volunteers_count,
    durationMinutes: row.duration_minutes,
    actorName: null,
    associationName: parsedMetadata.associationName,
    groupJoinEnabled: parsedMetadata.groupJoinEnabled,
    placeType: parsedMetadata.placeType,
    departureLocationLabel: parsedMetadata.departureLocationLabel,
    arrivalLocationLabel: parsedMetadata.arrivalLocationLabel,
    routeStyle: parsedMetadata.routeStyle,
    routeAdjustmentMessage: parsedMetadata.routeAdjustmentMessage,
    notes: parsedNotes.cleanNotes,
    notesPlain: parsedNotes.cleanNotes,
    submissionMode: parsedMetadata.submissionMode,
    wasteBreakdown: parsedMetadata.wasteBreakdown,
    manualDrawing: parsedNotes.manualDrawing,
    manualDrawingGeoJson: parsedNotes.drawingJson,
    derivedGeometryKind: row.derived_geometry_kind as
      | ActionDataContract["geometry"]["kind"]
      | null,
    derivedGeometryGeoJson: row.derived_geometry_geojson,
    geometryConfidence: row.geometry_confidence,
    geometrySource: row.geometry_source as
      | ActionDataContract["geometry"]["geometrySource"]
      | null,
  });
}

function dedupeMapContracts(contracts: ActionDataContract[]): ActionDataContract[] {
  const seen = new Set<string>();
  const output: ActionDataContract[] = [];
  for (const contract of contracts) {
    const key = `${contract.id}::${contract.type}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(contract);
  }
  return output;
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const value = (payload as { error?: unknown }).error;
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

function kindFromStatus(status: number): AppErrorKind {
  if (status === 400 || status === 422) {
    return "validation";
  }
  if (status === 401 || status === 403) {
    return "permission";
  }
  if (status === 429) {
    return "network";
  }
  return "server";
}

function createActionError(
  response: Response,
  payload: unknown,
  fallback: string,
): AppError {
  const kind = kindFromStatus(response.status);
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  return new AppError({
    kind,
    message: parseErrorMessage(body, fallback || defaultMessageForKind(kind)),
    status: response.status,
    code: typeof body?.["code"] === "string" ? String(body["code"]) : undefined,
    referenceCode:
      typeof body?.["referenceCode"] === "string"
        ? String(body["referenceCode"])
        : undefined,
    retryable: kind === "network" || kind === "server",
    details:
      body?.["details"] && typeof body["details"] === "object"
        ? (body["details"] as Record<string, unknown>)
        : undefined,
  });
}

function serializeTypes(
  raw: ActionTypeFilter | undefined,
  fallback: ActionTypeFilter,
): string {
  const value = raw ?? fallback;
  if (value === "all") {
    return "all";
  }
  if (typeof value === "string") {
    return value;
  }
  const deduped = [...new Set(value)];
  if (deduped.length === 0) {
    return "all";
  }
  return deduped.join(",");
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function buildActionsQueryString(
  params: FetchActionsParams = {},
): string {
  const query = new URLSearchParams();
  query.set("limit", String(clampInteger(params.limit, 1, 200, 30)));
  if (typeof params.days === "number") {
    query.set("days", String(clampInteger(params.days, 1, 3650, 90)));
  }
  query.set("types", serializeTypes(params.types, "action"));
  if (params.status && params.status !== "all") {
    query.set("status", params.status);
  }
  setScopeQueryParams(query, params);
  if (params.qualityGrade) {
    query.set("qualityGrade", params.qualityGrade);
  }
  if (typeof params.toFixPriority === "boolean") {
    query.set("toFixPriority", String(params.toFixPriority));
  }
  if (params.impact) {
    query.set("impact", params.impact);
  }
  return query.toString();
}

export function buildMapActionsQueryString(
  params: FetchMapActionsParams = {},
): string {
  const query = new URLSearchParams();
  query.set("limit", String(clampInteger(params.limit, 1, 300, 80)));
  if (typeof params.floorDate === "string") {
    query.set("floorDate", params.floorDate);
  } else if (params.floorDate === null) {
    query.set("floorDate", "all");
  } else {
    query.set("days", String(clampInteger(params.days, 1, 3650, 30)));
  }
  query.set("types", serializeTypes(params.types, "all"));
  const resolvedStatus = params.status ?? "approved";
  if (resolvedStatus !== "all") {
    query.set("status", resolvedStatus);
  }
  setScopeQueryParams(query, params);
  if (params.impact) {
    query.set("impact", params.impact);
  }
  if (
    typeof params.qualityMin === "number" &&
    Number.isFinite(params.qualityMin)
  ) {
    query.set(
      "qualityMin",
      String(Math.max(0, Math.min(100, Math.round(params.qualityMin)))),
    );
  }
  return query.toString();
}

export async function createAction(
  payload: CreateActionPayload,
): Promise<{
  id: string;
  retentionLoop?: {
    summary: string;
    badge: string;
    thanksMessage: string;
    share: { text: string; url: string };
    nextActionSuggestion: string;
  } | null;
}> {
  const postPayload = async (bodyPayload: unknown) => {
    const response = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
    });
    const body = await parseJsonSafely(response);
    return { response, body };
  };

  const contractPayload = toContractCreatePayload(payload);
  const contractResult = await postPayload(contractPayload);
  const contractError = parseErrorMessage(
    contractResult.body,
    "Impossible de créer l'action.",
  );

  if (!contractResult.response.ok) {
    if (
      contractResult.response.status === 400 ||
      contractResult.response.status === 422
    ) {
      const legacyResult = await postPayload(payload);
      if (legacyResult.response.ok) {
        const legacyBody = legacyResult.body;
        if (
          !legacyBody ||
          typeof legacyBody !== "object" ||
          typeof (legacyBody as { id?: unknown }).id !== "string"
        ) {
          throw new AppError({
            kind: "server",
            message: "La réponse du service est incomplète après la création.",
          });
        }

        const parsedBody = legacyBody as {
          id: string;
          retentionLoop?: {
            summary: string;
            badge: string;
            thanksMessage: string;
            share: { text: string; url: string };
            nextActionSuggestion: string;
          } | null;
        };

        return {
          id: parsedBody.id,
          retentionLoop: parsedBody.retentionLoop ?? null,
        };
      }

      throw createActionError(
        legacyResult.response,
        legacyResult.body,
        contractError || "Impossible de créer l'action.",
      );
    }

    throw createActionError(
      contractResult.response,
      contractResult.body,
      contractError,
    );
  }

  const body = contractResult.body;
  if (!body || typeof body !== "object" || typeof (body as { id?: unknown }).id !== "string") {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète après la création.",
    });
  }

  const parsedBody = body as {
    id: string;
    retentionLoop?: {
      summary: string;
      badge: string;
      thanksMessage: string;
      share: { text: string; url: string };
      nextActionSuggestion: string;
    } | null;
  };

  return { id: parsedBody.id, retentionLoop: parsedBody.retentionLoop ?? null };
}

export async function fetchActions(
  params: FetchActionsParams = {},
): Promise<ActionListResponse> {
  const query = buildActionsQueryString(params);
  const response = await fetch(`/api/actions?${query}`, {
    method: "GET",
    cache: "no-store",
  });
  const body = await parseJsonSafely(response);

  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de charger l'historique."),
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { items?: unknown }).items)
  ) {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète pour l'historique.",
    });
  }

  return body as ActionListResponse;
}

export async function fetchMapActions(
  params: FetchMapActionsParams = {},
): Promise<ActionMapResponse> {
  const supabase = getSupabaseBrowserClient();
  const rpcParams = buildMapFeedRpcParams(params);

  const [remoteResult, localResult] = await Promise.allSettled([
    supabase.rpc("actions_map_feed", rpcParams),
    loadLocalActionContracts({
      status: params.status === "all" ? null : params.status ?? "approved",
      floorDate: resolveMapFloorDate(params),
      limit: rpcParams.p_limit,
      requireCoordinates: true,
    }),
  ]);

  if (remoteResult.status === "rejected") {
    throw new AppError({
      kind: "server",
      message: "Impossible de charger les points cartographiques.",
      details:
        remoteResult.reason instanceof Error
          ? { error: remoteResult.reason.message }
          : { error: String(remoteResult.reason) },
    });
  }

  const remoteRows = remoteResult.value.error
    ? null
    : Array.isArray(remoteResult.value.data)
      ? (remoteResult.value.data as MapFeedRpcRow[])
      : remoteResult.value.data
        ? ([remoteResult.value.data] as MapFeedRpcRow[])
        : [];

  if (remoteResult.value.error) {
    throw new AppError({
      kind: "server",
      message: remoteResult.value.error.message || "Impossible de charger les points cartographiques.",
      details: { error: remoteResult.value.error.message },
    });
  }

  const remoteContracts = (remoteRows ?? []).map(toActionContractFromMapRow);
  const localContracts = localResult.status === "fulfilled" ? localResult.value : [];

  const contracts = dedupeMapContracts([...remoteContracts, ...localContracts]);
  const now = new Date();
  const limit = clampMapLimit(params.limit);
  const filteredContracts = contracts.filter((contract) => {
    if (params.status && params.status !== "all" && contract.status !== params.status) {
      return false;
    }
    if (typeof params.qualityMin === "number" && Number.isFinite(params.qualityMin)) {
      const insights = buildActionInsights(contract, now);
      if (insights.qualityScore < params.qualityMin) {
        return false;
      }
    }
    return true;
  });

  const items = filteredContracts
    .map((contract) => {
      const insights = buildActionInsights(contract, now);
      return toActionMapItem(contract, insights);
    })
    .slice(0, limit);

  return {
    status: "ok",
    count: items.length,
    daysWindow: params.floorDate === null ? null : typeof params.days === "number" ? params.days : null,
    items,
    partialSource: localResult.status === "rejected",
    sourceHealth: {
      partial: localResult.status === "rejected",
      failedSources:
        localResult.status === "rejected" ? ["local"] : [],
      availableSources:
        localResult.status === "rejected"
          ? ["actions", "spots"]
          : ["actions", "spots", "local"],
      warnings:
        localResult.status === "rejected"
          ? ["Le stockage local de la carte est indisponible."]
          : [],
    },
  };
}

export type ActionPrefillResponse = {
  status: "ok";
  prefill: {
    actionDate: string;
    actorName: string;
    associationName: string | null;
    locationLabel: string | null;
    volunteersCount: number;
    durationMinutes: number;
  };
  basedOn: {
    recentDeclarations: number;
  };
};

export async function fetchActionPrefill(): Promise<ActionPrefillResponse> {
  const response = await fetch("/api/actions/prefill", {
    method: "GET",
    cache: "no-store",
  });
  const body = await parseJsonSafely(response);
  if (!response.ok) {
    throw createActionError(
      response,
      body,
      parseErrorMessage(body, "Impossible de charger le pre-remplissage."),
    );
  }
  if (!body || typeof body !== "object") {
    throw new AppError({
      kind: "server",
      message: "La réponse du service est incomplète pour le pre-remplissage.",
    });
  }
  return body as ActionPrefillResponse;
}
