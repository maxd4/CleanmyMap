import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
  toCanonicalSpotContract,
  type TrashSpotterSpotRow,
  type UnifiedSourceHealth,
} from "@/lib/actions/unified-source";

export type RouteRecommendationSourceResult = {
  items: ActionDataContract[];
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
};

function unavailableSourceResult(): RouteRecommendationSourceResult {
  return {
    items: [],
    isTruncated: false,
    sourceHealth: {
      partial: true,
      failedSources: ["spots"],
      availableSources: [],
      warnings: ["Partial data: source(s) unavailable (spots)."],
    },
  };
}

/**
 * Loads only validated Trash Spotter spots for route recommendations.
 * This source is intentionally separate from the unified action loader:
 * `approved` maps to both validated and cleaned for canonical spots.
 */
export async function loadRouteRecommendationSource(
  supabase: SupabaseClient,
  params: { limit: number; floorDate: string },
): Promise<RouteRecommendationSourceResult> {
  try {
    const result = await supabase
      .from("trash_spotter_spots")
      .select(
        "id, created_at, created_by_clerk_id, label, spot_type, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, geometry_confidence, geometry_source, status, notes",
      )
      .eq("status", "validated")
      .eq("spot_type", "spot")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("created_at", `${params.floorDate}T00:00:00.000Z`)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(params.limit + 1);

    if (result.error) {
      return unavailableSourceResult();
    }

    const rows = (Array.isArray(result.data) ? result.data : []) as TrashSpotterSpotRow[];
    const validatedRows = rows.filter(
      (row) => row.status === "validated" && row.spot_type === "spot",
    );
    const isTruncated = validatedRows.length > params.limit;
    const items = validatedRows
      .slice(0, params.limit)
      .map(toCanonicalSpotContract);

    return {
      items,
      isTruncated,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["spots"],
        warnings: [],
      },
    };
  } catch {
    return unavailableSourceResult();
  }
}
