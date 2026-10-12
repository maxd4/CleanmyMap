import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { autoComposeTeams, loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
// Justification Vercel: automatic team assignment mutates event state and must be evaluated dynamically.
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const confirm = body.confirm === true;
    if (!confirm) return NextResponse.json(await autoComposeTeams(supabase, event));
    if (typeof body.proposalFingerprint !== "string" || typeof body.expectedRevision !== "number" || !Number.isInteger(body.expectedRevision)) {
      return NextResponse.json({ error: "La confirmation exige l'empreinte et la révision de l'aperçu." }, { status: 400 });
    }
    return NextResponse.json(await autoComposeTeams(supabase, event, {
      proposalFingerprint: body.proposalFingerprint,
      expectedRevision: body.expectedRevision,
      actorClerkId: access.userId,
    }));
  } catch (error) {
    return handleApiError(error, "spogomi.teams.auto");
  }
}
