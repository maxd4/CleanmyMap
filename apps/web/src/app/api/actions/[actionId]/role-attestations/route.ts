import { NextResponse } from "next/server";
import { z } from "zod";
import { requireActionRequestAccess } from "@/lib/auth/action-request-access";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getCurrentUserIdentity } from "@/lib/authz";
import { canManageAction, canManageActionsGlobally } from "@/lib/actions/permissions";
import { loadActionById } from "@/lib/actions/store";
import { loadActionOrganizerRowsForAction } from "@/lib/actions/participation/organizers";
import { loadActionParticipationReviewPage } from "@/lib/actions/participation/group-participation";
import { ACTION_FIELD_ROLE_OPTIONS, isActionFieldRoleCode } from "@/lib/actions/field-roles";
import {
  isActionFinalizedForRoleAttestation,
  loadActionRoleAttestationState,
  reviewActionRoleAttestation,
} from "@/lib/actions/role-attestations";
import { evaluateRoleAttestationPolicy } from "@/lib/actions/role-attestation-policy";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: attestation reads and writes are identity-scoped/private; no-store prevents shared-cache exposure of final participation and reviewer decisions.
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ actionId: string }> };

const reviewSchema = z.object({
  userId: z.string().trim().min(1),
  roleCode: z.string().trim().min(1),
  decision: z.enum(["confirm", "reject"]),
  reason: z.string().trim().max(1000).nullable().optional(),
});

async function resolveAccess(actionId: string, userId: string) {
  const supabase = getSupabaseServerClient(true);
  const [action, identity, organizerRows] = await Promise.all([
    loadActionById(supabase, actionId),
    getCurrentUserIdentity({ userId }),
    loadActionOrganizerRowsForAction(supabase, actionId),
  ]);
  if (!action) return { ok: false as const, status: 404 as const, supabase };
  const organizerIds = organizerRows.map((row) => row.organizer_clerk_id.trim()).filter(Boolean);
  const isManager = canManageAction(
    { userId, role: identity?.role ?? null, activeRole: identity?.activeRole ?? null },
    { createdByClerkId: action.created_by_clerk_id, actionPhase: action.action_phase, status: action.status },
    organizerIds,
  );
  const isGlobalAdmin = canManageActionsGlobally({ activeRole: identity?.activeRole ?? null });
  return { ok: true as const, supabase, action, identity, organizerRows, isManager, isGlobalAdmin };
}

function errorStatus(message: string): number {
  if (message.includes("forbidden")) return 403;
  if (message.includes("lifecycle_closed") || message.includes("participation_required")) return 409;
  if (message.includes("reason_required") || message.includes("input_invalid") || message.includes("role_invalid")) return 400;
  return 500;
}

function noStoreResponse(body: unknown, status = 200) {
  // Justification Vercel: participant identities, assignments and attestation audit data must never be stored or shared by an intermediary cache.
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

function readPagination(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const rawLimit = Number(searchParams.get("limit") ?? 100);
  const rawOffset = Number(searchParams.get("offset") ?? 0);
  return {
    limit: Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.trunc(rawLimit), 100)) : 100,
    offset: Number.isFinite(rawOffset) ? Math.max(0, Math.min(Math.trunc(rawOffset), 100_000)) : 0,
  };
}

export async function GET(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  try {
    const { actionId } = await context.params;
    const access = await resolveAccess(actionId.trim(), auth.userId);
    if (!access.ok) return noStoreResponse({ error: "Action introuvable." }, access.status);
    if (!isActionFinalizedForRoleAttestation(access.action)) {
      return noStoreResponse({ error: "Les missions sont consultables après la finalisation canonique de l’action." }, 409);
    }

    const pageRequest = readPagination(request);
    const state = await loadActionRoleAttestationState(access.supabase, access.action.id);
    const participantsPage = await loadActionParticipationReviewPage(access.supabase, {
      actionId: access.action.id,
      statuses: ["confirmed"],
      actionPhase: "post_action_complete",
      limit: access.isManager ? pageRequest.limit : 1,
      offset: access.isManager ? pageRequest.offset : 0,
      userId: access.isManager ? undefined : auth.userId,
    });
    const visibleParticipants = access.isManager
      ? participantsPage.items
      : participantsPage.items.filter((participant) => participant.userId === auth.userId);
    if (!access.isManager && visibleParticipants.length === 0) {
      return noStoreResponse({ error: "La consultation des missions exige une participation finale confirmée." }, 403);
    }
    return noStoreResponse({
      status: "ok",
      actionId: access.action.id,
      canReview: access.isManager,
      currentUserId: auth.userId,
      roleOptions: ACTION_FIELD_ROLE_OPTIONS,
      pagination: {
        hasMore: access.isManager && participantsPage.hasMore,
        nextOffset: access.isManager ? participantsPage.nextOffset : null,
      },
      participants: visibleParticipants.map((participant) => ({
        userId: participant.userId,
        displayName: participant.displayName,
        handle: participant.handle,
        participationStatus: participant.participationStatus,
        plannedRoles: state.assignments.filter((assignment) => assignment.user_id === participant.userId),
        attestations: state.attestations
          .filter((attestation) => attestation.user_id === participant.userId)
          .map((attestation) => ({
            ...attestation,
            reviewer_clerk_id: access.isManager ? attestation.reviewer_clerk_id : null,
            provenance_snapshot: access.isManager ? attestation.provenance_snapshot : {},
          })),
      })),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/actions/[actionId]/role-attestations");
  }
}

export async function POST(request: Request, context: Context) {
  const auth = await requireActionRequestAccess(request);
  if (!auth.ok) return unauthorizedJsonResponse();
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);
  if (!isActionFieldRoleCode(parsed.data.roleCode)) {
    return validationErrorResponse({ roleCode: ["Cette mission est inconnue."] });
  }
  try {
    const { actionId } = await context.params;
    const access = await resolveAccess(actionId.trim(), auth.userId);
    if (!access.ok) return noStoreResponse({ error: "Action introuvable." }, access.status);
    if (!access.isManager) return noStoreResponse({ error: "Seul un reviewer habilité peut modifier une mission." }, 403);
    if (!isActionFinalizedForRoleAttestation(access.action)) {
      return noStoreResponse({ error: "L’action doit être finalisée avant toute revue de mission." }, 409);
    }

    const [currentState, participationResult] = await Promise.all([
      loadActionRoleAttestationState(access.supabase, access.action.id),
      access.supabase
        .from("action_participants")
        .select("participation_status")
        .eq("action_id", access.action.id)
        .eq("user_id", parsed.data.userId)
        .maybeSingle(),
    ]);
    if (participationResult.error) throw new Error(participationResult.error.message);
    const current = currentState.attestations.find(
      (attestation) => attestation.user_id === parsed.data.userId && attestation.role_code === parsed.data.roleCode,
    );
    const reason = parsed.data.reason?.trim() || null;
    if (parsed.data.decision === "reject" && !reason) {
      return validationErrorResponse({ reason: ["Un motif est requis pour rejeter une mission."] });
    }
    if (current && current.verification_status !== "pending" && !reason) {
      return validationErrorResponse({ reason: ["Un motif est requis pour corriger une décision."] });
    }
    const policy = evaluateRoleAttestationPolicy({
      actionFinalized: isActionFinalizedForRoleAttestation(access.action),
      participationStatus: (participationResult.data as { participation_status?: string } | null)?.participation_status,
      reviewerAuthorized: access.isManager,
      reviewerIsGlobalAdmin: access.isGlobalAdmin,
      reviewerUserId: auth.userId,
      targetUserId: parsed.data.userId,
      hasPlannedAssignment: currentState.assignments.some(
        (assignment) => assignment.user_id === parsed.data.userId && assignment.role_code === parsed.data.roleCode,
      ),
      decision: parsed.data.decision,
      reason,
      currentStatus: current?.verification_status ?? null,
    });
    if (!policy.allowed && policy.status === "denied") {
      return noStoreResponse({ error: "La décision n’est pas compatible avec les preuves requises pour cette mission." }, 409);
    }
    const attestation = await reviewActionRoleAttestation(access.supabase, {
      actionId: access.action.id,
      userId: parsed.data.userId,
      roleCode: parsed.data.roleCode,
      decision: parsed.data.decision,
      reviewerClerkId: auth.userId,
      reason,
      reviewerIsGlobalAdmin: access.isGlobalAdmin,
    });
    return noStoreResponse({ status: "ok", attestation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "role_attestation_failed";
    const status = errorStatus(message);
    if (status !== 500) return noStoreResponse({ error: "La décision de mission n’est pas applicable dans cet état." }, status);
    return handleApiError(error, "POST /api/actions/[actionId]/role-attestations");
  }
}
