import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type PollutionScoreReference,
  type PollutionScoreReferences,
} from "./pollution-score";

type PollutionScoreReferenceRow = {
  scope?: string | null;
  department_code?: string | null;
  department_name?: string | null;
  waste_per_volunteer_hour?: number | null;
  butts_per_volunteer_hour?: number | null;
  waste_source_count?: number | null;
  butts_source_count?: number | null;
  updated_at?: string | null;
};

const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;

let serverCache:
  | { expiresAt: number; references: PollutionScoreReferences | null }
  | null = null;
let serverFetchInFlight: Promise<PollutionScoreReferences | null> | null = null;

function normalizeRows(data: unknown): PollutionScoreReferenceRow[] {
  if (Array.isArray(data)) {
    return data as PollutionScoreReferenceRow[];
  }
  return data && typeof data === "object"
    ? [data as PollutionScoreReferenceRow]
    : [];
}

function toNonNegativeInteger(value: number | null | undefined): number | null {
  const candidate = Number(value);
  return Number.isInteger(candidate) && candidate >= 0 ? candidate : null;
}

function toGlobalReference(row: PollutionScoreReferenceRow): PollutionScoreReference | null {
  const wasteSourceCount = toNonNegativeInteger(row.waste_source_count);
  const buttsSourceCount = toNonNegativeInteger(row.butts_source_count);
  const wasteReference = Number(row.waste_per_volunteer_hour);
  const buttsReference = Number(row.butts_per_volunteer_hour);
  const validWasteReference =
    Number.isFinite(wasteReference) &&
    wasteReference > 0;
  const validButtsReference =
    Number.isFinite(buttsReference) &&
    buttsReference > 0;

  if (
    wasteSourceCount === null ||
    buttsSourceCount === null ||
    (!validWasteReference && !validButtsReference)
  ) {
    return null;
  }

  return {
    wastePerVolunteerHour: validWasteReference ? wasteReference : null,
    buttsPerVolunteerHour: validButtsReference ? buttsReference : null,
    wasteSourceCount,
    buttsSourceCount,
  };
}

export async function fetchActionPollutionScoreReferences(
  supabase: SupabaseClient,
): Promise<PollutionScoreReferences | null> {
  if (typeof window !== "undefined") {
    return fetchUncachedActionPollutionScoreReferences(supabase);
  }

  const now = Date.now();
  if (serverCache && serverCache.expiresAt > now) {
    return serverCache.references;
  }
  if (serverFetchInFlight) {
    return serverFetchInFlight;
  }

  serverFetchInFlight = fetchUncachedActionPollutionScoreReferences(supabase)
    .then((references) => {
      serverCache = {
        references,
        expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
      };
      return references;
    })
    .finally(() => {
      serverFetchInFlight = null;
    });

  return serverFetchInFlight;
}

export function invalidateActionPollutionScoreReferencesCache(): void {
  serverCache = null;
}

async function fetchUncachedActionPollutionScoreReferences(
  supabase: SupabaseClient,
): Promise<PollutionScoreReferences | null> {
  const result = await supabase.rpc("action_pollution_score_references_v2");

  if (result.error) {
    throw result.error;
  }

  const row = normalizeRows(result.data).find(
    (candidate) =>
      candidate.scope === "global" &&
      candidate.department_code === null &&
      candidate.department_name === null,
  );
  const global = row ? toGlobalReference(row) : null;
  return global ? { global } : null;
}
