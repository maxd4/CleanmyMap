import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer, moveParticipantToTeam } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
// Justification Vercel: team composition is mutable event state and requires fresh authorization.
export const dynamic = "force-dynamic";

const moveSchema = z.object({ participantId: z.string().uuid(), teamId: z.string().uuid().nullable() });

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = moveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["Correction d'équipe invalide."] });
  try {
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, (await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    return NextResponse.json(await moveParticipantToTeam({ supabase, event, ...parsed.data }));
  } catch (error) {
    return handleApiError(error, "spogomi.teams.move");
  }
}
