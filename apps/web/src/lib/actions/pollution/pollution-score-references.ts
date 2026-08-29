import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_POLLUTION_SCORE_REFERENCES,
  type PollutionScoreReferences,
} from "./pollution-score";

type PollutionScoreReferenceRow = {
  waste_per_volunteer: number | null;
  butts_per_volunteer: number | null;
};

// The function reads only publicly selectable approved actions. Keep this
// cache limited to this public aggregate; do not reuse it for user-scoped data.
const SERVER_CACHE_TTL_MS = 5 * 60 * 1000;

let serverCache:
  | { expiresAt: number; references: PollutionScoreReferences }
  | null = null;
let serverFetchInFlight: Promise<PollutionScoreReferences> | null = null;

function normalizePollutionScoreReferenceRows(
  data: unknown,
): PollutionScoreReferenceRow[] {
  if (Array.isArray(data)) {
    return data as PollutionScoreReferenceRow[];
  }
  if (data) {
    return [data as PollutionScoreReferenceRow];
  }
  return [];
}

function isPositiveFiniteReference(value: number | null | undefined): value is number {
  const candidate = Number(value ?? 0);
  return Number.isFinite(candidate) && candidate > 0;
}

export async function fetchActionPollutionScoreReferences(
  supabase: SupabaseClient,
): Promise<PollutionScoreReferences> {
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
): Promise<PollutionScoreReferences> {
  const result = await supabase.rpc("action_pollution_score_references");

  if (result.error) {
    throw result.error;
  }

  const rows = normalizePollutionScoreReferenceRows(result.data);
  const row = rows[0] ?? null;

  if (
    isPositiveFiniteReference(row?.waste_per_volunteer) &&
    isPositiveFiniteReference(row?.butts_per_volunteer)
  ) {
    return {
      wastePerVolunteer: Number(row.waste_per_volunteer),
      buttsPerVolunteer: Number(row.butts_per_volunteer),
    };
  }

  return DEFAULT_POLLUTION_SCORE_REFERENCES;
}
