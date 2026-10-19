import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { loadActionParticipationReviews } from "@/lib/actions/participation/group-participation";
import {
  ACTION_FIELD_ROLE_OPTIONS,
  isActionFieldRoleCode,
  loadActionFieldRoleState,
  normalizeActionFieldRoleCodes,
  replaceActionFieldRoles,
} from "@/lib/actions/field-roles";
import { resolveActionFieldRoleAccess } from "@/lib/actions/field-roles-http";

export const runtime = "nodejs";
// Justification Vercel: action field-role reads and writes are identity-scoped and private; no-store prevents shared-cache exposure of participant assignments.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ actionId: string }> };

const replaceSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  roleCodes: z.array(z.string().trim().min(1)).max(ACTION_FIELD_ROLE_OPTIONS.length),
});

function toResponseState(
  state: Awaited<ReturnType<typeof loadActionFieldRoleState>>,
  userId: string,
  includeAll: boolean,
) {
  const transferProposals = state.transferProposals ?? [];
  const visibleTransferProposals = includeAll
    ? transferProposals
    : transferProposals.filter((proposal) => proposal.successor_user_id === userId || proposal.current_primary_user_id === userId);
  return {
    assignments: includeAll
      ? state.assignments
      : state.assignments.filter((assignment) => assignment.user_id === userId),
    pendingTransfer: visibleTransferProposals.find((proposal) => proposal.status === "pending") ?? null,
    transferProposals: visibleTransferProposals,
  };
}

async function loadResponse(access: Extract<Awaited<ReturnType<typeof resolveActionFieldRoleAccess>>, { ok: true }>, userId: string) {
  const state = await loadActionFieldRoleState(access.supabase, access.action.id);
  const confirmedParticipants = access.isManager
    ? await loadActionParticipationReviews(access.supabase, {
        actionId: access.action.id,
        statuses: ["confirmed"],
        actionPhase: access.action.action_phase,
        limit: 100,
      })
    : [{ userId, displayName: "Mes responsabilités", handle: null, participationStatus: "confirmed" as const }];
  return {
    status: "ok",
    actionId: access.action.id,
    canManage: access.isManager,
    canProposeTransfer: access.isGlobalAdmin || access.isCreator || access.isPrimary,
    canRejectTransfer: access.isGlobalAdmin || access.isCreator || access.isPrimary,
    currentUserId: userId,
    roleOptions: ACTION_FIELD_ROLE_OPTIONS,
    organizers: access.organizerRows.map((row) => ({
      userId: row.organizer_clerk_id,
      displayName: row.organizer_label,
      handle: row.organizer_handle,
      isPrimary: row.is_primary,
    })),
    confirmedParticipants: confirmedParticipants.map((participant) => ({
      userId: participant.userId,
      displayName: participant.displayName,
      handle: participant.handle,
      registrationStatus: participant.participationStatus,
    })),
    ...toResponseState(state, userId, access.isManager),
  };
}

export async function GET(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  try {
    const { actionId } = await context.params;
    const access = await resolveActionFieldRoleAccess(actionId.trim(), auth.userId);
    if (!access.ok) return NextResponse.json({ error: access.status === 404 ? "Action introuvable." : "Accès réservé aux inscrits confirmés et organisateurs autorisés." }, { status: access.status });
    // Justification Vercel: the response contains private roster/role data and must remain uncached.
    return NextResponse.json(await loadResponse(access, auth.userId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/field-roles");
  }
}

export async function PUT(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  const parsed = replaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);
  const invalidRoleCodes = parsed.data.roleCodes.filter((code) => !isActionFieldRoleCode(code));
  if (invalidRoleCodes.length > 0) return validationErrorResponse({ roleCodes: ["Une responsabilité opérationnelle est inconnue."] });

  try {
    const { actionId } = await context.params;
    const access = await resolveActionFieldRoleAccess(actionId.trim(), auth.userId);
    if (!access.ok) return NextResponse.json({ error: access.status === 404 ? "Action introuvable." : "Accès refusé." }, { status: access.status });
    if (access.action.action_phase !== "pre_action" || !["pending", "approved"].includes(access.action.status)) {
      return NextResponse.json({ error: "Les responsabilités ne sont modifiables que pendant la pré-action." }, { status: 409 });
    }
    const targetUserId = parsed.data.userId ?? auth.userId;
    if (!access.isManager && targetUserId !== auth.userId) {
      return NextResponse.json({ error: "Vous ne pouvez modifier que vos propres responsabilités." }, { status: 403 });
    }
    const { readActionRegistrationRecord } = await import("@/lib/actions/participation/registration-records");
    const registration = await readActionRegistrationRecord(access.supabase, { actionId: actionId.trim(), userId: targetUserId });
    if (registration?.registration_status !== "confirmed") {
      return NextResponse.json({ error: "Seul un bénévole inscrit et confirmé peut recevoir une responsabilité." }, { status: 409 });
    }
    const roleCodes = normalizeActionFieldRoleCodes(parsed.data.roleCodes);
    await replaceActionFieldRoles(access.supabase, { actionId: actionId.trim(), userId: targetUserId, roleCodes, actorId: auth.userId });
    // Justification Vercel: the response contains private roster/role data and must remain uncached.
    return NextResponse.json(await loadResponse(access, auth.userId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "PUT /api/actions/[actionId]/field-roles");
  }
}
