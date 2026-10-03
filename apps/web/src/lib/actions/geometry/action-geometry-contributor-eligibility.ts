import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The database function is the canonical owner of observed-geometry
 * eligibility. Server routes call this boundary instead of reimplementing
 * role, organizer, participant, or registration checks independently.
 */
export async function isActionGeometryContributorEligible(
  supabase: SupabaseClient,
  params: { actionId: string; contributorClerkId: string },
): Promise<boolean> {
  const result = await supabase.rpc("is_action_geometry_contributor_eligible", {
    p_action_id: params.actionId,
    p_contributor_clerk_id: params.contributorClerkId,
  });

  if (result.error) {
    throw new Error(`Impossible de vérifier l'éligibilité cartographique : ${result.error.message}`);
  }

  return result.data === true;
}
