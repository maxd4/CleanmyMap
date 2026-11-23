import { NextResponse } from "next/server";
import { z } from "zod";
import { appendParticipationClaimAudit } from "@/lib/actions/participation/claim-audit";
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
const claimInputSchema = z.object({ rosterEntryId: z.string().uuid().optional() }).strict();

function privateResponse(response: Response): Response {
  // Vercel contract: claim state is per authenticated member and action, so it cannot be cached/shared.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

type ClaimRouteContext = {
  params: Promise<{ actionId: string }>;
};

export async function POST(request: Request, ctx: ClaimRouteContext) {
  const rateLimit = await verifyRateLimit(request, {
    limit: 10,
    window: 60,
  });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) return privateResponse(rateLimitResponse);

  const access = await requireAuthenticatedAccess();
  if (!access.ok) {
    return privateResponse(unauthorizedJsonResponse());
  }

  const bodyText = await request.text().catch(() => "");
  let rawBody: unknown = {};
  if (bodyText.trim()) {
    try {
      rawBody = JSON.parse(bodyText);
    } catch {
      rawBody = null;
    }
  }
  const parsedBody = claimInputSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    // A roster identifier is a bearer-like pointer, so invalid values do not
    // disclose whether an entry or action exists.
    return privateResponse(NextResponse.json({ error: "Action introuvable." }, { status: 404 }));
  }

  const { actionId: rawActionId } = await ctx.params;
  const parsedActionId = actionIdSchema.safeParse(rawActionId);
  if (!parsedActionId.success) {
    return privateResponse(validationErrorResponse({
      actionId: ["Identifiant d'action manquant."],
    }));
  }
  const actionId = parsedActionId.data;

  try {
    const supabase = getSupabaseServerClient(true);
    const claim = await claimFinishedActionParticipation(supabase, {
      actionId,
      userId: access.userId,
      ...(parsedBody.data.rosterEntryId ? { rosterEntryId: parsedBody.data.rosterEntryId } : {}),
    });

    await appendParticipationClaimAudit({ actionId, userId: access.userId, operationIdPrefix: "action-post-claim", claim });

    return privateResponse(NextResponse.json({
      status: "ok",
      actionId,
      alreadyRequested: claim.alreadyRequested,
      participationStatus: claim.participationStatus,
      participationSource: claim.participationSource,
      joinedAt: claim.joinedAt,
      updatedAt: claim.updatedAt,
    }));
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "NotFoundError") {
        return privateResponse(NextResponse.json({ error: "Action introuvable." }, { status: 404 }));
      }
      if (error.name === "ValidationError") {
        return privateResponse(validationErrorResponse({ actionId: [error.message] }));
      }
    }
    return privateResponse(handleApiError(error, "POST /api/actions/:actionId/participation-claim"));
  }
}
