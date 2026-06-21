import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError, validationErrorResponse } from "@/lib/http/api-errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { syncQuizQuestionTypeProgress } from "@/lib/gamification/quiz-progress";
import { syncQuizQuestionTypeBalanceProgress } from "@/lib/gamification/quiz-balance-progress";

export const runtime = "nodejs";

const BodySchema = z.object({
  questionType: z.string().min(1),
  questionId: z.string().optional(),
  correct: z.boolean(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return unauthorizedJsonResponse();
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

  if (!parsed.data.correct) {
    return NextResponse.json({
      status: "ok",
      questionType: parsed.data.questionType,
      correctCount: 0,
      awards: [],
      balancedAwards: [],
      balancedCount: 0,
      previousBalancedCount: 0,
      balancedTotalXpAwarded: 0,
      totalXpAwarded: 0,
    });
  }

  try {
    const supabase = getSupabaseServerClient(true);
    const result = await syncQuizQuestionTypeProgress(supabase, {
      userId,
      questionType: parsed.data.questionType,
      questionId: parsed.data.questionId,
    });
    const balanceResult = await syncQuizQuestionTypeBalanceProgress(supabase, {
      userId,
      questionType: parsed.data.questionType,
      questionId: parsed.data.questionId,
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
