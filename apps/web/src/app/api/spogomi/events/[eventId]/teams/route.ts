import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { createSpogomiTeam } from "@/lib/spogomi/preparation-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: organizer team creation mutates event composition and requires fresh authorization.
export const dynamic = "force-dynamic";

const createTeamSchema = z.object({
  divisionId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  publicName: z.string().max(60).optional(),
}).strict();

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { eventId } = await context.params;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    const parsed = await parseJsonBodyWithValidation(request, createTeamSchema);
    if (!parsed.ok) return parsed.response;
    const result = await createSpogomiTeam({ supabase, event: authorized.event, actorClerkId: access.userId, ...parsed.data });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "spogomi.teams.create");
  }
}
