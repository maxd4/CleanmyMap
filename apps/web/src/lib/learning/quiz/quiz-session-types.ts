import type { QuizAccessTypeId } from "./quiz-access-types";
import type { QuizReviewTarget } from "./quiz-review-targets";

export type QuizThemeSummary = {
  label: string;
  href: string;
  total: number;
  correct: number;
  accuracy: number;
};

export type QuizErrorTypeSummary = {
  label: string;
  count: number;
};

export type QuizModeRecommendation = {
  id: QuizAccessTypeId;
  label: string;
  reason: string;
};

export type QuizSessionSummary = {
  score: number;
  totalQuestions: number;
  totalAnswered: number;
  themesSucceeded: QuizThemeSummary[];
  themesToReview: QuizThemeSummary[];
  frequentErrorTypes: QuizErrorTypeSummary[];
  recommendedMode: QuizModeRecommendation | null;
  recommendedLearningTarget: QuizReviewTarget | null;
  nextReviewTarget: QuizReviewTarget | null;
};
