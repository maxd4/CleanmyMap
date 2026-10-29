import type {
  ActionImpactLevel,
  ActionMapResponse,
  ActionStatus,
} from "@/lib/actions/types";
import type { ActionContextFilter } from "@/lib/actions/action-context";
import type { MapViewportState } from "@/lib/geo/map-viewport";
import type { ReportScopeKind } from "@/lib/reports/scope";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppError } from "@/lib/errors/app-errors";
import { fetchActionPollutionScoreReferences } from "../pollution/pollution-score-references";
import type { PollutionScoreReferences } from "../pollution/pollution-score";
import {
  buildMapResponseItems,
  buildMapSourceHealth,
  mapFeedRowsToPublicContracts,
  resolveMapFetchConfig,
  type ActionsMapRpcResult,
  type ActionsMapFeedRow,
  type MapFetchConfig,
} from "./map-http-contracts";
import {
  resolveMapQueryStatus,
  serializeTypes,
  setScopeQueryParams,
  filterMapItemsByViewport,
} from "./map-http-utils";

export type FetchMapActionsParams = {
  actionId?: string | null;
  status?: ActionStatus | "all";
  limit?: number;
  days?: number;
  floorDate?: string | null;
  types?: import("./map-http-utils").ActionTypeFilter;
  association?: string | "all";
  scopeKind?: ReportScopeKind;
  scopeValue?: string | null;
  impact?: ActionImpactLevel;
  qualityMin?: number;
  contextFilter?: ActionContextFilter;
  viewport?: MapViewportState | null;
};

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
  query.set("status", resolvedStatus);
  setScopeQueryParams(query, params);

  if (params.impact) query.set("impact", params.impact);
  if (config.contextFilter !== "all") query.set("context", config.contextFilter);
  if (params.actionId) query.set("actionId", params.actionId);
  if (params.viewport) {
    query.set("south", String(params.viewport.bounds.south));
    query.set("west", String(params.viewport.bounds.west));
    query.set("north", String(params.viewport.bounds.north));
    query.set("east", String(params.viewport.bounds.east));
    query.set("zoom", String(params.viewport.zoom));
  }
  if (config.qualityMin !== null) query.set("qualityMin", String(config.qualityMin));
  return query.toString();
}

export async function fetchMapActions(
  params: FetchMapActionsParams = {},
): Promise<ActionMapResponse> {
  const query = buildMapActionsQueryString(params);
  try {
    const response = await fetch(`/api/actions/map?${query}`, {
      method: "GET",
      cache: "no-store",
    });
    if (response.ok) {
      const body = (await response.json().catch(() => null)) as ActionMapResponse | null;
      if (body && typeof body === "object" && Array.isArray(body.items) && typeof body.count === "number") {
        const publicItems = body.items.filter((item) => item.status === "approved");
        const items = filterMapItemsByViewport(publicItems, params.viewport);
        return { ...body, count: items.length, items };
      }
    }
  } catch {
    // The browser API is a fast path; the direct Supabase path below remains the canonical fallback.
  }

  const config = resolveMapFetchConfig(params);
  const [rpcResult, refsResult] = await loadMapActionSources(config);
  const rpcPayload = unwrapMapRpcResult(rpcResult);
  const pollutionScoreReferences: PollutionScoreReferences | null =
    refsResult.status === "fulfilled" ? refsResult.value : null;
  const remoteContracts = Array.isArray(rpcPayload.data)
    ? mapFeedRowsToPublicContracts(rpcPayload.data as ActionsMapFeedRow[])
    : [];
  const sourceIsTruncated = Array.isArray(rpcPayload.data) && rpcPayload.data.length >= config.rpcLimit;
  const boundedCandidateItems = buildMapResponseItems({
    remoteContracts,
    scope: config.scope,
    types: config.types,
    pollutionScoreReferences,
    impact: config.impact,
    qualityMin: config.qualityMin,
    contextFilter: config.contextFilter,
    limit: config.limit,
  });
  const isTruncated = sourceIsTruncated || boundedCandidateItems.length > config.limit;
  const items = boundedCandidateItems.slice(0, config.limit);

  return {
    status: "ok",
    count: items.length,
    daysWindow: config.floorDate === null ? null : config.days,
    items,
    isTruncated,
    partialSource: false,
    sourceHealth: buildMapSourceHealth(),
  };
}
