import { NextResponse } from "next/server";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { getSpogomiRecognitionPartialDetails, reconcileSpogomiRecognition } from "@/lib/spogomi/recognition-service";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const eventId = (await context.params).eventId;
    const supabase = getSupabaseServerClient(true);
    const event = await loadSpogomiEventForOrganizer(supabase, eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement SPOGOMI introuvable." }, { status: 404 });
    return NextResponse.json({ status: "ok", reconciliation: await reconcileSpogomiRecognition({ supabase, eventId, actorClerkId: access.userId }) });
  } catch (error) {
    const partial = getSpogomiRecognitionPartialDetails(error);
    if (partial) return NextResponse.json({ error: "La réconciliation SPOGOMI est partielle et doit être rejouée.", reconciliation: partial }, { status: 503 });
    return handleApiError(error, "POST /api/spogomi/events/:eventId/recognition/reconcile");
  }
}
