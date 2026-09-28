import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { assessActionMilestones } from "./action-milestones";
import { EXPLORER_TIERS, PARTICIPANT_TIERS } from "./badges/families";
import { loadGamificationUserCounters } from "./counters";
import { computeActionBalanceSummary } from "./action-balance-calculation";
import { computeMonthlyRegularityAwards } from "./monthly-regularity";
import { QUIZ_BALANCE_MILESTONES, QUIZ_PROGRESS_MILESTONES } from "./quiz-milestones";
import { listQuizQuestionFormatIds } from "@/lib/learning/quiz/quiz-question-formats";
import {
  computeActionValidationAward,
  evaluateActionQualityScore,
} from "./progression-utils";
import {
  loadActionRowsForUser,
  loadCurrentValidatedActionIdsForUser,
} from "./progression-data";
import { loadResolvedModerationCasesForUser } from "./moderation-progression";
import { collectEligibleCleanZoneSources } from "./clean-zones";
import type { ActionRow } from "./progression-types";
import type {
  GamificationFacts,
  GamificationSourceFact,
} from "./gamification-reconstruction";

function dateOf(row: Pick<ActionRow, "action_date" | "created_at">): string {
  return (row.action_date || row.created_at || new Date(0).toISOString()).slice(0, 10);
}

function sourceFact(input: Omit<GamificationSourceFact, "statusPhase">): GamificationSourceFact {
  return { ...input, statusPhase: "validated" };
}


type QuizProgressFactRow = {
  question_type?: string;
  correct_count?: number;
  updated_at?: string;
};

function appendCounterFacts(
  facts: GamificationSourceFact[],
  userId: string,
  counters: { participationCount: number; visitedPlacesCount: number },
  visitedRows: unknown[],
): void {
  for (const tier of PARTICIPANT_TIERS) {
    if (tier.threshold > 0 && counters.participationCount >= tier.threshold) {
      facts.push(sourceFact({
        mechanicId: "participation",
        eventType: "participant_tier_unlock",
        sourceTable: "action_participants",
        sourceId: `participant:${tier.id}`,
        occurredOn: new Date().toISOString().slice(0, 10),
        xpAwarded: tier.xp,
        threshold: tier.threshold,
        badgeId: tier.id,
        metadata: { tier: tier.id },
      }));
    }
  }
  for (const tier of EXPLORER_TIERS) {
    if (tier.min > 0 && counters.visitedPlacesCount >= tier.min) {
      facts.push(sourceFact({
        mechanicId: "exploration",
        eventType: "explorer_tier_unlock",
        sourceTable: "user_visited_places",
        sourceId: `tier:${tier.id}`,
        occurredOn: new Date().toISOString().slice(0, 10),
        xpAwarded: 1,
        threshold: tier.min,
        badgeId: tier.id,
        metadata: { tier: tier.id },
      }));
    }
  }

  for (const row of visitedRows as Array<{ place_label?: string; created_at?: string }>) {
    const placeLabel = row.place_label?.trim().toLowerCase();
    if (!placeLabel) continue;
    facts.push(sourceFact({
      mechanicId: "exploration",
      eventType: "new_place_discovered",
      sourceTable: "user_visited_places",
      sourceId: `${userId}:${placeLabel}`,
      occurredOn: (row.created_at ?? new Date().toISOString()).slice(0, 10),
      xpAwarded: 1,
      metadata: { locationLabel: placeLabel },
    }));
  }
  for (const milestone of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].filter((value) => counters.visitedPlacesCount >= value)) {
    facts.push(sourceFact({
      mechanicId: "exploration",
      eventType: "new_place_milestone",
      sourceTable: "user_visited_places",
      sourceId: `${userId}:milestone:${milestone}`,
      occurredOn: new Date().toISOString().slice(0, 10),
      xpAwarded: 1,
      threshold: milestone,
      metadata: { milestone },
    }));
  }
}

async function loadCanonicalOrganizerIds(
  supabase: SupabaseClient,
  actions: ActionRow[],
): Promise<Map<string, string[]>> {
  const canonicalOrganizerIds = new Map<string, string[]>();
  for (const action of actions) {
    canonicalOrganizerIds.set(
      action.id,
      await loadActionOrganizerIdsForAction(supabase, action.id, action.created_by_clerk_id).catch(() => [action.created_by_clerk_id]),
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
    const award = computeActionValidationAward(
      1,
      evaluateActionQualityScore(action).grade,
      organizers.length,
    );
    facts.push(sourceFact({
      mechanicId: "organisation",
      eventType: "action_declare_validation",
      sourceTable: "actions",
      sourceId: action.id,
      occurredOn: dateOf(action),
      xpAwarded: award.xpAwarded,
      metadata: { qualityGrade: evaluateActionQualityScore(action).grade, organizerCount: organizers.length },
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
  const facts: GamificationSourceFact[] = [];
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
  facts.push(...actionMilestoneFacts.values());
  return facts;
}

async function loadActionMilestoneFacts(
  supabase: SupabaseClient,
  userId: string,
  validatedActions: ActionRow[],
  canonicalOrganizerIds: Map<string, string[]>,
): Promise<GamificationSourceFact[]> {
  const confirmedParticipantIdsByAction = await loadConfirmedParticipantIds(supabase, validatedActions);
  return buildActionMilestoneFacts(
    userId,
    validatedActions,
    canonicalOrganizerIds,
    confirmedParticipantIdsByAction,
  );
}

async function buildActionFacts(
  supabase: SupabaseClient,
  userId: string,
  actions: ActionRow[],
  validatedActionIds: Set<string>,
): Promise<{ facts: GamificationSourceFact[]; validatedActions: ActionRow[]; balance: ReturnType<typeof computeActionBalanceSummary> }> {
  const validatedActions = actions.filter((action) => validatedActionIds.has(action.id));
  const canonicalOrganizerIds = await loadCanonicalOrganizerIds(supabase, actions);
  const facts = buildActionValidationFacts(userId, validatedActions, canonicalOrganizerIds);
  facts.push(...await loadActionMilestoneFacts(supabase, userId, validatedActions, canonicalOrganizerIds));
  for (const award of computeMonthlyRegularityAwards(actions)) {
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
  return { facts, validatedActions, balance };
}

async function loadCleanZoneFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationSourceFact[]> {
  const facts: GamificationSourceFact[] = [];
  const cleanPlaceResult = await supabase
    .from("trash_spotter_spots")
    .select("id, status, latitude, longitude, notes, validated_at, cleaned_at")
    .eq("user_id", userId)
    .eq("spot_type", "clean_place")
    .in("status", ["validated", "cleaned"])
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .not("notes", "is", null)
    .limit(1000);
  if (!cleanPlaceResult.error) {
    const sources = collectEligibleCleanZoneSources({ cleanPlaces: (cleanPlaceResult.data ?? []) as never[], progressionEvents: [] });
    for (const source of sources) {
      facts.push(sourceFact({
        mechanicId: "clean_zones",
        eventType: "clean_zone_task",
        sourceTable: source.progressionSourceTable,
        sourceId: source.progressionSourceId,
        occurredOn: new Date().toISOString().slice(0, 10),
        xpAwarded: 1,
        metadata: { canonicalPlaceKey: source.canonicalPlaceKey, provenance: source.provenance },
      }));
    }
  }
  return facts;
}

function buildQuizFacts(
  rows: unknown,
): { facts: GamificationSourceFact[]; totalCorrectAnswers: number } {
  const facts: GamificationSourceFact[] = [];
  const quizRows = (rows ?? []) as QuizProgressFactRow[];
  const questionTypes = listQuizQuestionFormatIds();
  for (const row of quizRows) {
    const count = Math.max(0, Math.trunc(Number(row.correct_count) || 0));
    for (const milestone of QUIZ_PROGRESS_MILESTONES) {
      if (count >= milestone.threshold) {
        facts.push(sourceFact({
          mechanicId: "learning",
          eventType: "quiz_question_type_milestone",
          sourceTable: "quiz_type_progress",
          sourceId: `quiz:${row.question_type}:${milestone.threshold}`,
          occurredOn: (row.updated_at ?? new Date().toISOString()).slice(0, 10),
          xpAwarded: milestone.xp,
          threshold: milestone.threshold,
          badgeId: milestone.badgeId,
          metadata: { questionType: row.question_type, milestone: milestone.threshold },
        }));
      }
    }
  }
  const quizCounts = new Map(quizRows.map((row) => [row.question_type, Math.max(0, Math.trunc(Number(row.correct_count) || 0))]));
  const balancedCount = questionTypes.length > 0 ? Math.min(...questionTypes.map((type) => quizCounts.get(type) ?? 0)) : 0;
  for (const milestone of QUIZ_BALANCE_MILESTONES) {
    if (balancedCount >= milestone.threshold) {
      facts.push(sourceFact({
        mechanicId: "learning",
        eventType: "quiz_question_type_balance_milestone",
        sourceTable: "quiz_type_balance_progress",
        sourceId: `quiz:balanced:${milestone.threshold}`,
        occurredOn: new Date().toISOString().slice(0, 10),
        xpAwarded: milestone.xp,
        threshold: milestone.threshold,
        badgeId: milestone.badgeId,
        metadata: { balancedCount, milestone: milestone.threshold },
      }));
    }
  }
  return {
    facts,
    totalCorrectAnswers: quizRows.reduce(
      (sum, row) => sum + Math.max(0, Math.trunc(Number(row.correct_count) || 0)),
      0,
    ),
  };
}

async function appendParticipationReferralFacts(
  supabase: SupabaseClient,
  userId: string,
  facts: GamificationSourceFact[],
  participantRows: unknown[],
): Promise<void> {
  const participationRows = participantRows as Array<{
    action_id?: string;
    participation_source?: string;
    joined_at?: string;
    updated_at?: string;
  }>;
  const recoveredParticipation = participationRows.find((row) =>
    Boolean(row.action_id) && row.participation_source === "post_action_claim");
  if (recoveredParticipation) {
    const row = recoveredParticipation;
    facts.push(sourceFact({
      mechanicId: "participation_retrouvee",
      eventType: "action_participation_recovered",
      sourceTable: "action_participants",
      sourceId: `participation-retrieved:${userId}`,
      occurredOn: (row.joined_at ?? row.updated_at ?? new Date().toISOString()).slice(0, 10),
      xpAwarded: 0,
      metadata: { actionId: row.action_id, participationSource: "post_action_claim" },
    }));
  }

  const referralChildren = await supabase
    .from("profiles")
    .select("id, referred_at")
    .eq("referred_by_profile_id", userId)
    .limit(10000);
  if (!referralChildren.error) {
    for (const child of (referralChildren.data ?? []) as Array<{ id?: string; referred_at?: string }>) {
      if (!child.id) continue;
      const childActions = await loadActionRowsForUser(supabase, child.id);
      const childValidated = await loadCurrentValidatedActionIdsForUser(supabase, child.id, { actionRows: childActions });
      const usefulContribution = childActions
        .filter((action) => action.status === "approved" && childValidated.has(action.id))
        .sort((left, right) => `${dateOf(left)}:${left.id}`.localeCompare(`${dateOf(right)}:${right.id}`))[0];
      if (!usefulContribution) continue;
      facts.push(sourceFact({
        mechanicId: "parrainage_utile",
        eventType: "community_referral_invite",
        sourceTable: "referral_contributions",
        sourceId: `referral-contribution:${child.id}`,
        occurredOn: dateOf(usefulContribution) || (child.referred_at ?? new Date().toISOString()).slice(0, 10),
        xpAwarded: 2,
        metadata: {
          inviteeUserId: child.id,
          contributionSourceTable: "actions",
          contributionSourceId: usefulContribution.id,
        },
      }));
    }
  }
}

async function appendModerationFacts(
  supabase: SupabaseClient,
  userId: string,
  facts: GamificationSourceFact[],
): Promise<void> {
  try {
    const cases = await loadResolvedModerationCasesForUser(supabase, userId);
    for (const [index, resolvedCase] of cases.entries()) {
      for (const threshold of [1, 3, 5, 8, 10, 15, 20].filter((value) => cases.length >= value)) {
        if (index === 0 && threshold === 1 || index === threshold - 1) {
          facts.push(sourceFact({
            mechanicId: "moderation",
            eventType: "moderation_tier_unlock",
            sourceTable: "admin_operations_audit",
            sourceId: `${userId}:moderation-tier:${threshold}`,
            occurredOn: resolvedCase.occurredOn,
            xpAwarded: 1,
            threshold,
          }));
        }
      }
    }
    const first = cases[0];
    if (first) {
      facts.push(sourceFact({ mechanicId: "premiere_moderation", eventType: "moderation_first_case", sourceTable: "admin_operations_audit", sourceId: `${userId}:moderation-first-case`, occurredOn: first.occurredOn, xpAwarded: 0, metadata: { caseId: first.caseId } }));
    }
    const participation = cases.find((item) => item.family === "participation");
    if (participation) facts.push(sourceFact({ mechanicId: "premiere_validation_participation", eventType: "moderation_first_participation", sourceTable: "admin_operations_audit", sourceId: `${userId}:moderation-first-participation`, occurredOn: participation.occurredOn, xpAwarded: 0, metadata: { caseId: participation.caseId } }));
    const impact = cases.find((item) => item.operation === "correct_impact");
    if (impact) facts.push(sourceFact({ mechanicId: "premiere_correction_impact_justifiee", eventType: "moderation_first_impact_correction", sourceTable: "admin_operations_audit", sourceId: `${userId}:moderation-first-impact-correction`, occurredOn: impact.occurredOn, xpAwarded: 0, metadata: { caseId: impact.caseId } }));
    const families = new Set(cases.map((item) => item.family));
    if (families.size === 3) facts.push(sourceFact({ mechanicId: "moderateur_polyvalent", eventType: "moderation_multi_family", sourceTable: "admin_operations_audit", sourceId: `${userId}:moderation-multi-family`, occurredOn: first?.occurredOn ?? new Date().toISOString().slice(0, 10), xpAwarded: 1, metadata: { families: [...families] } }));
  } catch {
    // Non-applicable moderation is not a not-started user progression.
  }
}

async function loadCurrentGamificationFacts(
  supabase: SupabaseClient,
  userId: string,
): Promise<GamificationFacts> {
  const [actions, counters, visitedResult, quizResult, participantResult] = await Promise.all([
    loadActionRowsForUser(supabase, userId),
    loadGamificationUserCounters(supabase, userId),
    supabase.from("user_visited_places").select("place_label, created_at").eq("user_id", userId).limit(10000),
    supabase.from("quiz_type_progress").select("question_type, correct_count, updated_at").eq("user_id", userId).limit(100),
    supabase.from("action_participants").select("action_id, joined_at, updated_at, participation_source").eq("user_id", userId).eq("participation_status", "confirmed").limit(10000),
  ]);
  if (visitedResult.error) throw new Error(visitedResult.error.message);
  if (quizResult.error) throw new Error(quizResult.error.message);
  if (participantResult.error) throw new Error(participantResult.error.message);

  const validatedActionIds = await loadCurrentValidatedActionIdsForUser(supabase, userId, { actionRows: actions });
  const actionState = await buildActionFacts(supabase, userId, actions, validatedActionIds);
  const facts = [...actionState.facts];
  appendCounterFacts(facts, userId, counters, (visitedResult.data ?? []) as unknown[]);
  facts.push(...await loadCleanZoneFacts(supabase, userId));
  const quizState = buildQuizFacts(quizResult.data);
  facts.push(...quizState.facts);
  await appendParticipationReferralFacts(supabase, userId, facts, (participantResult.data ?? []) as unknown[]);
  await appendModerationFacts(supabase, userId, facts);

  return {
    userId,
    sourceFacts: facts,
    progressionCounters: {
      participation: counters.participationCount,
      exploration: counters.visitedPlacesCount,
      clean_zones: facts.filter((fact) => fact.mechanicId === "clean_zones").length,
      organisation: actionState.validatedActions.length,
      regularity: computeMonthlyRegularityAwards(actions).length,
      versatility: actionState.balance.balancedCycles,
      learning: quizState.totalCorrectAnswers,
    },
  };
}
export { loadCurrentGamificationFacts };
