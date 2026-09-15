import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { runSingleActionQuery } from "@/lib/actions/query";
import type { ActionPhase } from "@/lib/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACTION_PARTICIPATION_COLUMNS,
  ADMIN_PARTICIPATION_SOURCE,
  ACTIVE_PARTICIPATION_STATUS,
  countParticipantsForAction,
  escapeSearchPattern,
  insertParticipantRecord,
  loadParticipantProfilesForUserIds,
  PENDING_PARTICIPATION_STATUS,
  readParticipantRecord,
  readParticipantRecordById,
  resolveJoinedAt,
  resolveParticipationUpdatedAt,
  updateParticipantRecord,
  type ActionParticipantReviewRow,
  type ParticipantSearchRow,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";
import {
  buildParticipationAuditValue,
  runActionParticipationStep,
  type ActionParticipationReviewItem,
  type ParticipationAuditValue,
  type ActionParticipationSearchItem,
} from "./group-participation-contract";

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
  const existing = await runActionParticipationStep({
    stage: "lookup",
    partialMutation: false,
    operation: () =>
      readParticipantRecordById(supabase, {
        actionId: params.actionId,
        participantId: params.participantId,
      }),
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
    const participantsCount = await runActionParticipationStep({
      stage: "post_update",
      partialMutation: false,
      targetUserId: existing.user_id,
      operation: () =>
        countParticipantsForAction(supabase, params.actionId),
    });
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
  const updatedRecord = await runActionParticipationStep({
    stage: "participation_update",
    partialMutation: false,
    targetUserId: existing.user_id,
    operation: () =>
      updateParticipantRecord(supabase, {
        actionId: params.actionId,
        userId: existing.user_id,
        joinedAt,
        participationStatus: nextStatus,
        participationSource: existing.participation_source,
      }),
  });
  const participantsCount = await runActionParticipationStep({
    stage: "post_update",
    partialMutation: true,
    targetUserId: existing.user_id,
    operation: () => countParticipantsForAction(supabase, params.actionId),
  });

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
  const actionResult = await runActionParticipationStep({
    stage: "lookup",
    partialMutation: false,
    operation: () =>
      runSingleActionQuery<{
        status: "pending" | "approved" | "rejected" | "cancelled";
        moderation_visibility?: "visible" | "hidden" | null;
        action_phase: ActionPhase;
        notes: string | null;
      }>(supabase, (query) =>
        query
          .select(ACTION_PARTICIPATION_COLUMNS)
          .eq("id", params.actionId)
          .maybeSingle(),
      ),
  });

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

  if (actionResult.status === "cancelled") {
    const validationError = new Error(
      "Une action annulée ne peut plus recevoir de participant.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }

  if (
    actionResult.action_phase !== "pre_action" &&
    actionResult.status !== "approved"
  ) {
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

  const existing = await runActionParticipationStep({
    stage: "lookup",
    partialMutation: false,
    targetUserId: params.targetUserId,
    operation: () =>
      readParticipantRecord(supabase, {
        actionId: params.actionId,
        userId: params.targetUserId,
      }),
  });

  const joinedAt =
    existing?.joined_at ?? existing?.created_at ?? new Date().toISOString();
  const targetStatus = ACTIVE_PARTICIPATION_STATUS;
  const targetSource = ADMIN_PARTICIPATION_SOURCE;

  if (existing) {
    const alreadyJoined =
      existing.participation_status === targetStatus &&
      existing.participation_source === targetSource;
    const updatedRecord = alreadyJoined
      ? existing
      : await runActionParticipationStep({
          stage: "participation_update",
          partialMutation: false,
          targetUserId: params.targetUserId,
          operation: () =>
            updateParticipantRecord(supabase, {
              actionId: params.actionId,
              userId: params.targetUserId,
              joinedAt,
              participationStatus: targetStatus,
              participationSource: targetSource,
            }),
        });

    const participantsCount = await runActionParticipationStep({
      stage: "post_update",
      partialMutation: !alreadyJoined,
      targetUserId: params.targetUserId,
      operation: () => countParticipantsForAction(supabase, params.actionId),
    });

    return {
      alreadyJoined,
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

  const insertedRecord = await runActionParticipationStep({
    stage: "participation_update",
    partialMutation: false,
    targetUserId: params.targetUserId,
    operation: () =>
      insertParticipantRecord(supabase, {
        actionId: params.actionId,
        userId: params.targetUserId,
        joinedAt,
        participationStatus: targetStatus,
        participationSource: targetSource,
      }),
  });
  const participantsCount = await runActionParticipationStep({
    stage: "post_update",
    partialMutation: true,
    targetUserId: params.targetUserId,
    operation: () => countParticipantsForAction(supabase, params.actionId),
  });

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
