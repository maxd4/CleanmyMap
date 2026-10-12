import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SpogomiCompositionProtectionError, lockSpogomiTeams, loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { z } from "zod";

export const runtime = "nodejs";
// Justification Vercel: team locking changes certification state and must not be statically rendered.
export const dynamic = "force-dynamic";

const lockSchema = z.object({ expectedRevision: z.number().int().nonnegative().optional() });

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = lockSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Révision de composition invalide." }, { status: 422 });
  try {
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    return NextResponse.json(await lockSpogomiTeams(supabase, event, access.userId, parsed.data.expectedRevision));
  } catch (error) {
    if (error instanceof SpogomiCompositionProtectionError) {
      return NextResponse.json({ error: error.message, kind: "validation", status: "error" }, { status: 409 });
    }
    return handleApiError(error, "spogomi.teams.lock");
  }
}
