import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { renameSpogomiTeam } from "@/lib/spogomi/team-name-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const renameSchema = z.object({
  expectedPublicName: z.string().min(1),
  publicName: z.string().min(1),
});

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string; teamId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { eventId, teamId } = await context.params;
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const parsed = await parseJsonBodyWithValidation(request, renameSchema);
    if (!parsed.ok) return parsed.response;
    const team = await renameSpogomiTeam({
      supabase,
      eventId: event.id,
      teamId,
      expectedPublicName: parsed.data.expectedPublicName,
      publicName: parsed.data.publicName,
      actorClerkId: access.userId,
    });
    return NextResponse.json({ team });
  } catch (error) {
    return handleApiError(error, "spogomi.team.rename");
  }
}
