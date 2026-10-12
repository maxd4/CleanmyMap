import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { requireMobileAuthenticatedAccess } from "@/lib/auth/mobile-bearer";
import { canOverrideActionParticipants } from "@/lib/actions/permissions";
import { getCurrentUserIdentity } from "@/lib/authz";
import { loadActionById } from "@/lib/actions/store";
import { loadCanonicalActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { canReviewActionParticipants } from "@/lib/actions/permissions";
import {
  loadActionParticipationReviews,
  reviewActionParticipation,
  addActionParticipationByAdmin,
} from "@/lib/actions/participation/group-participation";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";
import { rebuildUserGamificationBadges } from "@/lib/gamification/badges/rebuild";

export const runtime = "nodejs";
// Justification Vercel: reviewer data is authenticated, private and mutable during moderation.
export const dynamic = "force-dynamic";

type ReviewContext = { params: Promise<{ actionId: string }> };
const reviewSchema = z.union([
  z.object({ participantId: z.string().trim().min(1), decision: z.enum(["accept", "reject"]), reason: z.string().trim().max(500).optional() }),
  z.object({ participantUserId: z.string().trim().min(1), reason: z.string().trim().max(500).optional() }),
]);

async function reviewerContext(actionId: string, userId: string) {
  const supabase = getSupabaseServerClient(true);
  const [action, identity, organizerIds] = await Promise.all([
    loadActionById(supabase, actionId),
    getCurrentUserIdentity({ userId }),
    loadCanonicalActionOrganizerIdsForAction(supabase, actionId),
  ]);
  if (!action) return { ok: false as const, status: 404 as const, supabase };
  const allowed = canReviewActionParticipants(
    { userId, role: identity?.role, activeRole: identity?.activeRole },
    { createdByClerkId: action.created_by_clerk_id, actionPhase: action.action_phase },
    organizerIds,
  );
  return allowed
    ? { ok: true as const, supabase, action, identity }
    : { ok: false as const, status: 403 as const, supabase };
}

export async function GET(request: Request, ctx: ReviewContext) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const { actionId } = await ctx.params;
  try {
    const context = await reviewerContext(actionId, access.userId);
    if (!context.ok) return NextResponse.json({ error: context.status === 404 ? "Action introuvable." : "Accès refusé." }, { status: context.status });
    const [pendingRequests, confirmedParticipants] = await Promise.all([
      loadActionParticipationReviews(context.supabase, { actionId, limit: 50, statuses: ["pending"], actionPhase: context.action.action_phase }),
      loadActionParticipationReviews(context.supabase, { actionId, limit: 50, statuses: ["confirmed"], actionPhase: context.action.action_phase }),
    ]);
    // Justification Vercel: private review data must not be served from a shared cache.
    return NextResponse.json({ status: "ok", canReview: true, pendingRequests, confirmedParticipants }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "GET /api/mobile/actions/:actionId/review");
  }
}

export async function POST(request: Request, ctx: ReviewContext) {
  const access = await requireMobileAuthenticatedAccess(request);
  if (!access.ok) return unauthorizedJsonResponse();
  const { actionId } = await ctx.params;
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);
  try {
    const context = await reviewerContext(actionId, access.userId);
    if (!context.ok) return NextResponse.json({ error: context.status === 404 ? "Action introuvable." : "Accès refusé." }, { status: context.status });
    const requiresReason = canOverrideActionParticipants(context.identity) &&
      (("participantUserId" in parsed.data) || parsed.data.decision === "reject");
    if (requiresReason && (parsed.data.reason?.trim().length ?? 0) < 5) {
      return validationErrorResponse({ reason: ["Un motif d'au moins 5 caractères est requis pour cette opération de modération."] });
    }
    const result = "participantUserId" in parsed.data
      ? await addActionParticipationByAdmin(context.supabase, { actionId, targetUserId: parsed.data.participantUserId, actionPhase: context.action.action_phase })
      : await reviewActionParticipation(context.supabase, { actionId, participantId: parsed.data.participantId, decision: parsed.data.decision, actionPhase: context.action.action_phase, requirePending: true });
    if ("participantUserId" in parsed.data || parsed.data.decision === "accept") {
      await rebuildUserGamificationBadges(context.supabase, result.participantUserId).catch(() => null);
      await refreshProgressionProfile(context.supabase, result.participantUserId).catch(() => null);
    }
    await appendActionModerationAudit({
      operationId: `mobile-action-group-join-${actionId}-${Date.now()}`,
      actorUserId: access.userId,
      targetActionId: actionId,
      operation: "participantUserId" in parsed.data ? "admin_add_participant" : `admin_review_${parsed.data.decision}`,
      outcome: "success",
      reason: parsed.data.reason ?? null,
      previousValue: result.previousValue,
      newValue: result.newValue,
      targetUserId: result.participantUserId,
      details: { participantUserId: result.participantUserId, participationStatus: result.participationStatus },
    });
    return NextResponse.json({ status: "ok", actionId, ...result });
  } catch (error) {
    return handleApiError(error, "POST /api/mobile/actions/:actionId/review");
  }
}
