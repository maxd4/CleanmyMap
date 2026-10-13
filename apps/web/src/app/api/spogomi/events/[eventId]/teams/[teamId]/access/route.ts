import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { handleApiError } from "@/lib/http/api-errors";
import { issueSpogomiTeamAccessGrant, revokeSpogomiTeamAccessGrant } from "@/lib/spogomi/team-access";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: team access grants are short-lived credentials and require fresh authorization.
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ eventId: string; teamId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const { eventId, teamId } = await context.params;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    if (!authorized.event.event_slug) return NextResponse.json({ error: "L’événement doit avoir un slug avant de générer un lien d’équipe." }, { status: 409 });
    const grant = await issueSpogomiTeamAccessGrant({ supabase, eventId, teamId, createdByClerkId: access.userId });
    const link = new URL(`/api/spogomi/team-access?eventSlug=${encodeURIComponent(String(authorized.event.event_slug))}&token=${encodeURIComponent(grant.token)}`, request.url).toString();
    // Justification Vercel: access credentials must never be served from a shared cache.
    return NextResponse.json({ accessUrl: link, expiresAt: grant.expiresAt }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.team-access.issue");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ eventId: string; teamId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimitResponse = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const { eventId, teamId } = await context.params;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    await revokeSpogomiTeamAccessGrant({ supabase, eventId, teamId });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return handleApiError(error, "spogomi.team-access.revoke");
  }
}
