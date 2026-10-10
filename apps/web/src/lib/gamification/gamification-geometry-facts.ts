import type { SupabaseClient } from "@supabase/supabase-js";
import { occurredOnFrom } from "./gamification-fact-timestamps";
import { sourceFact } from "./gamification-fact-builders";
import type { GamificationSourceFact } from "./gamification-reconstruction";

type GeometryContributionRow = {
  action_id?: string;
  observed_at?: string | null;
};

export function buildGeometryContributionFacts(
  rows: readonly GeometryContributionRow[],
): GamificationSourceFact[] {
  const firstAcceptedObservationByAction = new Map<string, string>();
  for (const row of rows) {
    if (!row.action_id || firstAcceptedObservationByAction.has(row.action_id)) continue;
    firstAcceptedObservationByAction.set(
      row.action_id,
      occurredOnFrom(row.observed_at),
    );
  }

  return [...firstAcceptedObservationByAction.entries()].map(([actionId, occurredOn]) =>
    sourceFact({
      mechanicId: "cartography",
      eventType: "verified_geometry_contribution",
      sourceTable: "action_geometry_contributions",
      sourceId: actionId,
      occurredOn,
      xpAwarded: 1,
      metadata: {
        actionId,
        recognition: "distinct_action_with_accepted_terrain_contribution",
        noXpPerFile: true,
        noXpPerKilometer: true,
      },
    }),
  );
}

export async function loadGeometryContributionFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationSourceFact[]> {
  const result = await supabase
    .from("action_geometry_contributions")
    .select("action_id, observed_at, id")
    .eq("contributor_clerk_id", userId)
    .eq("validation_state", "accepted")
    .order("observed_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(10000);
  if (result.error) throw new Error(result.error.message);
  return buildGeometryContributionFacts((result.data ?? []) as GeometryContributionRow[]);
}
