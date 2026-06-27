/* eslint-disable max-lines, max-lines-per-function, complexity */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionParticipantRow, ActionRow } from "@/types/database";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { runActionQuery, runSingleActionQuery } from "@/lib/actions/query";
import type { ActionParticipantSummary } from "./participant-summaries";
import { loadActionParticipantSummaries } from "./participant-summaries";

const PENDING_PARTICIPATION_STATUS = "pending" as const;
const ACTIVE_PARTICIPATION_STATUS = "confirmed" as const;
const GROUP_PARTICIPATION_SOURCE = "group_form" as const;
const ADMIN_PARTICIPATION_SOURCE = "admin" as const;

type ParticipationStatus = ActionParticipantRow["participation_status"];
type ParticipationSource = ActionParticipantRow["participation_source"];

type ProfileLookupRow = {
  id: string;
  display_name: string | null;
  handle: string | null;
};

export type JoinableActionItem = Pick<
  ActionRow,
  | "id"
  | "created_at"
  | "action_date"
  | "location_label"
  | "volunteers_count"
  | "duration_minutes"
  | "status"
> & {
  participantsCount: number;
  joined: boolean;
  awaitingApproval: boolean;
  joinedAt: string | null;
  participationStatus: ParticipationStatus | null;
  participationSource: ParticipationSource | null;
  participationUpdatedAt: string | null;
  groupJoinEnabled: boolean;
};

export type JoinableActionHistoryItem = JoinableActionItem;

type ActionPreviewRow = Pick<
  ActionRow,
  | "id"
  | "created_at"
  | "action_date"
  | "location_label"
  | "volunteers_count"
  | "duration_minutes"
  | "status"
  | "notes"
>;

type ActionParticipantRecordRow = Pick<
  ActionParticipantRow,
  | "action_id"
  | "created_at"
  | "joined_at"
  | "updated_at"
  | "participation_status"
  | "participation_source"
>;

type ActionParticipantStatusRow = Pick<
  ActionParticipantRow,
  | "action_id"
  | "created_at"
  | "joined_at"
  | "updated_at"
  | "participation_status"
  | "participation_source"
>;

type ActionParticipantReviewRow = Pick<
  ActionParticipantRow,
  | "id"
  | "action_id"
  | "created_at"
  | "joined_at"
  | "updated_at"
  | "user_id"
  | "participation_status"
  | "participation_source"
> & {
  display_name: string | null;
  handle: string | null;
};

const ACTION_PREVIEW_COLUMNS =
  "id, created_at, action_date, location_label, volunteers_count, duration_minutes, status, notes";
const ACTION_PARTICIPATION_COLUMNS = "status, notes";

function resolveJoinedAt(
  row: Pick<
    ActionParticipantRow,
    "created_at" | "joined_at" | "updated_at" | "participation_status" | "participation_source"
  >,
): string {
  return row.joined_at ?? row.created_at;
}

function resolveParticipationUpdatedAt(
  row: Pick<ActionParticipantRow, "created_at" | "joined_at" | "updated_at">,
): string | null {
  return row.updated_at ?? row.joined_at ?? row.created_at;
}

function buildJoinableItem(
  action: ActionPreviewRow,
  metadata: ReturnType<typeof extractActionMetadataFromNotes>,
  participantsCount: number,
  participantSummary: ActionParticipantSummary | null,
): JoinableActionItem {
  const joined = participantSummary?.myParticipationStatus === ACTIVE_PARTICIPATION_STATUS;
  const awaitingApproval =
    participantSummary?.myParticipationStatus === PENDING_PARTICIPATION_STATUS;
  return {
    ...action,
    participantsCount,
    joined,
    awaitingApproval,
    joinedAt: participantSummary?.myJoinedAt ?? null,
    participationStatus: participantSummary?.myParticipationStatus ?? null,
    participationSource: participantSummary?.myParticipationSource ?? null,
    participationUpdatedAt: participantSummary?.myUpdatedAt ?? participantSummary?.myJoinedAt ?? null,
    groupJoinEnabled: metadata.groupJoinEnabled,
  };
}

async function countActiveParticipants(supabase: SupabaseClient, actionId: string): Promise<number> {
  const result = await supabase
    .from("action_participants")
    .select("id", { count: "exact", head: true })
    .eq("action_id", actionId)
    .eq("participation_status", ACTIVE_PARTICIPATION_STATUS);

  if (result.error) {
    throw new Error(result.error.message);
  }

  return Number(result.count ?? 0);
}

async function loadParticipantProfilesForUserIds(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, ProfileLookupRow>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const result = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .in("id", userIds);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []) as ProfileLookupRow[];
  return new Map(rows.map((row) => [row.id, row] as const));
}

async function readParticipantRecord(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
): Promise<ActionParticipantStatusRow | null> {
  const result = await supabase
    .from("action_participants")
    .select(
      "action_id, created_at, joined_at, updated_at, participation_status, participation_source",
    )
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionParticipantStatusRow | null;
}

async function readParticipantRecordById(
  supabase: SupabaseClient,
  params: { actionId: string; participantId: string },
): Promise<ActionParticipantReviewRow | null> {
  const result = await supabase
    .from("action_participants")
    .select(
      "id, action_id, created_at, joined_at, updated_at, user_id, participation_status, participation_source",
    )
    .eq("action_id", params.actionId)
    .eq("id", params.participantId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionParticipantReviewRow | null;
}

async function updateParticipantRecord(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    joinedAt: string;
    participationStatus: ParticipationStatus;
    participationSource: ParticipationSource;
  },
): Promise<ActionParticipantStatusRow> {
  const result = await supabase
    .from("action_participants")
    .update({
      joined_at: params.joinedAt,
      participation_status: params.participationStatus,
      participation_source: params.participationSource,
    })
    .eq("action_id", params.actionId)
    .eq("user_id", params.userId)
    .select(
      "action_id, created_at, joined_at, updated_at, participation_status, participation_source",
    )
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionParticipantStatusRow;
}

async function insertParticipantRecord(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    joinedAt: string;
    participationStatus: ParticipationStatus;
    participationSource: ParticipationSource;
  },
): Promise<ActionParticipantStatusRow> {
  const result = await supabase
    .from("action_participants")
    .insert({
      action_id: params.actionId,
      user_id: params.userId,
      joined_at: params.joinedAt,
      participation_status: params.participationStatus,
      participation_source: params.participationSource,
    })
    .select(
      "action_id, created_at, joined_at, updated_at, participation_status, participation_source",
    )
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ActionParticipantStatusRow;
}

async function countParticipantsForAction(supabase: SupabaseClient, actionId: string): Promise<number> {
  return countActiveParticipants(supabase, actionId);
}

export async function loadJoinableActions(
  supabase: SupabaseClient,
  params: {
    limit: number;
    userId: string | null;
    actionId?: string | null;
  },
): Promise<JoinableActionItem[]> {
  const fetchLimit = Math.max(params.limit * 4, params.limit);
  const actions = await runActionQuery<ActionPreviewRow>(supabase, (query) =>
    query
      .select(ACTION_PREVIEW_COLUMNS)
      .eq("status", "approved")
      .order("action_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
  );
  if (actions.length === 0) {
    return [];
  }

  let orderedActions = actions;
  if (params.actionId) {
    const focusedAction = await runSingleActionQuery<ActionPreviewRow>(supabase, (query) =>
      query
        .select(ACTION_PREVIEW_COLUMNS)
        .eq("id", params.actionId)
        .eq("status", "approved")
        .maybeSingle(),
    );

    if (focusedAction) {
      orderedActions = [
        focusedAction,
        ...actions.filter((action) => action.id !== params.actionId),
      ].slice(0, fetchLimit);
    }
  }

  const joinableActions = orderedActions
    .map((action) => ({
      action,
      metadata: extractActionMetadataFromNotes(action.notes),
    }))
    .filter(({ metadata }) => metadata.groupJoinEnabled !== false)
    .slice(0, params.limit);

  if (joinableActions.length === 0) {
    return [];
  }

  const actionIds = joinableActions.map(({ action }) => action.id);
  const participantSummaries = await loadActionParticipantSummaries(supabase, {
    actionIds,
    userId: params.userId,
  });

  const participantCounts = new Map<string, number>();
  const participantSummaryByActionId = new Map<string, ActionParticipantSummary>();
  for (const summary of participantSummaries) {
    participantCounts.set(summary.actionId, summary.activeCount);
    participantSummaryByActionId.set(summary.actionId, summary);
  }

  return joinableActions.map(({ action, metadata }) =>
    buildJoinableItem(
      action,
      metadata,
      participantCounts.get(action.id) ?? 0,
      participantSummaryByActionId.get(action.id) ?? null,
    ),
  );
}

export async function loadUserParticipationHistory(
  supabase: SupabaseClient,
  params: {
    userId: string;
    limit: number;
  },
): Promise<JoinableActionHistoryItem[]> {
  if (params.limit <= 0) {
    return [];
  }

  const participationResult = await supabase
    .from("action_participants")
    .select("action_id, created_at, joined_at, updated_at, participation_status, participation_source")
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false })
    .order("joined_at", { ascending: false })
    .limit(params.limit);

  if (participationResult.error) {
    throw new Error(participationResult.error.message);
  }

  const participationRows = (participationResult.data ?? []) as ActionParticipantRecordRow[];

  if (participationRows.length === 0) {
    return [];
  }

  const actionIds = [...new Set(participationRows.map((row) => row.action_id))];
  const actions = await runActionQuery<ActionPreviewRow>(supabase, (query) =>
    query.select(ACTION_PREVIEW_COLUMNS).in("id", actionIds),
  );
  const actionById = new Map(actions.map((action) => [action.id, action] as const));

  const participantCounts = new Map<string, number>();
  const participantSummaries = await loadActionParticipantSummaries(supabase, {
    actionIds,
    userId: params.userId,
  });
  for (const summary of participantSummaries) {
    participantCounts.set(summary.actionId, summary.activeCount);
  }

  return participationRows.flatMap((participation) => {
    const action = actionById.get(participation.action_id);
    if (!action) {
      return [];
    }

    const metadata = extractActionMetadataFromNotes(action.notes);
    const joined = participation.participation_status === ACTIVE_PARTICIPATION_STATUS;
    const awaitingApproval = participation.participation_status === PENDING_PARTICIPATION_STATUS;
    return [
      {
        ...action,
        participantsCount: participantCounts.get(action.id) ?? 0,
        joined,
        awaitingApproval,
        joinedAt: resolveJoinedAt(participation),
        participationStatus: participation.participation_status,
        participationSource: participation.participation_source,
        participationUpdatedAt: resolveParticipationUpdatedAt(participation),
        groupJoinEnabled: metadata.groupJoinEnabled,
      } satisfies JoinableActionHistoryItem,
    ];
  });
}

export type ActionParticipationReviewItem = {
  id: string;
  actionId: string;
  displayName: string;
  handle: string | null;
  joinedAt: string;
  updatedAt: string | null;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
};

export async function loadActionParticipationReviews(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    limit?: number;
  },
): Promise<ActionParticipationReviewItem[]> {
  const reviewLimit = Math.max(1, Math.min(params.limit ?? 24, 100));
  const result = await supabase
    .from("action_participants")
    .select("id, action_id, created_at, joined_at, updated_at, user_id, participation_status, participation_source")
    .eq("action_id", params.actionId)
    .eq("participation_status", PENDING_PARTICIPATION_STATUS)
    .order("created_at", { ascending: true })
    .limit(reviewLimit);

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []) as ActionParticipantReviewRow[];
  if (rows.length === 0) {
    return [];
  }

  const profileMap = await loadParticipantProfilesForUserIds(
    supabase,
    rows.map((row) => row.user_id),
  );

  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      actionId: row.action_id,
      displayName:
        profile?.display_name?.trim() ||
        profile?.handle?.trim() ||
        row.user_id,
      handle: profile?.handle?.trim() || null,
      joinedAt: resolveJoinedAt(row),
      updatedAt: resolveParticipationUpdatedAt(row),
      participationStatus: row.participation_status,
      participationSource: row.participation_source,
    };
  });
}

export async function reviewActionParticipation(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    participantId: string;
    decision: "accept" | "reject";
  },
): Promise<{
  alreadyReviewed: boolean;
  participantUserId: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
}> {
  const existing = await readParticipantRecordById(supabase, {
    actionId: params.actionId,
    participantId: params.participantId,
  });

  if (!existing) {
    const notFoundError = new Error("Participation request not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (existing.participation_status !== PENDING_PARTICIPATION_STATUS) {
    const validationError = new Error(
      "Cette participation a déjà été traitée.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const joinedAt = existing.joined_at ?? existing.created_at;
  const nextStatus =
    params.decision === "accept"
      ? ACTIVE_PARTICIPATION_STATUS
      : "cancelled";
  const updatedRecord = await updateParticipantRecord(supabase, {
    actionId: params.actionId,
    userId: existing.user_id,
    joinedAt,
    participationStatus: nextStatus,
    participationSource: existing.participation_source,
  });

  return {
    alreadyReviewed: false,
    participantUserId: existing.user_id,
    participationStatus: updatedRecord.participation_status,
    participationSource: updatedRecord.participation_source,
    joinedAt: resolveJoinedAt(updatedRecord),
    updatedAt: resolveParticipationUpdatedAt(updatedRecord),
  };
}

export async function joinActionParticipation(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string; isAdminLike: boolean },
): Promise<{
  alreadyJoined: boolean;
  joinedAt: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  participationUpdatedAt: string | null;
  participantsCount: number;
}> {
  const actionResult = await runSingleActionQuery<{
    status: "pending" | "approved" | "rejected";
    notes: string | null;
  }>(supabase, (query) => query.select(ACTION_PARTICIPATION_COLUMNS).eq("id", params.actionId).maybeSingle());

  if (!actionResult) {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.status !== "approved") {
    const validationError = new Error(
      "L'action doit etre validée par un admin avant de rejoindre son formulaire.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const actionMetadata = extractActionMetadataFromNotes(actionResult.notes);
  if (actionMetadata.groupJoinEnabled === false) {
    const validationError = new Error(
      "L'organisateur n'a pas ouvert ce formulaire.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const desiredStatus = params.isAdminLike
    ? ACTIVE_PARTICIPATION_STATUS
    : PENDING_PARTICIPATION_STATUS;
  const desiredSource = params.isAdminLike
    ? ADMIN_PARTICIPATION_SOURCE
    : GROUP_PARTICIPATION_SOURCE;
  const existingResult = await readParticipantRecord(supabase, params);
  if (existingResult) {
    if (
      existingResult.participation_status === ACTIVE_PARTICIPATION_STATUS &&
      desiredStatus === PENDING_PARTICIPATION_STATUS
    ) {
      const participantsCount = await countParticipantsForAction(supabase, params.actionId);
      return {
        alreadyJoined: true,
        joinedAt: resolveJoinedAt(existingResult),
        participationStatus: existingResult.participation_status,
        participationSource: existingResult.participation_source,
        participationUpdatedAt: resolveParticipationUpdatedAt(existingResult),
        participantsCount,
      };
    }

    if (existingResult.participation_status === desiredStatus) {
      const participantsCount = await countParticipantsForAction(supabase, params.actionId);
      return {
        alreadyJoined: desiredStatus === ACTIVE_PARTICIPATION_STATUS,
        joinedAt: resolveJoinedAt(existingResult),
        participationStatus: existingResult.participation_status,
        participationSource: existingResult.participation_source,
        participationUpdatedAt: resolveParticipationUpdatedAt(existingResult),
        participantsCount,
      };
    }

    const joinedAt = new Date().toISOString();
    const updatedRecord = await updateParticipantRecord(supabase, {
      actionId: params.actionId,
      userId: params.userId,
      joinedAt,
      participationStatus: desiredStatus,
      participationSource: desiredSource,
    });
    const participantsCount = await countParticipantsForAction(supabase, params.actionId);

    return {
      alreadyJoined: desiredStatus === ACTIVE_PARTICIPATION_STATUS && existingResult.participation_status === ACTIVE_PARTICIPATION_STATUS,
      joinedAt: resolveJoinedAt(updatedRecord),
      participationStatus: updatedRecord.participation_status,
      participationSource: updatedRecord.participation_source,
      participationUpdatedAt: resolveParticipationUpdatedAt(updatedRecord),
      participantsCount,
    };
  }

  const joinedAt = new Date().toISOString();
  let insertedRecord: ActionParticipantStatusRow;
  try {
    insertedRecord = await insertParticipantRecord(supabase, {
      actionId: params.actionId,
      userId: params.userId,
      joinedAt,
      participationStatus: desiredStatus,
      participationSource: desiredSource,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      const duplicateRecord = await readParticipantRecord(supabase, params);
      if (!duplicateRecord) {
        throw error;
      }

      if (duplicateRecord.participation_status === desiredStatus) {
        const participantsCount = await countParticipantsForAction(supabase, params.actionId);
        return {
          alreadyJoined: desiredStatus === ACTIVE_PARTICIPATION_STATUS,
          joinedAt: resolveJoinedAt(duplicateRecord),
          participationStatus: duplicateRecord.participation_status,
          participationSource: duplicateRecord.participation_source,
          participationUpdatedAt: resolveParticipationUpdatedAt(duplicateRecord),
          participantsCount,
        };
      }

      const reactivatedRecord = await updateParticipantRecord(supabase, {
        actionId: params.actionId,
        userId: params.userId,
        joinedAt,
        participationStatus: desiredStatus,
        participationSource: desiredSource,
      });
      const participantsCount = await countParticipantsForAction(supabase, params.actionId);

      return {
        alreadyJoined:
          desiredStatus === ACTIVE_PARTICIPATION_STATUS &&
          duplicateRecord.participation_status === ACTIVE_PARTICIPATION_STATUS,
        joinedAt: resolveJoinedAt(reactivatedRecord),
        participationStatus: reactivatedRecord.participation_status,
        participationSource: reactivatedRecord.participation_source,
        participationUpdatedAt: resolveParticipationUpdatedAt(reactivatedRecord),
        participantsCount,
      };
    }

    throw error;
  }
  const participantsCount = await countParticipantsForAction(supabase, params.actionId);

  return {
    alreadyJoined: false,
    joinedAt: resolveJoinedAt(insertedRecord),
    participationStatus: insertedRecord.participation_status,
    participationSource: insertedRecord.participation_source,
    participationUpdatedAt: resolveParticipationUpdatedAt(insertedRecord),
    participantsCount,
  };
}
/* eslint-enable max-lines, max-lines-per-function, complexity */
