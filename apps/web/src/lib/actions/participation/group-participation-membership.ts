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
import {
  createActionParticipationMutationResult,
  type ActionParticipationMutationResult,
} from "./group-participation-contract";

function buildMembershipResult(params: {
  alreadyJoined: boolean;
  joinedAt: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  participationUpdatedAt: string | null;
  participantsCount: number;
}): ActionParticipationMutationResult {
  return createActionParticipationMutationResult(params);
}
async function updateRegistrationAndBuildResult(
  supabase: SupabaseClient,
  params: {
    actionId: string;
    userId: string;
    registeredAt: string;
    registrationStatus: ActionRegistrationStatusRow["registration_status"];
    registrationSource: ActionRegistrationStatusRow["registration_source"];
    alreadyJoined: boolean;
  },
): Promise<ActionParticipationMutationResult> {
  const updatedRecord = await updateActionRegistrationRecord(supabase, params);
  const participantsCount = await countActiveRegistrationsForAction(
    supabase,
    params.actionId,
  );
  return buildMembershipResult({
    alreadyJoined: params.alreadyJoined,
    joinedAt: resolveRegisteredAt(updatedRecord),
    participationStatus: updatedRecord.registration_status,
    participationSource: updatedRecord.registration_source,
    participationUpdatedAt: resolveRegistrationUpdatedAt(updatedRecord),
    participantsCount,
  });
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

type JoinableActionRow = {
  status: "pending" | "approved" | "rejected" | "cancelled";
  moderation_visibility?: "visible" | "hidden" | null;
  action_phase: ActionPhase;
  action_date: string;
  event_start_time?: string | null;
  published_at?: string | null;
  notes: string | null;
};

async function loadJoinableFutureAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<JoinableActionRow> {
  const actionResult = await runSingleActionQuery<JoinableActionRow>(
    supabase,
    (query) =>
      query
        .select(ACTION_PARTICIPATION_COLUMNS)
        .eq("id", actionId)
        .maybeSingle(),
  );
  const actionMetadata = actionResult
    ? extractActionMetadataFromNotes(actionResult.notes)
    : null;
  if (
    !actionResult ||
    actionResult.status === "cancelled" ||
    !isJoinableFuturePreAction(
      actionResult,
      actionMetadata ?? { groupJoinEnabled: false },
    )
  ) {
    const notFoundError = new Error("Action not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }
  return actionResult;
}

async function resolveExistingRegistration(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
  existing: ActionRegistrationStatusRow,
  desiredStatus: ActionRegistrationStatusRow["registration_status"],
  desiredSource: ActionRegistrationStatusRow["registration_source"],
): Promise<ActionParticipationMutationResult> {
  if (
    existing.registration_status === ACTIVE_PARTICIPATION_STATUS &&
    desiredStatus === PENDING_PARTICIPATION_STATUS
  ) {
    const participantsCount = await countActiveRegistrationsForAction(
      supabase,
      params.actionId,
    );
    return buildMembershipResult({
      alreadyJoined: true,
      joinedAt: resolveRegisteredAt(existing),
      participationStatus: existing.registration_status,
      participationSource: existing.registration_source,
      participationUpdatedAt: resolveRegistrationUpdatedAt(existing),
      participantsCount,
    });
  }
  if (existing.registration_status === desiredStatus) {
    const participantsCount = await countActiveRegistrationsForAction(
      supabase,
      params.actionId,
    );
    return buildMembershipResult({
      alreadyJoined: desiredStatus === ACTIVE_PARTICIPATION_STATUS,
      joinedAt: resolveRegisteredAt(existing),
      participationStatus: existing.registration_status,
      participationSource: existing.registration_source,
      participationUpdatedAt: resolveRegistrationUpdatedAt(existing),
      participantsCount,
    });
  }
  const joinedAt = new Date().toISOString();
  return updateRegistrationAndBuildResult(supabase, {
    actionId: params.actionId,
    userId: params.userId,
    registeredAt: joinedAt,
    registrationStatus: desiredStatus,
    registrationSource: desiredSource,
    alreadyJoined:
      desiredStatus === ACTIVE_PARTICIPATION_STATUS &&
      existing.registration_status === ACTIVE_PARTICIPATION_STATUS,
  });
}

async function insertRegistrationWithRecovery(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string },
  desiredStatus: ActionRegistrationStatusRow["registration_status"],
  desiredSource: ActionRegistrationStatusRow["registration_source"],
): Promise<ActionParticipationMutationResult> {
  const joinedAt = new Date().toISOString();
  try {
    const insertedRecord = await insertActionRegistrationRecord(supabase, {
      actionId: params.actionId,
      userId: params.userId,
      registeredAt: joinedAt,
      registrationStatus: desiredStatus,
      registrationSource: desiredSource,
    });
    const participantsCount = await countActiveRegistrationsForAction(
      supabase,
      params.actionId,
    );
    return buildMembershipResult({
      alreadyJoined: false,
      joinedAt: resolveRegisteredAt(insertedRecord),
      participationStatus: insertedRecord.registration_status,
      participationSource: insertedRecord.registration_source,
      participationUpdatedAt: resolveRegistrationUpdatedAt(insertedRecord),
      participantsCount,
    });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && (error as { code?: string }).code === "23505")) {
      throw error;
    }
    const duplicateRecord = await readActionRegistrationRecord(supabase, params);
    if (!duplicateRecord) throw error;
    if (duplicateRecord.registration_status === desiredStatus) {
      const participantsCount = await countActiveRegistrationsForAction(
        supabase,
        params.actionId,
      );
      return buildMembershipResult({
        alreadyJoined: desiredStatus === ACTIVE_PARTICIPATION_STATUS,
        joinedAt: resolveRegisteredAt(duplicateRecord),
        participationStatus: duplicateRecord.registration_status,
        participationSource: duplicateRecord.registration_source,
        participationUpdatedAt: resolveRegistrationUpdatedAt(duplicateRecord),
        participantsCount,
      });
    }
    return updateRegistrationAndBuildResult(supabase, {
      actionId: params.actionId,
      userId: params.userId,
      registeredAt: joinedAt,
      registrationStatus: desiredStatus,
      registrationSource: desiredSource,
      alreadyJoined:
        desiredStatus === ACTIVE_PARTICIPATION_STATUS &&
        duplicateRecord.registration_status === ACTIVE_PARTICIPATION_STATUS,
    });
  }
}

export async function joinActionParticipation(
  supabase: SupabaseClient,
  params: { actionId: string; userId: string; isAdminLike: boolean },
): Promise<ActionParticipationMutationResult> {
  await loadJoinableFutureAction(supabase, params.actionId);
  const desiredStatus = params.isAdminLike
    ? ACTIVE_PARTICIPATION_STATUS
    : PENDING_PARTICIPATION_STATUS;
  const desiredSource = params.isAdminLike
    ? ADMIN_PARTICIPATION_SOURCE
    : GROUP_PARTICIPATION_SOURCE;
  const existingResult = await readActionRegistrationRecord(supabase, params);
  return existingResult
    ? resolveExistingRegistration(
        supabase,
        params,
        existingResult,
        desiredStatus,
        desiredSource,
      )
    : insertRegistrationWithRecovery(
        supabase,
        params,
        desiredStatus,
        desiredSource,
      );
}
