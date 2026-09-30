"use client";

import { useQuizSessionController } from "@/components/learn/quiz/session/use-quiz-session-controller";
import { insertAdaptiveReinforcement } from "@/components/learn/quiz/quiz-adaptive";
import { recordQuizQuestionCorrectAnswer } from "@/lib/gamification/api";
import { getQuizReviewTarget } from "@/lib/learning/quiz/quiz-review-targets";
import { buildQuizErrorGrid } from "@/lib/learning/quiz/quiz-error-grid";
import type { QuizAccessTypeId } from "@/lib/learning/quiz/quiz-access-types";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";

export function useEnvironmentalQuizSession({
  initialQuestions,
  isDemoMode,
  selectedAccessType,
  userId,
  initialSessionQuestions,
  setSessionQuestions,
  onSRSUpdate,
}: {
  initialQuestions: QuizQuestion[];
  isDemoMode: boolean;
  selectedAccessType: QuizAccessTypeId | null;
  userId: string | null;
  initialSessionQuestions: QuizQuestion[];
  setSessionQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
  onSRSUpdate: Parameters<typeof useQuizSessionController>[0]["onSRSUpdate"];
}) {
  const sessionQuestions = initialSessionQuestions.length > 0 ? initialSessionQuestions : initialQuestions;
  return useQuizSessionController({
    sessionQuestions,
    getErrorType: (item) => item.errorType ?? buildQuizErrorGrid(item).errorType,
    onResetSessionQuestions: () => setSessionQuestions([]),
    onCorrectAnswer: (question, answer) => {
      if (!isDemoMode && selectedAccessType !== "ecole") {
        void recordQuizQuestionCorrectAnswer(question.pedagogicalType ?? question.format ?? question.type, question.id, answer, userId).catch(() => undefined);
      }
    },
    onIncorrectAnswer: ({ question, questionIndex, errorCount }) => {
      setSessionQuestions((current) => insertAdaptiveReinforcement(current.length > 0 ? current : initialQuestions, questionIndex, question, errorCount, (item) => item.reviewTarget?.href ?? getQuizReviewTarget(item.category, item.review, item.reasoningType).href));
    },
    onSRSUpdate,
  });
}
