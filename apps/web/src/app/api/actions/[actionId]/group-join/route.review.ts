import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { normalizeModerationReason } from "@/lib/actions/moderation-audit";
import {
  addActionParticipationByAdmin,
  ActionParticipationOperationError,
  reviewActionParticipation,
} from "@/lib/actions/participation/group-participation";
import { POST_ACTION_CLAIM_PARTICIPATION_SOURCE } from "@/lib/actions/participation/group-participation.helpers";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";
import { rebuildUserGamificationBadges } from "@/lib/gamification/badges/rebuild";
import {
  type GroupJoinAuditErrorStage,
  type GroupJoinAction,
  type GroupJoinModerationParams,
  type GroupJoinRouteContext,
  type ModerationAuditAppender,
  getAdminParticipationOperation,
  loadGroupJoinAction,
  resolveGroupJoinRequestContext,
  reviewOrAddParticipantSchema,
} from "./route.shared";

type ReviewInput = z.infer<typeof reviewOrAddParticipantSchema>;
type ReviewAuditContext = {
  actorUserId: string;
  operation: string;
  reason: string | null;
  targetUserId: string | null;
};

type ReviewAuditErrorAppender = ReturnType<typeof createReviewAuditHandlers>["appendError"];

async function loadReviewableAction(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  actionId: string,
  userId: string,
  resolveAdminAuditIdentity: GroupJoinModerationParams["resolveAdminAuditIdentity"],
  operation: string,
  reason: string | null,
  targetUserId: string | null,
  appendError: ReviewAuditErrorAppender,
): Promise<{ action: GroupJoinAction } | { response: Response }> {
  const action = await loadGroupJoinAction(supabase, actionId);
  if (
    action &&
    action.status === "approved" ||
    action && action.status !== "cancelled" && action.action_phase === "pre_action"
  ) {
    return { action };
  }
  const adminIdentity = await resolveAdminAuditIdentity(userId);
  if (adminIdentity) {
    await appendError({
      actorUserId: adminIdentity.actorUserId,
      operation,
      reason,
      targetUserId,
      stage: "lookup",
      partialMutation: false,
    });
  }
  return { response: NextResponse.json({ error: "Action introuvable." }, { status: 404 }) };
}

async function prepareReviewModeration({
  action,
  actionId,
  appendError,
  canOverrideActionParticipants,
  data,
  resolveReviewerAccess,
  supabase,
  userId,
}: {
  action: GroupJoinAction;
  actionId: string;
  appendError: ReviewAuditErrorAppender;
  canOverrideActionParticipants: GroupJoinModerationParams["canOverrideActionParticipants"];
  data: ReviewInput;
  resolveReviewerAccess: GroupJoinModerationParams["resolveReviewerAccess"];
  supabase: ReturnType<typeof getSupabaseServerClient>;
  userId: string;
}): Promise<{ ok: true; access: Extract<Awaited<ReturnType<GroupJoinModerationParams["resolveReviewerAccess"]>>, { ok: true }>; reason: string | null; auditContext: ReviewAuditContext | null } | { ok: false; response: Response }> {
  const access = await resolveReviewerAccess({
    supabase,
    actionId,
    creatorUserId: action.created_by_clerk_id,
    actorUserId: userId,
  });
  if (!access.ok) {
    return { ok: false, response: NextResponse.json({ error: "Vous n'êtes pas autorisé à modérer cette file." }, { status: 403 }) };
  }
  const adminOperation = getAdminParticipationOperation(data);
  const adminOverrideOperation = canOverrideActionParticipants(access.identity)
    ? adminOperation
    : null;
  const reasonRequired = adminOverrideOperation === "admin_add_participant" || adminOverrideOperation === "admin_review_reject";
  const reason = normalizeModerationReason(data.reason, { required: reasonRequired });
  const auditContext = adminOverrideOperation
    ? {
        actorUserId: access.identity?.userId ?? userId,
        operation: adminOverrideOperation,
        reason,
        targetUserId: getReviewTargetUserId(data),
      }
    : null;
  if (adminOverrideOperation && reasonRequired && !reason) {
    if (!auditContext) return { ok: false, response: NextResponse.json({ error: "Opération admin non résolue." }, { status: 400 }) };
    await appendError({
      actorUserId: auditContext.actorUserId,
      operation: auditContext.operation,
      reason: auditContext.reason,
      targetUserId: auditContext.targetUserId,
      stage: "lookup",
      partialMutation: false,
    });
    return { ok: false, response: NextResponse.json({ error: "Un motif d'au moins 5 caractères est requis pour cette opération de modération." }, { status: 400 }) };
  }
  return { ok: true, access, reason, auditContext };
}

function createReviewAuditHandlers(
  trimmedActionId: string,
  appendActionModerationAudit: ModerationAuditAppender,
) {
  let recorded = false;
  const appendOnce: ModerationAuditAppender = async (audit) => {
    if (recorded) return;
    recorded = true;
    await appendActionModerationAudit(audit);
  };
  const appendError = async (params: {
    actorUserId: string;
    operation: string;
    reason: string | null;
    targetUserId?: string | null;
    stage: GroupJoinAuditErrorStage;
    partialMutation: boolean;
  }) => {
    await appendOnce({
      operationId: `action-group-join-${trimmedActionId}-${Date.now()}`,
      actorUserId: params.actorUserId,
      targetActionId: trimmedActionId,
      operation: params.operation,
      outcome: "error",
      reason: params.reason,
      ...(params.targetUserId ? { targetUserId: params.targetUserId } : {}),
      details: { stage: params.stage, partialMutation: params.partialMutation },
    });
  };
  return { appendOnce, appendError };
}

function getReviewTargetUserId(data: ReviewInput): string | null {
  return "participantUserId" in data ? data.participantUserId : null;
}

function getReviewSuccessOperation(
  data: ReviewInput,
  result: { previousValue?: { participationStatus?: string } | null },
  isPostActionClaim: boolean,
): string {
  if (isPostActionClaim) return "post_action_claim_review";
  if ("participantUserId" in data) return "admin_add_participant";
  if (data.decision === "reject" && result.previousValue?.participationStatus === "confirmed") {
    return "admin_remove_participant";
  }
  return `admin_review_${data.decision}`;
}

async function recordReviewError(
  error: unknown,
  context: ReviewAuditContext | null,
  data: ReviewInput,
  userId: string,
  resolveAdminAuditIdentity: GroupJoinModerationParams["resolveAdminAuditIdentity"],
  appendError: ReturnType<typeof createReviewAuditHandlers>["appendError"],
) {
  if (context) {
    const operationError =
      error instanceof ActionParticipationOperationError ? error : null;
    const stage: GroupJoinAuditErrorStage = operationError?.stage ??
      (error instanceof Error &&
      (error.name === "NotFoundError" || error.name === "ValidationError")
        ? "lookup"
        : "participation_update");
    await appendError({
      actorUserId: context.actorUserId,
      operation: context.operation,
      reason: context.reason,
      targetUserId: operationError?.targetUserId ?? context.targetUserId,
      stage,
      partialMutation: operationError?.partialMutation ?? false,
    });
    return;
  }
  const adminIdentity = await resolveAdminAuditIdentity(userId);
  if (adminIdentity) {
    await appendError({
      actorUserId: adminIdentity.actorUserId,
      operation: getAdminParticipationOperation(data),
      reason: normalizeModerationReason(data.reason),
      targetUserId: getReviewTargetUserId(data),
      stage: "lookup",
      partialMutation: false,
    });
  }
}

export async function handleGroupJoinReview(
  request: Request,
  ctx: GroupJoinRouteContext,
  params: GroupJoinModerationParams,
) {
  const { userId, resolveReviewerAccess, canOverrideActionParticipants, appendActionModerationAudit, resolveAdminAuditIdentity } = params;
  const context = await resolveGroupJoinRequestContext(request, ctx, reviewOrAddParticipantSchema);
  if (!context.ok) return context.response;
  const parsed = { success: true as const, data: context.parsed };
  const { trimmedActionId } = context;

  const {
    appendOnce: appendAdminParticipationAuditOnce,
    appendError: appendAdminParticipationError,
  } = createReviewAuditHandlers(
    trimmedActionId,
    appendActionModerationAudit,
  );
  let adminParticipationAuditContext: ReviewAuditContext | null = null;

  try {
    const supabase = getSupabaseServerClient(true);
    const actionResolution = await loadReviewableAction(
      supabase,
      trimmedActionId,
      userId,
      resolveAdminAuditIdentity,
      getAdminParticipationOperation(parsed.data),
      normalizeModerationReason(parsed.data.reason),
      getReviewTargetUserId(parsed.data),
      appendAdminParticipationError,
    );
    if ("response" in actionResolution) return actionResolution.response;
    const actionResult = actionResolution.action;
    const moderation = await prepareReviewModeration({
      action: actionResult,
      actionId: trimmedActionId,
      appendError: appendAdminParticipationError,
      canOverrideActionParticipants,
      data: parsed.data,
      resolveReviewerAccess,
      supabase,
      userId,
    });
    if (!moderation.ok) return moderation.response;
    const { access, reason } = moderation;
    adminParticipationAuditContext = moderation.auditContext;

    const result =
      "participantUserId" in parsed.data
        ? await addActionParticipationByAdmin(supabase, {
            actionId: trimmedActionId,
            targetUserId: parsed.data.participantUserId,
            actionPhase: actionResult.action_phase,
          })
        : await reviewActionParticipation(supabase, {
            actionId: trimmedActionId,
            participantId: parsed.data.participantId,
            decision: parsed.data.decision,
            actionPhase: actionResult.action_phase,
          });

    const isPostActionClaim =
      result.participationSource === POST_ACTION_CLAIM_PARTICIPATION_SOURCE;

    if (
      "participantUserId" in parsed.data || parsed.data.decision === "accept"
    ) {
      await rebuildUserGamificationBadges(
        supabase,
        result.participantUserId,
      ).catch(() => null);
      await refreshProgressionProfile(
        supabase,
        result.participantUserId,
      ).catch(() => null);
    }

    if (isPostActionClaim || canOverrideActionParticipants(access.identity)) {
      await appendAdminParticipationAuditOnce({
        operationId: `action-group-join-${trimmedActionId}-${Date.now()}`,
        actorUserId: access.identity?.userId ?? userId,
        targetActionId: trimmedActionId,
        operation: getReviewSuccessOperation(
          parsed.data,
          result,
          isPostActionClaim,
        ),
        outcome: "success",
        reason,
        previousValue: result.previousValue,
        newValue: result.newValue,
        targetUserId: result.participantUserId,
        details: {
          participantUserId: result.participantUserId,
          participationStatus: result.participationStatus,
          participationSource: result.participationSource,
          decision: "decision" in parsed.data ? parsed.data.decision : "accept",
        },
      });
    }

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      participantId:
        "participantId" in parsed.data
          ? parsed.data.participantId
          : result.participantUserId,
      participantUserId: result.participantUserId,
      decision:
        "decision" in parsed.data ? parsed.data.decision : "accept",
      participationStatus: result.participationStatus,
      participationSource: result.participationSource,
      joinedAt: result.joinedAt,
      updatedAt: result.updatedAt,
      participantsCount: result.participantsCount,
    });
  } catch (error) {
    await recordReviewError(
      error,
      adminParticipationAuditContext,
      parsed.data,
      userId,
      resolveAdminAuditIdentity,
      appendAdminParticipationError,
    );
    if (error instanceof Error) {
      if (error.name === "NotFoundError") {
        return NextResponse.json(
          { error: "Demande introuvable." },
          { status: 404 },
        );
      }
      if (error.name === "ValidationError") {
        return validationErrorResponse({
          participantId: [error.message],
        });
      }
    }

    return handleApiError(error, "POST /api/actions/:actionId/group-join");
  }
}
