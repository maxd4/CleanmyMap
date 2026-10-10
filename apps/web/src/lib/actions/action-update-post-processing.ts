import type { SupabaseClient } from "@supabase/supabase-js";
import { recordRepollutionPredictionEvaluationForAction } from "./store-post-processing";
import {
  syncUpdatedOrganizers,
  syncUpdatedParticipants,
} from "./participation/action-update-participation-sync";
import {
  emitActionParticipantImpactNotifications,
} from "./action-participant-impact-notifications";
import type { ActionParticipantImpactSnapshot } from "./participation/group-participation-read";
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

type RunActionUpdatePostProcessingParams = {
  supabase: SupabaseClient;
  actionId: string;
  updateData: Record<string, unknown>;
  body: ActionUpdateInput;
  userId: string;
  identity: UserIdentity | null;
  shouldAuditModeration: boolean;
  auditSnapshots: ActionAuditSnapshots | null;
  previousImpactSnapshot?: ActionParticipantImpactSnapshot | null;
  persistedActionRevision?: string | null;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
  organizersAlreadySynced?: boolean;
  appendAdminAuditOnce: AuditAppender;
  setErrorStage: (stage: AdminOverrideErrorStage) => void;
};

export async function runActionUpdatePostProcessing(
  params: RunActionUpdatePostProcessingParams,
): Promise<void> {
  const {
    supabase,
    actionId,
    updateData,
    body,
    userId,
    identity,
    shouldAuditModeration,
    auditSnapshots,
    previousImpactSnapshot = null,
    persistedActionRevision = null,
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
  if (previousImpactSnapshot) {
    await emitActionParticipantImpactNotifications({
      supabase,
      actionId,
      previousSnapshot: previousImpactSnapshot,
      persistedRevision: persistedActionRevision,
    });
  }
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
