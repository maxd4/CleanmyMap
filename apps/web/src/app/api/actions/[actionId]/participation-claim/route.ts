import { NextResponse } from "next/server";
import { z } from "zod";
import { appendActionModerationAudit } from "@/lib/actions/moderation-audit";
import { claimFinishedActionParticipation } from "@/lib/actions/participation/post-action-claims";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { verifyRateLimit, createServerRateLimitResponse } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Justification Vercel: la réclamation dépend de la session Clerk et de l'état de participation courant.
export const dynamic = "force-dynamic";

const actionIdSchema = z.string().trim().min(1);

type ClaimRouteContext = {
  params: Promise<{ actionId: string }>;
};

export async function POST(_request: Request, ctx: ClaimRouteContext) {
  const rateLimit = await verifyRateLimit(_request, {
    limit: 10,
    window: 60,
  });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return unauthorizedJsonResponse();
  }

  const { actionId: rawActionId } = await ctx.params;
  const parsedActionId = actionIdSchema.safeParse(rawActionId);
  if (!parsedActionId.success) {
    return validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    });
  }
  const actionId = parsedActionId.data;

  try {
    const supabase = getSupabaseServerClient();
    const claim = await claimFinishedActionParticipation(supabase, {
      actionId,
      userId: access.userId,
    });

    await appendActionModerationAudit({
      operationId: `action-post-claim-${actionId}-${access.userId}-${Date.now()}`,
      actorUserId: access.userId,
      targetActionId: actionId,
      operation: "post_action_claim",
      outcome: "success",
      previousValue: claim.previousValue,
      newValue: claim.newValue,
      targetUserId: access.userId,
      details: {
        requesterUserId: access.userId,
        participationSource: claim.participationSource,
        alreadyRequested: claim.alreadyRequested,
        requestedAt: claim.joinedAt,
      },
    });

    return NextResponse.json({
      status: "ok",
      actionId,
      alreadyRequested: claim.alreadyRequested,
      participationStatus: claim.participationStatus,
      participationSource: claim.participationSource,
      joinedAt: claim.joinedAt,
      updatedAt: claim.updatedAt,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "NotFoundError") {
        return NextResponse.json({ error: "Action introuvable." }, { status: 404 });
      }
      if (error.name === "ValidationError") {
        return validationErrorResponse({ actionId: [error.message] });
      }
    }
    return handleApiError(error, "POST /api/actions/:actionId/participation-claim");
  }
}
