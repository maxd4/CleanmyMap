import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionPhase } from "@/lib/actions/types";
import { usesRegistrationStore } from "./action-phase";
import {
  ACTIVE_PARTICIPATION_STATUS,
  GROUP_PARTICIPATION_SOURCE,
  PENDING_PARTICIPATION_STATUS,
  type ParticipationStatus,
} from "./group-participation.helpers";
import { runActionParticipationStep } from "./group-participation-contract";
import {
  readParticipationRecordByIdForPhase,
  updateParticipationRecordForPhase,
  type ParticipationRecord,
} from "./group-participation-persistence";
import {
  countReviewedParticipants,
  toParticipationAuditValue,
  type ParticipationMutationResult,
} from "./group-participation-review-support";

type ReviewActionParticipationParams = {
  actionId: string;
  participantId: string;
  decision: "accept" | "reject";
  actionPhase?: ActionPhase;
  requirePending?: boolean;
};

type ReviewActionParticipationResult = ParticipationMutationResult & {
  alreadyReviewed: boolean;
};

async function buildAlreadyReviewedResult(
  supabase: SupabaseClient,
  actionId: string,
  useRegistrations: boolean,
  existing: ParticipationRecord,
): Promise<ReviewActionParticipationResult> {
  const participantsCount = await countReviewedParticipants(
    supabase,
    actionId,
    useRegistrations,
    false,
    existing.user_id,
  );
  return {
    alreadyReviewed: true,
    participantUserId: existing.user_id,
    participationStatus: existing.status,
    participationSource: existing.source,
    joinedAt: existing.joined_at,
    updatedAt: existing.updated_at ?? existing.joined_at,
    participantsCount,
    previousValue: toParticipationAuditValue(existing),
    newValue: toParticipationAuditValue(existing),
  };
}

async function loadReviewParticipation(
  supabase: SupabaseClient,
  params: ReviewActionParticipationParams,
  useRegistrations: boolean,
): Promise<ParticipationRecord> {
  const existing = await runActionParticipationStep<ParticipationRecord | null>({
    stage: "lookup",
    partialMutation: false,
    operation: () =>
      readParticipationRecordByIdForPhase({
        supabase,
        useRegistrations,
        actionId: params.actionId,
        participantId: params.participantId,
      }),
  });
  if (!existing) {
    const notFoundError = new Error("Participation request not found.");
    notFoundError.name = "NotFoundError";
    throw notFoundError;
  }
  if (
    useRegistrations &&
    existing.status === PENDING_PARTICIPATION_STATUS &&
    existing.source !== GROUP_PARTICIPATION_SOURCE
  ) {
    const validationError = new Error(
      "Cette invitation doit être traitée par son destinataire.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }
  if (existing.status === "cancelled" && !params.requirePending) {
    const validationError = new Error(
      "Cette participation a déjà été traitée.",
    );
    validationError.name = "ValidationError";
    throw validationError;
  }
  return existing;
}

async function applyParticipationReview(
  supabase: SupabaseClient,
  params: ReviewActionParticipationParams,
  useRegistrations: boolean,
  existing: ParticipationRecord,
): Promise<ReviewActionParticipationResult> {
  const nextStatus =
    params.decision === "accept" ? ACTIVE_PARTICIPATION_STATUS : "cancelled";
  let updatedRecord: ParticipationRecord;
  try {
    updatedRecord = await updateReviewRecord(supabase, params, useRegistrations, existing, nextStatus);
  } catch (error) {
    const current = await readParticipationRecordByIdForPhase({
      supabase,
      useRegistrations,
      actionId: params.actionId,
      participantId: params.participantId,
    });
    if (current && existing.status === PENDING_PARTICIPATION_STATUS && current.status !== PENDING_PARTICIPATION_STATUS) {
      return buildAlreadyReviewedResult(supabase, params.actionId, useRegistrations, current);
    }
    throw error;
  }
  const participantsCount = await countReviewedParticipants(
    supabase,
    params.actionId,
    useRegistrations,
    true,
    existing.user_id,
  );
  return {
    alreadyReviewed: false,
    participantUserId: existing.user_id,
    participationStatus: updatedRecord.status,
    participationSource: updatedRecord.source,
    joinedAt: updatedRecord.joined_at,
    updatedAt: updatedRecord.updated_at ?? updatedRecord.joined_at,
    participantsCount,
    previousValue: toParticipationAuditValue(existing),
    newValue: toParticipationAuditValue(updatedRecord),
  };
}

async function updateReviewRecord(
  supabase: SupabaseClient,
  params: ReviewActionParticipationParams,
  useRegistrations: boolean,
  existing: ParticipationRecord,
  nextStatus: ParticipationStatus,
): Promise<ParticipationRecord> {
  return runActionParticipationStep<ParticipationRecord>({
    stage: "participation_update",
    partialMutation: false,
    targetUserId: existing.user_id,
    operation: () =>
      updateParticipationRecordForPhase({
        supabase,
        useRegistrations,
        actionId: params.actionId,
        userId: existing.user_id,
        joinedAt: existing.joined_at,
        status: nextStatus,
        source: existing.source,
        recordId: params.participantId,
        expectedStatus: existing.status === PENDING_PARTICIPATION_STATUS
          ? PENDING_PARTICIPATION_STATUS
          : undefined,
      }),
  });
}

export async function reviewActionParticipation(
  supabase: SupabaseClient,
  params: ReviewActionParticipationParams,
): Promise<ReviewActionParticipationResult> {
  const useRegistrations = usesRegistrationStore(params.actionPhase);
  const existing = await loadReviewParticipation(
    supabase,
    params,
    useRegistrations,
  );
  if (
    params.decision === "accept" &&
    existing.status === ACTIVE_PARTICIPATION_STATUS
  ) {
    return buildAlreadyReviewedResult(
      supabase,
      params.actionId,
      useRegistrations,
      existing,
    );
  }
  if (params.requirePending && existing.status !== PENDING_PARTICIPATION_STATUS) {
    return buildAlreadyReviewedResult(
      supabase,
      params.actionId,
      useRegistrations,
      existing,
    );
  }
  return applyParticipationReview(supabase, params, useRegistrations, existing);
}
