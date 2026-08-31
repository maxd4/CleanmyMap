import type { QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";

export function getSessionAccuracy(sessionSummary: QuizSessionSummary | null | undefined) {
  if (!sessionSummary || sessionSummary.totalAnswered === 0) {
    return 0;
  }

  return Math.round((sessionSummary.score / sessionSummary.totalAnswered) * 100);
}
