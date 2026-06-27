import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_POLLUTION_SCORE_REFERENCES,
  type PollutionScoreReferences,
} from "./pollution-score";

type PollutionScoreReferenceRow = {
  waste_per_volunteer: number | null;
  butts_per_volunteer: number | null;
};

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

function resolvePollutionScoreReferenceValue(
  value: number | null | undefined,
  fallback: number,
): number {
  const candidate = Number(value ?? 0);
  return Number.isFinite(candidate) && candidate > 0 ? candidate : fallback;
}

export async function fetchActionPollutionScoreReferences(
  supabase: SupabaseClient,
): Promise<PollutionScoreReferences> {
  const result = await supabase.rpc("action_pollution_score_references");

  if (result.error) {
    throw result.error;
  }

  const rows = normalizePollutionScoreReferenceRows(result.data);
  const row = rows[0] ?? null;

  return {
    wastePerVolunteer: resolvePollutionScoreReferenceValue(
      row?.waste_per_volunteer,
      DEFAULT_POLLUTION_SCORE_REFERENCES.wastePerVolunteer,
    ),
    buttsPerVolunteer: resolvePollutionScoreReferenceValue(
      row?.butts_per_volunteer,
      DEFAULT_POLLUTION_SCORE_REFERENCES.buttsPerVolunteer,
    ),
  };
}
