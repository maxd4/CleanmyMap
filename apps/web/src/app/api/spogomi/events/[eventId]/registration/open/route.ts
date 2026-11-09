import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer, openSpogomiRegistration } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
// Justification Vercel: opening registrations is a revision-controlled
// organizer mutation whose readiness and authorization are resolved at request time.
export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const supabase = getSupabaseServerClient(true);
    const eventId = (await context.params).eventId;
    const event = await loadSpogomiEventForOrganizer(supabase, eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const updated = await openSpogomiRegistration({ supabase, event, actorClerkId: access.userId });
    return NextResponse.json({ event: updated });
  } catch (error) {
    return handleApiError(error, "spogomi.registration.open");
  }
}
