import { isCurrentActionValidated } from "./action-milestones";
import { computeActionBalanceSummary } from "./action-balance-calculation";
import { collectEligibleCleanZoneSources, type CleanZoneCanonicalRow } from "./clean-zones";
import { BASE_CURRENT_PROGRESSION_IDS, buildProgressionFacts, type CatalogProgressionInputs } from "./gamification-catalog-progression-facts";
import { buildGamificationCatalog, milestoneFactsFromStates } from "./gamification-catalog";
import { countCurrentLeaderboardBadges, type CurrentLeaderboardBadgeCounts } from "./leaderboard-badges";
import { buildCurrentMilestones, type MilestoneEvent } from "./milestones";
import { CURRENT_MILESTONES } from "./current-milestones";
import { buildQuizLearningProgressionSummary, type QuizLearningProgressRow } from "./quiz-learning-progression";
import { computeMonthlyRegularitySummary } from "./monthly-regularity";
import { gamificationEventRegistry } from "./gamification-registry";
import { buildProductFeedbackFacts } from "./gamification-feedback-facts";
import type { ActionRow, ProgressionEventType, ProgressionStatusPhase } from "./progression-types";

export type LeaderboardEventRow = {
  user_id?: string | null;
  event_type?: string | null;
  source_table?: string | null;
  source_id?: string | null;
  status_phase?: string | null;
  xp_awarded?: number | string | null;
  occurred_on?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ParticipantRow = { user_id?: string | null; action_id?: string | null; participation_status?: string | null };
export type VisitedPlaceRow = { user_id?: string | null; place_label?: string | null };
export type FormRow = {
  action_id?: string | null;
  status?: string | null;
  validated_by_admin?: boolean | null;
  is_duplicate?: boolean | null;
  is_deleted?: boolean | null;
  is_test?: boolean | null;
};
export type CleanPlaceRow = CleanZoneCanonicalRow & { user_id?: string | null; spot_type?: string | null };
export type GeometryContributionRow = {
  contributor_clerk_id?: string | null;
  action_id?: string | null;
  validation_state?: string | null;
};
export type ProductFeedbackRow = {
  submitted_by_user_id?: string | null;
  id?: string | null;
  created_at?: string | null;
  qualification_decided_at?: string | null;
  qualification_status?: string | null;
  report_type?: string | null;
};

type BadgeCountContext = {
  eventsByUser: Map<string, LeaderboardEventRow[]>;
  participantsByUser: Map<string, ParticipantRow[]>;
  visitedByUser: Map<string, VisitedPlaceRow[]>;
  quizByUser: Map<string, QuizLearningProgressRow[]>;
  cleanPlacesByUser: Map<string, CleanPlaceRow[]>;
  rowsByUser: Map<string, ActionRow[]>;
  geometryContributionsByUser: Map<string, GeometryContributionRow[]>;
  feedbackByUser: Map<string, ProductFeedbackRow[]>;
};

function isValidatedForm(row: FormRow): boolean {
  return row.status !== "draft" && row.status !== "deleted" && row.status !== "incomplete" &&
    row.validated_by_admin === true && row.is_duplicate === false && row.is_deleted === false && row.is_test === false;
}

function indexEligibleFormsByAction(forms: readonly FormRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of forms) {
    if (!row.action_id || !isValidatedForm(row)) continue;
    counts.set(row.action_id, (counts.get(row.action_id) ?? 0) + 1);
  }
  return counts;
}

function isCompleteAction(row: ActionRow, validatedActionIds: ReadonlySet<string>): boolean {
  return validatedActionIds.has(row.id) && row.status === "approved" &&
    row.location_label.trim().length >= 3 && Number(row.waste_kg ?? 0) >= 0 &&
    row.volunteers_count !== null && row.volunteers_count >= 1 &&
    row.duration_minutes >= 0 && (row.actor_name?.trim().length ?? 0) > 0;
}

function asMilestoneEvents(rows: readonly LeaderboardEventRow[]): MilestoneEvent[] {
  const registry = gamificationEventRegistry();
  return rows.flatMap((row) => {
    const eventType = row.event_type as ProgressionEventType | undefined;
    if (!eventType || !registry[eventType] || !row.source_id || !row.source_table || !row.status_phase) return [];
    if (registry[eventType].classification !== "milestone") return [];
    return [{
      event_type: eventType,
      status_phase: row.status_phase as ProgressionStatusPhase,
      source_id: row.source_id,
      xp_awarded: Number(row.xp_awarded) || 0,
      occurred_on: row.occurred_on ?? null,
      metadata: row.metadata ?? null,
    }];
  });
}

export function buildBadgeCounts(
  userIds: readonly string[],
  context: BadgeCountContext,
  forms: readonly FormRow[],
): Map<string, CurrentLeaderboardBadgeCounts> {
  const eligibleFormsByAction = indexEligibleFormsByAction(forms);
  const eligibleActionIds = new Set(eligibleFormsByAction.keys());
  const result = new Map<string, CurrentLeaderboardBadgeCounts>();

  for (const userId of userIds) {
    result.set(userId, buildUserBadgeCounts(userId, context, eligibleFormsByAction, eligibleActionIds));
  }
  return result;
}

function buildUserBadgeCounts(
  userId: string,
  context: BadgeCountContext,
  eligibleFormsByAction: Map<string, number>,
  eligibleActionIds: Set<string>,
): CurrentLeaderboardBadgeCounts {
  const rows = context.rowsByUser.get(userId) ?? [];
  const currentValidated = new Set(rows.filter(isCurrentActionValidated).map((row) => row.id));
  const completeActions = rows.filter((row) => isCompleteAction(row, eligibleActionIds));
  const cleanPlaces = (context.cleanPlacesByUser.get(userId) ?? []).filter((row) => row.spot_type === "clean_place");
  const cleanEvents = (context.eventsByUser.get(userId) ?? [])
    .filter((event) => event.event_type === "clean_zone_task" && event.source_table && event.source_id)
    .map((event) => ({ sourceTable: event.source_table!, sourceId: event.source_id! }));
  const cleanSources = collectEligibleCleanZoneSources({ cleanPlaces, progressionEvents: cleanEvents });
  const learning = buildQuizLearningProgressionSummary(context.quizByUser.get(userId) ?? []);
  const regularity = computeMonthlyRegularitySummary(rows);
  const balance = computeActionBalanceSummary(rows, currentValidated);
  const cartographyCount = new Set(
    (context.geometryContributionsByUser.get(userId) ?? [])
      .filter((row) => row.validation_state === "accepted")
      .map((row) => row.action_id)
      .filter((actionId): actionId is string => Boolean(actionId)),
  ).size;
  const productFeedbackCount = buildProductFeedbackFacts(context.feedbackByUser.get(userId) ?? []).count;
  const eligibleFormsCount = [...new Set(rows.map((row) => row.id))]
    .reduce((sum, actionId) => sum + (eligibleFormsByAction.get(actionId) ?? 0), 0);
  const counters: CatalogProgressionInputs["counters"] = {
    approvedActionsCount: rows.filter((row) => row.status === "approved").length,
    completeActionsCount: completeActions.length,
    visitedPlacesCount: context.visitedByUser.get(userId)?.length ?? 0,
    eligibleFormsCount,
    participationCount: new Set(
      (context.participantsByUser.get(userId) ?? [])
        .filter((row) => row.participation_status === "confirmed")
        .map((row) => row.action_id)
        .filter(Boolean),
    ).size,
  };
  const events = asMilestoneEvents(context.eventsByUser.get(userId) ?? []);
  const milestones = buildCurrentMilestones({ completeActionsCount: counters.completeActionsCount, events });
  const applicableMilestoneIds = CURRENT_MILESTONES
    .filter((milestone) => milestone.visibility !== "authorized_moderation" && milestone.visibility !== "not_exposed")
    .map((milestone) => milestone.id);
  const catalog = buildGamificationCatalog({
    progressions: buildProgressionFacts({ counters, cleanZoneSources: cleanSources, learning, regularity, balance, cartographyCount, productFeedbackCount }),
    milestones: milestoneFactsFromStates(milestones, { invitedUsersCount: 0 }),
    applicableProgressionIds: BASE_CURRENT_PROGRESSION_IDS,
    applicableMilestoneIds,
  });
  return countCurrentLeaderboardBadges(catalog);
}
