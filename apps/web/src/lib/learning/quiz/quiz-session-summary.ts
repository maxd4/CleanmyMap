import {
  QUIZ_ACCESS_TYPES,
  getQuizAccessType,
  type QuizAccessTypeId,
} from "@/lib/learning/quiz/quiz-access-types";
import { buildQuizErrorGrid, type QuizErrorTypeId } from "@/lib/learning/quiz/quiz-error-grid";
import { getQuizReviewTarget } from "@/lib/learning/quiz/quiz-review-targets";
import type { QuizReasoningType } from "@/lib/learning/quiz/quiz-reasoning-types";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import type {
  QuizModeRecommendation,
  QuizSessionSummary,
  QuizThemeSummary,
} from "@/lib/learning/quiz/quiz-session-types";

export type BuildQuizSessionSummaryOptions = {
  score: number;
  selectedAccessType: QuizAccessTypeId | null;
  sessionCompleted: boolean;
  sessionResults: Readonly<Record<string, boolean>>;
  sessionQuestions: readonly QuizQuestion[];
  questions: readonly QuizQuestion[];
};

/**
 * Builds the end-of-session summary without React state or persistence side effects.
 * The input bank is explicit so the rule remains reusable by personal, demo and school sessions.
 */
export function buildQuizSessionSummary({
  score,
  selectedAccessType,
  sessionCompleted,
  sessionResults,
  sessionQuestions,
  questions,
}: BuildQuizSessionSummaryOptions): QuizSessionSummary | null {
  if (!sessionCompleted) {
    return null;
  }

  const answeredEntries = Object.entries(sessionResults);
  if (answeredEntries.length === 0) {
    return null;
  }

  const questionsById = new Map(questions.map((item) => [item.id, item] as const));
  const groupedThemes = new Map<string, QuizThemeSummary>();
  const errorTypeCounts = new Map<QuizErrorTypeId, number>();
  const reasoningTypeCounts = new Map<QuizReasoningType, number>();

  for (const [questionId, isCorrect] of answeredEntries) {
    const answeredQuestion = questionsById.get(questionId);
    if (!answeredQuestion) {
      continue;
    }

    const reviewTarget =
      answeredQuestion.reviewTarget ??
      getQuizReviewTarget(answeredQuestion.category, answeredQuestion.review, answeredQuestion.reasoningType);
    const resolvedErrorType = answeredQuestion.errorType ?? buildQuizErrorGrid(answeredQuestion).errorType;
    if (!isCorrect) {
      errorTypeCounts.set(resolvedErrorType, (errorTypeCounts.get(resolvedErrorType) ?? 0) + 1);
      reasoningTypeCounts.set(
        answeredQuestion.reasoningType,
        (reasoningTypeCounts.get(answeredQuestion.reasoningType) ?? 0) + 1,
      );
    }
    const currentTheme =
      groupedThemes.get(reviewTarget.href) ??
      ({
        label: reviewTarget.label,
        href: reviewTarget.href,
        total: 0,
        correct: 0,
        accuracy: 0,
      } satisfies QuizThemeSummary);

    currentTheme.total += 1;
    if (isCorrect) {
      currentTheme.correct += 1;
    }
    currentTheme.accuracy = currentTheme.total > 0 ? currentTheme.correct / currentTheme.total : 0;
    groupedThemes.set(reviewTarget.href, currentTheme);
  }

  const themes = Array.from(groupedThemes.values());
  const themesSucceeded = themes.filter((theme) => theme.total > 0 && theme.correct === theme.total);
  const themesToReview = themes
    .filter((theme) => theme.total > 0 && theme.correct < theme.total)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
  const nextReviewTarget = themesToReview[0]
    ? { label: themesToReview[0].label, href: themesToReview[0].href }
    : themesSucceeded[0]
      ? { label: themesSucceeded[0].label, href: themesSucceeded[0].href }
      : null;
  const errorTypeEntries = Array.from(errorTypeCounts.entries()).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fr"),
  );
  const frequentErrorTypes = errorTypeEntries
    .slice(0, 3)
    .map(([errorType, count]) => ({
      label: errorType,
      count,
    }));

  const reasoningTypeEntries = Array.from(reasoningTypeCounts.entries()).sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "fr"),
  );
  const modeScores: Array<{ accessType: (typeof QUIZ_ACCESS_TYPES)[number]; score: number }> = QUIZ_ACCESS_TYPES.filter(
    (accessType) => accessType.id !== "mixte",
  ).map((accessType) => {
    const matchedErrorCount = reasoningTypeEntries.reduce(
      (sum, [reasoningType, count]) => sum + (accessType.reasoningTypes.includes(reasoningType) ? count : 0),
      0,
    );
    return {
      accessType,
      score: matchedErrorCount,
    };
  });
  const bestMode = modeScores.sort(
    (left, right) => right.score - left.score || left.accessType.label.localeCompare(right.accessType.label, "fr"),
  )[0];
  const recommendedMode: QuizModeRecommendation =
    bestMode && bestMode.score > 0
      ? {
          id: bestMode.accessType.id,
          label: bestMode.accessType.label,
          reason: `Ce mode couvre le mieux tes erreurs récentes (${bestMode.score} correspondance${bestMode.score > 1 ? "s" : ""}).`,
        }
      : selectedAccessType
        ? {
            id: selectedAccessType,
            label: getQuizAccessType(selectedAccessType).label,
            reason: "Poursuis sur ce mode pour consolider la session sans changer de cadre.",
          }
        : {
            id: "mixte",
            label: getQuizAccessType("mixte").label,
            reason: "Le mode mixte reste le plus utile pour repartir sur un parcours équilibré.",
          };
  const recommendedLearningTarget = nextReviewTarget;

  return {
    score,
    totalQuestions: sessionQuestions.length,
    totalAnswered: answeredEntries.length,
    themesSucceeded,
    themesToReview,
    frequentErrorTypes,
    recommendedMode,
    recommendedLearningTarget,
    nextReviewTarget,
  };
}
