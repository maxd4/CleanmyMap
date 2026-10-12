import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { issueSpogomiIdentityCode, SpogomiIdentityLinkError } from "@/lib/spogomi/identity-link";

export const runtime = "nodejs";
// Justification Vercel: identity codes are private event credentials and require fresh authorization.
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ eventId: string; participantId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 20, window: 60 });
  if (rateLimited) return rateLimited;

  try {
    const { eventId, participantId } = await context.params;
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });

    const issued = await issueSpogomiIdentityCode(supabase, {
      eventId,
      participantId,
      organizerId: access.userId,
    });
    return NextResponse.json({
      status: "issued",
      code: issued.code,
      expiresAt: issued.expiresAt,
      delivery: "manual",
      warning: "Ce code est affiché une seule fois. Remettez-le directement à la personne concernée.",
    });
  } catch (error) {
    if (error instanceof SpogomiIdentityLinkError && error.kind === "already_linked") {
      return NextResponse.json({ error: "Cette identité est déjà liée." }, { status: 409 });
    }
    return handleApiError(error, "spogomi.identity-code.issue");
  }
}
