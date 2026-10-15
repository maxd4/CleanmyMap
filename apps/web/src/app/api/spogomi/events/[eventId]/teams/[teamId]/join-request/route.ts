import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createSpogomiTeamJoinRequest,
  loadSpogomiTeamJoinRequestForRequester,
  SpogomiTeamJoinRequestError,
  transitionSpogomiTeamJoinRequest,
} from "@/lib/spogomi/team-join-requests";

export const runtime = "nodejs";
// Justification Vercel: requester-scoped team join state is private and must remain fresh per request.
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ eventId: string; teamId: string }> };
const routeParamsSchema = z.object({ eventId: z.string().uuid(), teamId: z.string().uuid() });
type AuthenticationResult =
  | { response: Response }
  | { access: { ok: true; userId: string } };

async function authenticate(request: Request): Promise<AuthenticationResult> {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 8, window: 60 });
  if (rateLimited) return { response: rateLimited } as const;
  return { access } as const;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  try {
    const parsedParams = routeParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationErrorResponse({ params: ["Équipe invalide."] });
    const { eventId, teamId } = parsedParams.data;
    const requestRecord = await loadSpogomiTeamJoinRequestForRequester(getSupabaseServerClient(true), {
      eventId,
      teamId,
      requesterClerkId: authentication.access.userId,
    });
    return NextResponse.json({ status: "ok", request: requestRecord });
  } catch (error) {
    return handleApiError(error, "spogomi.team-join-request.read");
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  try {
    const parsedParams = routeParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationErrorResponse({ params: ["Équipe invalide."] });
    const { eventId, teamId } = parsedParams.data;
    const requestRecord = await createSpogomiTeamJoinRequest({
      supabase: getSupabaseServerClient(true),
      eventId,
      teamId,
      requesterClerkId: authentication.access.userId,
    });
    return NextResponse.json({ status: "ok", request: requestRecord }, { status: requestRecord.status === "pending" ? 201 : 200 });
  } catch (error) {
    if (error instanceof SpogomiTeamJoinRequestError) {
      const status = error.kind === "unavailable" ? 404 : error.kind === "conflict" ? 409 : error.kind === "forbidden" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return handleApiError(error, "spogomi.team-join-request.create");
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  try {
    const parsedParams = routeParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) return validationErrorResponse({ params: ["Équipe invalide."] });
    const { eventId, teamId } = parsedParams.data;
    const current = await loadSpogomiTeamJoinRequestForRequester(getSupabaseServerClient(true), {
      eventId,
      teamId,
      requesterClerkId: authentication.access.userId,
    });
    if (!current) return NextResponse.json({ error: "Demande introuvable." }, { status: 404 });
    const requestRecord = await transitionSpogomiTeamJoinRequest({
      supabase: getSupabaseServerClient(true),
      requestId: current.id,
      eventId,
      targetStatus: "cancelled",
      actorKind: "requester",
      actorClerkId: authentication.access.userId,
    });
    return NextResponse.json({ status: "ok", request: requestRecord });
  } catch (error) {
    if (error instanceof SpogomiTeamJoinRequestError) {
      const status = error.kind === "unavailable" ? 404 : error.kind === "conflict" ? 409 : error.kind === "forbidden" ? 403 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return handleApiError(error, "spogomi.team-join-request.cancel");
  }
}
