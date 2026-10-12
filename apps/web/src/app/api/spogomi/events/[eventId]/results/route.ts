import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse, forbiddenJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiEventResultReviews, resolveSpogomiReviewerRole, reviewSpogomiTeamSubmission } from "@/lib/spogomi/result-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  teamId: z.string().uuid(),
  submissionId: z.string().uuid(),
  decision: z.enum(["certified", "rejected"]),
  reason: z.string().trim().max(2000).nullable(),
}).strict();

export async function GET(_request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  try {
    const result = await loadSpogomiEventResultReviews({ supabase: getSupabaseServerClient(true), eventId: (await context.params).eventId, userId: access.userId });
    if (result === false) return forbiddenJsonResponse();
    if (!result) return NextResponse.json({ error: "Événement introuvable." }, { status: 404 });
    return NextResponse.json({ results: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.results.read");
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return unauthorizedJsonResponse();
  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse({ body: ["La décision d’arbitrage est invalide."] });
  try {
    const eventId = (await context.params).eventId;
    const supabase = getSupabaseServerClient(true);
    const actorKind = await resolveSpogomiReviewerRole({ supabase, eventId, userId: access.userId });
    if (actorKind === false) return forbiddenJsonResponse();
    const result = await reviewSpogomiTeamSubmission({ supabase, eventId, ...parsed.data, reviewerClerkId: access.userId, actorKind });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error, "spogomi.results.review");
  }
}
