import type { QuizAccessTypeId } from "@/components/learn/quiz-access-types";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";
import type { QuizErrorTypeId } from "@/components/learn/quiz-error-grid";

export type QuizPedagogicalMetricsClientQuestionResult = {
  questionId: string;
  correct: boolean;
  skill: QuizReasoningType;
  pedagogicalType: string;
  errorType?: QuizErrorTypeId;
  category: string;
  difficulty?: string;
  trapLevel?: string;
};

export type QuizPedagogicalMetricsClientSession = {
  mode: QuizAccessTypeId;
  playedAt: string;
  totalQuestions: number;
  score: number;
  questions: QuizPedagogicalMetricsClientQuestionResult[];
};

export async function recordQuizPedagogicalMetrics(
  session: QuizPedagogicalMetricsClientSession,
): Promise<void> {
  if (session.questions.length === 0) {
    return;
  }

  const res = await fetch("/api/gamification/quiz/pedagogical-metrics", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(session),
  });

  if (!res.ok) {
    throw new Error(`recordQuizPedagogicalMetrics failed (${res.status})`);
  }
}
