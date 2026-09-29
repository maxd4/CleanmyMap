import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTION_APPROVED_COLUMNS } from "./progression-data";
import { isCurrentActionValidated } from "./action-milestones";
import { computeActionBalanceSummary } from "./action-balance-calculation";
import { collectEligibleCleanZoneSources, type CleanZoneCanonicalRow } from "./clean-zones";
import {
  buildProgressionFacts,
  type CatalogProgressionInputs,
} from "./gamification-catalog-loader";
import {
  buildGamificationCatalog,
  milestoneFactsFromStates,
} from "./gamification-catalog";
import { countCurrentLeaderboardBadges, type CurrentLeaderboardBadgeCounts } from "./leaderboard-badges";
import { buildCurrentMilestones, type MilestoneEvent } from "./milestones";
import { CURRENT_MILESTONES } from "./current-milestones";
import { buildQuizLearningProgressionSummary, type QuizLearningProgressRow } from "./quiz-learning-progression";
import { computeMonthlyRegularitySummary } from "./monthly-regularity";
import { gamificationEventRegistry } from "./progression-utils";
import type { ActionRow, ProgressionEventType, ProgressionStatusPhase } from "./progression-types";

const BATCH_ROW_LIMIT = 50_000;

type LeaderboardProfileRow = {
  user_id: string;
  display_name: string | null;
  display_name_mode: string | null;
  handle: string | null;
  leaderboard_public_opt_in: boolean | null;
};

type LeaderboardProgressionRow = {
  user_id: string;
  current_level: number | null;
  xp_validated: number | null;
};

type LeaderboardEventRow = {
  user_id?: string | null;
  event_type?: string | null;
  source_table?: string | null;
  source_id?: string | null;
  status_phase?: string | null;
  xp_awarded?: number | string | null;
  occurred_on?: string | null;
  metadata?: Record<string, unknown> | null;
};

type OrganizerRow = { action_id?: string | null; organizer_clerk_id?: string | null };
type ParticipantRow = { user_id?: string | null; action_id?: string | null };
type VisitedPlaceRow = { user_id?: string | null; place_label?: string | null };
type FormRow = {
  action_id?: string | null;
  status?: string | null;
  validated_by_admin?: boolean | null;
  is_duplicate?: boolean | null;
  is_deleted?: boolean | null;
  is_test?: boolean | null;
};
type CleanPlaceRow = CleanZoneCanonicalRow & { user_id?: string | null; spot_type?: string | null };

export type LeaderboardBatchData = {
  profiles: LeaderboardProfileRow[];
  progressions: Map<string, LeaderboardProgressionRow>;
  badgeCounts: Map<string, CurrentLeaderboardBadgeCounts>;
};

type QueryClient = {
  from(table: string): {
    select(columns: string): {
      in(column: string, values: string[]): {
        limit(value: number): Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
};

async function loadRows<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  userColumn: string,
  userIds: readonly string[],
): Promise<T[]> {
  if (userIds.length === 0) return [];
  const result = await (supabase as unknown as QueryClient)
    .from(table)
    .select(columns)
    .in(userColumn, [...userIds])
    .limit(BATCH_ROW_LIMIT);
  if (result.error) throw new Error(result.error.message);
  return Array.isArray(result.data) ? result.data as T[] : [];
}

async function loadProfiles(supabase: SupabaseClient): Promise<LeaderboardProfileRow[]> {
  const result = await supabase
    .from("profiles")
    .select("id, display_name, display_name_mode, handle, leaderboard_public_opt_in")
    .eq("leaderboard_public_opt_in", true)
    .limit(1000);
  if (result.error) throw new Error(result.error.message);
  return ((result.data ?? []) as Array<LeaderboardProfileRow & { id?: string }>).flatMap((row) => {
    const userId = row.user_id || row.id;
    return userId ? [{ ...row, user_id: userId }] : [];
  });
}

async function loadProgressions(
  supabase: SupabaseClient,
  userIds: readonly string[],
): Promise<Map<string, LeaderboardProgressionRow>> {
  const rows = await loadRows<LeaderboardProgressionRow>(
    supabase,
    "progression_profiles",
    "user_id, current_level, xp_validated",
    "user_id",
    userIds,
  );
  return new Map(rows.filter((row) => typeof row.user_id === "string").map((row) => [row.user_id, row]));
}

async function loadActionBatch(
  supabase: SupabaseClient,
  userIds: readonly string[],
): Promise<{ rowsByUser: Map<string, ActionRow[]>; forms: FormRow[] }> {
  if (userIds.length === 0) return { rowsByUser: new Map(), forms: [] };

  const ownedResult = await supabase
    .from("actions")
    .select(ACTION_APPROVED_COLUMNS)
    .in("created_by_clerk_id", [...userIds])
    .limit(BATCH_ROW_LIMIT);
  if (ownedResult.error) throw new Error(ownedResult.error.message);
  const ownedRows = (ownedResult.data ?? []) as ActionRow[];

  const organizerRows = await loadRows<OrganizerRow>(
    supabase,
    "action_organizers",
    "action_id, organizer_clerk_id",
    "organizer_clerk_id",
    userIds,
  );
  const organizedActionIds = [...new Set(organizerRows.map((row) => row.action_id).filter((id): id is string => Boolean(id)))];
  const missingActionIds = organizedActionIds.filter((id) => !ownedRows.some((row) => row.id === id));
  let organizedRows: ActionRow[] = [];
  if (missingActionIds.length > 0) {
    const result = await supabase
      .from("actions")
      .select(ACTION_APPROVED_COLUMNS)
      .in("id", missingActionIds)
      .limit(BATCH_ROW_LIMIT);
    if (result.error) throw new Error(result.error.message);
    organizedRows = (result.data ?? []) as ActionRow[];
  }

  const rowsById = new Map([...ownedRows, ...organizedRows].map((row) => [row.id, row]));
  const userRows = new Map<string, ActionRow[]>();
  const append = (userId: string, row: ActionRow) => {
    const rows = userRows.get(userId) ?? [];
    if (!rows.some((candidate) => candidate.id === row.id)) rows.push(row);
    userRows.set(userId, rows);
  };
  for (const row of ownedRows) {
    if (userIds.includes(row.created_by_clerk_id)) append(row.created_by_clerk_id, row);
  }
  for (const organizer of organizerRows) {
    if (organizer.organizer_clerk_id && organizer.action_id) {
      const row = rowsById.get(organizer.action_id);
      if (row) append(organizer.organizer_clerk_id, row);
    }
  }

  const actionIds = [...rowsById.keys()];
  const forms = actionIds.length === 0
    ? []
    : await loadRows<FormRow>(supabase, "forms", "action_id, status, validated_by_admin, is_duplicate, is_deleted, is_test", "action_id", actionIds);
  return { rowsByUser: userRows, forms };
}

function isValidatedForm(row: FormRow): boolean {
  return row.status !== "draft" && row.status !== "deleted" && row.status !== "incomplete" &&
    row.validated_by_admin === true && row.is_duplicate === false && row.is_deleted === false && row.is_test === false;
}

function isCompleteAction(row: ActionRow, validatedActionIds: ReadonlySet<string>): boolean {
  return validatedActionIds.has(row.id) && row.status === "approved" &&
    row.location_label.trim().length >= 3 && Number(row.waste_kg ?? 0) >= 0 &&
    row.volunteers_count >= 1 && row.duration_minutes >= 0 && (row.actor_name?.trim().length ?? 0) > 0;
}

function groupByUser<T extends { user_id?: string | null }>(rows: readonly T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.user_id) continue;
    const current = grouped.get(row.user_id) ?? [];
    current.push(row);
    grouped.set(row.user_id, current);
  }
  return grouped;
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

function buildBadgeCounts(
  userIds: readonly string[],
  eventsByUser: Map<string, LeaderboardEventRow[]>,
  participantsByUser: Map<string, ParticipantRow[]>,
  visitedByUser: Map<string, VisitedPlaceRow[]>,
  quizByUser: Map<string, QuizLearningProgressRow[]>,
  cleanPlacesByUser: Map<string, CleanPlaceRow[]>,
  rowsByUser: Map<string, ActionRow[]>,
  forms: readonly FormRow[],
): Map<string, CurrentLeaderboardBadgeCounts> {
  const formsByAction = new Set(forms.filter(isValidatedForm).map((row) => row.action_id).filter((id): id is string => Boolean(id)));
  const result = new Map<string, CurrentLeaderboardBadgeCounts>();

  for (const userId of userIds) {
    const rows = rowsByUser.get(userId) ?? [];
    const currentValidated = new Set(rows.filter(isCurrentActionValidated).map((row) => row.id));
    const completeActions = rows.filter((row) => isCompleteAction(row, formsByAction));
    const cleanPlaces = (cleanPlacesByUser.get(userId) ?? []).filter((row) => row.spot_type === "clean_place");
    const cleanEvents = (eventsByUser.get(userId) ?? [])
      .filter((event) => event.event_type === "clean_zone_task" && event.source_table && event.source_id)
      .map((event) => ({ sourceTable: event.source_table!, sourceId: event.source_id! }));
    const cleanSources = collectEligibleCleanZoneSources({ cleanPlaces, progressionEvents: cleanEvents });
    const learning = buildQuizLearningProgressionSummary(quizByUser.get(userId) ?? []);
    const regularity = computeMonthlyRegularitySummary(rows);
    const balance = computeActionBalanceSummary(rows, currentValidated);
    const userActionIds = new Set(rows.map((row) => row.id));
    const counters: CatalogProgressionInputs["counters"] = {
      approvedActionsCount: rows.filter((row) => row.status === "approved").length,
      completeActionsCount: completeActions.length,
      visitedPlacesCount: visitedByUser.get(userId)?.length ?? 0,
      eligibleFormsCount: forms.filter((row) => row.action_id && userActionIds.has(row.action_id) && formsByAction.has(row.action_id)).length,
      participationCount: new Set((participantsByUser.get(userId) ?? []).map((row) => row.action_id).filter(Boolean)).size,
    };
    const events = asMilestoneEvents(eventsByUser.get(userId) ?? []);
    const milestones = buildCurrentMilestones({ completeActionsCount: counters.completeActionsCount, events });
    const applicableMilestoneIds = CURRENT_MILESTONES
      .filter((milestone) => milestone.visibility !== "authorized_moderation" && milestone.visibility !== "not_exposed")
      .map((milestone) => milestone.id);
    const catalog = buildGamificationCatalog({
      progressions: buildProgressionFacts({ counters, cleanZoneSources: cleanSources, learning, regularity, balance }),
      milestones: milestoneFactsFromStates(milestones, { invitedUsersCount: 0 }),
      applicableProgressionIds: ["participation", "organisation", "exploration", "clean_zones", "regularity", "versatility", "learning"],
      applicableMilestoneIds,
    });
    result.set(userId, countCurrentLeaderboardBadges(catalog));
  }
  return result;
}

export async function loadLeaderboardBatchData(supabase: SupabaseClient): Promise<LeaderboardBatchData> {
  const profiles = await loadProfiles(supabase);
  const userIds = profiles.map((profile) => profile.user_id);
  if (userIds.length === 0) return { profiles, progressions: new Map(), badgeCounts: new Map() };

  const [progressions, actionBatch, events, participants, visited, quiz, cleanPlaces] = await Promise.all([
    loadProgressions(supabase, userIds),
    loadActionBatch(supabase, userIds),
    loadRows<LeaderboardEventRow>(supabase, "progression_events", "user_id, event_type, source_table, source_id, status_phase, xp_awarded, occurred_on, metadata", "user_id", userIds),
    loadRows<ParticipantRow>(supabase, "action_participants", "user_id, action_id", "user_id", userIds),
    loadRows<VisitedPlaceRow>(supabase, "user_visited_places", "user_id, place_label", "user_id", userIds),
    loadRows<QuizLearningProgressRow & { user_id?: string | null }>(supabase, "quiz_type_progress", "user_id, question_type, correct_count", "user_id", userIds),
    loadRows<CleanPlaceRow>(supabase, "trash_spotter_spots", "user_id, id, status, latitude, longitude, notes, validated_at, cleaned_at, spot_type", "user_id", userIds),
  ]);

  const eventsByUser = groupByUser(events);
  const participantsByUser = groupByUser(participants);
  const visitedByUser = groupByUser(visited);
  const quizByUser = groupByUser(quiz);
  const cleanPlacesByUser = groupByUser(cleanPlaces);
  const badgeCounts = buildBadgeCounts(userIds, eventsByUser, participantsByUser, visitedByUser, quizByUser, cleanPlacesByUser, actionBatch.rowsByUser, actionBatch.forms);
  return { profiles, progressions, badgeCounts };
}
