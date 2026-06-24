import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { syncQuizPedagogicalMetrics } from "@/lib/learning/quiz-pedagogical-metrics";

export const runtime = "nodejs";

const QuestionResultSchema = z.object({
  questionId: z.string().min(1),
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
  pedagogicalType: z.string().min(1),
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
  category: z.string().min(1),
  difficulty: z.string().optional(),
  trapLevel: z.string().optional(),
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
  playedAt: z.string().min(1),
  totalQuestions: z.number().int().positive(),
  score: z.number().int().nonnegative(),
  questions: z.array(QuestionResultSchema).min(1),
});

export async function POST(request: Request) {
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
