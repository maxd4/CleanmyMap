import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { listSpogomiIdentityAssistanceRequests } from "@/lib/spogomi/identity-assistance";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
// Justification Vercel: organizer-only assistance requests are private and must remain fresh per request.
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimited) return rateLimited;
  try {
    const eventId = (await context.params).eventId;
    const event = await loadSpogomiEventForOrganizer(getSupabaseServerClient(true), eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const requests = await listSpogomiIdentityAssistanceRequests(getSupabaseServerClient(true), eventId);
    return NextResponse.json({ status: "ok", requests });
  } catch (error) {
    return handleApiError(error, "spogomi.identity-assistance.organizer-list");
  }
}
