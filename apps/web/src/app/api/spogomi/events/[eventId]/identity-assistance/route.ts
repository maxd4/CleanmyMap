import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadSpogomiIdentityAssistanceRequestForRequester,
  SpogomiIdentityAssistanceError,
  transitionSpogomiIdentityAssistanceRequest,
} from "@/lib/spogomi/identity-assistance";

export const runtime = "nodejs";
// Justification Vercel: this authenticated identity-assistance state is private and must remain fresh per request.
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(_request, access.userId, { limit: 30, window: 60 });
  if (rateLimited) return rateLimited;
  const eventId = (await context.params).eventId;
  try {
    const requestRow = await loadSpogomiIdentityAssistanceRequestForRequester(getSupabaseServerClient(true), {
      eventId,
      requesterClerkId: access.userId,
    });
    return NextResponse.json({ status: "ok", request: requestRow });
  } catch (error) {
    return handleApiError(error, "spogomi.identity-assistance.read");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(_request, access.userId, { limit: 8, window: 3600 });
  if (rateLimited) return rateLimited;
  try {
    const eventId = (await context.params).eventId;
    const current = await loadSpogomiIdentityAssistanceRequestForRequester(getSupabaseServerClient(true), {
      eventId,
      requesterClerkId: access.userId,
    });
    if (!current) return NextResponse.json({ error: "Cette demande n’est pas disponible." }, { status: 404 });
    const updated = await transitionSpogomiIdentityAssistanceRequest({
      supabase: getSupabaseServerClient(true),
      requestId: current.id,
      eventId,
      targetStatus: "cancelled",
      actorKind: "requester",
      actorClerkId: access.userId,
    });
    return NextResponse.json({ status: "ok", request: updated });
  } catch (error) {
    if (error instanceof SpogomiIdentityAssistanceError && error.kind === "unavailable") {
      return NextResponse.json({ error: "Cette demande n’est pas disponible." }, { status: 404 });
    }
    return handleApiError(error, "spogomi.identity-assistance.cancel");
  }
}
