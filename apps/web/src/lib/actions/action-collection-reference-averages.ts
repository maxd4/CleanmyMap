import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ActionCollectionReferenceAverages = {
  wastePerVolunteer: number | null;
  buttsPerVolunteer: number | null;
  wasteSourceCount: number;
  buttsSourceCount: number;
  eligibleActionCount: number;
  updatedAt: string | null;
};

type ActionCollectionReferenceAverageRow = {
  waste_per_volunteer?: number | string | null;
  butts_per_volunteer?: number | string | null;
  waste_source_count?: number | string | null;
  butts_source_count?: number | string | null;
  eligible_action_count?: number | string | null;
  updated_at?: string | null;
};

const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;

let serverCache:
  | { expiresAt: number; references: ActionCollectionReferenceAverages | null }
  | null = null;
let serverFetchInFlight: Promise<ActionCollectionReferenceAverages | null> | null = null;

function toNonNegativeInteger(value: number | string | null | undefined): number | null {
  const candidate = Number(value);
  return Number.isInteger(candidate) && candidate >= 0 ? candidate : null;
}

function toNonNegativeNumber(value: number | string | null | undefined): number | null {
  const candidate = Number(value);
  return Number.isFinite(candidate) && candidate >= 0 ? candidate : null;
}

export function normalizeActionCollectionReferenceAverageRow(
  row: ActionCollectionReferenceAverageRow | null | undefined,
): ActionCollectionReferenceAverages | null {
  if (!row) {
    return null;
  }

  const wasteSourceCount = toNonNegativeInteger(row.waste_source_count);
  const buttsSourceCount = toNonNegativeInteger(row.butts_source_count);
  const eligibleActionCount = toNonNegativeInteger(row.eligible_action_count);
  if (wasteSourceCount === null || buttsSourceCount === null || eligibleActionCount === null) {
    return null;
  }

  return {
    wastePerVolunteer: toNonNegativeNumber(row.waste_per_volunteer),
    buttsPerVolunteer: toNonNegativeNumber(row.butts_per_volunteer),
    wasteSourceCount,
    buttsSourceCount,
    eligibleActionCount,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export async function fetchActionCollectionReferenceAverages(
  supabase: SupabaseClient,
): Promise<ActionCollectionReferenceAverages | null> {
  const result = await supabase.rpc("action_collection_reference_averages_v1");
  if (result.error) {
    throw result.error;
  }

  const row = Array.isArray(result.data)
    ? (result.data[0] as ActionCollectionReferenceAverageRow | undefined)
    : (result.data as ActionCollectionReferenceAverageRow | null);
  return normalizeActionCollectionReferenceAverageRow(row);
}

export async function loadActionCollectionReferenceAverages(): Promise<ActionCollectionReferenceAverages | null> {
  const now = Date.now();
  if (serverCache && serverCache.expiresAt > now) {
    return serverCache.references;
  }
  if (serverFetchInFlight) {
    return serverFetchInFlight;
  }

  serverFetchInFlight = fetchActionCollectionReferenceAverages(getSupabaseServerClient(true))
    .then((references) => {
      serverCache = { references, expiresAt: Date.now() + SERVER_CACHE_TTL_MS };
      return references;
    })
    .finally(() => {
      serverFetchInFlight = null;
    });

  return serverFetchInFlight;
}

export function invalidateActionCollectionReferenceAveragesCache(): void {
  serverCache = null;
}
