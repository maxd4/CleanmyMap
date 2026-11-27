import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTION_APPROVED_COLUMNS, isSpontaneousActionNotes } from "../progression-data";
import type { CurrentLeaderboardBadgeCounts } from "./leaderboard-badges";
import type { QuizLearningProgressRow } from "./quiz-learning-progression";
import type { ActionRow } from "./progression-types";
import { buildBadgeCounts, type LeaderboardEventRow, type ParticipantRow, type VisitedPlaceRow, type FormRow, type CleanPlaceRow, type GeometryContributionRow, type ProductFeedbackRow } from "./leaderboard-badge-projection";

const BATCH_PAGE_SIZE = 1_000;
const BATCH_ID_CHUNK_SIZE = 500;

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

type OrganizerRow = { action_id?: string | null; organizer_clerk_id?: string | null };

export type LeaderboardBatchData = {
  profiles: LeaderboardProfileRow[];
  progressions: Map<string, LeaderboardProgressionRow>;
  badgeCounts: Map<string, CurrentLeaderboardBadgeCounts>;
};

type QueryResult = { data: unknown; error: { message: string } | null };
type QueryPage = PromiseLike<QueryResult>;

type QueryChain = {
  eq(column: string, value: string): QueryChain;
  order(column: string, options?: { ascending?: boolean }): QueryChain;
  range(from: number, to: number): Promise<QueryResult>;
};

type QueryClient = {
  from(table: string): {
    select(columns: string): {
      in(column: string, values: string[]): QueryChain;
    };
  };
};

type RowFilter = readonly [column: string, value: string];
type RowOrdering = readonly string[];

function chunkValues(values: readonly string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push([...values.slice(index, index + size)]);
  }
  return chunks;
}

async function loadPagedRows<T>(
  loadPage: (from: number, to: number) => QueryPage,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += BATCH_PAGE_SIZE) {
    const result = await loadPage(from, from + BATCH_PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);
    const page = Array.isArray(result.data) ? result.data as T[] : [];
    rows.push(...page);
    if (page.length < BATCH_PAGE_SIZE) break;
  }
  return rows;
}

async function loadRows<T>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  userColumn: string,
  userIds: readonly string[],
  ordering: RowOrdering,
  filters: readonly RowFilter[] = [],
): Promise<T[]> {
  if (userIds.length === 0) return [];

  const rows: T[] = [];
  for (const values of chunkValues(userIds, BATCH_ID_CHUNK_SIZE)) {
    const chunkRows = await loadPagedRows<T>((from, to) => {
      let query = (supabase as unknown as QueryClient)
        .from(table)
        .select(columns)
        .in(userColumn, values);
      for (const [column, value] of filters) {
        query = query.eq(column, value);
      }
      for (const column of ordering) {
        query = query.order(column, { ascending: true });
      }
      return query.range(from, to);
    });
    rows.push(...chunkRows);
  }
  return rows;
}

async function loadProfiles(supabase: SupabaseClient): Promise<LeaderboardProfileRow[]> {
  const rows = await loadPagedRows<LeaderboardProfileRow & { id?: string }>((from, to) =>
    supabase
      .from("profiles")
      .select("id, display_name, display_name_mode, handle, leaderboard_public_opt_in")
      .eq("leaderboard_public_opt_in", true)
      .order("id", { ascending: true })
      .range(from, to),
  );
  return rows.flatMap((row) => {
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
    ["user_id"],
  );
  return new Map(rows.filter((row) => typeof row.user_id === "string").map((row) => [row.user_id, row]));
}

async function loadActionBatch(
  supabase: SupabaseClient,
  userIds: readonly string[],
): Promise<{ rowsByUser: Map<string, ActionRow[]>; forms: FormRow[] }> {
  if (userIds.length === 0) return { rowsByUser: new Map(), forms: [] };

  const ownedRows = (await loadRows<ActionRow>(
    supabase,
    "actions",
    ACTION_APPROVED_COLUMNS,
    "created_by_clerk_id",
    userIds,
    ["created_by_clerk_id", "id"],
  )).filter((row) => isSpontaneousActionNotes(row.notes));

  const organizerRows = await loadRows<OrganizerRow>(
    supabase,
    "action_organizers",
    "action_id, organizer_clerk_id",
    "organizer_clerk_id",
    userIds,
    ["organizer_clerk_id", "id"],
  );
  const organizedActionIds = [...new Set(organizerRows.map((row) => row.action_id).filter((id): id is string => Boolean(id)))];
  const missingActionIds = organizedActionIds.filter((id) => !ownedRows.some((row) => row.id === id));
  let organizedRows: ActionRow[] = [];
  if (missingActionIds.length > 0) {
    organizedRows = await loadRows<ActionRow>(
      supabase,
      "actions",
      ACTION_APPROVED_COLUMNS,
      "id",
      missingActionIds,
      ["id"],
    );
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
    : await loadRows<FormRow>(supabase, "forms", "action_id, status, validated_by_admin, is_duplicate, is_deleted, is_test", "action_id", actionIds, ["action_id", "id"]);
  return { rowsByUser: userRows, forms };
}

function groupByUser<T>(rows: readonly T[], key: (row: T) => string | null | undefined): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const userId = key(row);
    if (!userId) continue;
    const current = grouped.get(userId) ?? [];
    current.push(row);
    grouped.set(userId, current);
  }
  return grouped;
}

export async function loadLeaderboardBatchData(supabase: SupabaseClient): Promise<LeaderboardBatchData> {
  const profiles = await loadProfiles(supabase);
  const userIds = profiles.map((profile) => profile.user_id);
  if (userIds.length === 0) return { profiles, progressions: new Map(), badgeCounts: new Map() };

  const [progressions, actionBatch, events, participants, visited, quiz, cleanPlaces, geometryContributions, feedback] = await Promise.all([
    loadProgressions(supabase, userIds),
    loadActionBatch(supabase, userIds),
    loadRows<LeaderboardEventRow>(supabase, "progression_events", "user_id, event_type, source_table, source_id, status_phase, xp_awarded, occurred_on, metadata", "user_id", userIds, ["user_id", "id"]),
    loadRows<ParticipantRow>(supabase, "action_participants", "user_id, action_id, participation_status", "user_id", userIds, ["user_id", "id"], [["participation_status", "confirmed"]]),
    loadRows<VisitedPlaceRow>(supabase, "user_visited_places", "user_id, place_label", "user_id", userIds, ["user_id", "id"]),
    loadRows<QuizLearningProgressRow & { user_id?: string | null }>(supabase, "quiz_type_progress", "user_id, question_type, correct_count", "user_id", userIds, ["user_id", "id"]),
    loadRows<CleanPlaceRow>(supabase, "trash_spotter_spots", "user_id, id, status, latitude, longitude, notes, validated_at, cleaned_at, spot_type", "user_id", userIds, ["user_id", "id"]),
    loadRows<GeometryContributionRow>(supabase, "action_geometry_contributions", "contributor_clerk_id, action_id, validation_state", "contributor_clerk_id", userIds, ["contributor_clerk_id", "action_id"], [["validation_state", "accepted"]]),
    loadRows<ProductFeedbackRow>(supabase, "community_bug_reports", "submitted_by_user_id, id, created_at, qualification_status, qualification_decided_at, report_type", "submitted_by_user_id", userIds, ["submitted_by_user_id", "id"], [["qualification_status", "accepted"]]),
  ]);

  const eventsByUser = groupByUser(events, (row) => row.user_id);
  const participantsByUser = groupByUser(participants, (row) => row.user_id);
  const visitedByUser = groupByUser(visited, (row) => row.user_id);
  const quizByUser = groupByUser(quiz, (row) => row.user_id);
  const cleanPlacesByUser = groupByUser(cleanPlaces, (row) => row.user_id);
  const geometryContributionsByUser = groupByUser(geometryContributions, (row) => row.contributor_clerk_id);
  const feedbackByUser = groupByUser(feedback, (row) => row.submitted_by_user_id);
  const badgeCounts = buildBadgeCounts(userIds, { eventsByUser, participantsByUser, visitedByUser, quizByUser, cleanPlacesByUser, rowsByUser: actionBatch.rowsByUser, geometryContributionsByUser, feedbackByUser }, actionBatch.forms);
  return { profiles, progressions, badgeCounts };
}
