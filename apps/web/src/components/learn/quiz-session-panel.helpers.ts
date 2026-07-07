import type { QuizQuestion, QuizSessionSummary } from "@/components/learn/environmental-quiz";
import { buildQuizErrorGrid } from "@/components/learn/quiz-error-grid";
import { getQuizReviewTarget } from "@/components/learn/quiz-review-targets";
import type { QuizErrorTypeId } from "@/components/learn/quiz-error-grid";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";
import type { CognitiveQuizStateId } from "@/lib/learning/cognitive-principles";
import type { SupportedLocale } from "@/lib/learning/cognitive-principles";
import { getQuizStateLabel } from "@/lib/learning/cognitive-principles";

export const STATE_TONES: Record<CognitiveQuizStateId, "cyan" | "amber" | "violet" | "emerald"> = {
  new: "cyan",
  failed: "amber",
  due: "violet",
  mastered: "emerald",
};

export function getQuestionFormatLabel(type: QuizQuestion["type"]) {
  if (type === "flashcard") {
    return "Flashcard";
  }
  if (type === "true-false") {
    return "Vrai / Faux";
  }
  if (type === "multiple-select") {
    return "Cases à cocher";
  }
  return "Choix Multiple";
}

export function getResolvedReviewTarget(question: QuizQuestion) {
  return (
    question.reviewTarget ??
    getQuizReviewTarget(question.category, question.review, question.reasoningType)
  );
}

export function getResolvedErrorType(question: QuizQuestion) {
  return question.errorType ?? buildQuizErrorGrid(question).errorType;
}

export function getSessionAccuracy(sessionSummary: QuizSessionSummary | null | undefined) {
  if (!sessionSummary || sessionSummary.totalAnswered === 0) {
    return 0;
  }

  return Math.round((sessionSummary.score / sessionSummary.totalAnswered) * 100);
}

export { getQuizStateLabel };
export type { QuizErrorTypeId, QuizReasoningType, SupportedLocale };
