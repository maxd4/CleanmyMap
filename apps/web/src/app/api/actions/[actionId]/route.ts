import { NextResponse } from "next/server";
import { loadActionById } from "@/lib/actions/store";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  handleApiError,
  parseJsonBodyWithValidation,
  validationErrorResponse,
} from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import {
  getCurrentUserIdentity,
  requireAuthenticatedAccess,
} from "@/lib/authz";
import { canManageAction } from "@/lib/actions/permissions";
import { loadManualInvitationStatusesForAction, loadManualRegistrationIdsForAction } from "@/lib/actions/participation/registration-records";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { updateActionSchema } from "@/lib/validation/action";
import { buildActionEditorPayload } from "@/lib/actions/action-editor-payload";
import type { ActionUpdateInput } from "@/lib/actions/action-update-audit";
import {
  preparePatchMutation,
} from "./route.patch-preparation";
import { createAdminAuditOnceAppender } from "./route.patch-audit";
import {
  executePreparedActionUpdate,
  handlePatchError,
  type PatchExecutionState,
} from "./route.patch-execution";
import type { EditableAction } from "./route.types";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";

export const runtime = "nodejs";
// Vercel: force dynamic because this route serves authenticated action edits with fresh reads.
export const dynamic = "force-dynamic";

async function loadActionPermissionContext(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  actionId: string,
) {
  const identity = await getCurrentUserIdentity({ userId });
  const permissionIdentity = identity
    ? { userId, role: identity.role, activeRole: identity.activeRole }
    : null;
  const organizerIds = await loadCanonicalActionOrganizerIdsForAction(supabase, actionId);
  return { identity, permissionIdentity, organizerIds };
}

async function parsePatchRequest(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
  access: Awaited<ReturnType<typeof requireAuthenticatedAccess>>,
): Promise<Response | { userId: string; trimmedActionId: string; parsedBody: ActionUpdateInput }> {
  if (!access.ok) return unauthorizedJsonResponse();

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  const parsed = await parseJsonBodyWithValidation(request, updateActionSchema);
  if (!parsed.ok) return parsed.response;
  return { userId: access.userId, trimmedActionId, parsedBody: parsed.data };
}

async function loadAuthorizedPatchAction({
  supabase,
  userId,
  actionId,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  userId: string;
  actionId: string;
}): Promise<Response | {
  current: EditableAction;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  organizerIds: string[];
}> {
  const current = await loadActionById(supabase, actionId);
  if (!current) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });

  const { identity, permissionIdentity, organizerIds } = await loadActionPermissionContext(
    supabase,
    userId,
    actionId,
  );
  // This owner/organizer/admin decision stays visible at the HTTP boundary.
  if (!canManageAction(permissionIdentity, { createdByClerkId: current.created_by_clerk_id }, organizerIds)) {
    return NextResponse.json(
      { error: "Vous n'êtes pas autorisé à modifier cette action." },
      { status: 403 },
    );
  }
  if (current.status === "cancelled") {
    return NextResponse.json(
      {
        error: "Cette action annulée est un tombstone historique et ne peut plus être modifiée.",
        code: "state_conflict",
      },
      { status: 409 },
    );
  }
  return { current, identity, organizerIds };
}

function createPatchExecutionState(): PatchExecutionState {
  return {
    auditSnapshots: null,
    actionWriteSucceeded: false,
    persistedActionRevision: null,
    contributionPersisted: false,
    adminErrorStage: "action_update",
  };
}

async function executePatchRequest({
  userId,
  trimmedActionId,
  parsed,
}: {
  userId: string;
  trimmedActionId: string;
  parsed: ActionUpdateInput;
}): Promise<Response> {
  let shouldAuditModeration = false;
  let adminAuditActorUserId = userId;
  let adminAuditTargetUserId: string | null = null;
  let moderationOperation = "edit_action";
  let moderationReason: string | null = null;
  const appendAdminAuditOnce = createAdminAuditOnceAppender();
  const state = createPatchExecutionState();

  try {
    const supabase = getSupabaseServerClient(true);
    const actionContext = await loadAuthorizedPatchAction({
      supabase,
      userId,
      actionId: trimmedActionId,
    });
    if (actionContext instanceof Response) return actionContext;
    const { current, identity, organizerIds } = actionContext;
    const mutation = await preparePatchMutation({
      supabase,
      userId,
      current,
      identity,
      organizerIds,
      parsed,
    });
    if (mutation instanceof Response) return mutation;

    shouldAuditModeration = mutation.shouldAuditModeration;
    adminAuditActorUserId = mutation.adminAuditActorUserId;
    adminAuditTargetUserId = mutation.adminAuditTargetUserId;
    moderationOperation = mutation.moderationOperation;
    moderationReason = mutation.moderationReason;

    const body = await executePreparedActionUpdate({
      supabase,
      actionId: trimmedActionId,
      userId,
      current,
      identity,
      preparedUpdate: mutation.preparedUpdate,
      shouldAuditModeration,
      adminAuditActorUserId,
      adminAuditTargetUserId,
      moderationOperation,
      moderationReason,
      appendAdminAuditOnce,
      state,
    });
    if (body instanceof Response) return body;

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      actionPhase: body.actionPhase ?? current["action_phase"],
    });
  } catch (error) {
    return handlePatchError({
      error,
      shouldAuditModeration,
      auditSnapshots: state.auditSnapshots,
      appendAdminAuditOnce,
      adminAuditActorUserId,
      adminAuditTargetUserId,
      moderationOperation,
      moderationReason,
      adminErrorStage: state.adminErrorStage,
      state,
      actionId: trimmedActionId,
    });
  }
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const { userId } = access;

  const { actionId } = await ctx.params;
  const trimmedActionId = actionId.trim();
  if (!trimmedActionId) {
    return validationErrorResponse({ actionId: ["Identifiant d'action manquant."] });
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const row = await loadActionById(supabase, trimmedActionId);
    if (!row) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });

    const { permissionIdentity, organizerIds } = await loadActionPermissionContext(
      supabase,
      userId,
      trimmedActionId,
    );
    // GET has the same management boundary as PATCH; visitors cannot read this editor payload.
    if (!canManageAction(permissionIdentity, { createdByClerkId: row.created_by_clerk_id }, organizerIds)) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à lire cette action." },
        { status: 403 },
      );
    }

    const participantAccounts = await loadManualRegistrationIdsForAction(
      supabase,
      trimmedActionId,
    ).catch(() => []);
    const manualInvitationStatuses = await loadManualInvitationStatusesForAction(
      supabase,
      trimmedActionId,
    ).catch(() => []);
    const action = {
      ...buildActionEditorPayload(row),
      organizerAccounts:
        row.organizer_type === "spontaneous"
          ? organizerIds
          : organizerIds.filter((organizerId) => organizerId !== row.created_by_clerk_id),
      participantAccounts,
      manualInvitationStatuses,
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
  const access = await requireActionRequestAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();

  // Authorization is enforced by loadAuthorizedPatchAction via canManageAction;
  // preparePatchMutation applies canEditValidatedImpact and canManageActionsGlobally
  // to their respective privileged paths, while the execution owner audits failures.
  const parsedRequest = await parsePatchRequest(request, ctx, access);
  if (parsedRequest instanceof Response) return parsedRequest;
  const { userId, trimmedActionId, parsedBody } = parsedRequest;
  return executePatchRequest({
    userId,
    trimmedActionId,
    parsed: parsedBody,
  });
}
