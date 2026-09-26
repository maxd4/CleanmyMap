import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  extractActionMetadataFromNotes,
  setActionGroupJoinEnabledInNotes,
} from "@/lib/actions/metadata";
import {
  type GroupJoinRouteContext,
  type GroupJoinModerationParams,
  type ModerationAuditAppender,
  toggleSchema,
  resolveCanonicalClerkUserId,
  loadGroupJoinAction,
  resolveGroupJoinRequestContext,
} from "./route.shared";

type ToggleAuditContext = {
  actorUserId: string;
  targetUserId: string | null;
  previousValue: { groupJoinEnabled: boolean };
  newValue: { groupJoinEnabled: boolean };
};

async function recordToggleError({
  actionId,
  actionKnown,
  appendAudit,
  auditContext,
  resolveAdminAuditIdentity,
  userId,
}: {
  actionId: string;
  actionKnown: boolean;
  appendAudit: ModerationAuditAppender;
  auditContext: ToggleAuditContext | null;
  resolveAdminAuditIdentity: GroupJoinModerationParams["resolveAdminAuditIdentity"];
  userId: string;
}) {
  if (auditContext) {
    await appendAudit({
      operationId: `action-group-join-toggle-${actionId}-${Date.now()}`,
      actorUserId: auditContext.actorUserId,
      targetActionId: actionId,
      operation: "toggle_group_join",
      outcome: "error",
      previousValue: auditContext.previousValue,
      newValue: auditContext.newValue,
      ...(auditContext.targetUserId
        ? { targetUserId: auditContext.targetUserId }
        : {}),
      details: { stage: "update", partialMutation: false },
    });
    return;
  }
  if (!actionKnown) {
    const adminIdentity = await resolveAdminAuditIdentity(userId);
    if (adminIdentity) {
      await appendAudit({
        operationId: `action-group-join-toggle-${actionId}-${Date.now()}`,
        actorUserId: adminIdentity.actorUserId,
        targetActionId: actionId,
        operation: "toggle_group_join",
        outcome: "error",
        details: { stage: "lookup", partialMutation: false },
      });
    }
  }
}

export async function handleGroupJoinToggle(
  request: Request,
  ctx: GroupJoinRouteContext,
  params: GroupJoinModerationParams,
) {
  const { userId, resolveReviewerAccess, canOverrideActionParticipants, appendActionModerationAudit, resolveAdminAuditIdentity } = params;
  const context = await resolveGroupJoinRequestContext(request, ctx, toggleSchema);
  if (!context.ok) return context.response;
  const parsed = { success: true as const, data: context.parsed };
  const { trimmedActionId } = context;

  let toggleAdminAuditRecorded = false;
  let toggleAdminAuditContext: ToggleAuditContext | null = null;
  let toggleActionKnown = false;
  const appendToggleAuditOnce: ModerationAuditAppender = async (audit) => {
    if (toggleAdminAuditRecorded) {
      return;
    }
    toggleAdminAuditRecorded = true;
    await appendActionModerationAudit(audit);
  };

  try {
    const supabase = getSupabaseServerClient(true);
    const actionResult = await loadGroupJoinAction(supabase, trimmedActionId);

    if (!actionResult) {
      const adminIdentity = await resolveAdminAuditIdentity(userId);
      if (adminIdentity) {
        await appendToggleAuditOnce({
          operationId: `action-group-join-toggle-${trimmedActionId}-${Date.now()}`,
          actorUserId: adminIdentity.actorUserId,
          targetActionId: trimmedActionId,
          operation: "toggle_group_join",
          outcome: "error",
          details: { stage: "lookup", partialMutation: false },
        });
      }
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    toggleActionKnown = true;

    if (
      actionResult.status === "cancelled" ||
      (actionResult.status !== "approved" && actionResult.action_phase !== "pre_action")
    ) {
      return validationErrorResponse({
        actionId: [
          "Le formulaire ne peut être modifié qu'en pré-action ou après validation.",
        ],
      });
    }

    const access = await resolveReviewerAccess({
      supabase,
      actionId: trimmedActionId,
      creatorUserId: actionResult.created_by_clerk_id,
      actorUserId: userId,
    });
    const actorUserId = access.identity?.userId ?? userId;

    if (!access.ok) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier ce formulaire." },
        { status: 403 },
      );
    }

    const shouldAuditToggle =
      Boolean(access.identity) &&
      canOverrideActionParticipants(access.identity) &&
      actorUserId !== actionResult.created_by_clerk_id;
    const previousValue = {
      groupJoinEnabled: extractActionMetadataFromNotes(actionResult.notes)
        .groupJoinEnabled,
    };
    if (shouldAuditToggle) {
      toggleActionKnown = true;
      toggleAdminAuditContext = {
        actorUserId,
        targetUserId: resolveCanonicalClerkUserId(
          actionResult.created_by_clerk_id,
        ),
        previousValue,
        newValue: { groupJoinEnabled: parsed.data.groupJoinEnabled },
      };
    }

    const updatedNotes = setActionGroupJoinEnabledInNotes(
      actionResult.notes,
      parsed.data.groupJoinEnabled,
    );

    const updateResult = await supabase
      .from("actions")
      .update({ notes: updatedNotes })
      .eq("id", trimmedActionId)
      .select("id, notes")
      .single();

    if (updateResult.error || !updateResult.data) {
      throw new Error("Action update failed.");
    }

    const updatedMetadata = extractActionMetadataFromNotes(
      updateResult.data?.notes ?? updatedNotes,
    );

    if (toggleAdminAuditContext) {
      await appendToggleAuditOnce({
        operationId: `action-group-join-toggle-${trimmedActionId}-${Date.now()}`,
        actorUserId: toggleAdminAuditContext.actorUserId,
        targetActionId: trimmedActionId,
        operation: "toggle_group_join",
        outcome: "success",
        previousValue: toggleAdminAuditContext.previousValue,
        newValue: { groupJoinEnabled: updatedMetadata.groupJoinEnabled },
        ...(toggleAdminAuditContext.targetUserId
          ? { targetUserId: toggleAdminAuditContext.targetUserId }
          : {}),
      });
    }

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      groupJoinEnabled: updatedMetadata.groupJoinEnabled,
    });
  } catch (error) {
    await recordToggleError({
      actionId: trimmedActionId,
      actionKnown: toggleActionKnown,
      appendAudit: appendToggleAuditOnce,
      auditContext: toggleAdminAuditContext,
      resolveAdminAuditIdentity,
      userId,
    });
    return handleApiError(error, "PATCH /api/actions/:actionId/group-join");
  }
}
