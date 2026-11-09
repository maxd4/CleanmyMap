import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedAccess } from "@/lib/authz";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { enforceServerRateLimitForAuthenticatedUser } from "@/lib/rate-limit/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadSpogomiRegistrationQuiz,
  SpogomiRegistrationQuizError,
  submitSpogomiRegistrationQuiz,
} from "@/lib/spogomi/preparation/registration-quiz-service";

export const runtime = "nodejs";
// Justification Vercel: the quiz is an authenticated, revision-sensitive
// admission proof and must remain private/no-store, never shared from a cache.
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ eventId: z.string().uuid() });
const divisionSchema = z.string().uuid();
const submitSchema = z.object({
  divisionId: z.string().uuid(),
  quizVersion: z.string().trim().min(1).max(128),
  answers: z.record(z.string(), z.string().trim().min(1).max(160)).refine((answers) => Object.keys(answers).length <= 32, "Trop de réponses."),
  experience: z.enum(["yes", "no", "prefer_not_to_say"]).optional(),
  experienceDescription: z.string().max(2000).optional(),
});

function errorResponse(error: unknown) {
  if (error instanceof SpogomiRegistrationQuizError) {
    const status = error.kind === "unavailable" ? 404 : error.kind === "stale" ? 409 : error.kind === "forbidden" ? 403 : 400;
    return NextResponse.json({ error: error.message, kind: error.kind }, { status });
  }
  return handleApiError(error, "spogomi.registration-quiz");
}

async function authenticate(request: Request) {
  const access = await requireAuthenticatedAccess();
  if (!access.ok) return { response: unauthorizedJsonResponse() } as const;
  const rateLimited = await enforceServerRateLimitForAuthenticatedUser(request, access.userId, { limit: 10, window: 60 });
  if (rateLimited) return { response: rateLimited } as const;
  return { access } as const;
}

export async function GET(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  const parsedParams = paramsSchema.safeParse(await context.params);
  const divisionId = divisionSchema.safeParse(new URL(request.url).searchParams.get("divisionId"));
  if (!parsedParams.success || !divisionId.success) return validationErrorResponse({ params: ["Édition ou division invalide."] });
  try {
    const definition = await loadSpogomiRegistrationQuiz({ supabase: getSupabaseServerClient(true), eventId: parsedParams.data.eventId, divisionId: divisionId.data });
    return NextResponse.json({ status: "ok", quiz: definition }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  const authentication = await authenticate(request);
  if ("response" in authentication) return authentication.response;
  const parsedParams = paramsSchema.safeParse(await context.params);
  const body = submitSchema.safeParse(await request.json().catch(() => null));
  if (!parsedParams.success) return validationErrorResponse({ params: ["Édition invalide."] });
  if (!body.success) return validationErrorResponse(body.error.flatten().fieldErrors);
  try {
    const evaluation = await submitSpogomiRegistrationQuiz({
      supabase: getSupabaseServerClient(true),
      eventId: parsedParams.data.eventId,
      divisionId: body.data.divisionId,
      userId: authentication.access.userId,
      quizVersion: body.data.quizVersion,
      answers: body.data.answers,
      experience: body.data.experience,
      experienceDescription: body.data.experienceDescription,
    });
    return NextResponse.json({ status: "ok", evaluation });
  } catch (error) {
    return errorResponse(error);
  }
}
