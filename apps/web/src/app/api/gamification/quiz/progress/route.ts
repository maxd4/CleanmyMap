import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, parseAuthenticatedJsonRequest, validationErrorResponse } from "@/lib/http/api-errors";
import { syncQuizQuestionTypeProgress } from "@/lib/gamification/quiz-progress";
import { syncQuizQuestionTypeBalanceProgress } from "@/lib/gamification/quiz-balance-progress";
import {
  isQuizAnswerCorrect,
  normalizeQuizAnswer,
} from "@/lib/learning/quiz/quiz-answer-evaluation";
import { QUIZ_QUESTIONS } from "@/lib/learning/quiz/quiz-question-bank";
import { getQuizPedagogicalType } from "@/lib/learning/quiz/quiz-taxonomy";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BodySchema = z.object({
  questionId: z.string().trim().min(1),
  answer: z.union([
    z.string().trim().min(1),
    z.array(z.string().trim().min(1)).min(1),
  ]),
  questionType: z.string().min(1).optional(),
  correct: z.boolean().optional(),
});

function noAwardResponse(questionType: string) {
  return {
    status: "ok",
    questionType,
    correctCount: 0,
    awards: [],
    balancedAwards: [],
    balancedCount: 0,
    previousBalancedCount: 0,
    balancedTotalXpAwarded: 0,
    totalXpAwarded: 0,
  };
}

export async function POST(request: Request) {
  const authenticate = () => auth();
  const payload = await parseAuthenticatedJsonRequest(request, authenticate);
  if (!payload.ok) {
    return payload.response;
  }
  const { userId } = payload;

  const parsed = BodySchema.safeParse(payload.data);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.flatten().fieldErrors);
  }

  const question = QUIZ_QUESTIONS.find((candidate) => candidate.id === parsed.data.questionId);
  if (!question) {
    return validationErrorResponse({ questionId: ["Question inconnue."] });
  }

  const questionType = getQuizPedagogicalType(question);
  const answer = normalizeQuizAnswer(parsed.data.answer);
  if (!isQuizAnswerCorrect(question, answer)) {
    return NextResponse.json(noAwardResponse(questionType));
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const result = await syncQuizQuestionTypeProgress(supabase, {
      userId,
      questionType,
      questionId: question.id,
    });
    const balanceResult = await syncQuizQuestionTypeBalanceProgress(supabase, {
      userId,
      questionType,
      questionId: question.id,
    });

    return NextResponse.json({
      status: "ok",
      ...result,
      balancedAwards: balanceResult.awards,
      balancedCount: balanceResult.balancedCount,
      previousBalancedCount: balanceResult.previousBalancedCount,
      balancedTotalXpAwarded: balanceResult.totalXpAwarded,
      totalXpAwarded: result.totalXpAwarded + balanceResult.totalXpAwarded,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/gamification/quiz/progress");
  }
}
