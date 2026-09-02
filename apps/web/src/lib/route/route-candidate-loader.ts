import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTrashSpotterActionableCandidates,
  isVolunteerRouteEligible,
} from "@/lib/actions/trash-spotter-actionable-candidates";
import {
  toCanonicalSpotContract,
  type TrashSpotterSpotRow,
  type UnifiedSourceHealth,
} from "@/lib/actions/unified-source";
import type { RoutePlannerOrigin } from "./route-planner";
import { routeDistanceKm, type RoutePlannerCandidate } from "./route-planner";

const WALKING_SPEED_KM_PER_HOUR = 4.5;
const MAX_ROUTE_CANDIDATES = 600;

export type RouteCandidateLoadResult = {
  candidates: RoutePlannerCandidate[];
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
  diagnostics: {
    loaded: number;
    eligible: number;
    excludedUnsafe: number;
    excludedOutsideGeographicBudget: number;
    sourcePartial: boolean;
    truncated: boolean;
  };
};

function boundingBox(origin: RoutePlannerOrigin, radiusKm: number) {
  const latitudeDelta = radiusKm / 111;
  const longitudeDelta = radiusKm / (111 * Math.max(0.1, Math.cos((origin.latitude * Math.PI) / 180)));
  return {
    south: Math.max(-90, origin.latitude - latitudeDelta),
    north: Math.min(90, origin.latitude + latitudeDelta),
    west: Math.max(-180, origin.longitude - longitudeDelta),
    east: Math.min(180, origin.longitude + longitudeDelta),
  };
}

function emptyFailureResult(): RouteCandidateLoadResult {
  const sourceHealth: UnifiedSourceHealth = {
    partial: true,
    failedSources: ["spots"],
    availableSources: [],
    warnings: ["Partial data: source(s) unavailable (spots)."],
  };
  return {
    candidates: [],
    isTruncated: false,
    sourceHealth,
    diagnostics: {
      loaded: 0,
      eligible: 0,
      excludedUnsafe: 0,
      excludedOutsideGeographicBudget: 0,
      sourcePartial: true,
      truncated: false,
    },
  };
}

export async function loadRouteCandidates(
  supabase: SupabaseClient,
  params: {
    origin: RoutePlannerOrigin;
    travelBudgetMinutes: number;
    floorDate: string;
  },
): Promise<RouteCandidateLoadResult> {
  const radiusKm =
    (Math.max(0, params.travelBudgetMinutes) / 60) * WALKING_SPEED_KM_PER_HOUR;
  const bounds = boundingBox(params.origin, radiusKm);

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
    .gte("latitude", bounds.south)
    .lte("latitude", bounds.north)
    .gte("longitude", bounds.west)
    .lte("longitude", bounds.east)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(MAX_ROUTE_CANDIDATES + 1);

  if (result.error) {
    return emptyFailureResult();
  }

  const rows = ((result.data ?? []) as TrashSpotterSpotRow[]);
  const isTruncated = rows.length > MAX_ROUTE_CANDIDATES;
  const loadedRows = rows.slice(0, MAX_ROUTE_CANDIDATES);
  const candidates: RoutePlannerCandidate[] = [];
  let excludedUnsafe = 0;
  let excludedOutsideGeographicBudget = 0;

  for (const row of loadedRows) {
    const actionable = buildTrashSpotterActionableCandidates([
      toCanonicalSpotContract(row),
    ])[0];
    if (!actionable) continue;
    if (!isVolunteerRouteEligible(actionable)) {
      excludedUnsafe += 1;
      continue;
    }
    if (routeDistanceKm(params.origin, actionable) > radiusKm + 1e-9) {
      excludedOutsideGeographicBudget += 1;
      continue;
    }
    candidates.push({
      ...actionable,
      score: 0,
      reason: "",
    });
  }

  return {
    candidates,
    isTruncated,
    sourceHealth: {
      partial: false,
      failedSources: [],
      availableSources: ["spots"],
      warnings: [],
    },
    diagnostics: {
      loaded: loadedRows.length,
      eligible: candidates.length,
      excludedUnsafe,
      excludedOutsideGeographicBudget,
      sourcePartial: false,
      truncated: isTruncated,
    },
  };
}
