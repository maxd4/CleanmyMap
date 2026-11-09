import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SpogomiParticipantLifecycleError, withdrawSpogomiParticipant } from "@/lib/spogomi/participant-lifecycle";

export const runtime = "nodejs";
// Justification Vercel: le désistement est authentifié, borné au compte lié et
// persiste une transition SPOGOMI privée sans cache inter-utilisateur.
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ eventId: z.string().uuid(), participantId: z.string().uuid() });
const bodySchema = z.object({ reason: z.string().trim().max(1200).optional() }).default({});

export async function POST(request: Request, context: { params: Promise<{ eventId: string; participantId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const limited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 4, window: 60 });
  if (limited) return limited;
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return validationErrorResponse({ params: ["Participant ou événement invalide."] });
  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return validationErrorResponse(body.error.flatten().fieldErrors);
  try {
    const result = await withdrawSpogomiParticipant({
      supabase: getSupabaseServerClient(true),
      eventId: params.data.eventId,
      participantId: params.data.participantId,
      clerkId: access.userId,
      reason: body.data.reason,
    });
    return NextResponse.json({ status: "ok", participant: result });
  } catch (error) {
    if (error instanceof SpogomiParticipantLifecycleError) {
      const status = error.kind === "not_found" ? 404 : error.kind === "forbidden" ? 403 : error.kind === "conflict" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    return handleApiError(error, "spogomi.participant.withdraw");
  }
}
