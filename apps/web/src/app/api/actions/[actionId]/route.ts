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
  canManageActionsGlobally,
  canEditValidatedImpact,
} from "@/lib/actions/permissions";
import {
  appendActionModerationAudit,
  isModerationReasonRequired,
  normalizeModerationReason,
} from "@/lib/actions/moderation-audit";
import { loadManualRegistrationIdsForAction } from "@/lib/actions/participation/registration-records";
import {
  loadActionOrganizerIdsForAction,
} from "@/lib/actions/participation/organizers";
import { updateActionSchema } from "@/lib/validation/action";
import { buildActionEditorPayload } from "@/lib/actions/action-editor-payload";
import {
  buildActionAuditSnapshots,
  type ActionUpdateInput,
} from "@/lib/actions/action-update-audit";
import { hasActionImpactUpdate } from "@/lib/actions/action-update-impact";
import {
  ActionUpdateValidationError,
  prepareActionUpdate,
} from "@/lib/actions/action-update-persistence";
import {
  runActionUpdatePostProcessing,
  type AdminOverrideErrorStage,
} from "@/lib/actions/action-update-post-processing";
import { resolveActionUpdateOrganizer } from "@/lib/actions/action-update-organizer";

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
    const supabase = getSupabaseServerClient(true);
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

    const participantAccounts = await loadManualRegistrationIdsForAction(
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
  let moderationOperation = "edit_action";
  let moderationReason: string | null = null;
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
    const supabase = getSupabaseServerClient(true);
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

    if (current.status === "cancelled") {
      return NextResponse.json(
        {
          error:
            "Cette action annulée est un tombstone historique et ne peut plus être modifiée.",
          code: "state_conflict",
        },
        { status: 409 },
      );
    }

    const parsedBody: ActionUpdateInput = await resolveActionUpdateOrganizer({ supabase, body: parsed.data, current });
    const validatedImpactCorrection =
      current.status === "approved" && hasActionImpactUpdate(parsedBody);
    if (validatedImpactCorrection && !canEditValidatedImpact(identity)) {
      return NextResponse.json(
        {
          error:
            "La correction d'un impact validé est réservée aux administrateurs autorisés.",
        },
        { status: 403 },
      );
    }
    moderationReason = validatedImpactCorrection
      ? normalizeModerationReason(parsedBody.reason, {
          required: isModerationReasonRequired("correct_impact"),
        })
      : null;
    if (validatedImpactCorrection && !moderationReason) {
      return validationErrorResponse({
        reason: [
          "Un motif d'au moins 5 caractères est requis pour corriger un impact validé.",
        ],
      });
    }
    moderationOperation = validatedImpactCorrection
      ? "correct_impact"
      : "edit_action";
    adminAuditActorUserId = identity?.userId ?? userId;
    adminAuditTargetUserId = current.created_by_clerk_id.trim() || null;
    shouldAuditModeration =
      validatedImpactCorrection ||
      (Boolean(identity) &&
        userId !== current.created_by_clerk_id &&
        canManageActionsGlobally(identity));
    const preparedUpdate = await prepareActionUpdate({
      current,
      parsedBody,
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
    auditSnapshots = shouldAuditModeration
      ? buildActionAuditSnapshots(
          current,
          body,
          currentMetadata,
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
      moderationOperation,
      moderationReason,
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
        operation: moderationOperation,
        outcome: "error",
        reason: moderationReason,
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
