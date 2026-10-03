import { copyValidatedActionToLocalStore } from "@/lib/data/local-sync";
import { refreshActionImpactProgressionDependents } from "./route.action-progression";
import { runActionTransitionSideEffects } from "@/lib/admin/moderation/transition";
import { adminErrorResponse, adminSuccessResponse } from "@/lib/admin/response";
import {
  canonicalTargetUserId,
  type ActionAuditSnapshot,
  type ActionAuditState,
  type ActionImpactValues,
  type ActionModerationOperation,
  type ActionModerationPayload,
  type AppendModerationAuditOnce,
  type ModerationErrorStage,
  type ModerationSupabaseClient,
} from "./route.shared";

export type ActionStatusUpdateResult = {
  source: "actions" | "submissions";
  found: boolean;
};

export type ActionVisibilityUpdateResult = { found: boolean } | null;

export type ActionModerationEffectDependencies = {
  tryLoadActionAuditState: (
    supabase: ModerationSupabaseClient,
    id: string,
  ) => Promise<ActionAuditState | null>;
  applyExpectedActionAuditChanges: (
    previous: ActionAuditState | null,
    changes: {
      status: ActionModerationPayload["status"];
      moderationVisibility: ActionModerationPayload["moderationVisibility"];
      edits: ActionModerationPayload["edits"];
    },
  ) => ActionAuditState | null;
  toActionAuditSnapshot: (
    state: ActionAuditState | null,
  ) => ActionAuditSnapshot;
  loadActionImpactValues: (
    supabase: ModerationSupabaseClient,
    id: string,
  ) => Promise<ActionImpactValues | null>;
};

export async function actionNotFoundResponse(params: {
  operationId: string;
  actorUserId: string;
  targetId: string;
  entityType: ActionModerationPayload["entityType"];
  stage: "lookup" | "post_update";
  requiredReasonOperation: ActionModerationOperation | null;
  reason: string | null;
  appendAuditOnce: AppendModerationAuditOnce;
}): Promise<Response> {
  await params.appendAuditOnce({
    operationId: params.operationId,
    at: new Date().toISOString(),
    actorUserId: params.actorUserId,
    operationType: "moderation",
    outcome: "error",
    targetId: params.targetId,
    details: {
      code: "not_found",
      entityType: params.entityType,
      stage: params.stage,
      ...(params.requiredReasonOperation
        ? { operation: params.requiredReasonOperation }
        : {}),
      ...(params.reason ? { reason: params.reason } : {}),
    },
  });

  return adminErrorResponse({
    status: 404,
    code: "not_found",
    message: "Action not found",
    hint: "Verifier l'identifiant avant de relancer la moderation.",
    operationId: params.operationId,
  });
}

async function finishActionModeration(params: {
  supabase: ModerationSupabaseClient;
  payload: ActionModerationPayload;
  operationId: string;
  actorUserId: string;
  requiredReasonOperation: ActionModerationOperation | null;
  reason: string | null;
  appendAuditOnce: AppendModerationAuditOnce;
  previousActionAuditState: ActionAuditState | null;
  previousImpactValue: ActionImpactValues | null;
  refreshedProgressionUserIds: string[];
  shouldRefreshImpact: boolean;
  statusUpdate: ActionStatusUpdateResult;
  copied: boolean;
  dependencies: ActionModerationEffectDependencies;
}): Promise<Response> {
  const {
    supabase,
    payload,
    operationId,
    actorUserId,
    requiredReasonOperation,
    reason,
    appendAuditOnce,
    previousActionAuditState,
    previousImpactValue,
    refreshedProgressionUserIds,
    shouldRefreshImpact,
    statusUpdate,
    copied,
    dependencies,
  } = params;
  const loadedNewActionAuditState = await dependencies.tryLoadActionAuditState(
    supabase,
    payload.id,
  );
  const newActionAuditState =
    loadedNewActionAuditState ??
    dependencies.applyExpectedActionAuditChanges(previousActionAuditState, {
      status: payload.status,
      moderationVisibility: payload.moderationVisibility,
      edits: payload.edits,
    });
  const targetUserId = canonicalTargetUserId(
    previousActionAuditState?.createdByClerkId ??
      previousImpactValue?.createdByClerkId ??
      newActionAuditState?.createdByClerkId,
  );

  await appendAuditOnce({
    operationId,
    at: new Date().toISOString(),
    actorUserId,
    operationType: "moderation",
    outcome: "success",
    targetId: payload.id,
    details: {
      entityType: payload.entityType,
      targetStatus: payload.status,
      ...(requiredReasonOperation
        ? { operation: requiredReasonOperation }
        : {}),
      ...(reason ? { reason } : {}),
      ...(targetUserId ? { targetUserId } : {}),
      previousValue: dependencies.toActionAuditSnapshot(previousActionAuditState),
      newValue: dependencies.toActionAuditSnapshot(newActionAuditState),
      ...(refreshedProgressionUserIds.length > 0
        ? { refreshedProgressionUserIds }
        : {}),
      ...(shouldRefreshImpact
        ? { publicSurfaceSnapshotsInvalidated: true }
        : {}),
      sourceTable: statusUpdate.source,
      copiedToLocalValidatedStore: copied,
    },
  });

  return adminSuccessResponse({
    operationId,
    payload: {
      status: "ok",
      entityType: "action",
      id: payload.id,
      sourceTable: statusUpdate.source,
      copiedToLocalValidatedStore: copied,
    },
  });
}

async function runActionModerationPostUpdateEffects(params: {
  supabase: ModerationSupabaseClient;
  payload: ActionModerationPayload;
  operationId: string;
  actorUserId: string;
  requiredReasonOperation: ActionModerationOperation | null;
  reason: string | null;
  appendAuditOnce: AppendModerationAuditOnce;
  setErrorStage: (stage: ModerationErrorStage) => void;
  previousImpactValue: ActionImpactValues | null;
  shouldRefreshImpact: boolean;
  isApprovalTransition: boolean;
  isRejectionTransition: boolean;
  statusUpdate: ActionStatusUpdateResult;
  visibilityUpdate: ActionVisibilityUpdateResult;
  dependencies: ActionModerationEffectDependencies;
}): Promise<Response | { copied: boolean; refreshedProgressionUserIds: string[] }> {
  const {
    supabase,
    payload,
    operationId,
    actorUserId,
    requiredReasonOperation,
    reason,
    appendAuditOnce,
    setErrorStage,
    previousImpactValue,
    shouldRefreshImpact,
    isApprovalTransition,
    isRejectionTransition,
    statusUpdate,
    visibilityUpdate,
    dependencies,
  } = params;

  setErrorStage("post_update");
  if (payload.status === "approved" && statusUpdate.source === "actions") {
    const { recordRepollutionPredictionEvaluationForAction } =
      await import("@/lib/actions/store");
    await recordRepollutionPredictionEvaluationForAction(supabase, payload.id);
  }
  if (visibilityUpdate && !visibilityUpdate.found) {
    return actionNotFoundResponse({
      operationId,
      actorUserId,
      targetId: payload.id,
      entityType: payload.entityType,
      stage: "post_update",
      requiredReasonOperation,
      reason,
      appendAuditOnce,
    });
  }

  let copied = false;
  let refreshedProgressionUserIds: string[] = [];
  if (shouldRefreshImpact) {
    const newImpactValue = await dependencies.loadActionImpactValues(
      supabase,
      payload.id,
    );
    refreshedProgressionUserIds = await refreshActionImpactProgressionDependents(
      supabase,
      {
        actionId: payload.id,
        creatorUserId:
          newImpactValue?.createdByClerkId ??
          previousImpactValue?.createdByClerkId ??
          null,
        refreshUsers: !isApprovalTransition && !isRejectionTransition,
      },
    );
  }
  if (
    payload.status === "approved" &&
    requiredReasonOperation !== "restore_after_sanction"
  ) {
    setErrorStage("local_sync");
    const syncResult = await copyValidatedActionToLocalStore(
      supabase,
      payload.id,
      actorUserId,
    );
    copied = syncResult.copied;
    setErrorStage("post_update");
  }
  if (isApprovalTransition || isRejectionTransition) {
    setErrorStage("post_update");
    await runActionTransitionSideEffects(supabase, {
      actionId: payload.id,
      actorUserId,
      approvalTransition: isApprovalTransition,
      rejectionTransition: isRejectionTransition,
    });
  }

  return { copied, refreshedProgressionUserIds };
}

export async function completeActionModeration(params: {
  supabase: ModerationSupabaseClient;
  payload: ActionModerationPayload;
  operationId: string;
  actorUserId: string;
  requiredReasonOperation: ActionModerationOperation | null;
  reason: string | null;
  appendAuditOnce: AppendModerationAuditOnce;
  setErrorStage: (stage: ModerationErrorStage) => void;
  previousActionAuditState: ActionAuditState | null;
  previousImpactValue: ActionImpactValues | null;
  shouldRefreshImpact: boolean;
  isApprovalTransition: boolean;
  isRejectionTransition: boolean;
  statusUpdate: ActionStatusUpdateResult;
  visibilityUpdate: ActionVisibilityUpdateResult;
  dependencies: ActionModerationEffectDependencies;
}): Promise<Response> {
  const postUpdateResult = await runActionModerationPostUpdateEffects(params);
  if (postUpdateResult instanceof Response) return postUpdateResult;

  return finishActionModeration({
    ...params,
    copied: postUpdateResult.copied,
    refreshedProgressionUserIds: postUpdateResult.refreshedProgressionUserIds,
  });
}
