import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActions } from "@/lib/actions/store";
import { loadLocalActionContracts } from "@/lib/data/map-records";
import { logFailure } from "@/lib/logging/failure-log";
import type {
  UnifiedActionContractsParams,
  UnifiedActionSourceLoadResult,
  LegacySpotRow,
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
    .order("created_at", { ascending: false })
    .limit(params.limit + 1);

  if (params.floorDate) {
    query = query.gte("created_at", `${params.floorDate}T00:00:00.000Z`);
  }
  if (params.requireCoordinates) {
    query = query.not("latitude", "is", null).not("longitude", "is", null);
  }
  if (params.viewport) {
    query = query
      .gte("latitude", params.viewport.south)
      .lte("latitude", params.viewport.north)
      .gte("longitude", params.viewport.west)
      .lte("longitude", params.viewport.east);
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

async function loadLegacySpots(
  supabase: SupabaseClient,
  params: UnifiedActionContractsParams,
): Promise<LegacySpotRow[]> {
  const spotStatuses = mapActionStatusToSpotStatuses(params.status);
  if (spotStatuses && spotStatuses.length === 0) {
    return [];
  }

  let query = supabase
    .from("spots")
    .select(
      "id, created_at, created_by_clerk_id, label, waste_type, latitude, longitude, status, notes",
    )
    .order("created_at", { ascending: false })
    .limit(params.limit + 1);

  if (params.floorDate) {
    query = query.gte("created_at", `${params.floorDate}T00:00:00.000Z`);
  }
  if (params.requireCoordinates) {
    query = query.not("latitude", "is", null).not("longitude", "is", null);
  }
  if (params.viewport) {
    query = query
      .gte("latitude", params.viewport.south)
      .lte("latitude", params.viewport.north)
      .gte("longitude", params.viewport.west)
      .lte("longitude", params.viewport.east);
  }
  if (spotStatuses) {
    query = query.in("status", spotStatuses);
  }

  const result = await query;
  if (result.error) {
    throw result.error;
  }
  return (result.data ?? []) as LegacySpotRow[];
}

export async function loadUnifiedActionSourceData(
  supabase: SupabaseClient,
  params: UnifiedActionContractsParams,
): Promise<UnifiedActionSourceLoadResult> {
  const [remoteRowsResult, remoteSpotsResult, legacySpotsResult, localContracts] =
    await Promise.allSettled([
      fetchActions(supabase, {
        limit: params.limit + 1,
        status: params.status,
        floorDate: params.floorDate ?? undefined,
        requireCoordinates: params.requireCoordinates,
        viewport: params.viewport,
      }),
      loadCanonicalSpots(supabase, params),
      loadLegacySpots(supabase, params),
      loadLocalActionContracts({
        status: params.status,
        floorDate: params.floorDate,
        limit: params.limit + 1,
        requireCoordinates: params.requireCoordinates,
      }),
    ]);

  const failedSources: UnifiedActionSourceLoadResult["failedSources"] = [];
  const availableSources: UnifiedActionSourceLoadResult["availableSources"] = [];

  if (remoteRowsResult.status === "rejected") {
    failedSources.push("actions");
    logFailure("UnifiedSource", "Actions fetch failed", remoteRowsResult.reason, {
      source: "actions",
    });
  } else {
    availableSources.push("actions");
  }

  if (remoteSpotsResult.status === "rejected") {
    failedSources.push("spots");
    logFailure("UnifiedSource", "Trash spotter fetch failed", remoteSpotsResult.reason, {
      source: "trash_spotter_spots",
    });
  } else {
    availableSources.push("spots");
  }

  if (legacySpotsResult.status === "rejected") {
    failedSources.push("spots_legacy");
    logFailure("UnifiedSource", "Legacy spots fetch failed", legacySpotsResult.reason, {
      source: "spots",
    });
  } else {
    availableSources.push("spots_legacy");
  }

  if (localContracts.status === "rejected") {
    throw localContracts.reason;
  }
  availableSources.push("local");

  return {
    remoteRows: remoteRowsResult.status === "fulfilled" ? remoteRowsResult.value : [],
    remoteSpots: remoteSpotsResult.status === "fulfilled" ? remoteSpotsResult.value : [],
    legacySpots: legacySpotsResult.status === "fulfilled" ? legacySpotsResult.value : [],
    localContracts: localContracts.value,
    failedSources,
    availableSources,
  };
}
