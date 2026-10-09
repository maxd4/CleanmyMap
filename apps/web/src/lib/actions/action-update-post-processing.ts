import type { SupabaseClient } from "@supabase/supabase-js";
import { recordRepollutionPredictionEvaluationForAction } from "./store-post-processing";
import {
  loadCanonicalActionOrganizerIdsForAction,
  syncActionManualParticipants,
} from "./participation/organizers";
import { syncActionOrganizers } from "./participation/organizer-sync";
import { ManualParticipantSyncValidationError } from "./participation/manual-participant-sync";
import { ActionUpdateValidationError } from "./action-update-persistence";
import type { appendActionModerationAudit } from "./moderation-audit";
import type { UserIdentity } from "@/lib/authz";
import type {
  ActionAuditSnapshots,
  ActionUpdateInput,
} from "./action-update-audit";

export type AdminOverrideErrorStage =
  | "action_update"
  | "geometry_contribution"
  | "post_update"
  | "participant_sync";

type AuditAppender = (
  params: Parameters<typeof appendActionModerationAudit>[0],
) => Promise<void>;

export async function runActionUpdatePostProcessing(params: {
  supabase: SupabaseClient;
  actionId: string;
  updateData: Record<string, unknown>;
  body: ActionUpdateInput;
  userId: string;
  identity: UserIdentity | null;
  shouldAuditModeration: boolean;
  auditSnapshots: ActionAuditSnapshots | null;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
  organizersAlreadySynced?: boolean;
  appendAdminAuditOnce: AuditAppender;
  setErrorStage: (stage: AdminOverrideErrorStage) => void;
}): Promise<void> {
  const {
    supabase,
    actionId,
    updateData,
    body,
    userId,
    identity,
    shouldAuditModeration,
    auditSnapshots,
    adminAuditActorUserId,
    adminAuditTargetUserId,
    moderationOperation,
    moderationReason,
    organizersAlreadySynced = false,
    appendAdminAuditOnce,
    setErrorStage,
  } = params;

  setErrorStage("post_update");
  if (updateData["status"] === "approved") {
    await recordRepollutionPredictionEvaluationForAction(supabase, actionId);
  }

  if (!organizersAlreadySynced) {
    await syncUpdatedOrganizers({ supabase, actionId, body, userId, identity });
  }
  await syncUpdatedParticipants({ supabase, actionId, body, userId, identity, setErrorStage });
  await appendPostProcessingAudit({
    shouldAuditModeration,
    auditSnapshots,
    actionId,
    adminAuditActorUserId,
    adminAuditTargetUserId,
    moderationOperation,
    moderationReason,
    appendAdminAuditOnce,
    setErrorStage,
  });
}

export async function syncUpdatedOrganizers({
  supabase,
  actionId,
  body,
  userId,
  identity,
}: {
  supabase: SupabaseClient;
  actionId: string;
  body: ActionUpdateInput;
  userId: string;
  identity: UserIdentity | null;
}) {
  if (
    body.organizerAccounts === undefined
  ) return;

  const creator = resolvePostProcessingCreator(userId, identity);
  const organizerResolution = await syncActionOrganizers({
    supabase,
    actionId,
    creator,
    organizerAccounts: body.organizerAccounts,
  });
  if (organizerResolution.unresolvedTokens.length > 0) {
    throw new ActionUpdateValidationError(
      "organizerAccounts",
      `Comptes organisateurs introuvables: ${organizerResolution.unresolvedTokens.join(", ")}`,
    );
  }
}

async function syncUpdatedParticipants({
  supabase,
  actionId,
  body,
  userId,
  identity,
  setErrorStage,
}: {
  supabase: SupabaseClient;
  actionId: string;
  body: ActionUpdateInput;
  userId: string;
  identity: UserIdentity | null;
  setErrorStage: (stage: AdminOverrideErrorStage) => void;
}) {
  if (body.participantAccounts === undefined) return;
  setErrorStage("participant_sync");
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId);
  try {
    const resolution = await syncActionManualParticipants({
      supabase,
      actionId,
      creator: resolvePostProcessingCreator(userId, identity),
      participantAccounts: body.participantAccounts,
      organizerIds,
    });
    if (resolution.unresolvedTokens.length > 0) {
      throw new ActionUpdateValidationError(
        "participantAccounts",
        `Comptes participants introuvables: ${resolution.unresolvedTokens.join(", ")}`,
      );
    }
  } catch (error) {
    if (error instanceof ManualParticipantSyncValidationError) {
      throw new ActionUpdateValidationError("participantAccounts", error.message);
    }
    throw error;
  }
}

function resolvePostProcessingCreator(userId: string, identity: UserIdentity | null) {
  const resolvedIdentity = identity ?? {
    displayName: userId,
    handle: userId,
    username: userId,
    email: null,
  };
  return {
    userId,
    displayName: resolvedIdentity.displayName?.trim() || userId,
    handle: resolvedIdentity.handle?.trim() || null,
    username: resolvedIdentity.username?.trim() || null,
    email: resolvedIdentity.email?.trim() || null,
  };
}

async function appendPostProcessingAudit({
  shouldAuditModeration,
  auditSnapshots,
  actionId,
  adminAuditActorUserId,
  adminAuditTargetUserId,
  moderationOperation,
  moderationReason,
  appendAdminAuditOnce,
  setErrorStage,
}: {
  shouldAuditModeration: boolean;
  auditSnapshots: ActionAuditSnapshots | null;
  actionId: string;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
  appendAdminAuditOnce: AuditAppender;
  setErrorStage: (stage: AdminOverrideErrorStage) => void;
}) {
  if (!shouldAuditModeration || !auditSnapshots) return;
  setErrorStage("post_update");
  await appendAdminAuditOnce({
    operationId: `action-edit-${actionId}-${Date.now()}`,
    actorUserId: adminAuditActorUserId,
    targetActionId: actionId,
    operation: moderationOperation,
    outcome: "success",
    reason: moderationReason,
    targetUserId: adminAuditTargetUserId,
    previousValue: auditSnapshots.previousValue,
    newValue: auditSnapshots.newValue,
  });
}
