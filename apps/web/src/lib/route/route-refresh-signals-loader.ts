import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionRouteVersion } from "./route-active-version";
import type { RouteFreshnessSignal } from "./route-refresh-signals";
import { loadParisPressureSnapshot } from "@/lib/geo/paris-pressure-loader";

function validTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !Number.isFinite(new Date(value).getTime())) {
    return null;
  }
  return value;
}

function newerThan(left: string | null, right: string): boolean {
  return left !== null && new Date(left).getTime() > new Date(right).getTime();
}

function observedIdsForVersion(version: ActionRouteVersion): string[] {
  const predictionIds = new Set(
    version.calculation.provenance.prediction?.selectedCandidateIds ?? [],
  );
  return version.calculation.stops
    .filter((stop) => stop.sourceFamily === "observed" || (!stop.sourceFamily && !predictionIds.has(stop.id)))
    .map((stop) => stop.id)
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

export async function loadRouteFreshnessSignal(
  supabase: SupabaseClient,
  version: ActionRouteVersion,
): Promise<RouteFreshnessSignal> {
  const sourceIds = observedIdsForVersion(version);
  const predictionRefreshedAt = validTimestamp(
    version.calculation.provenance.prediction?.snapshot?.refreshedAt,
  );
  const currentPrediction = loadParisPressureSnapshot();
  const currentPredictionRefreshedAt = predictionRefreshedAt !== null
    ? validTimestamp(currentPrediction?.refreshedAt)
    : null;
  const predictionIsNewer =
    predictionRefreshedAt !== null &&
    currentPredictionRefreshedAt !== null &&
    newerThan(currentPredictionRefreshedAt, predictionRefreshedAt);

  if (sourceIds.length === 0) {
    return {
      status: predictionIsNewer ? "newer" : "current",
      latestSourceAt: currentPredictionRefreshedAt,
    };
  }

  const result = await supabase
    .from("trash_spotter_spots")
    .select("id, updated_at")
    .in("id", sourceIds);
  if (result.error) {
    return { status: "unknown", latestSourceAt: null };
  }

  const rows = (Array.isArray(result.data) ? result.data : []) as Array<{
    id?: unknown;
    updated_at?: unknown;
  }>;
  const currentById = new Map(
    rows
      .filter((row) => typeof row.id === "string")
      .map((row) => [row.id as string, validTimestamp(row.updated_at)] as const),
  );
  const missingSource = sourceIds.some((id) => !currentById.has(id));
  const sourceTimestamps = rows
    .map((row) => validTimestamp(row.updated_at))
    .filter((value): value is string => value !== null);
  const latestSourceAt = [...sourceTimestamps, currentPredictionRefreshedAt]
    .filter((value): value is string => value !== null)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;
  const sourceIsNewer = sourceTimestamps.some((value) => newerThan(value, version.appliedAt));

  return {
    status: predictionIsNewer || sourceIsNewer || missingSource ? "newer" : "current",
    latestSourceAt,
  };
}
