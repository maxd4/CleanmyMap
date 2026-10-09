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
  loadCanonicalActionOrganizerIdsForAction,
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
import {
  validatePatchOrganizerAccounts,
  validateSpontaneousOrganizerPatch,
} from "./route.patch-organizers";
import { createAdminAuditOnceAppender } from "./route.patch-audit";
import {
  ensureGpxGeometryContributionEligible,
  hasGpxGeometryContribution,
  recordGpxGeometryContributionIfPresent,
  reconcileGeometryContributionProgressionIfNeeded,
  stripObservedGeometryProjectionFields,
} from "@/lib/actions/geometry/action-geometry-contribution-workflow";

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
type PreparedActionUpdate = Exclude<Awaited<ReturnType<typeof prepareActionUpdate>>, Response>;

async function loadAuthorizedPatchAction({
  supabase,
  userId,
  actionId,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  userId: string;
  actionId: string;
}): Promise<Response | { current: EditableAction; identity: Awaited<ReturnType<typeof getCurrentUserIdentity>> }> {
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
  return { current, identity };
}

async function preparePatchMutation({
  supabase,
  userId,
  current,
  identity,
  parsed,
}: {
  supabase: ReturnType<typeof getSupabaseServerClient>;
  userId: string;
  current: EditableAction;
  identity: Awaited<ReturnType<typeof getCurrentUserIdentity>>;
  parsed: ActionUpdateInput;
}): Promise<Response | {
  preparedUpdate: PreparedActionUpdate;
  shouldAuditModeration: boolean;
  adminAuditActorUserId: string;
  adminAuditTargetUserId: string | null;
  moderationOperation: string;
  moderationReason: string | null;
}> {
  const spontaneousOrganizerError = validateSpontaneousOrganizerPatch(current, parsed);
  if (spontaneousOrganizerError) return spontaneousOrganizerError;
  const parsedBody = await resolveActionUpdateOrganizer({ supabase, body: parsed, current });
  const organizerAccountsError = await validatePatchOrganizerAccounts({ supabase, userId, identity, organizerAccounts: parsedBody.organizerAccounts });
  if (organizerAccountsError) return organizerAccountsError;
  const validatedImpactCorrection = current.status === "approved" && hasActionImpactUpdate(parsedBody);
  if (validatedImpactCorrection && !canEditValidatedImpact(identity)) {
    return NextResponse.json(
      { error: "La correction d'un impact validé est réservée aux administrateurs autorisés." },
      { status: 403 },
    );
  }
  const moderationReason = validatedImpactCorrection
    ? normalizeModerationReason(parsedBody.reason, { required: isModerationReasonRequired("correct_impact") })
    : null;
  if (validatedImpactCorrection && !moderationReason) {
    return validationErrorResponse({ reason: ["Un motif d'au moins 5 caractères est requis pour corriger un impact validé."] });
  }

  const preparedUpdate = await prepareActionUpdate({ current, parsedBody }).catch((error: unknown) => {
    if (error instanceof ActionUpdateValidationError) {
      return validationErrorResponse({ [error.field]: [error.message] });
    }
    throw error;
  });
  if (preparedUpdate instanceof Response) return preparedUpdate;

  return {
    preparedUpdate,
    shouldAuditModeration: validatedImpactCorrection || (
      Boolean(identity) &&
      userId !== current.created_by_clerk_id &&
      canManageActionsGlobally(identity)
    ),
    adminAuditActorUserId: identity?.userId ?? userId,
    adminAuditTargetUserId: current.created_by_clerk_id.trim() || null,
    moderationOperation: validatedImpactCorrection ? "correct_impact" : "edit_action",
    moderationReason,
  };
}

type PatchExecutionState = {
  auditSnapshots: ReturnType<typeof buildActionAuditSnapshots> | null;
  actionWriteSucceeded: boolean;
  contributionPersisted: boolean;
  adminErrorStage: AdminOverrideErrorStage;
};

const PATCH_ATOMICITY = "PARTIAL_ALLOWED" as const;

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

  const hasActionUpdates = Object.keys(scalarUpdateData).length > 0;
  state.adminErrorStage = "action_update";
  const updateResult = hasActionUpdates
    ? await supabase.from("actions").update(scalarUpdateData).eq("id", actionId).select("id").single()
    : { data: { id: actionId }, error: null };
  if (updateResult.error) throw new Error("Action update failed");
  state.actionWriteSucceeded = hasActionUpdates && Boolean(updateResult.data);

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
  await runActionUpdatePostProcessing({ supabase, actionId, updateData: scalarUpdateData, body, userId, identity, shouldAuditModeration, auditSnapshots: state.auditSnapshots, adminAuditActorUserId, adminAuditTargetUserId, moderationOperation, moderationReason, appendAdminAuditOnce, setErrorStage: (stage) => { state.adminErrorStage = stage; } });
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
    const { current, identity } = actionContext;

    const mutation = await preparePatchMutation({
      supabase,
      userId,
      current,
      identity,
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
