import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_POLLUTION_SCORE_REFERENCES,
  type PollutionScoreReferences,
} from "./pollution-score";

type PollutionScoreReferenceRow = {
  waste_per_volunteer: number | null;
  butts_per_volunteer: number | null;
};

export async function fetchActionPollutionScoreReferences(
  supabase: SupabaseClient,
): Promise<PollutionScoreReferences> {
  const result = await supabase.rpc("action_pollution_score_references");

  if (result.error) {
    throw result.error;
  }

  const rows = Array.isArray(result.data)
    ? (result.data as PollutionScoreReferenceRow[])
    : result.data
      ? ([result.data] as PollutionScoreReferenceRow[])
      : [];
  const row = rows[0] ?? null;

  const wastePerVolunteer = Number(row?.waste_per_volunteer ?? 0);
  const buttsPerVolunteer = Number(row?.butts_per_volunteer ?? 0);

  return {
    wastePerVolunteer:
      Number.isFinite(wastePerVolunteer) && wastePerVolunteer > 0
        ? wastePerVolunteer
        : DEFAULT_POLLUTION_SCORE_REFERENCES.wastePerVolunteer,
    buttsPerVolunteer:
      Number.isFinite(buttsPerVolunteer) && buttsPerVolunteer > 0
        ? buttsPerVolunteer
        : DEFAULT_POLLUTION_SCORE_REFERENCES.buttsPerVolunteer,
  };
}
