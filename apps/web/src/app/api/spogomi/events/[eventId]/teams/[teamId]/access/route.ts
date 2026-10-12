import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { issueSpogomiTeamAccessGrant, revokeSpogomiTeamAccessGrant } from "@/lib/spogomi/team-access";

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
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    if (!event.event_slug) return NextResponse.json({ error: "L’événement doit avoir un slug avant de générer un lien d’équipe." }, { status: 409 });
    const grant = await issueSpogomiTeamAccessGrant({ supabase, eventId, teamId, createdByClerkId: access.userId });
    const link = new URL(`/api/spogomi/team-access?eventSlug=${encodeURIComponent(String(event.event_slug))}&token=${encodeURIComponent(grant.token)}`, request.url).toString();
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
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    await revokeSpogomiTeamAccessGrant({ supabase, eventId, teamId });
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return handleApiError(error, "spogomi.team-access.revoke");
  }
}
