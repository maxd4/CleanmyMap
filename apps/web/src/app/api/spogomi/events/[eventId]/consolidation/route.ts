import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { forbiddenJsonResponse, unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { loadSpogomiEventForOrganizer } from "@/lib/spogomi/preparation-service";
import { buildSpogomiConsolidationPreview, publishSpogomiConsolidation } from "@/lib/spogomi/consolidation-service";

export const runtime = "nodejs";
// Justification Vercel: this authenticated preview/publication route reads fresh
// SPOGOMI sources and must not cache a mutable consolidation or its conflicts.
export const dynamic = "force-dynamic";

const publishSchema = z.object({
  action: z.enum(["preview", "publish"]),
  sourceHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
}).strict();

async function authorizedEvent(eventId: string, userId: string) {
  return loadSpogomiEventForOrganizer(getSupabaseServerClient(true), eventId, userId);
}

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 30, window: 60 });
  if (rateLimited) return rateLimited;
  try {
    const event = await authorizedEvent((await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    // Justification Vercel: consolidation previews and conflicts are mutable and must be read fresh.
    return NextResponse.json(await buildSpogomiConsolidationPreview({ supabase: getSupabaseServerClient(true), eventId: event.id }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.consolidation.preview");
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 10, window: 60 });
  if (rateLimited) return rateLimited;
  const parsed = publishSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationErrorResponse({ body: ["La confirmation du bilan SPOGOMI est invalide."] });
  try {
    const event = await authorizedEvent((await context.params).eventId, access.userId);
    if (event === false) return forbiddenJsonResponse();
    if (!event) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    const supabase = getSupabaseServerClient(true);
    if (parsed.data.action === "preview") {
      return NextResponse.json(await buildSpogomiConsolidationPreview({ supabase, eventId: event.id }), { headers: { "Cache-Control": "no-store" } });
    }
    if (!parsed.data.sourceHash) return validationErrorResponse({ sourceHash: ["L’aperçu courant est requis avant publication."] });
    const result = await publishSpogomiConsolidation({ supabase, eventId: event.id, publishedByClerkId: access.userId, expectedSourceHash: parsed.data.sourceHash });
    return NextResponse.json({ status: "published", consolidation: result });
  } catch (error) {
    return handleApiError(error, "spogomi.consolidation.publish");
  }
}
