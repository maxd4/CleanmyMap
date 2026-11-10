import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { loadSpogomiRefereeQuiz, submitSpogomiRefereeQuiz } from "@/lib/spogomi/referee-qualification-service";

export const runtime = "nodejs";
// Justification Vercel: quiz definitions and evaluations are private and bound
// to the current event regulation, so a shared cache would leak stale state.
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ eventId: z.string().uuid() });
const divisionSchema = z.string().uuid();
const submitSchema = z.object({ divisionId: z.string().uuid(), quizVersion: z.string().trim().min(1).max(128), answers: z.record(z.string(), z.string().trim().min(1).max(160)).refine((answers) => Object.keys(answers).length <= 32, "Trop de réponses.") }).strict();

async function authenticate(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;
  const limited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 12, window: 60 });
  if (limited) return { response: limited } as const;
  return { access } as const;
}

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  const params = paramsSchema.safeParse(await context.params);
  const divisionId = divisionSchema.safeParse(new URL(request.url).searchParams.get("divisionId"));
  if (!params.success || !divisionId.success) return validationErrorResponse({ params: ["Édition ou division invalide."] });
  try {
    const quiz = await loadSpogomiRefereeQuiz({ supabase: getSupabaseServerClient(true), eventId: params.data.eventId, divisionId: divisionId.data });
    // Justification Vercel no-store: quiz content is private and regulation-versioned.
    return NextResponse.json({ status: "ok", quiz }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.referee-quiz.load");
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  const params = paramsSchema.safeParse(await context.params);
  const body = submitSchema.safeParse(await request.json().catch(() => null));
  if (!params.success) return validationErrorResponse({ params: ["Édition invalide."] });
  if (!body.success) return validationErrorResponse({ body: ["Réponses invalides."] });
  try {
    const evaluation = await submitSpogomiRefereeQuiz({ supabase: getSupabaseServerClient(true), eventId: params.data.eventId, divisionId: body.data.divisionId, userId: authentication.access.userId, quizVersion: body.data.quizVersion, answers: body.data.answers });
    // Justification Vercel no-store: evaluation state is private to the authenticated account.
    return NextResponse.json({ status: "ok", evaluation }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return handleApiError(error, "spogomi.referee-quiz.submit");
  }
}
