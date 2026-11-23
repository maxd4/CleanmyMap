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
import { canEditActionForm, canManageAction } from "@/lib/actions/permissions";
import { loadActionFormEditorIds } from "@/lib/actions/action-form-editors";
import { loadActionRegistrationProjectionForAction, loadManualInvitationStatusesForAction, loadManualRegistrationIdsForAction } from "@/lib/actions/participation/registration-records";
import {
  loadActionOrganizerRowsForAction,
  loadCanonicalActionOrganizerIdsForAction,
} from "@/lib/actions/participation/organizers";
import { loadConfirmedParticipantIdsForAction } from "@/lib/actions/participation/group-participation.helpers";
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
import { isActionFinalizationEligible } from "@/lib/actions/finalization-eligibility";
import { extractActionMetadataFromNotes } from "@/lib/actions/metadata";
import type { ActionRow } from "@/types/database";

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
  const [organizerIds, editorIds] = await Promise.all([
    loadCanonicalActionOrganizerIdsForAction(supabase, actionId),
    loadActionFormEditorIds(supabase, actionId),
  ]);
  return { identity, permissionIdentity, organizerIds, editorIds };
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
  editorIds: string[];
  isFormDelegate: boolean;
}> {
  const current = await loadActionById(supabase, actionId);
  if (!current) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });

  const { identity, permissionIdentity, organizerIds, editorIds } = await loadActionPermissionContext(
    supabase,
    userId,
    actionId,
  );
  // This owner/organizer/admin decision stays visible at the HTTP boundary.
  const permissionTarget = { createdByClerkId: current.created_by_clerk_id };
  if (!canEditActionForm(permissionIdentity, permissionTarget, organizerIds, editorIds)) {
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
  return {
    current,
    identity,
    organizerIds,
    editorIds,
    isFormDelegate: !canManageAction(permissionIdentity, permissionTarget, organizerIds),
  };
}

function sameIdentifiers(left: string[] | undefined, right: string[]): boolean {
  if (left === undefined) return true;
  const normalize = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
}

async function restrictDelegatedFormPayload(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  actionId: string,
  current: ActionRow,
  organizerIds: string[],
  parsed: ActionUpdateInput,
): Promise<Response | ActionUpdateInput> {
  const metadata = extractActionMetadataFromNotes(current.notes);
  const manualParticipantIds = await loadManualRegistrationIdsForAction(supabase, actionId);
  const displayedOrganizerIds = current.organizer_type === "spontaneous"
    ? organizerIds
    : organizerIds.filter((organizerId) => organizerId !== current.created_by_clerk_id);
  const displayedOrganizerName = current.organizer_name ?? metadata.associationName ?? "";
  const forbidden = () => NextResponse.json(
    { error: "Ce privilège autorise uniquement les champs du formulaire, pas la gestion des personnes, invitations ou organisateurs." },
    { status: 403 },
  );
  if (!sameIdentifiers(parsed.organizerAccounts, displayedOrganizerIds)
      || (parsed.organizerType !== undefined && parsed.organizerType !== current.organizer_type)
      || (parsed.organizerId !== undefined && (parsed.organizerId?.trim() || null) !== (current.organizer_id?.trim() || null))
      || (parsed.organizerName !== undefined && parsed.organizerName.trim() !== displayedOrganizerName.trim())
      || (parsed.associationName !== undefined && parsed.associationName !== metadata.associationName)
      || !sameIdentifiers(parsed.participantAccounts, manualParticipantIds)
      || (parsed.accessMode !== undefined && parsed.accessMode !== (current.access_mode ?? "public"))
      || (parsed.groupJoinEnabled !== undefined && parsed.groupJoinEnabled !== metadata.groupJoinEnabled)) {
    return forbidden();
  }

  const preparationData = parsed.preparationData ? { ...parsed.preparationData } : undefined;
  const currentPreparation = (current.preparation_data ?? {}) as Record<string, unknown>;
  if (preparationData?.groupJoinEnabled !== undefined
      && preparationData.groupJoinEnabled !== metadata.groupJoinEnabled) return forbidden();
  if (preparationData?.organizerReferenceStatus !== undefined
      && preparationData.organizerReferenceStatus !== currentPreparation.organizerReferenceStatus) return forbidden();
  if (preparationData) {
    delete preparationData.groupJoinEnabled;
    delete preparationData.organizerReferenceStatus;
  }

  const result = { ...parsed };
  delete result.organizerAccounts;
  delete result.organizerType;
  delete result.organizerId;
  delete result.organizerName;
  delete result.associationName;
  delete result.participantAccounts;
  delete result.accessMode;
  delete result.groupJoinEnabled;
  if (preparationData && Object.keys(preparationData).length > 0) {
    result.preparationData = preparationData;
  } else {
    delete result.preparationData;
  }
  return result;
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
    const { current, identity, organizerIds, isFormDelegate } = actionContext;
    const patchBody = isFormDelegate
      ? await restrictDelegatedFormPayload(supabase, trimmedActionId, current, organizerIds, parsed)
      : parsed;
    if (patchBody instanceof Response) return patchBody;
    const mutation = await preparePatchMutation({
      supabase,
      actionId: trimmedActionId,
      userId,
      current,
      identity,
      organizerIds,
      parsed: patchBody,
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

    const { permissionIdentity, organizerIds, editorIds } = await loadActionPermissionContext(
      supabase,
      userId,
      trimmedActionId,
    );
    // GET has the same form-edit boundary as PATCH; visitors cannot read this editor payload.
    if (!canEditActionForm(permissionIdentity, { createdByClerkId: row.created_by_clerk_id }, organizerIds, editorIds)) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à lire cette action." },
        { status: 403 },
      );
    }

    const participantAccounts = await loadManualRegistrationIdsForAction(
      supabase,
      trimmedActionId,
    );
    const registrationStatuses = await loadActionRegistrationProjectionForAction(
      supabase,
      trimmedActionId,
    );
    const manualInvitationStatuses = await loadManualInvitationStatusesForAction(
      supabase,
      trimmedActionId,
    );
    const confirmedParticipantAccounts = await loadConfirmedParticipantIdsForAction(
      supabase,
      trimmedActionId,
    );
    const organizerRows = await loadActionOrganizerRowsForAction(supabase, trimmedActionId);
    const primaryOrganizerName = organizerRows.find((organizer) => organizer.is_primary)?.organizer_label?.trim();
    const editorPayload = buildActionEditorPayload(row);
    const action = {
      ...editorPayload,
      finalizationEligible: isActionFinalizationEligible(row),
      ...(row.organizer_type === "spontaneous" && primaryOrganizerName
        ? { organizerName: primaryOrganizerName }
        : {}),
      organizerAccounts:
        row.organizer_type === "spontaneous"
          ? organizerIds
          : organizerIds.filter((organizerId) => organizerId !== row.created_by_clerk_id),
      participantAccounts,
      registrationStatuses,
      manualInvitationStatuses,
      confirmedParticipantAccounts,
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

  return executePatchAfterAuthentication(request, ctx, access);
}

async function executePatchAfterAuthentication(
  request: Request,
  ctx: { params: Promise<{ actionId: string }> },
  access: Awaited<ReturnType<typeof requireActionRequestAccess>> & { ok: true },
): Promise<Response> {
  // Form access is enforced by loadAuthorizedPatchAction via canEditActionForm;
  // preparePatchMutation still applies the narrower validated-impact and
  // global-moderation capabilities before their respective privileged paths.
  const parsedRequest = await parsePatchRequest(request, ctx, access);
  if (parsedRequest instanceof Response) return parsedRequest;
  const { userId, trimmedActionId, parsedBody } = parsedRequest;
  return executePatchRequest({
    userId,
    trimmedActionId,
    parsed: parsedBody,
  });
}
