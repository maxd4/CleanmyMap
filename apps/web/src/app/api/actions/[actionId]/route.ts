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
import {
  canManageAction,
} from "@/lib/actions/permissions";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import { loadManualRegistrationIdsForAction } from "@/lib/actions/participation/registration-records";
import {
  loadCanonicalActionOrganizerIdsForAction,
} from "@/lib/actions/participation/organizers";
import { updateActionSchema } from "@/lib/validation/action";
import { buildActionEditorPayload } from "@/lib/actions/action-editor-payload";
import {
  buildActionAuditSnapshots,
  type ActionUpdateInput,
} from "@/lib/actions/action-update-audit";
import { ActionUpdateValidationError } from "@/lib/actions/action-update-persistence";
import {
  runActionUpdatePostProcessing,
  syncUpdatedOrganizers,
  type AdminOverrideErrorStage,
} from "@/lib/actions/action-update-post-processing";
import { preparePatchMutation, type PreparedPatchMutation } from "./route.patch-preparation";
import { createAdminAuditOnceAppender } from "./route.patch-audit";
import {
  ensureGpxGeometryContributionEligible,
  hasGpxGeometryContribution,
  recordGpxGeometryContributionIfPresent,
  reconcileGeometryContributionProgressionIfNeeded,
  stripObservedGeometryProjectionFields,
} from "@/lib/actions/geometry/action-geometry-contribution-workflow";
import {
  buildActionChangeEventKey,
  detectActionChangeKinds,
} from "@/lib/actions/action-change-notifications";
import { emitAdministrativeRequirementNotificationsIfNeeded } from "@/lib/actions/administrative-requirement-notifications";
import { emitActionUpdateNotifications } from "@/lib/actions/action-update-notifications";
import {
  captureActionUpdateParticipantImpactSnapshot,
} from "@/lib/actions/action-participant-impact-notifications";
import type { ActionParticipantImpactSnapshot } from "@/lib/actions/participation/group-participation-read";

export const runtime = "nodejs";
// Vercel: force dynamic because this route serves authenticated action edits with fresh reads.
export const dynamic = "force-dynamic";
async function loadActionPermissionContext(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
  actionId: string,
) {
  const identity = await getCurrentUserIdentity();
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

type EditableAction = NonNullable<Awaited<ReturnType<typeof loadActionById>>>;
type PreparedActionUpdate = PreparedPatchMutation["preparedUpdate"];

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

type PatchExecutionState = {
  auditSnapshots: ReturnType<typeof buildActionAuditSnapshots> | null;
  actionWriteSucceeded: boolean;
  contributionPersisted: boolean;
  adminErrorStage: AdminOverrideErrorStage;
};

const PATCH_ATOMICITY = "PARTIAL_ALLOWED" as const;

async function emitPublishedActionUpdateIfNeeded(params: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  actionId: string;
  actorUserId: string;
  current: EditableAction;
  updateData: Record<string, unknown>;
  actionWriteSucceeded: boolean;
}): Promise<void> {
  if (!params.actionWriteSucceeded) return;
  const changeKinds = detectActionChangeKinds({
    current: params.current,
    updateData: params.updateData,
  });
  if (changeKinds.length === 0) return;

  await emitActionUpdateNotifications({
    supabase: params.supabase,
    actionId: params.actionId,
    actorUserId: params.actorUserId,
    changeKinds,
    eventKey: buildActionChangeEventKey({
      actionId: params.actionId,
      revision: params.current.updated_at ?? "missing-revision",
      changeKinds,
    }),
  });
}

async function executePreparedActionUpdate({
  supabase,
  actionId,
  userId,
  current,
  identity,
  preparedUpdate,
  shouldAuditModeration,
  adminAuditActorUserId,
  adminAuditTargetUserId,
  moderationOperation,
  moderationReason,
  appendAdminAuditOnce,
  state,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  actionId: string;
  userId: string;
  current: EditableAction;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  preparedUpdate: PreparedActionUpdate;
  shouldAuditModeration: boolean;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
  appendAdminAuditOnce: (params: Parameters<typeof appendActionModerationAudit>[0]) => Promise<void>;
  state: PatchExecutionState;
}): Promise<Response | PreparedActionUpdate["body"]> {
  const { body, currentMetadata, updateData } = preparedUpdate;
  state.auditSnapshots = shouldAuditModeration
    ? buildActionAuditSnapshots(current, body, currentMetadata)
    : null;
  const hasGeometryContribution = hasGpxGeometryContribution(updateData);
  const eligibilityResponse = await ensureGpxGeometryContributionEligible({
    supabase,
    actionId,
    userId,
    updateData,
  });
  if (eligibilityResponse) return eligibilityResponse;

  const scalarUpdateData = hasGeometryContribution
    ? stripObservedGeometryProjectionFields(updateData)
    : updateData;

  const previousImpactSnapshot: ActionParticipantImpactSnapshot | null =
    await captureActionUpdateParticipantImpactSnapshot({ supabase, actionId, current, body });

  const hasActionUpdates = Object.keys(scalarUpdateData).length > 0;
  const organizerMustPrecedeSpontaneousFinalization =
    (body.organizerType ?? current.organizer_type) === "spontaneous" &&
    scalarUpdateData.action_phase === "post_action_complete" &&
    body.organizerAccounts !== undefined;
  if (organizerMustPrecedeSpontaneousFinalization) {
    await syncUpdatedOrganizers({
      supabase,
      actionId,
      body,
      userId,
      identity,
    });
  }
  state.adminErrorStage = "action_update";
  const updateResult = hasActionUpdates
    ? await supabase.from("actions").update(scalarUpdateData).eq("id", actionId).select("id").single()
    : { data: { id: actionId }, error: null };
  if (updateResult.error) throw new Error("Action update failed");
  state.actionWriteSucceeded = hasActionUpdates && Boolean(updateResult.data);
  await emitPublishedActionUpdateIfNeeded({
    supabase,
    actionId,
    actorUserId: userId,
    current,
    updateData: scalarUpdateData,
    actionWriteSucceeded: state.actionWriteSucceeded,
  });
  await emitAdministrativeRequirementNotificationsIfNeeded({
    supabase,
    actionId,
    current,
    updateData: scalarUpdateData,
    actionWriteSucceeded: state.actionWriteSucceeded,
  });

  state.adminErrorStage = hasGeometryContribution
    ? "geometry_contribution"
    : state.adminErrorStage;
  const geometryContribution = hasGeometryContribution
    ? await recordGpxGeometryContributionIfPresent({ supabase, actionId, userId, updateData })
    : null;
  if (geometryContribution instanceof Response) return geometryContribution;
  if (geometryContribution) {
    state.contributionPersisted ||= geometryContribution.persisted;
  }

  await reconcileGeometryContributionProgressionIfNeeded({
    accepted: geometryContribution?.accepted ?? false,
    supabase,
    actionId,
    userId,
  });
  await runActionUpdatePostProcessing({ supabase, actionId, updateData: scalarUpdateData, body, userId, identity, shouldAuditModeration, auditSnapshots: state.auditSnapshots, previousImpactSnapshot, adminAuditActorUserId, adminAuditTargetUserId, moderationOperation, moderationReason, organizersAlreadySynced: organizerMustPrecedeSpontaneousFinalization, appendAdminAuditOnce, setErrorStage: (stage) => { state.adminErrorStage = stage; } });
  return body;
}

async function handlePatchError({
  error,
  shouldAuditModeration,
  auditSnapshots,
  appendAdminAuditOnce,
  adminAuditActorUserId,
  adminAuditTargetUserId,
  moderationOperation,
  moderationReason,
  adminErrorStage,
  actionWriteSucceeded,
  contributionPersisted,
  actionId,
}: {
  error: unknown;
  shouldAuditModeration: boolean;
  auditSnapshots: ReturnType<typeof buildActionAuditSnapshots> | null;
  appendAdminAuditOnce: (params: Parameters<typeof appendActionModerationAudit>[0]) => Promise<void>;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
  adminErrorStage: AdminOverrideErrorStage;
  actionWriteSucceeded: boolean;
  contributionPersisted: boolean;
  actionId: string;
}): Promise<Response> {
  if (error instanceof ActionUpdateValidationError) {
    return validationErrorResponse({ [error.field]: [error.message] });
  }
  if (shouldAuditModeration && auditSnapshots) {
    await appendAdminAuditOnce({
      operationId: `action-edit-${actionId}-${Date.now()}`,
      actorUserId: adminAuditActorUserId,
      targetActionId: actionId,
      operation: moderationOperation,
      outcome: "error",
      reason: moderationReason,
      targetUserId: adminAuditTargetUserId,
      previousValue: auditSnapshots.previousValue,
      newValue: auditSnapshots.newValue,
      details: {
        stage: adminErrorStage,
        atomicity: PATCH_ATOMICITY,
        partialMutation: actionWriteSucceeded || contributionPersisted,
      },
    });
  }
  return handleApiError(error, "PATCH /api/actions/:actionId");
}

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

    const { permissionIdentity, organizerIds } = await loadActionPermissionContext(
      supabase,
      userId,
      trimmedActionId,
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
      organizerAccounts:
        row.organizer_type === "spontaneous"
          ? organizerIds
          : organizerIds.filter(
              (organizerId) => organizerId !== row.created_by_clerk_id,
            ),
      participantAccounts,
    };
    return NextResponse.json({ status: "ok", action });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/:actionId");
  }
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
  const patchState: PatchExecutionState = {
    auditSnapshots: null,
    actionWriteSucceeded: false,
    contributionPersisted: false,
    adminErrorStage: "action_update",
  };
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
    const {
      preparedUpdate,
      shouldAuditModeration: mutationShouldAuditModeration,
      adminAuditActorUserId: mutationAuditActorUserId,
      adminAuditTargetUserId: mutationAuditTargetUserId,
      moderationOperation: mutationOperation,
      moderationReason: mutationReason,
    } = mutation;
    shouldAuditModeration = mutationShouldAuditModeration;
    adminAuditActorUserId = mutationAuditActorUserId;
    adminAuditTargetUserId = mutationAuditTargetUserId;
    moderationOperation = mutationOperation;
    moderationReason = mutationReason;

    const body = await executePreparedActionUpdate({
      supabase,
      actionId: trimmedActionId,
      userId,
      current,
      identity,
      preparedUpdate,
      shouldAuditModeration,
      adminAuditActorUserId,
      adminAuditTargetUserId,
      moderationOperation,
      moderationReason,
      appendAdminAuditOnce,
      state: patchState,
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
      auditSnapshots: patchState.auditSnapshots,
      appendAdminAuditOnce,
      adminAuditActorUserId,
      adminAuditTargetUserId,
      moderationOperation,
      moderationReason,
      adminErrorStage: patchState.adminErrorStage,
      actionWriteSucceeded: patchState.actionWriteSucceeded,
      contributionPersisted: patchState.contributionPersisted,
      actionId: trimmedActionId,
    });
  }
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();

  // Authorization is enforced by loadAuthorizedPatchAction via canManageAction;
  // preparePatchMutation applies canEditValidatedImpact and
  // canManageActionsGlobally to their respective privileged paths, while
  // executePatchRequest records privileged failures with appendActionModerationAudit.
  const parsedRequest = await parsePatchRequest(request, ctx, access);
  if (parsedRequest instanceof Response) return parsedRequest;
  const { userId, trimmedActionId, parsedBody: parsed } = parsedRequest;
  return executePatchRequest({ userId, trimmedActionId, parsed });
}
