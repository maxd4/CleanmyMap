import type { SupabaseClient } from "@supabase/supabase-js";
import { recordRepollutionPredictionEvaluationForAction } from "./store";
import {
  loadActionOrganizerIdsForAction,
  syncActionManualParticipants,
} from "./participation/organizers";
import type { appendActionModerationAudit } from "./moderation-audit";
import type { UserIdentity } from "@/lib/authz";
import type {
  ActionAuditSnapshots,
  ActionUpdateInput,
} from "./action-update-audit";
import type { ActionRow } from "@/types/database";

export type AdminOverrideErrorStage =
  | "action_update"
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
  current: ActionRow;
  userId: string;
  identity: UserIdentity | null;
  shouldAuditModeration: boolean;
  auditSnapshots: ActionAuditSnapshots | null;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  appendAdminAuditOnce: AuditAppender;
  setErrorStage: (stage: AdminOverrideErrorStage) => void;
}): Promise<void> {
  const {
    supabase,
    actionId,
    updateData,
    body,
    current,
    userId,
    identity,
    shouldAuditModeration,
    auditSnapshots,
    adminAuditActorUserId,
    adminAuditTargetUserId,
    appendAdminAuditOnce,
    setErrorStage,
  } = params;

  setErrorStage("post_update");
  if (updateData["status"] === "approved") {
    await recordRepollutionPredictionEvaluationForAction(supabase, actionId);
  }

  if (body.participantAccounts !== undefined) {
    setErrorStage("participant_sync");
    const organizerIds = await loadActionOrganizerIdsForAction(
      supabase,
      actionId,
      current.created_by_clerk_id,
    );
    const resolvedIdentity = identity ?? {
      displayName: userId,
      handle: userId,
      username: userId,
      email: null,
    };

    await syncActionManualParticipants({
      supabase,
      actionId,
      creator: {
        userId,
        displayName: resolvedIdentity.displayName?.trim() || userId,
        handle: resolvedIdentity.handle?.trim() || null,
        username: resolvedIdentity.username?.trim() || null,
        email: resolvedIdentity.email?.trim() || null,
      },
      participantAccounts: body.participantAccounts ?? [],
      organizerIds,
    });
  }

  if (shouldAuditModeration && auditSnapshots) {
    setErrorStage("post_update");
    await appendAdminAuditOnce({
      operationId: `action-edit-${actionId}-${Date.now()}`,
      actorUserId: adminAuditActorUserId,
      targetActionId: actionId,
      operation: "edit_action",
      outcome: "success",
      targetUserId: adminAuditTargetUserId,
      previousValue: auditSnapshots.previousValue,
      newValue: auditSnapshots.newValue,
    });
  }
}
