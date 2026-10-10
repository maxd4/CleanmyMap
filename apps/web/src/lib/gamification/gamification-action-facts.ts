import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { assessActionMilestones } from "./action-milestones";
import { computeActionBalanceSummary } from "./action-balance-calculation";
import { computeMonthlyRegularityAwards } from "./monthly-regularity";
import { sourceFact, dateOf } from "./gamification-fact-builders";
import type { GamificationSourceFact } from "./gamification-reconstruction";
import type { ActionRow } from "./progression-types";
import {
  computeActionValidationAward,
  evaluateActionQualityScore,
} from "./progression-utils";

type ActionFactsResult = {
  facts: GamificationSourceFact[];
  validatedActions: ActionRow[];
  balance: ReturnType<typeof computeActionBalanceSummary>;
  regularityCount: number;
};

async function loadCanonicalOrganizerIds(
  supabase: SupabaseClient,
  actions: ActionRow[],
): Promise<Map<string, string[]>> {
  const canonicalOrganizerIds = new Map<string, string[]>();
  for (const action of actions) {
    canonicalOrganizerIds.set(
      action.id,
      await loadCanonicalActionOrganizerIdsForAction(supabase, action.id).catch(() => []),
    );
  }
  return canonicalOrganizerIds;
}

function buildActionValidationFacts(
  userId: string,
  validatedActions: ActionRow[],
  canonicalOrganizerIds: Map<string, string[]>,
): GamificationSourceFact[] {
  const facts: GamificationSourceFact[] = [];
  for (const action of validatedActions) {
    const organizers = canonicalOrganizerIds.get(action.id) ?? [];
    if (!organizers.includes(userId)) continue;
    const quality = evaluateActionQualityScore(action);
    const award = computeActionValidationAward(1, quality.grade, organizers.length);
    facts.push(sourceFact({
      mechanicId: "organisation",
      eventType: "action_declare_validation",
      sourceTable: "actions",
      sourceId: action.id,
      occurredOn: dateOf(action),
      xpAwarded: award.xpAwarded,
      metadata: { qualityGrade: quality.grade, organizerCount: organizers.length },
    }));
  }

  const firstAction = validatedActions
    .filter((action) => (canonicalOrganizerIds.get(action.id) ?? []).includes(userId))
    .sort((left, right) => `${dateOf(left)}:${left.id}`.localeCompare(`${dateOf(right)}:${right.id}`))[0];
  if (firstAction) {
    facts.push(sourceFact({
      mechanicId: "premiere_trace_utile",
      eventType: "first_trace_utile",
      sourceTable: "actions",
      sourceId: firstAction.id,
      occurredOn: dateOf(firstAction),
      metadata: { actionId: firstAction.id },
    }));
  }
  return facts;
}

async function loadConfirmedParticipantIds(
  supabase: SupabaseClient,
  validatedActions: ActionRow[],
): Promise<Map<string, string[]>> {
  const confirmedParticipantIdsByAction = new Map<string, string[]>();
  if (validatedActions.length === 0) return confirmedParticipantIdsByAction;
  const participantRows = await supabase
    .from("action_participants")
    .select("action_id, user_id")
    .in("action_id", validatedActions.map((action) => action.id))
    .eq("participation_status", "confirmed");
  if (!participantRows.error) {
    for (const row of (participantRows.data ?? []) as Array<{ action_id?: string; user_id?: string }>) {
      if (!row.action_id || !row.user_id) continue;
      const current = confirmedParticipantIdsByAction.get(row.action_id) ?? [];
      if (!current.includes(row.user_id)) current.push(row.user_id);
      confirmedParticipantIdsByAction.set(row.action_id, current);
    }
  }
  return confirmedParticipantIdsByAction;
}

function buildActionMilestoneFacts(
  userId: string,
  validatedActions: ActionRow[],
  canonicalOrganizerIds: Map<string, string[]>,
  confirmedParticipantIdsByAction: Map<string, string[]>,
): GamificationSourceFact[] {
  const actionMilestoneFacts = new Map<string, GamificationSourceFact>();
  for (const action of validatedActions) {
    if (!(canonicalOrganizerIds.get(action.id) ?? []).includes(userId)) continue;
    const quality = evaluateActionQualityScore(action).grade;
    for (const assessment of assessActionMilestones({
      action,
      userId,
      canonicalOrganizerIds: canonicalOrganizerIds.get(action.id) ?? [],
      confirmedParticipantUserIds: confirmedParticipantIdsByAction.get(action.id) ?? [],
      validationQualityGrade: quality,
    })) {
      if (!assessment.qualified || actionMilestoneFacts.has(assessment.id)) continue;
      actionMilestoneFacts.set(assessment.id, sourceFact({
        mechanicId: assessment.id,
        eventType: assessment.eventType,
        sourceTable: "action_milestones",
        sourceId: `action-milestone:${assessment.id}`,
        occurredOn: dateOf(action),
        xpAwarded: assessment.xpAwarded,
        metadata: { actionId: action.id, milestoneId: assessment.id, qualityGrade: quality, reason: assessment.reason },
      }));
    }
  }
  return [...actionMilestoneFacts.values()];
}

export async function buildActionFacts(
  supabase: SupabaseClient,
  userId: string,
  actions: ActionRow[],
  validatedActionIds: Set<string>,
): Promise<ActionFactsResult> {
  const validatedActions = actions.filter((action) => validatedActionIds.has(action.id));
  const canonicalOrganizerIds = await loadCanonicalOrganizerIds(supabase, actions);
  const facts = buildActionValidationFacts(userId, validatedActions, canonicalOrganizerIds);
  const confirmedParticipantIdsByAction = await loadConfirmedParticipantIds(supabase, validatedActions);
  facts.push(...buildActionMilestoneFacts(
    userId,
    validatedActions,
    canonicalOrganizerIds,
    confirmedParticipantIdsByAction,
  ));
  const regularityAwards = computeMonthlyRegularityAwards(actions);
  for (const award of regularityAwards) {
    facts.push(sourceFact({
      mechanicId: "regularity",
      eventType: "action_monthly_regularity",
      sourceTable: "actions",
      sourceId: award.sourceId,
      occurredOn: award.occurredOn,
      xpAwarded: award.xpAwarded,
      threshold: award.streak,
      metadata: { monthKey: award.monthKey, actionCount: award.actionCount, streak: award.streak },
    }));
  }
  const balance = computeActionBalanceSummary(actions, validatedActionIds);
  for (const award of balance.awards) {
    facts.push(sourceFact({
      mechanicId: "versatility",
      eventType: "action_balance_cycle",
      sourceTable: "actions",
      sourceId: award.sourceId,
      occurredOn: award.occurredOn,
      xpAwarded: award.xpAwarded,
      threshold: award.requiredPerType,
      metadata: { cycleIndex: award.cycleIndex, requiredPerType: award.requiredPerType },
    }));
  }
  return { facts, validatedActions, balance, regularityCount: regularityAwards.length };
}
