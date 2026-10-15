import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { issueSpogomiIdentityAssistanceInvitation } from "@/lib/spogomi/identity-assistance";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
// Justification Vercel: private invitation issuance depends on the current organizer session and must remain fresh.
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 5, window: 3600 });
  if (rateLimited) return rateLimited;
  try {
    const eventId = (await context.params).eventId;
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const invitation = await issueSpogomiIdentityAssistanceInvitation({ supabase, eventId, organizerId: access.userId });
    const url = new URL("/spogomi/assistance", request.url);
    url.searchParams.set("eventId", eventId);
    url.searchParams.set("token", invitation.token);
    return NextResponse.json({ status: "issued", url: url.toString(), expiresAt: invitation.expiresAt, delivery: "manual", warning: "Ce lien est privé et à remettre directement à la personne concernée." });
  } catch (error) {
    return handleApiError(error, "spogomi.identity-assistance.invitation");
  }
}
