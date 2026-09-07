import { NextResponse } from "next/server";
import {
  getCurrentUserIdentity,
  requireAuthenticatedAccess,
} from "@/lib/authz";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import {
  canReviewActionParticipants,
  canUseAdminOverride,
} from "@/lib/actions/permissions";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import { loadActionOrganizerIdsForAction } from "@/lib/actions/participation/organizers";
import { cancelActionParticipation } from "@/lib/actions/participation/group-participation";
import { refreshProgressionProfile } from "@/lib/gamification/progression-tracking";
import { handleGroupJoinQueue } from "./route.queue";
import { handleGroupJoinReview } from "./route.review";
import { handleGroupJoinToggle } from "./route.toggle";
import type {
  GroupJoinRouteContext,
  ModerationAuditAppender,
  ReviewerAccess,
  ReviewerAccessResolver,
} from "./route.shared";

export const runtime = "nodejs";
// Justification Vercel: la jonction est resolue par action et par utilisateur, donc pas de cache.
export const dynamic = "force-dynamic";

const appendModerationAudit: ModerationAuditAppender = async (params) => {
  await appendActionModerationAudit(params);
};

async function resolveAdminAuditIdentity(
  fallbackUserId?: string,
): Promise<{ actorUserId: string } | null> {
  try {
    const identity = await getCurrentUserIdentity();
    if (!identity || !canUseAdminOverride(identity)) {
      return null;
    }
    const actorUserId = identity.userId ?? fallbackUserId ?? null;
    return actorUserId ? { actorUserId } : null;
  } catch {
    return null;
  }
}

async function resolveGroupJoinUserId(operation: string): Promise<string | null> {
  try {
    const identity = await getCurrentUserIdentity();
    return identity?.userId ?? null;
  } catch (error) {
    console.warn(`[group-join] Clerk auth unavailable during ${operation}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

const resolveReviewerAccess: ReviewerAccessResolver = async (params) => {
  const identity = await getCurrentUserIdentity();
  if (canUseAdminOverride(identity)) {
    return {
      ok: true,
      identity,
    } satisfies ReviewerAccess;
  }

  const permissionIdentity = {
    userId: params.actorUserId,
    role: identity?.role ?? null,
    activeRole: identity?.activeRole ?? null,
  };
  const organizerIds = await loadActionOrganizerIdsForAction(
    params.supabase,
    params.actionId,
    null,
  );
  if (
    canReviewActionParticipants(
      permissionIdentity,
      { createdByClerkId: params.creatorUserId },
      organizerIds,
    )
  ) {
    return {
      ok: true,
      identity,
    } satisfies ReviewerAccess;
  }

  return { ok: false } satisfies ReviewerAccess;
};

export async function PATCH(
  request: Request,
  ctx: GroupJoinRouteContext,
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  return handleGroupJoinToggle(request, ctx, {
    userId: access.userId,
    resolveReviewerAccess,
    canUseAdminOverride,
    appendActionModerationAudit: appendModerationAudit,
    resolveAdminAuditIdentity,
  });
}

export async function GET(
  request: Request,
  ctx: GroupJoinRouteContext,
) {
  const userId = await resolveGroupJoinUserId(
    "GET /api/actions/:actionId/group-join",
  );
  return handleGroupJoinQueue(request, ctx, {
    userId,
    resolveReviewerAccess,
  });
}

export async function POST(
  request: Request,
  ctx: GroupJoinRouteContext,
) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  return handleGroupJoinReview(request, ctx, {
    userId: access.userId,
    resolveReviewerAccess,
    canUseAdminOverride,
    appendActionModerationAudit: appendModerationAudit,
    resolveAdminAuditIdentity,
  });
}

export async function DELETE(
  _request: Request,
  ctx: GroupJoinRouteContext,
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
    const result = await cancelActionParticipation(supabase, {
      actionId: trimmedActionId,
      userId,
    });

    await refreshProgressionProfile(supabase, userId).catch(() => null);

    return NextResponse.json({
      status: "ok",
      actionId: trimmedActionId,
      alreadyCancelled: result.alreadyCancelled,
      joinedAt: result.joinedAt,
      participationStatus: result.participationStatus,
      participationSource: result.participationSource,
      participationUpdatedAt: result.participationUpdatedAt,
      participantsCount: result.participantsCount,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return NextResponse.json(
        { error: "Participation introuvable." },
        { status: 404 },
      );
    }

    return handleApiError(error, "DELETE /api/actions/:actionId/group-join");
  }
}
