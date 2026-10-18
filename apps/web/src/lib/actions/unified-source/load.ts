import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActions } from "@/lib/actions/store";
import { loadLocalActionContracts } from "@/lib/data/map-records";
import { logFailure } from "@/lib/logging/failure-log";
import { allowLocalActionStoreInCurrentRuntime } from "@/lib/persistence/runtime-store";
import type {
  UnifiedActionContractsParams,
  UnifiedActionSourceLoadResult,
  TrashSpotterSpotRow,
} from "./contracts";
import { mapActionStatusToSpotStatuses } from "./contracts";

const CANONICAL_SPOT_PAGE_SIZE = 1000;

function buildCanonicalSpotsQuery(
  supabase: SupabaseClient,
  params: UnifiedActionContractsParams,
  pageSize?: number,
  pageRange?: { from: number; to: number },
) {
  const spotStatuses = mapActionStatusToSpotStatuses(params.status);
  if (spotStatuses && spotStatuses.length === 0) {
    return null;
  }
  let query = supabase
    .from("trash_spotter_spots")
    .select(
      "id, created_at, created_by_clerk_id, label, spot_type, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source, status, notes",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (pageRange && pageSize) {
    query = query.limit(pageSize).range(pageRange.from, pageRange.to);
  } else if (params.limit !== null) {
    query = query.limit(params.limit + 1);
  }

  if (params.floorDate) {
    query = query.gte("created_at", `${params.floorDate}T00:00:00.000Z`);
  }
  if (params.ceilingDate) {
    query = query.lt("created_at", `${params.ceilingDate}T00:00:00.000Z`);
  }
  if (params.requireCoordinates) {
    query = query.not("latitude", "is", null).not("longitude", "is", null);
  }
  if (params.viewport && !params.actionId) {
    query = query
      .gte("latitude", params.viewport.south)
      .lte("latitude", params.viewport.north)
      .gte("longitude", params.viewport.west)
      .lte("longitude", params.viewport.east);
  }
  if (params.actionId) {
    query = query.eq("id", params.actionId);
  }
  if (params.actionIds && params.actionIds.length > 0) {
    query = query.in("id", params.actionIds);
  }
  if (spotStatuses) {
    query = query.in("status", spotStatuses);
  }

  return query;
}

async function loadCanonicalSpots(
  supabase: SupabaseClient,
  params: UnifiedActionContractsParams,
): Promise<TrashSpotterSpotRow[]> {
  const requestedLimit = params.limit === null ? null : params.limit + 1;
  const shouldPaginate =
    requestedLimit === null || requestedLimit > CANONICAL_SPOT_PAGE_SIZE;
  if (!shouldPaginate) {
    const query = buildCanonicalSpotsQuery(supabase, params);
    if (!query) {
      return [];
    }
    const result = await query;
    if (result.error) {
      throw result.error;
    }
    return (result.data ?? []) as TrashSpotterSpotRow[];
  }

  const rows: TrashSpotterSpotRow[] = [];
  let offset = 0;
  let terminated = false;
  const maxPages = 10_000;
  for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
    const remaining = requestedLimit === null
      ? CANONICAL_SPOT_PAGE_SIZE
      : Math.min(CANONICAL_SPOT_PAGE_SIZE, requestedLimit - rows.length);
    if (remaining <= 0) {
      terminated = true;
      break;
    }
    const query = buildCanonicalSpotsQuery(
      supabase,
      params,
      remaining,
      { from: offset, to: offset + remaining - 1 },
    );
    if (!query) {
      terminated = true;
      break;
    }
    const result = await query;
    if (result.error) {
      throw result.error;
    }
    const page = (result.data ?? []) as TrashSpotterSpotRow[];
    if (page.length === 0) {
      terminated = true;
      break;
    }
    rows.push(...page);
    offset += page.length;
    if (requestedLimit !== null && rows.length >= requestedLimit) {
      terminated = true;
      break;
    }
  }

  if (!terminated) {
    throw new Error("Trash Spotter source pagination exceeded its safety bound.");
  }
  return requestedLimit === null ? rows : rows.slice(0, requestedLimit);
}

function canUseLocalActionFallback(
  params: UnifiedActionContractsParams,
  remoteRowsResult: PromiseSettledResult<Awaited<ReturnType<typeof fetchActions>>>,
  wantsActions: boolean,
): boolean {
  return (
    wantsActions &&
    !params.requirePublicCompletedActions &&
    params.actionIds == null &&
    remoteRowsResult.status === "rejected" &&
    allowLocalActionStoreInCurrentRuntime()
  );
}

export async function loadUnifiedActionSourceData(
  supabase: SupabaseClient,
  params: UnifiedActionContractsParams,
): Promise<UnifiedActionSourceLoadResult> {
  const sourceLimit = params.limit === null ? null : params.limit + 1;
  const wantsActions =
    !params.types || params.types.length === 0 || params.types.includes("action");
  const wantsSpots =
    !params.types ||
    params.types.length === 0 ||
    params.types.includes("spot") ||
    params.types.includes("clean_place");

  const [remoteRowsResult, remoteSpotsResult] = await Promise.allSettled([
    wantsActions
      ? fetchActions(supabase, {
          actionId: params.actionId,
          actionIds: params.actionIds,
          limit: sourceLimit,
          status: params.status,
          includeFuturePublicActions: params.includeFuturePublicActions,
          futureOnly: params.futureOnly,
          floorDate: params.floorDate ?? undefined,
          ceilingDate: params.ceilingDate ?? undefined,
          requireCoordinates: params.requireCoordinates,
          requirePublicCompletedActions: params.requirePublicCompletedActions,
          viewport: params.viewport,
        })
      : Promise.resolve([]),
    wantsSpots ? loadCanonicalSpots(supabase, params) : Promise.resolve([]),
  ]);

  const shouldUseLocalFallback = canUseLocalActionFallback(params, remoteRowsResult, wantsActions);
  const localContractsResult = shouldUseLocalFallback
    ? (await Promise.allSettled([
        loadLocalActionContracts({
          status: params.status,
          floorDate: params.floorDate,
          ceilingDate: params.ceilingDate ?? null,
          limit: sourceLimit,
          requireCoordinates: params.requireCoordinates,
        }),
      ]))[0]
    : null;

  const failedSources: UnifiedActionSourceLoadResult["failedSources"] = [];
  const availableSources: UnifiedActionSourceLoadResult["availableSources"] = [];
  const truncatedSources: UnifiedActionSourceLoadResult["truncatedSources"] = [];

  if (wantsActions && remoteRowsResult.status === "rejected") {
    failedSources.push("actions");
    logFailure("UnifiedSource", "Actions fetch failed", remoteRowsResult.reason, {
      source: "actions",
    });
  } else if (wantsActions) {
    availableSources.push("actions");
  }

  if (wantsSpots && remoteSpotsResult.status === "rejected") {
    failedSources.push("spots");
    logFailure("UnifiedSource", "Trash spotter fetch failed", remoteSpotsResult.reason, {
      source: "trash_spotter_spots",
    });
  } else if (wantsSpots) {
    availableSources.push("spots");
  }

  if (shouldUseLocalFallback && localContractsResult?.status === "fulfilled") {
    availableSources.push("local");
  } else if (shouldUseLocalFallback && localContractsResult?.status === "rejected") {
    failedSources.push("local");
    logFailure("UnifiedSource", "Local actions fallback failed", localContractsResult.reason, {
      source: "local",
    });
  }

  if (
    wantsActions &&
    sourceLimit !== null &&
    remoteRowsResult.status === "fulfilled" &&
    remoteRowsResult.value.length >= sourceLimit
  ) {
    truncatedSources.push("actions");
  }
  if (
    wantsSpots &&
    sourceLimit !== null &&
    remoteSpotsResult.status === "fulfilled" &&
    remoteSpotsResult.value.length >= sourceLimit
  ) {
    truncatedSources.push("spots");
  }

  const localContractsValue =
    localContractsResult?.status === "fulfilled" ? localContractsResult.value : [];

  return {
    remoteRows: remoteRowsResult.status === "fulfilled" ? remoteRowsResult.value : [],
    remoteSpots: remoteSpotsResult.status === "fulfilled" ? remoteSpotsResult.value : [],
    localContracts: localContractsValue,
    failedSources,
    availableSources,
    truncatedSources,
  };
}
