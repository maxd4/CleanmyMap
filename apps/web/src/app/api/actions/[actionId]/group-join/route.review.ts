import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { normalizeModerationReason } from "@/lib/actions/moderation-audit";
import { runSingleActionQuery } from "@/lib/actions/query";
import {
  addActionParticipationByAdmin,
  ActionParticipationOperationError,
  reviewActionParticipation,
} from "@/lib/actions/participation/group-participation";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";
import type { UserIdentity } from "@/lib/authz";
import {
  type GroupJoinAuditErrorStage,
  type GroupJoinRouteContext,
  type ModerationAuditAppender,
  type ReviewerAccessResolver,
  getAdminParticipationOperation,
  reviewOrAddParticipantSchema,
} from "./route.shared";

export async function handleGroupJoinReview(
  request: Request,
  ctx: GroupJoinRouteContext,
  params: {
    userId: string;
    resolveReviewerAccess: ReviewerAccessResolver;
    canUseAdminOverride: (
      identity: UserIdentity | null | undefined,
    ) => boolean;
    appendActionModerationAudit: ModerationAuditAppender;
    resolveAdminAuditIdentity: (
      fallbackUserId?: string,
    ) => Promise<{ actorUserId: string } | null>;
  },
) {
  const {
    userId,
    resolveReviewerAccess,
    canUseAdminOverride,
    appendActionModerationAudit,
    resolveAdminAuditIdentity,
  } = params;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = reviewOrAddParticipantSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    });
  }

  let adminParticipationAuditRecorded = false;
  let adminParticipationAuditContext: {
    actorUserId: string;
    operation: string;
    reason: string | null;
    targetUserId: string | null;
  } | null = null;
  const appendAdminParticipationAuditOnce: ModerationAuditAppender = async (audit) => {
    if (adminParticipationAuditRecorded) {
      return;
    }
    adminParticipationAuditRecorded = true;
    await appendActionModerationAudit(audit);
  };
  const appendAdminParticipationError = async (params: {
    actorUserId: string;
    operation: string;
    reason: string | null;
    targetUserId?: string | null;
    stage: GroupJoinAuditErrorStage;
    partialMutation: boolean;
  }): Promise<void> => {
    await appendAdminParticipationAuditOnce({
      operationId: `action-group-join-${trimmedActionId}-${Date.now()}`,
      actorUserId: params.actorUserId,
      targetActionId: trimmedActionId,
      operation: params.operation,
      outcome: "error",
      reason: params.reason,
      ...(params.targetUserId ? { targetUserId: params.targetUserId } : {}),
      details: {
        stage: params.stage,
        partialMutation: params.partialMutation,
      },
    });
  };

  const adminOperation = getAdminParticipationOperation(parsed.data);
  const requestReason = normalizeModerationReason(parsed.data.reason);

  try {
    const supabase = getSupabaseServerClient();
    const actionResult = await runSingleActionQuery<{
      id: string;
      created_by_clerk_id: string | null;
      status: "pending" | "approved" | "rejected";
      action_phase: "pre_action" | "post_action_draft" | "post_action_complete";
      notes: string | null;
    }>(supabase, (query) =>
      query
        .select("id, created_by_clerk_id, status, action_phase, notes")
        .eq("id", trimmedActionId)
        .maybeSingle(),
    );

    if (!actionResult || (actionResult.status !== "approved" && actionResult.action_phase !== "pre_action")) {
      const adminIdentity = await resolveAdminAuditIdentity(userId);
      if (adminIdentity) {
        await appendAdminParticipationError({
          actorUserId: adminIdentity.actorUserId,
          operation: adminOperation,
          reason: requestReason,
          targetUserId:
            "participantUserId" in parsed.data
              ? parsed.data.participantUserId
              : null,
          stage: "lookup",
          partialMutation: false,
        });
      }
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    const access = await resolveReviewerAccess({
      supabase,
      actionId: trimmedActionId,
      creatorUserId: actionResult.created_by_clerk_id,
      actorUserId: userId,
    });

    if (!access.ok) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modérer cette file." },
        { status: 403 },
      );
    }

    const adminOverrideOperation =
      canUseAdminOverride(access.identity) ? adminOperation : null;
    const reasonRequired =
      adminOverrideOperation === "admin_add_participant" ||
      adminOverrideOperation === "admin_review_reject";
    const reason = normalizeModerationReason(parsed.data.reason, {
      required: reasonRequired,
    });
    if (adminOverrideOperation) {
      adminParticipationAuditContext = {
        actorUserId: access.identity?.userId ?? userId,
        operation: adminOverrideOperation,
        reason,
        targetUserId:
          "participantUserId" in parsed.data
            ? parsed.data.participantUserId
            : null,
      };
    }
    if (adminOverrideOperation && reasonRequired && !reason) {
      const auditContext = adminParticipationAuditContext;
      if (!auditContext) {
        return NextResponse.json(
          { error: "Opération admin non résolue." },
          { status: 400 },
        );
      }
      await appendAdminParticipationError({
        actorUserId: auditContext.actorUserId,
        operation: auditContext.operation,
        reason: auditContext.reason,
        targetUserId: auditContext.targetUserId,
        stage: "lookup",
        partialMutation: false,
      });
      return NextResponse.json(
        {
          error:
            "Un motif d'au moins 5 caractères est requis pour cette opération de modération.",
        },
        { status: 400 },
      );
    }

    const result =
      "participantUserId" in parsed.data
        ? await addActionParticipationByAdmin(supabase, {
            actionId: trimmedActionId,
            targetUserId: parsed.data.participantUserId,
          })
        : await reviewActionParticipation(supabase, {
            actionId: trimmedActionId,
            participantId: parsed.data.participantId,
            decision: parsed.data.decision,
          });

    if (
      "participantUserId" in parsed.data ||
      parsed.data.decision === "accept"
    ) {
      await refreshProgressionProfile(
        supabase,
        result.participantUserId,
      ).catch(() => null);
    }

    if (canUseAdminOverride(access.identity)) {
      await appendAdminParticipationAuditOnce({
        operationId: `action-group-join-${trimmedActionId}-${Date.now()}`,
        actorUserId: access.identity?.userId ?? userId,
        targetActionId: trimmedActionId,
        operation:
          "participantUserId" in parsed.data
            ? "admin_add_participant"
            : parsed.data.decision === "reject" &&
                result.previousValue?.participationStatus === "confirmed"
              ? "admin_remove_participant"
              : `admin_review_${parsed.data.decision}`,
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
    if (adminParticipationAuditContext) {
      const operationError =
        error instanceof ActionParticipationOperationError
          ? error
          : null;
      const stage: GroupJoinAuditErrorStage = operationError?.stage ??
        (error instanceof Error &&
        (error.name === "NotFoundError" || error.name === "ValidationError")
          ? "lookup"
          : "participation_update");
      await appendAdminParticipationError({
        actorUserId: adminParticipationAuditContext.actorUserId,
        operation: adminParticipationAuditContext.operation,
        reason: adminParticipationAuditContext.reason,
        targetUserId:
          operationError?.targetUserId ??
          adminParticipationAuditContext.targetUserId,
        stage,
        partialMutation: operationError?.partialMutation ?? false,
      });
    } else {
      const adminIdentity = await resolveAdminAuditIdentity(userId);
      if (adminIdentity) {
        await appendAdminParticipationError({
          actorUserId: adminIdentity.actorUserId,
          operation: getAdminParticipationOperation(parsed.data),
          reason: normalizeModerationReason(parsed.data.reason),
          targetUserId:
            "participantUserId" in parsed.data
              ? parsed.data.participantUserId
              : null,
          stage: "lookup",
          partialMutation: false,
        });
      }
    }
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
