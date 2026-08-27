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

function isPositiveFiniteReference(value: number | null | undefined): value is number {
  const candidate = Number(value ?? 0);
  return Number.isFinite(candidate) && candidate > 0;
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
