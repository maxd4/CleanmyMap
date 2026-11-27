import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCompleteGamificationRows } from "./gamification-evidence-pagination";
import { sourceFact } from "./gamification-fact-builders";
import { occurredOnFrom } from "./gamification-fact-timestamps";
import type { GamificationSourceFact } from "./gamification-reconstruction";
import { loadCurrentReferralContribution } from "../referrals/referral-contribution-proof";

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

  const referralChildren = await loadCompleteGamificationRows<{ id?: string; referred_at?: string }>("referral profiles", (from, to) =>
    supabase
    .from("profiles")
    .select("id, referred_at", { count: "exact" })
    .eq("referred_by_profile_id", userId)
    .order("id", { ascending: true })
    .range(from, to),
  );

  for (const child of referralChildren) {
    if (!child.id) continue;
    const contribution = await loadCurrentReferralContribution(supabase, child.id, child.referred_at);
    if (!contribution) continue;
    facts.push(sourceFact({
      mechanicId: "parrainage_utile",
      eventType: "community_referral_invite",
      sourceTable: "referral_contributions",
      sourceId: `referral-contribution:${child.id}`,
      occurredOn: contribution.proof.occurredOn,
      xpAwarded: 2,
      metadata: {
        inviteeUserId: child.id,
        contributionSourceTable: "actions",
        contributionSourceId: contribution.proof.sourceId,
      },
    }));
  }
  return facts;
}
