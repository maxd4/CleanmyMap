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

async function loadCanonicalSpots(
  supabase: SupabaseClient,
  params: UnifiedActionContractsParams,
): Promise<TrashSpotterSpotRow[]> {
  const spotStatuses = mapActionStatusToSpotStatuses(params.status);
  if (spotStatuses && spotStatuses.length === 0) {
    return [];
  }

  let query = supabase
    .from("trash_spotter_spots")
    .select(
      "id, created_at, created_by_clerk_id, label, spot_type, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source, status, notes",
    )
    .order("created_at", { ascending: false });
  if (params.limit !== null) {
    query = query.limit(params.limit + 1);
  }

  if (params.floorDate) {
    query = query.gte("created_at", `${params.floorDate}T00:00:00.000Z`);
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
  if (spotStatuses) {
    query = query.in("status", spotStatuses);
  }

  const result = await query;
  if (result.error) {
    throw result.error;
  }
  return (result.data ?? []) as TrashSpotterSpotRow[];
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
          limit: sourceLimit,
          status: params.status,
          includeFuturePublicActions: params.includeFuturePublicActions,
          futureOnly: params.futureOnly,
          floorDate: params.floorDate ?? undefined,
          requireCoordinates: params.requireCoordinates,
          viewport: params.viewport,
        })
      : Promise.resolve([]),
    wantsSpots ? loadCanonicalSpots(supabase, params) : Promise.resolve([]),
  ]);

  const shouldUseLocalFallback =
    wantsActions &&
    remoteRowsResult.status === "rejected" &&
    allowLocalActionStoreInCurrentRuntime();
  const localContractsResult = shouldUseLocalFallback
    ? (await Promise.allSettled([
        loadLocalActionContracts({
          status: params.status,
          floorDate: params.floorDate,
          limit: sourceLimit,
          requireCoordinates: params.requireCoordinates,
        }),
      ]))[0]
    : null;

  const failedSources: UnifiedActionSourceLoadResult["failedSources"] = [];
  const availableSources: UnifiedActionSourceLoadResult["availableSources"] = [];

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

  const localContractsValue =
    localContractsResult?.status === "fulfilled" ? localContractsResult.value : [];

  return {
    remoteRows: remoteRowsResult.status === "fulfilled" ? remoteRowsResult.value : [],
    remoteSpots: remoteSpotsResult.status === "fulfilled" ? remoteSpotsResult.value : [],
    localContracts: localContractsValue,
    failedSources,
    availableSources,
  };
}
