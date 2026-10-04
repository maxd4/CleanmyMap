import type { SupabaseClient } from "@supabase/supabase-js";
import { runSingleActionQuery } from "@/lib/actions/query";
import { isActionStartInFuture } from "@/lib/actions/temporal";
import {
  ACTION_PARTICIPATION_COLUMNS,
  ACTIVE_PARTICIPATION_STATUS,
  insertParticipantRecord,
  POST_ACTION_CLAIM_PARTICIPATION_SOURCE,
  readParticipantRecord,
  resolveJoinedAt,
  resolveParticipationUpdatedAt,
  type ActionParticipantStatusRow,
  type ParticipationSource,
  type ParticipationStatus,
} from "./group-participation.helpers";
import {
  createParticipationAuditValue,
  type ParticipationAuditValue,
} from "./group-participation-contract";

export type PostActionClaimResult = {
  alreadyRequested: boolean;
  actionId: string;
  participantUserId: string;
  participationStatus: ParticipationStatus;
  participationSource: ParticipationSource;
  joinedAt: string;
  updatedAt: string | null;
  previousValue: ParticipationAuditValue | null;
  newValue: ParticipationAuditValue;
};

function toAuditValue(row: ActionParticipantStatusRow): ParticipationAuditValue {
  return createParticipationAuditValue({
    participationStatus: row.participation_status,
    participationSource: row.participation_source,
    joinedAt: resolveJoinedAt(row),
    updatedAt: resolveParticipationUpdatedAt(row),
  });
}

function buildClaimResult(params: {
  alreadyRequested: boolean;
  actionId: string;
  participantUserId: string;
  value: ParticipationAuditValue;
  previousValue: ParticipationAuditValue | null;
}): PostActionClaimResult {
  return {
    alreadyRequested: params.alreadyRequested,
    actionId: params.actionId,
    participantUserId: params.participantUserId,
    participationStatus: params.value.participationStatus,
    participationSource: params.value.participationSource,
    joinedAt: params.value.joinedAt,
    updatedAt: params.value.updatedAt,
    previousValue: params.previousValue,
    newValue: params.value,
  };
}

function createNotFoundError(): Error {
  const error = new Error("Action not found.");
  error.name = "NotFoundError";
  return error;
}

function createValidationError(message: string): Error {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}

function isDuplicateError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

type ClaimParams = { actionId: string; userId: string; now?: Date };

function buildExistingClaimResult(
  existing: ActionParticipantStatusRow,
  params: ClaimParams,
): PostActionClaimResult | null {
  const alreadyRequested =
    existing.participation_status === ACTIVE_PARTICIPATION_STATUS ||
    (existing.participation_status === "pending" &&
      existing.participation_source === POST_ACTION_CLAIM_PARTICIPATION_SOURCE);
  if (alreadyRequested) {
    const value = toAuditValue(existing);
    return buildClaimResult({
      alreadyRequested: true,
      actionId: params.actionId,
      participantUserId: params.userId,
      value,
      previousValue: value,
    });
  }
  throw createValidationError(
    existing.participation_status === "cancelled"
      ? "Cette demande a déjà été refusée ou annulée."
      : "Une demande de participation active existe déjà.",
  );
}

async function insertClaimWithRecovery(
  supabase: SupabaseClient,
  params: ClaimParams,
): Promise<PostActionClaimResult> {
  const joinedAt = new Date().toISOString();
  try {
    const inserted = await insertParticipantRecord(supabase, {
      actionId: params.actionId,
      userId: params.userId,
      joinedAt,
      participationStatus: "pending",
      participationSource: POST_ACTION_CLAIM_PARTICIPATION_SOURCE,
    });
    const value = toAuditValue(inserted);
    return buildClaimResult({
      alreadyRequested: false,
      actionId: params.actionId,
      participantUserId: params.userId,
      value,
      previousValue: null,
    });
  } catch (error) {
    if (!isDuplicateError(error)) throw error;
    const concurrent = await readParticipantRecord(supabase, params);
    if (concurrent) {
      return buildExistingClaimResult(concurrent, params) ??
        buildClaimResult({
          alreadyRequested: true,
          actionId: params.actionId,
          participantUserId: params.userId,
          value: toAuditValue(concurrent),
          previousValue: toAuditValue(concurrent),
        });
    }
    throw createValidationError(
      "Une demande de participation existe déjà pour cette action.",
    );
  }
}

export async function claimFinishedActionParticipation(
  supabase: SupabaseClient,
  params: ClaimParams,
): Promise<PostActionClaimResult> {
  const action = await runSingleActionQuery<{
    status: "pending" | "approved" | "rejected";
    moderation_visibility?: "visible" | "hidden" | null;
    action_phase: "pre_action" | "post_action_draft" | "post_action_complete";
    action_date: string;
    event_start_time?: string | null;
    published_at?: string | null;
  }>(supabase, (query) =>
    query
      .select(ACTION_PARTICIPATION_COLUMNS)
      .eq("id", params.actionId)
      .maybeSingle(),
  );

  const now = params.now ?? new Date();
  const eligible =
    action?.status === "approved" &&
    action.moderation_visibility !== "hidden" &&
    Boolean(action.published_at) &&
    action.action_phase === "post_action_complete" &&
    !isActionStartInFuture(action, now);

  if (!action || !eligible) {
    throw createNotFoundError();
  }

  const existing = await readParticipantRecord(supabase, params);
  return existing
    ? buildExistingClaimResult(existing, params) as PostActionClaimResult
    : insertClaimWithRecovery(supabase, params);
}
