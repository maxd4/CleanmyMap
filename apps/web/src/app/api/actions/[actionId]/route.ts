import { NextResponse } from "next/server";
import { loadActionById } from "@/lib/actions/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  getCurrentUserIdentity,
  requireAuthenticatedAccess,
} from "@/lib/authz";
import {
  canManageAction,
  canUseAdminOverride,
} from "@/lib/actions/permissions";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import { loadManualParticipantIdsForAction } from "@/lib/actions/participation/group-participation.helpers";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { updateActionSchema } from "@/lib/validation/action";
import { buildActionEditorPayload } from "@/lib/actions/action-editor-payload";
import {
  buildActionAuditSnapshots,
  type ActionUpdateInput,
} from "@/lib/actions/action-update-audit";
import {
  ActionUpdateValidationError,
  prepareActionUpdate,
} from "@/lib/actions/action-update-persistence";
import {
  runActionUpdatePostProcessing,
  type AdminOverrideErrorStage,
} from "@/lib/actions/action-update-post-processing";

export const runtime = "nodejs";
// Vercel: force dynamic because this route serves authenticated action edits with fresh reads.
export const dynamic = "force-dynamic";


export async function GET(
  _request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }
  const { userId } = access;

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    });
  }

  try {
    const supabase = getSupabaseServerClient();
    const row = await loadActionById(supabase, trimmedActionId);
    if (!row) {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    const identity = await getCurrentUserIdentity();
    const permissionIdentity = identity
      ? { userId, role: identity.role, activeRole: identity.activeRole }
      : null;
    const organizerIds = await loadActionOrganizerIdsForAction(
      supabase,
      trimmedActionId,
      row.created_by_clerk_id,
    );
    if (
      !canManageAction(
        permissionIdentity,
        { createdByClerkId: row.created_by_clerk_id },
        organizerIds,
      )
    ) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à lire cette action." },
        { status: 403 },
      );
    }

    const participantAccounts = await loadManualParticipantIdsForAction(
      supabase,
      trimmedActionId,
    ).catch(() => []);
    const action = {
      ...buildActionEditorPayload(row),
      participantAccounts,
    };
    return NextResponse.json({ status: "ok", action });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/:actionId");
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }
  const { userId } = access;

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = updateActionSchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  let shouldAuditModeration = false;
  let adminAuditActorUserId = userId;
  let adminAuditTargetUserId: string | null = null;
  let auditSnapshots: ReturnType<typeof buildActionAuditSnapshots> | null = null;
  let actionWriteSucceeded = false;
  let adminAuditRecorded = false;
  let adminErrorStage: AdminOverrideErrorStage = "action_update";
  const appendAdminAuditOnce = async (
    params: Parameters<typeof appendActionModerationAudit>[0],
  ): Promise<void> => {
    if (adminAuditRecorded) {
      return;
    }
    adminAuditRecorded = true;
    await appendActionModerationAudit(params);
  };

  try {
    const supabase = getSupabaseServerClient();
    const current = await loadActionById(supabase, trimmedActionId);
    if (!current) {
      return NextResponse.json(
        { error: "Action introuvable." },
        { status: 404 },
      );
    }

    const identity = await getCurrentUserIdentity();
    const permissionIdentity = identity
      ? { userId, role: identity.role, activeRole: identity.activeRole }
      : null;
    const organizerIds = await loadActionOrganizerIdsForAction(
      supabase,
      trimmedActionId,
      current.created_by_clerk_id,
    );
    if (
      !canManageAction(
        permissionIdentity,
        { createdByClerkId: current.created_by_clerk_id },
        organizerIds,
      )
    ) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier cette action." },
        { status: 403 },
      );
    }

    const parsedBody: ActionUpdateInput = parsed.data;
    const preparedUpdate = await prepareActionUpdate({
      current,
      parsedBody,
      permissionIdentity,
    }).catch((error: unknown) => {
      if (error instanceof ActionUpdateValidationError) {
        return validationErrorResponse({
          [error.field]: [error.message],
        });
      }
      throw error;
    });
    if (preparedUpdate instanceof Response) {
      return preparedUpdate;
    }

    const { body, currentMetadata, updateData } = preparedUpdate;
    adminAuditActorUserId = identity?.userId ?? userId;
    adminAuditTargetUserId = current.created_by_clerk_id.trim() || null;
    shouldAuditModeration =
      Boolean(identity) &&
      userId !== current.created_by_clerk_id &&
      canUseAdminOverride(identity);
    auditSnapshots = shouldAuditModeration
      ? buildActionAuditSnapshots(
          current,
          body,
          currentMetadata,
          permissionIdentity,
        )
      : null;
    const hasActionUpdates = Object.keys(updateData).length > 0;
    adminErrorStage = "action_update";
    const updateResult = hasActionUpdates
      ? await supabase
          .from("actions")
          .update(updateData)
          .eq("id", trimmedActionId)
          .select("id")
          .single()
      : { data: { id: trimmedActionId }, error: null };

    if (updateResult.error) {
      throw new Error("Action update failed");
    }
    actionWriteSucceeded = hasActionUpdates && Boolean(updateResult.data);

    await runActionUpdatePostProcessing({
      supabase,
      actionId: trimmedActionId,
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
      setErrorStage: (stage) => {
        adminErrorStage = stage;
      },
    });

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      actionPhase: body.actionPhase ?? current["action_phase"],
    });
  } catch (error) {
    if (
      shouldAuditModeration &&
      auditSnapshots
    ) {
      await appendAdminAuditOnce({
        operationId: `action-edit-${trimmedActionId}-${Date.now()}`,
        actorUserId: adminAuditActorUserId,
        targetActionId: trimmedActionId,
        operation: "edit_action",
        outcome: "error",
        targetUserId: adminAuditTargetUserId,
        previousValue: auditSnapshots.previousValue,
        newValue: auditSnapshots.newValue,
        details: {
          stage: adminErrorStage,
          partialMutation: actionWriteSucceeded,
        },
      });
    }
    return handleApiError(error, "PATCH /api/actions/:actionId");
  }
}
