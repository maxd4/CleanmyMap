import { z } from "zod";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { incrementQuizProgressLocal } from "./quiz-progress-storage";

const TotalsSchema = z.object({
  wasteKg: z.number(),
  butts: z.number(),
});

export type BadgeTotals = z.infer<typeof TotalsSchema>;
export type BadgeIncrementType = "dechets" | "megots";

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

export type QuizProgressAward = z.infer<typeof QuizProgressAwardSchema>;
export type QuizProgressResponse = z.infer<typeof QuizProgressResponseSchema>;

export async function fetchBadgeTotals(userId: string): Promise<BadgeTotals> {
  const res = await fetch(`/api/gamification/badges/${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) throw new Error(`fetchBadgeTotals failed (${res.status})`);
  const json = (await res.json()) as unknown;

  const parsed = z.object({ totals: TotalsSchema }).safeParse(json);
  if (!parsed.success) throw new Error("fetchBadgeTotals: invalid response shape");
  return parsed.data.totals;
}

export async function incrementBadge(
  userId: string,
  type: BadgeIncrementType,
  amount: number,
): Promise<BadgeTotals> {
  const res = await fetch(
    `/api/gamification/badges/${encodeURIComponent(userId)}/increment`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, amount }),
    },
  );
  if (!res.ok) throw new Error(`incrementBadge failed (${res.status})`);
  const json = (await res.json()) as unknown;

  const parsed = z.object({ totals: TotalsSchema }).safeParse(json);
  if (!parsed.success) throw new Error("incrementBadge: invalid response shape");
  return parsed.data.totals;
}

export async function recordQuizQuestionCorrectAnswer(
  questionType: string,
  questionId?: string,
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
      questionType,
      questionId,
      correct: true,
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
