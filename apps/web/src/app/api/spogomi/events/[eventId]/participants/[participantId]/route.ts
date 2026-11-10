import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, parseJsonBodyWithValidation } from "@/lib/http/api-errors";
import { updateSpogomiParticipantPrivateLabel } from "@/lib/spogomi/preparation-service";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";

export const runtime = "nodejs";
// Justification Vercel: organizer place-label edits mutate private roster state and require fresh authorization.
export const dynamic = "force-dynamic";

const updatePlaceSchema = z.object({
  divisionId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  expectedPrivateLabel: z.string().max(160).nullable(),
  privateLabel: z.string().trim().min(1).max(160),
}).strict();

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string; participantId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const { eventId, participantId } = await context.params;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId);
    if ("response" in authorized) return authorized.response;
    const parsed = await parseJsonBodyWithValidation(request, updatePlaceSchema);
    if (!parsed.ok) return parsed.response;
    const result = await updateSpogomiParticipantPrivateLabel({ supabase, event: authorized.event, participantId, actorClerkId: access.userId, ...parsed.data });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "spogomi.participants.private-label");
  }
}
