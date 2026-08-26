import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { syncQuizPedagogicalMetrics } from "@/lib/learning/quiz-pedagogical-metrics";
import { requireBotIdHuman } from "@/lib/botid/server";
import { createServerRateLimitResponse, verifyRateLimit } from "@/lib/rate-limit/server";

export const runtime = "nodejs";

const MAX_QUIZ_SESSION_QUESTIONS = 50;
const MAX_QUIZ_STRING_LENGTH = 200;
const MAX_PLAYED_AT_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_PLAYED_AT_FUTURE_SKEW_MS = 5 * 60 * 1000;

const PlayedAtSchema = z.string().datetime({ offset: true }).superRefine((value, context) => {
  const playedAt = Date.parse(value);
  const now = Date.now();

  if (
    playedAt < now - MAX_PLAYED_AT_AGE_MS ||
    playedAt > now + MAX_PLAYED_AT_FUTURE_SKEW_MS
  ) {
    context.addIssue({
      code: "custom",
      message: "playedAt must be reasonably close to the current time",
    });
  }
});

const QuestionResultSchema = z.object({
  questionId: z.string().min(1).max(MAX_QUIZ_STRING_LENGTH),
  correct: z.boolean(),
  skill: z.enum([
    "idée reçue",
    "terrain",
    "estimation",
    "comparaison",
    "conséquences indirectes",
    "questions contre-intuitives",
    "cas-limites",
    "mini-enquetes",
  ]),
  pedagogicalType: z.string().min(1).max(MAX_QUIZ_STRING_LENGTH),
  errorType: z
    .enum([
      "idée reçue",
      "erreur de sécurité",
      "mauvaise estimation",
      "confusion entre recyclabilité et recyclage réel",
      "mauvais réflexe terrain",
      "confusion entre biodégradable et sans impact",
      "mauvaise compréhension d'une filière de tri",
      "raisonnement trop simpliste",
      "manque de nuance",
      "impact indirect ignoré",
    ])
    .optional(),
  category: z.string().min(1).max(MAX_QUIZ_STRING_LENGTH),
  difficulty: z.string().max(MAX_QUIZ_STRING_LENGTH).optional(),
  trapLevel: z.string().max(MAX_QUIZ_STRING_LENGTH).optional(),
});

const BodySchema = z.object({
  mode: z.enum([
    "mixte",
    "terrain",
    "donnees-scientifiques",
    "sensibilisation",
    "habitudes-de-vie",
    "ordres-de-grandeur",
    "tri-securite",
  ]),
  playedAt: PlayedAtSchema,
  totalQuestions: z.number().int().positive().max(MAX_QUIZ_SESSION_QUESTIONS),
  score: z.number().int().nonnegative(),
  questions: z.array(QuestionResultSchema).min(1).max(MAX_QUIZ_SESSION_QUESTIONS),
}).superRefine((body, context) => {
  if (body.score > body.totalQuestions) {
    context.addIssue({
      code: "custom",
      path: ["score"],
      message: "score cannot exceed totalQuestions",
    });
  }

  if (body.questions.length !== body.totalQuestions) {
    context.addIssue({
      code: "custom",
      path: ["questions"],
      message: "questions length must match totalQuestions",
    });
  }

  const questionIds = body.questions.map((question) => question.questionId);
  if (new Set(questionIds).size !== questionIds.length) {
    context.addIssue({
      code: "custom",
      path: ["questions"],
      message: "questions must contain unique questionId values",
    });
  }
});

export async function POST(request: Request) {
  const botIdResponse = await requireBotIdHuman();
  if (botIdResponse) return botIdResponse;

  const rateLimit = await verifyRateLimit(request, { limit: 10, window: 60 });
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  try {
    const supabase = getSupabaseServerClient(true);
    await syncQuizPedagogicalMetrics(supabase, parsed.data);

    return NextResponse.json({
      status: "ok",
      totalQuestions: parsed.data.totalQuestions,
      score: parsed.data.score,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/gamification/quiz/pedagogical-metrics");
  }
}
