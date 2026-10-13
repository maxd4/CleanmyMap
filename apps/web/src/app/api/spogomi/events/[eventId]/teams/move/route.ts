import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { SpogomiCompositionProtectionError, moveParticipantToTeam } from "@/lib/spogomi/preparation-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: team composition is mutable event state and requires fresh authorization.
export const dynamic = "force-dynamic";

const moveSchema = z.object({ participantId: z.string().uuid(), teamId: z.string().uuid().nullable(), expectedRevision: z.number().int().nonnegative().optional() });

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const parsed = moveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["Correction d'équipe invalide."] });
  try {
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent((await context.params).eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    return NextResponse.json(await moveParticipantToTeam({ supabase, event: authorized.event, actorClerkId: access.userId, ...parsed.data }));
  } catch (error) {
    if (error instanceof SpogomiCompositionProtectionError) {
      return NextResponse.json({ error: error.message, kind: "validation", status: "error" }, { status: 409 });
    }
    return handleApiError(error, "spogomi.teams.move");
  }
}
