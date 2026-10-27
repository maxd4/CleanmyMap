import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { renameSpogomiTeam } from "@/lib/spogomi/team-name-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: team pseudonym changes are authenticated mutable state and must be resolved dynamically.
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
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    const parsed = await parseJsonBodyWithValidation(request, renameSchema);
    if (!parsed.ok) return parsed.response;
    const team = await renameSpogomiTeam({
      supabase,
      eventId: authorized.event.id,
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
