import type { SupabaseClient } from "@supabase/supabase-js";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { runActionQuery, runSingleActionQuery } from "@/lib/actions/query";
import type { ActionParticipantSummary } from "./participant-summaries";
import { loadActionParticipantSummaries } from "./participant-summaries";
import type { ActionPhase } from "@/lib/actions/types";
import {
  ACTION_PARTICIPATION_COLUMNS,
  ACTION_PREVIEW_COLUMNS,
  ACTIVE_PARTICIPATION_STATUS,
  ADMIN_PARTICIPATION_SOURCE,
  buildJoinableItem,
  countParticipantsForAction,
  escapeSearchPattern,
  GROUP_PARTICIPATION_SOURCE,
  insertParticipantRecord,
  loadParticipantProfilesForUserIds,
  PENDING_PARTICIPATION_STATUS,
  readParticipantRecord,
  readParticipantRecordById,
  resolveJoinedAt,
  resolveParticipationUpdatedAt,
  updateParticipantRecord,
  type ActionParticipantRecordRow,
  type ActionParticipantReviewRow,
  type ActionParticipantStatusRow,
  type ActionPreviewRow,
  type ParticipantSearchRow,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";

type ParticipationAuditValue = {
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
};

function buildParticipationAuditValue(
  row: Pick<
    ActionParticipantStatusRow,
    | "created_at"
    | "joined_at"
    | "updated_at"
    | "participation_status"
    | "participation_source"
  >,
): ParticipationAuditValue {
  return {
    participationStatus: row.participation_status,
    participationSource: row.participation_source,
    joinedAt: resolveJoinedAt(row),
    updatedAt: resolveParticipationUpdatedAt(row),
  };
}

export type JoinableActionItem = {
  id: string;
  created_at: string;
  action_date: string;
  location_label: string;
  volunteers_count: number;
  duration_minutes: number;
  status: "pending" | "approved" | "rejected";
  actionPhase: ActionPhase;
  participantsCount: number;
  joined: boolean;
  awaitingApproval: boolean;
  joinedAt: string | null;
  participationStatus: ParticipationStatus | null;
  participationSource: ParticipationSource | null;
  participationUpdatedAt: string | null;
  groupJoinEnabled: boolean;
  pendingRequestsCount: number;
};

export type JoinableActionHistoryItem = JoinableActionItem;

export function isVisibleInGroupForms(
  action: Pick<ActionPreviewRow, "action_phase">,
  metadata: { groupJoinEnabled: boolean },
): boolean {
  return action.action_phase === "pre_action" && metadata.groupJoinEnabled === true;
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
      .eq("action_phase", "pre_action")
      .eq("moderation_visibility", "visible")
      .in("status", ["approved", "pending"])
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
        .eq("action_phase", "pre_action")
        .eq("moderation_visibility", "visible")
        .eq("id", params.actionId)
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
    .filter(({ action, metadata }) => isVisibleInGroupForms(action, metadata))
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
  try {
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
    const participantSummaryByActionId = new Map<string, ActionParticipantSummary>();
    const participantSummaries = await loadActionParticipantSummaries(supabase, {
      actionIds,
      userId: params.userId,
    });
    for (const summary of participantSummaries) {
      participantCounts.set(summary.actionId, summary.activeCount);
      participantSummaryByActionId.set(summary.actionId, summary);
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
          actionPhase: action.action_phase ?? "post_action_complete",
          participantsCount: participantCounts.get(action.id) ?? 0,
          joined,
          awaitingApproval,
          joinedAt: resolveJoinedAt(participation),
          participationStatus: participation.participation_status,
          participationSource: participation.participation_source,
          participationUpdatedAt: resolveParticipationUpdatedAt(participation),
          groupJoinEnabled: metadata.groupJoinEnabled,
          pendingRequestsCount: Math.max(
            0,
            (participantSummaryByActionId.get(action.id)?.totalCount ?? 0) -
              (participantCounts.get(action.id) ?? 0),
          ),
        } satisfies JoinableActionHistoryItem,
      ];
    });
  } catch (error) {
    console.warn("[group-participation] unable to load participation history", {
      userId: params.userId,
      limit: params.limit,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
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

export type ActionParticipationSearchItem = {
  userId: string;
  displayName: string;
  handle: string | null;
};

export async function loadActionParticipationReviews(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    limit?: number;
    statuses?: ParticipationStatus[];
  },
): Promise<ActionParticipationReviewItem[]> {
  const reviewLimit = Math.max(1, Math.min(params.limit ?? 24, 100));
  const statuses = params.statuses ?? [PENDING_PARTICIPATION_STATUS];
  const result = await supabase
    .from("action_participants")
    .select(
      "id, action_id, created_at, joined_at, updated_at, user_id, participation_status, participation_source",
    )
    .eq("action_id", params.actionId)
    .in("participation_status", statuses)
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

export async function searchActionParticipationCandidates(
  supabase: SupabaseClient,
  searchTerm: string,
  limit = 8,
): Promise<ActionParticipationSearchItem[]> {
  const term = searchTerm.trim();
  if (term.length === 0) {
    return [];
  }

  const cappedLimit = Math.max(1, Math.min(limit, 20));
  const exactQueries = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, handle")
      .eq("id", term)
      .limit(cappedLimit),
    supabase
      .from("profiles")
      .select("id, display_name, handle")
      .eq("handle", term)
      .limit(cappedLimit),
  ]);

  const exactRows = exactQueries.flatMap((result) =>
    result.error ? [] : ((result.data ?? []) as ParticipantSearchRow[]),
  );
  const exactMatches = exactRows.filter((row, index, rows) =>
    rows.findIndex((candidate) => candidate.id === row.id) === index,
  );
  if (exactMatches.length > 0) {
    return exactMatches.slice(0, cappedLimit).map((row) => ({
      userId: row.id,
      displayName: row.display_name?.trim() || row.handle?.trim() || row.id,
      handle: row.handle?.trim() || null,
    }));
  }

  const pattern = `%${escapeSearchPattern(term)}%`;
  const partial = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .or(`handle.ilike.${pattern},display_name.ilike.${pattern}`)
    .order("display_name", { ascending: true })
    .limit(cappedLimit);

  if (partial.error) {
    return [];
  }

  const partialRows = (partial.data ?? []) as ParticipantSearchRow[];
  return partialRows
    .filter((row, index, rows) =>
      rows.findIndex((candidate) => candidate.id === row.id) === index,
    )
    .map((row) => ({
      userId: row.id,
      displayName: row.display_name?.trim() || row.handle?.trim() || row.id,
      handle: row.handle?.trim() || null,
    }));
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
  participantsCount: number;
  previousValue: ParticipationAuditValue;
  newValue: ParticipationAuditValue;
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

  if (existing.participation_status === "cancelled") {
    const validationError = new Error(
      "Cette participation a déjà été traitée.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  const joinedAt = existing.joined_at ?? existing.created_at;
  if (
    params.decision === "accept" &&
    existing.participation_status === ACTIVE_PARTICIPATION_STATUS
  ) {
    const participantsCount = await countParticipantsForAction(
      supabase,
      params.actionId,
    );
    return {
      alreadyReviewed: true,
      participantUserId: existing.user_id,
      participationStatus: existing.participation_status,
      participationSource: existing.participation_source,
      joinedAt: resolveJoinedAt(existing),
      updatedAt: resolveParticipationUpdatedAt(existing),
      participantsCount,
      previousValue: buildParticipationAuditValue(existing),
      newValue: buildParticipationAuditValue(existing),
    };
  }

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
  const participantsCount = await countParticipantsForAction(
    supabase,
    params.actionId,
  );

  return {
    alreadyReviewed: false,
    participantUserId: existing.user_id,
    participationStatus: updatedRecord.participation_status,
    participationSource: updatedRecord.participation_source,
    joinedAt: resolveJoinedAt(updatedRecord),
    updatedAt: resolveParticipationUpdatedAt(updatedRecord),
    participantsCount,
    previousValue: buildParticipationAuditValue(existing),
    newValue: buildParticipationAuditValue(updatedRecord),
  };
}

export async function addActionParticipationByAdmin(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    targetUserId: string;
  },
): Promise<{
  alreadyJoined: boolean;
  participantUserId: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
  participantsCount: number;
  previousValue: ParticipationAuditValue | null;
  newValue: ParticipationAuditValue;
}> {
  const actionResult = await runSingleActionQuery<{
    status: "pending" | "approved" | "rejected";
    moderation_visibility?: "visible" | "hidden" | null;
    action_phase: ActionPhase;
    notes: string | null;
  }>(supabase, (query) => query.select(ACTION_PARTICIPATION_COLUMNS).eq("id", params.actionId).maybeSingle());

  if (!actionResult) {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.moderation_visibility === "hidden") {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.action_phase !== "pre_action" && actionResult.status !== "approved") {
    const validationError = new Error(
      "Le formulaire doit être ouvert en pré-action ou validée par un admin pour ajouter un participant.",
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

  const existing = await readParticipantRecord(supabase, {
    actionId: params.actionId,
    userId: params.targetUserId,
  });

  const joinedAt = existing?.joined_at ?? existing?.created_at ?? new Date().toISOString();
  const targetStatus = ACTIVE_PARTICIPATION_STATUS;
  const targetSource = ADMIN_PARTICIPATION_SOURCE;

  if (existing) {
    const updatedRecord =
      existing.participation_status === targetStatus &&
      existing.participation_source === targetSource
        ? existing
        : await updateParticipantRecord(supabase, {
            actionId: params.actionId,
            userId: params.targetUserId,
            joinedAt,
            participationStatus: targetStatus,
            participationSource: targetSource,
          });

    const participantsCount = await countParticipantsForAction(
      supabase,
      params.actionId,
    );

    return {
      alreadyJoined:
        existing.participation_status === targetStatus &&
        existing.participation_source === targetSource,
      participantUserId: params.targetUserId,
      participationStatus: updatedRecord.participation_status,
      participationSource: updatedRecord.participation_source,
      joinedAt: resolveJoinedAt(updatedRecord),
      updatedAt: resolveParticipationUpdatedAt(updatedRecord),
      participantsCount,
      previousValue: buildParticipationAuditValue(existing),
      newValue: buildParticipationAuditValue(updatedRecord),
    };
  }

  const insertedRecord = await insertParticipantRecord(supabase, {
    actionId: params.actionId,
    userId: params.targetUserId,
    joinedAt,
    participationStatus: targetStatus,
    participationSource: targetSource,
  });

  const participantsCount = await countParticipantsForAction(
    supabase,
    params.actionId,
  );

  return {
    alreadyJoined: false,
    participantUserId: params.targetUserId,
    participationStatus: insertedRecord.participation_status,
    participationSource: insertedRecord.participation_source,
    joinedAt: resolveJoinedAt(insertedRecord),
    updatedAt: resolveParticipationUpdatedAt(insertedRecord),
    participantsCount,
    previousValue: null,
    newValue: buildParticipationAuditValue(insertedRecord),
  };
}

export async function cancelActionParticipation(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
  },
): Promise<{
  alreadyCancelled: boolean;
  joinedAt: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  participationUpdatedAt: string | null;
  participantsCount: number;
}> {
  const existing = await readParticipantRecord(supabase, params);

  if (!existing) {
    const notFoundError = new Error("Participation request not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  const currentParticipantsCount = await countParticipantsForAction(supabase, params.actionId);

  if (existing.participation_status === "cancelled") {
    return {
      alreadyCancelled: true,
      joinedAt: resolveJoinedAt(existing),
      participationStatus: existing.participation_status,
      participationSource: existing.participation_source,
      participationUpdatedAt: resolveParticipationUpdatedAt(existing),
      participantsCount: currentParticipantsCount,
    };
  }

  const updatedRecord = await updateParticipantRecord(supabase, {
    actionId: params.actionId,
    userId: params.userId,
    joinedAt: resolveJoinedAt(existing),
    participationStatus: "cancelled",
    participationSource: existing.participation_source,
  });

  return {
    alreadyCancelled: false,
    joinedAt: resolveJoinedAt(updatedRecord),
    participationStatus: updatedRecord.participation_status,
    participationSource: updatedRecord.participation_source,
    participationUpdatedAt: resolveParticipationUpdatedAt(updatedRecord),
    participantsCount: Math.max(
      0,
      currentParticipantsCount -
        (existing.participation_status === ACTIVE_PARTICIPATION_STATUS ? 1 : 0),
    ),
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
    moderation_visibility?: "visible" | "hidden" | null;
    action_phase: ActionPhase;
    notes: string | null;
  }>(supabase, (query) => query.select(ACTION_PARTICIPATION_COLUMNS).eq("id", params.actionId).maybeSingle());

  if (!actionResult) {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.moderation_visibility === "hidden") {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.action_phase !== "pre_action" && actionResult.status !== "approved") {
    const validationError = new Error(
      "Le formulaire doit être ouvert en pré-action ou validée par un admin pour rejoindre son formulaire.",
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
