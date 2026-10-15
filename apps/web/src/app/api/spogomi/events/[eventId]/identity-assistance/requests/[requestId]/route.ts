import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  SpogomiIdentityAssistanceError,
  transitionSpogomiIdentityAssistanceRequest,
} from "@/lib/spogomi/identity-assistance";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  status: z.enum(["treated", "rejected"]),
  matchedParticipantId: z.string().uuid().optional(),
  verificationNote: z.string().trim().min(10).max(1200).optional(),
  resolutionNote: z.string().trim().max(1200).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ eventId: string; requestId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 20, window: 60 });
  if (rateLimited) return rateLimited;
  let body: unknown;
  try { body = await request.json(); } catch { return validationErrorResponse({ body: ["Décision invalide."] }); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error.flatten().fieldErrors);
  try {
    const { eventId, requestId } = await context.params;
    const event = await loadSpogomiEventForOrganizer(getSupabaseServerClient(true), eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    if (parsed.data.status === "treated" && (!parsed.data.matchedParticipantId || !parsed.data.verificationNote)) {
      return validationErrorResponse({ verificationNote: ["Une vérification indépendante et une ligne de roster sont requises."] });
    }
    const updated = await transitionSpogomiIdentityAssistanceRequest({
      supabase: getSupabaseServerClient(true),
      requestId,
      eventId,
      targetStatus: parsed.data.status,
      actorKind: "organizer",
      actorClerkId: access.userId,
      matchedParticipantId: parsed.data.matchedParticipantId,
      verificationNote: parsed.data.verificationNote,
      resolutionNote: parsed.data.resolutionNote,
    });
    return NextResponse.json({ status: "ok", request: updated, nextStep: updated.status === "treated" ? "issue_code_manually" : null });
  } catch (error) {
    if (error instanceof SpogomiIdentityAssistanceError && (error.kind === "unavailable" || error.kind === "conflict")) {
      return NextResponse.json({ error: error.message }, { status: error.kind === "conflict" ? 409 : 404 });
    }
    return handleApiError(error, "spogomi.identity-assistance.decide");
  }
}
