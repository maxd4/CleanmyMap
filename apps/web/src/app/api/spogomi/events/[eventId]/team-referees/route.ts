import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";
import {
  assignSpogomiTeamReferee,
  revokeSpogomiTeamReferee,
  SpogomiTeamRefereeError,
} from "@/lib/spogomi/team-referee-service";

export const runtime = "nodejs";
// Justification Vercel: team referee assignments mutate per-team authorization and readiness state.
export const dynamic = "force-dynamic";

const assignSchema = z
  .object({
    divisionId: z.string().uuid(),
    teamId: z.string().uuid(),
    refereeClerkId: z.string().trim().min(3).max(128),
    reason: z.string().trim().max(240).optional(),
  })
  .strict();

const revokeSchema = z
  .object({
    divisionId: z.string().uuid(),
    teamId: z.string().uuid(),
    reason: z.string().trim().max(240).optional(),
  })
  .strict();

function mapRouteError(error: unknown) {
  if (error instanceof SpogomiTeamRefereeError) {
    const status =
      error.kind === "forbidden"
        ? 403
        : error.kind === "conflict"
          ? 409
          : error.kind === "not_found"
            ? 404
            : 422;
    return NextResponse.json({ error: error.message, kind: error.kind }, { status });
  }
  if (error instanceof Error && /forbidden/i.test(error.message)) {
    return forbiddenJsonResponse();
  }
  return handleApiError(error, "spogomi.team_referees");
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimit = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, {
    limit: 30,
    window: 60,
  });
  if (rateLimit) return rateLimit;

  const parsed = assignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return validationErrorResponse({
      body: ["Les paramètres d’affectation de l’arbitre référent sont invalides."],
    });
  }

  try {
    const eventId = (await context.params).eventId;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;

    const result = await assignSpogomiTeamReferee({
      supabase,
      eventId,
      divisionId: parsed.data.divisionId,
      teamId: parsed.data.teamId,
      refereeClerkId: parsed.data.refereeClerkId,
      actorClerkId: access.userId,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ teamReferee: result }, { status: 200 });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimit = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, {
    limit: 30,
    window: 60,
  });
  if (rateLimit) return rateLimit;

  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return validationErrorResponse({
      body: ["Les paramètres de révocation de l’arbitre référent sont invalides."],
    });
  }

  try {
    const eventId = (await context.params).eventId;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;

    const result = await revokeSpogomiTeamReferee({
      supabase,
      eventId,
      divisionId: parsed.data.divisionId,
      teamId: parsed.data.teamId,
      actorClerkId: access.userId,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ teamReferee: result }, { status: 200 });
  } catch (error) {
    return mapRouteError(error);
  }
}
