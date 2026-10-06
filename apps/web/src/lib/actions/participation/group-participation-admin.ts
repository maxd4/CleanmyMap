import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import { runSingleActionQuery } from "@/lib/actions/query";
import type { ActionPhase } from "@/lib/actions/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { usesRegistrationStore } from "./action-phase";
import {
  ACTION_PARTICIPATION_COLUMNS,
  ADMIN_PARTICIPATION_SOURCE,
  ACTIVE_PARTICIPATION_STATUS,
} from "./group-participation.helpers";
import { runActionParticipationStep } from "./group-participation-contract";
import {
  insertParticipationRecordForPhase,
  readParticipationRecordForPhase,
  updateParticipationRecordForPhase,
  type ParticipationRecord,
} from "./group-participation-persistence";
import {
  countReviewedParticipants,
  toParticipationAuditValue,
  type ParticipationMutationResult,
} from "./group-participation-review-support";

type AddActionParticipationParams = {
  actionId: string;
  targetUserId: string;
  actionPhase?: ActionPhase;
};

type AddActionParticipationResult = ParticipationMutationResult & {
  alreadyJoined: boolean;
};

async function validateAdminParticipationAction(
  supabase: SupabaseClient,
  actionId: string,
): Promise<{ action_phase: ActionPhase }> {
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
          .eq("id", actionId)
          .maybeSingle(),
      ),
  });
  if (!actionResult || actionResult.moderation_visibility === "hidden") {
    const error = new Error("Action not found.");
    error.name = "NotFoundError";
    throw error;
  }
  if (actionResult.status === "cancelled") {
    const error = new Error("Une action annulée ne peut plus recevoir de participant.");
    error.name = "ValidationError";
    throw error;
  }
  if (actionResult.action_phase !== "pre_action" && actionResult.status !== "approved") {
    const error = new Error("Le formulaire doit être ouvert en pré-action ou validée par un admin pour ajouter un participant.");
    error.name = "ValidationError";
    throw error;
  }
  if (extractActionMetadataFromNotes(actionResult.notes).groupJoinEnabled === false) {
    const error = new Error("L'organisateur n'a pas ouvert ce formulaire.");
    error.name = "ValidationError";
    throw error;
  }
  return actionResult;
}

async function addExistingParticipationByAdmin(
  supabase: SupabaseClient,
  params: AddActionParticipationParams,
  useRegistrations: boolean,
  existing: ParticipationRecord,
): Promise<AddActionParticipationResult> {
  const joinedAt = existing.joined_at;
  const alreadyJoined =
    existing.status === ACTIVE_PARTICIPATION_STATUS &&
    existing.source === ADMIN_PARTICIPATION_SOURCE;
  const updatedRecord = alreadyJoined
    ? existing
    : await runActionParticipationStep({
        stage: "participation_update",
        partialMutation: false,
        targetUserId: params.targetUserId,
        operation: () =>
          updateParticipationRecordForPhase({
            supabase,
            useRegistrations,
            actionId: params.actionId,
            userId: params.targetUserId,
            joinedAt,
            status: ACTIVE_PARTICIPATION_STATUS,
            source: ADMIN_PARTICIPATION_SOURCE,
            recordId: existing.id,
          }),
      });
  const participantsCount = await countReviewedParticipants(
    supabase,
    params.actionId,
    useRegistrations,
    !alreadyJoined,
    params.targetUserId,
  );
  return {
    alreadyJoined,
    participantUserId: params.targetUserId,
    participationStatus: updatedRecord.status,
    participationSource: updatedRecord.source,
    joinedAt: updatedRecord.joined_at,
    updatedAt: updatedRecord.updated_at ?? updatedRecord.joined_at,
    participantsCount,
    previousValue: toParticipationAuditValue(existing),
    newValue: toParticipationAuditValue(updatedRecord),
  };
}

async function addNewParticipationByAdmin(
  supabase: SupabaseClient,
  params: AddActionParticipationParams,
  useRegistrations: boolean,
): Promise<AddActionParticipationResult> {
  const joinedAt = new Date().toISOString();
  const insertedRecord = await runActionParticipationStep<ParticipationRecord>({
    stage: "participation_update",
    partialMutation: false,
    targetUserId: params.targetUserId,
    operation: () =>
      insertParticipationRecordForPhase({
        supabase,
        useRegistrations,
        actionId: params.actionId,
        userId: params.targetUserId,
        joinedAt,
        status: ACTIVE_PARTICIPATION_STATUS,
        source: ADMIN_PARTICIPATION_SOURCE,
      }),
  });
  const participantsCount = await countReviewedParticipants(
    supabase,
    params.actionId,
    useRegistrations,
    true,
    params.targetUserId,
  );
  return {
    alreadyJoined: false,
    participantUserId: params.targetUserId,
    participationStatus: insertedRecord.status,
    participationSource: insertedRecord.source,
    joinedAt: insertedRecord.joined_at,
    updatedAt: insertedRecord.updated_at ?? insertedRecord.joined_at,
    participantsCount,
    previousValue: null,
    newValue: toParticipationAuditValue(insertedRecord),
  };
}

export async function addActionParticipationByAdmin(
  supabase: SupabaseClient,
  params: AddActionParticipationParams,
): Promise<AddActionParticipationResult> {
  const actionResult = await validateAdminParticipationAction(
    supabase,
    params.actionId,
  );
  const useRegistrations = usesRegistrationStore(
    params.actionPhase ?? actionResult.action_phase,
  );
  const existing = await runActionParticipationStep<ParticipationRecord | null>({
    stage: "lookup",
    partialMutation: false,
    targetUserId: params.targetUserId,
    operation: () =>
      readParticipationRecordForPhase({
        supabase,
        useRegistrations,
        actionId: params.actionId,
        userId: params.targetUserId,
      }),
  });
  return existing
    ? addExistingParticipationByAdmin(supabase, params, useRegistrations, existing)
    : addNewParticipationByAdmin(supabase, params, useRegistrations);
}
