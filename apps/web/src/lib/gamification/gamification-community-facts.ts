import type { SupabaseClient } from "@supabase/supabase-js";
import { sourceFact, dateOf } from "./gamification-fact-builders";
import { occurredOnFrom } from "./gamification-fact-timestamps";
import type { GamificationSourceFact } from "./gamification-reconstruction";
import {
  loadActionRowsForUser,
  loadCurrentValidatedActionIdsForUser,
} from "./progression-data";

type ParticipantFactRow = {
  action_id?: string;
  participation_source?: string;
  joined_at?: string;
  updated_at?: string;
};

export async function buildParticipationReferralFacts(
  supabase: SupabaseClient,
  userId: string,
  participantRows: unknown[],
): Promise<GamificationSourceFact[]> {
  const facts: GamificationSourceFact[] = [];
  const participationRows = participantRows as ParticipantFactRow[];
  const recoveredParticipation = participationRows.find((row) =>
    Boolean(row.action_id) && row.participation_source === "post_action_claim");
  if (recoveredParticipation) {
    facts.push(sourceFact({
      mechanicId: "participation_retrouvee",
      eventType: "action_participation_recovered",
      sourceTable: "action_participants",
      sourceId: `participation-retrieved:${userId}`,
      occurredOn: occurredOnFrom(recoveredParticipation.joined_at ?? recoveredParticipation.updated_at),
      xpAwarded: 0,
      metadata: {
        actionId: recoveredParticipation.action_id,
        participationSource: "post_action_claim",
      },
    }));
  }

  const referralChildren = await supabase
    .from("profiles")
    .select("id, referred_at")
    .eq("referred_by_profile_id", userId)
    .limit(10000);
  if (referralChildren.error) return facts;

  for (const child of (referralChildren.data ?? []) as Array<{ id?: string; referred_at?: string }>) {
    if (!child.id) continue;
    const childActions = await loadActionRowsForUser(supabase, child.id);
    const childValidated = await loadCurrentValidatedActionIdsForUser(supabase, child.id, {
      actionRows: childActions,
    });
    const usefulContribution = childActions
      .filter((action) => action.status === "approved" && childValidated.has(action.id))
      .sort((left, right) => `${dateOf(left)}:${left.id}`.localeCompare(`${dateOf(right)}:${right.id}`))[0];
    if (!usefulContribution) continue;
    facts.push(sourceFact({
      mechanicId: "parrainage_utile",
      eventType: "community_referral_invite",
      sourceTable: "referral_contributions",
      sourceId: `referral-contribution:${child.id}`,
      occurredOn: occurredOnFrom(
        usefulContribution.action_date ?? usefulContribution.created_at ?? child.referred_at,
      ),
      xpAwarded: 2,
      metadata: {
        inviteeUserId: child.id,
        contributionSourceTable: "actions",
        contributionSourceId: usefulContribution.id,
      },
    }));
  }
  return facts;
}
