import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { loadAuthorizedSpogomiEvent } from "@/lib/spogomi/route-auth";
import { getSpogomiRecognitionPartialDetails, reconcileSpogomiRecognition } from "@/lib/spogomi/recognition-service";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const eventId = (await context.params).eventId;
    const { supabase, authorized } = await loadAuthorizedSpogomiEvent(eventId, access.userId, "Événement SPOGOMI introuvable.");
    if ("response" in authorized) return authorized.response;
    return NextResponse.json({ status: "ok", reconciliation: await reconcileSpogomiRecognition({ supabase, eventId, actorClerkId: access.userId }) });
  } catch (error) {
    const partial = getSpogomiRecognitionPartialDetails(error);
    if (partial) return NextResponse.json({ error: "La réconciliation SPOGOMI est partielle et doit être rejouée.", reconciliation: partial }, { status: 503 });
    return handleApiError(error, "POST /api/spogomi/events/:eventId/recognition/reconcile");
  }
}
