import type { SupabaseClient } from "@supabase/supabase-js";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { runSingleActionQuery } from "@/lib/actions/query";
import type { ActionPhase } from "@/lib/actions/types";
import {
  ACTION_PARTICIPATION_COLUMNS,
  ACTIVE_PARTICIPATION_STATUS,
  ADMIN_PARTICIPATION_SOURCE,
  countParticipantsForAction,
  GROUP_PARTICIPATION_SOURCE,
  insertParticipantRecord,
  PENDING_PARTICIPATION_STATUS,
  readParticipantRecord,
  resolveJoinedAt,
  resolveParticipationUpdatedAt,
  updateParticipantRecord,
  type ActionParticipantStatusRow,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";

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
