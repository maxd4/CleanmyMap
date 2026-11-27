import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActionRowsForUser, loadCurrentValidatedActionIdsForUser } from "../progression-data";
import { occurredOnFrom } from "../progression/gamification-fact-timestamps";
import { dateOf } from "../progression/gamification-fact-builders";
import type { ActionRow } from "../progression/progression-types";

export type ReferralContributionProof = {
  sourceTable: "actions";
  sourceId: string;
  occurredOn: string;
};

type CurrentReferralContribution = {
  proof: ReferralContributionProof;
  eligibleSourceIds: Set<string>;
};

/** First CURRENT confirmed contribution, with stable civil-date and ID ordering. */
export function selectReferralContribution(
  actions: readonly ActionRow[],
  validatedActionIds: ReadonlySet<string>,
  referredAt?: string | null,
): CurrentReferralContribution | null {
  const eligibleActions = actions
    .filter((action) => action.status === "approved" && validatedActionIds.has(action.id))
    .sort((left, right) => `${dateOf(left)}:${left.id}`.localeCompare(`${dateOf(right)}:${right.id}`));
  const first = eligibleActions[0];
  if (!first) return null;
  return {
    proof: { sourceTable: "actions", sourceId: first.id, occurredOn: occurredOnFrom(first.action_date || first.created_at || referredAt) },
    eligibleSourceIds: new Set(eligibleActions.map((action) => action.id)),
  };
}

export async function loadCurrentReferralContribution(
  supabase: SupabaseClient,
  inviteeUserId: string,
  referredAt?: string | null,
): Promise<CurrentReferralContribution | null> {
  const actions = await loadActionRowsForUser(supabase, inviteeUserId, { complete: true });
  const validatedActionIds = await loadCurrentValidatedActionIdsForUser(supabase, inviteeUserId, { actionRows: actions });
  return selectReferralContribution(actions, validatedActionIds, referredAt);
}
