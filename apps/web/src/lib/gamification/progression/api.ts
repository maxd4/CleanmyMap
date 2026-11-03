import { z } from "zod";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { normalizeQuizAnswer, type QuizUserAnswer } from "@/lib/learning/quiz/quiz-answer-evaluation";
import { incrementQuizProgressLocal } from "./quiz-progress-storage";

const QuizProgressAwardSchema = z.object({
  step: z.union([z.literal(10), z.literal(50), z.literal(100)]),
  milestone: z.number().int().positive(),
  xp: z.number(),
  badgeId: z.string(),
  sourceId: z.string(),
});

const QuizProgressResponseSchema = z.object({
  questionType: z.string(),
  questionTypeLabel: z.string(),
  previousCount: z.number().int().nonnegative(),
  correctCount: z.number().int().positive(),
  awards: z.array(QuizProgressAwardSchema),
  totalXpAwarded: z.number(),
});

export type QuizProgressResponse = z.infer<typeof QuizProgressResponseSchema>;

export async function recordQuizQuestionCorrectAnswer(
  questionType: string,
  questionId: string,
  answer: QuizUserAnswer,
  userId?: string | null,
): Promise<QuizProgressResponse | null> {
  incrementQuizProgressLocal(questionType);

  if (!userId || !isFeatureEnabled("quizServerSync")) {
    return null;
  }

  const res = await fetch("/api/gamification/quiz/progress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      questionId,
      answer: normalizeQuizAnswer(answer),
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      return null;
    }

    throw new Error(`recordQuizQuestionCorrectAnswer failed (${res.status})`);
  }

  const json = (await res.json()) as unknown;
  const parsed = QuizProgressResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("recordQuizQuestionCorrectAnswer: invalid response shape");
  }

  return parsed.data;
}
