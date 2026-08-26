import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MY_OBSERVATION_STATUSES,
  MY_OBSERVATION_TYPES,
  type MyObservation,
} from "./my-observations-contract";

export const MY_OBSERVATIONS_DEFAULT_LIMIT = 20;
export const MY_OBSERVATIONS_MAX_LIMIT = 50;

const MY_OBSERVATIONS_SELECT =
  "id, created_at, spot_type, label, status, latitude, longitude, validated_at, cleaned_at";

type MyObservationRow = {
  id: string;
  created_at: string;
  spot_type: MyObservation["type"];
  label: string;
  status: MyObservation["status"];
  latitude: number | null;
  longitude: number | null;
  validated_at: string | null;
  cleaned_at: string | null;
};

export function clampMyObservationsLimit(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return MY_OBSERVATIONS_DEFAULT_LIMIT;
  }
  return Math.min(MY_OBSERVATIONS_MAX_LIMIT, Math.max(1, Math.trunc(value)));
}

function toMyObservation(row: MyObservationRow): MyObservation {
  return {
    id: row.id,
    createdAt: row.created_at,
    type: row.spot_type,
    label: row.label,
    status: row.status,
    latitude: row.latitude,
    longitude: row.longitude,
    validatedAt: row.validated_at,
    cleanedAt: row.cleaned_at,
  };
}

export async function listMyObservations(
  supabase: SupabaseClient,
  params: { userId: string; limit?: number | null },
): Promise<MyObservation[]> {
  const userId = params.userId.trim();
  if (!userId) {
    throw new Error("Authenticated user id is required.");
  }

  const result = await supabase
    .from("trash_spotter_spots")
    .select(MY_OBSERVATIONS_SELECT)
    .eq("created_by_clerk_id", userId)
    .in("spot_type", [...MY_OBSERVATION_TYPES])
    .in("status", [...MY_OBSERVATION_STATUSES])
    .order("created_at", { ascending: false })
    .limit(clampMyObservationsLimit(params.limit));

  if (result.error) {
    throw result.error;
  }

  return ((result.data ?? []) as MyObservationRow[]).map(toMyObservation);
}
