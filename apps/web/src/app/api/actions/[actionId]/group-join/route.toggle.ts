import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { runSingleActionQuery } from "@/lib/actions/query";
import {
  extractActionMetadataFromNotes,
  setActionGroupJoinEnabledInNotes,
} from "@/lib/actions/metadata";
import {
  type GroupJoinRouteContext,
  type ModerationAuditAppender,
  type ReviewerAccessResolver,
  toggleSchema,
  resolveCanonicalClerkUserId,
} from "./route.shared";
import type { UserIdentity } from "@/lib/authz";

type ToggleAuditContext = {
  actorUserId: string;
  targetUserId: string | null;
  previousValue: { groupJoinEnabled: boolean };
  newValue: { groupJoinEnabled: boolean };
};

export async function handleGroupJoinToggle(
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
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = toggleSchema.safeParse(payload);
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
    const supabase = getSupabaseServerClient();
    const actionResult = await runSingleActionQuery<{
      id: string;
      created_by_clerk_id: string | null;
      status: "pending" | "approved" | "rejected";
      action_phase: "pre_action" | "post_action_draft" | "post_action_complete";
      notes: string | null;
    }>(supabase, (query) =>
      query.select("id, created_by_clerk_id, status, action_phase, notes").eq("id", trimmedActionId).maybeSingle(),
    );

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

    if (actionResult.status !== "approved" && actionResult.action_phase !== "pre_action") {
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
      canUseAdminOverride(access.identity) &&
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
    if (toggleAdminAuditContext) {
      await appendToggleAuditOnce({
        operationId: `action-group-join-toggle-${trimmedActionId}-${Date.now()}`,
        actorUserId: toggleAdminAuditContext.actorUserId,
        targetActionId: trimmedActionId,
        operation: "toggle_group_join",
        outcome: "error",
        previousValue: toggleAdminAuditContext.previousValue,
        newValue: toggleAdminAuditContext.newValue,
        ...(toggleAdminAuditContext.targetUserId
          ? { targetUserId: toggleAdminAuditContext.targetUserId }
          : {}),
        details: { stage: "update", partialMutation: false },
      });
    } else if (!toggleActionKnown) {
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
    }
    return handleApiError(error, "PATCH /api/actions/:actionId/group-join");
  }
}
