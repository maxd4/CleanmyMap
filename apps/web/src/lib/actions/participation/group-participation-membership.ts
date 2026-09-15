import type { SupabaseClient } from "@supabase/supabase-js";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { runSingleActionQuery } from "@/lib/actions/query";
import { isJoinableFuturePreAction } from "@/lib/actions/temporal";
import type { ActionPhase } from "@/lib/actions/types";
import {
  ACTION_PARTICIPATION_COLUMNS,
  ACTIVE_PARTICIPATION_STATUS,
  ADMIN_PARTICIPATION_SOURCE,
  GROUP_PARTICIPATION_SOURCE,
  PENDING_PARTICIPATION_STATUS,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";
import {
  countActiveRegistrationsForAction,
  insertActionRegistrationRecord,
  readActionRegistrationRecord,
  resolveRegisteredAt,
  resolveRegistrationUpdatedAt,
  updateActionRegistrationRecord,
  type ActionRegistrationStatusRow,
} from "./registration-records";

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
  const existing = await readActionRegistrationRecord(supabase, params);

  if (!existing) {
    const notFoundError = new Error("Participation request not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  const currentParticipantsCount = await countActiveRegistrationsForAction(supabase, params.actionId);

  if (existing.registration_status === "cancelled") {
    return {
      alreadyCancelled: true,
      joinedAt: resolveRegisteredAt(existing),
      participationStatus: existing.registration_status,
      participationSource: existing.registration_source,
      participationUpdatedAt: resolveRegistrationUpdatedAt(existing),
      participantsCount: currentParticipantsCount,
    };
  }

  const updatedRecord = await updateActionRegistrationRecord(supabase, {
    actionId: params.actionId,
    userId: params.userId,
    registeredAt: resolveRegisteredAt(existing),
    registrationStatus: "cancelled",
    registrationSource: existing.registration_source,
  });

  return {
    alreadyCancelled: false,
    joinedAt: resolveRegisteredAt(updatedRecord),
    participationStatus: updatedRecord.registration_status,
    participationSource: updatedRecord.registration_source,
    participationUpdatedAt: resolveRegistrationUpdatedAt(updatedRecord),
    participantsCount: Math.max(
      0,
      currentParticipantsCount -
    (existing.registration_status === ACTIVE_PARTICIPATION_STATUS ? 1 : 0),
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
    status: "pending" | "approved" | "rejected" | "cancelled";
    moderation_visibility?: "visible" | "hidden" | null;
    action_phase: ActionPhase;
    action_date: string;
    event_start_time?: string | null;
    published_at?: string | null;
    notes: string | null;
  }>(supabase, (query) => query.select(ACTION_PARTICIPATION_COLUMNS).eq("id", params.actionId).maybeSingle());

  if (!actionResult) {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  if (actionResult.status === "cancelled") {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  const actionMetadata = extractActionMetadataFromNotes(actionResult.notes);
  if (!isJoinableFuturePreAction(actionResult, actionMetadata)) {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }

  const desiredStatus = params.isAdminLike
    ? ACTIVE_PARTICIPATION_STATUS
    : PENDING_PARTICIPATION_STATUS;
  const desiredSource = params.isAdminLike
    ? ADMIN_PARTICIPATION_SOURCE
    : GROUP_PARTICIPATION_SOURCE;
  const existingResult = await readActionRegistrationRecord(supabase, params);
  if (existingResult) {
    if (
      existingResult.registration_status === ACTIVE_PARTICIPATION_STATUS &&
      desiredStatus === PENDING_PARTICIPATION_STATUS
    ) {
      const participantsCount = await countActiveRegistrationsForAction(supabase, params.actionId);
      return {
        alreadyJoined: true,
        joinedAt: resolveRegisteredAt(existingResult),
        participationStatus: existingResult.registration_status,
        participationSource: existingResult.registration_source,
        participationUpdatedAt: resolveRegistrationUpdatedAt(existingResult),
        participantsCount,
      };
    }

    if (existingResult.registration_status === desiredStatus) {
      const participantsCount = await countActiveRegistrationsForAction(supabase, params.actionId);
      return {
        alreadyJoined: desiredStatus === ACTIVE_PARTICIPATION_STATUS,
        joinedAt: resolveRegisteredAt(existingResult),
        participationStatus: existingResult.registration_status,
        participationSource: existingResult.registration_source,
        participationUpdatedAt: resolveRegistrationUpdatedAt(existingResult),
        participantsCount,
      };
    }

    const joinedAt = new Date().toISOString();
    const updatedRecord = await updateActionRegistrationRecord(supabase, {
      actionId: params.actionId,
      userId: params.userId,
      registeredAt: joinedAt,
      registrationStatus: desiredStatus,
      registrationSource: desiredSource,
    });
    const participantsCount = await countActiveRegistrationsForAction(supabase, params.actionId);

    return {
      alreadyJoined: desiredStatus === ACTIVE_PARTICIPATION_STATUS && existingResult.registration_status === ACTIVE_PARTICIPATION_STATUS,
      joinedAt: resolveRegisteredAt(updatedRecord),
      participationStatus: updatedRecord.registration_status,
      participationSource: updatedRecord.registration_source,
      participationUpdatedAt: resolveRegistrationUpdatedAt(updatedRecord),
      participantsCount,
    };
  }

  const joinedAt = new Date().toISOString();
  let insertedRecord: ActionRegistrationStatusRow;
  try {
    insertedRecord = await insertActionRegistrationRecord(supabase, {
      actionId: params.actionId,
      userId: params.userId,
      registeredAt: joinedAt,
      registrationStatus: desiredStatus,
      registrationSource: desiredSource,
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      const duplicateRecord = await readActionRegistrationRecord(supabase, params);
      if (!duplicateRecord) {
        throw error;
      }

      if (duplicateRecord.registration_status === desiredStatus) {
        const participantsCount = await countActiveRegistrationsForAction(supabase, params.actionId);
        return {
          alreadyJoined: desiredStatus === ACTIVE_PARTICIPATION_STATUS,
          joinedAt: resolveRegisteredAt(duplicateRecord),
          participationStatus: duplicateRecord.registration_status,
          participationSource: duplicateRecord.registration_source,
          participationUpdatedAt: resolveRegistrationUpdatedAt(duplicateRecord),
          participantsCount,
        };
      }

      const reactivatedRecord = await updateActionRegistrationRecord(supabase, {
        actionId: params.actionId,
        userId: params.userId,
        registeredAt: joinedAt,
        registrationStatus: desiredStatus,
        registrationSource: desiredSource,
      });
      const participantsCount = await countActiveRegistrationsForAction(supabase, params.actionId);

      return {
        alreadyJoined:
          desiredStatus === ACTIVE_PARTICIPATION_STATUS &&
          duplicateRecord.registration_status === ACTIVE_PARTICIPATION_STATUS,
        joinedAt: resolveRegisteredAt(reactivatedRecord),
        participationStatus: reactivatedRecord.registration_status,
        participationSource: reactivatedRecord.registration_source,
        participationUpdatedAt: resolveRegistrationUpdatedAt(reactivatedRecord),
        participantsCount,
      };
    }

    throw error;
  }
  const participantsCount = await countActiveRegistrationsForAction(supabase, params.actionId);

  return {
    alreadyJoined: false,
    joinedAt: resolveRegisteredAt(insertedRecord),
    participationStatus: insertedRecord.registration_status,
    participationSource: insertedRecord.registration_source,
    participationUpdatedAt: resolveRegistrationUpdatedAt(insertedRecord),
    participantsCount,
  };
}
