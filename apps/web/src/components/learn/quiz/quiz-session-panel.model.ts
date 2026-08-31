import type {
  CognitiveQuizStateId,
  SupportedLocale,
} from "@/lib/learning/cognitive-principles";
import { getQuizStateLabel } from "@/lib/learning/cognitive-principles";
import {
  buildQuizErrorGrid,
  getQuizErrorFollowUp,
  type QuizErrorFollowUp,
  type QuizErrorTypeId,
} from "@/lib/learning/quiz/quiz-error-grid";
import type { QuizQuestion } from "@/lib/learning/quiz/quiz-question-contract";
import type { QuizReasoningType } from "@/lib/learning/quiz/quiz-reasoning-types";
import {
  getQuizReviewFollowUp,
  getQuizReviewTarget,
  type QuizReviewFollowUp,
  type QuizReviewTarget,
} from "@/lib/learning/quiz/quiz-review-targets";
import {
  getQuizLocalizedTextListFallback,
  getQuizUiCopy,
} from "@/lib/learning/quiz/quiz-i18n";

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

export function getResolvedReviewTarget(question: QuizQuestion): QuizReviewTarget {
  return (
    question.reviewTarget ??
    getQuizReviewTarget(question.category, question.review, question.reasoningType)
  );
}

export function getResolvedErrorType(question: QuizQuestion): QuizErrorTypeId {
  return question.errorType ?? buildQuizErrorGrid(question).errorType;
}

export function getAnswerFeedbackTitle(
  question: QuizQuestion,
  lastCheckResult: boolean | null,
): string {
  return question.type === "flashcard"
    ? Array.isArray(question.answer)
      ? question.answer.join(", ")
      : question.answer
    : lastCheckResult === true
      ? question.type === "multiple-select"
        ? "Bonne combinaison"
        : "Réponse correcte"
      : lastCheckResult === false
        ? "Réponse incorrecte"
        : "Réponse attendue";
}

export function getAnswerFeedbackBody(
  question: QuizQuestion,
  lastCheckResult: boolean | null,
): string {
  return question.type === "flashcard"
    ? "La réponse attendue et la piste de révision sont affichées immédiatement."
    : lastCheckResult === true
      ? question.feedbackCorrect ?? "Bonne réponse : tu as appliqué le bon mécanisme."
      : question.type === "multiple-select"
        ? question.feedbackWrong ?? "Erreur pédagogique : le corrigé montre les cases attendues et les exclusions utiles."
        : question.feedbackWrong ?? "Erreur pédagogique : le corrigé explique pourquoi la réponse attendue est la bonne.";
}

export function getAnswerLabel(options: readonly string[]): string {
  return options.join(", ");
}

export function getCorrectAnswerLabel(answer: QuizQuestion["answer"]): string {
  return Array.isArray(answer) ? answer.join(", ") : answer;
}

export type QuizSessionPanelModelInput = {
  locale: SupportedLocale;
  question: QuizQuestion;
  questionIndex: number;
  selectedOptions: readonly string[];
  showAnswer: boolean;
  showChoices: boolean;
  isSchoolMode: boolean;
  isCollectiveMode: boolean;
  lastCheckResult: boolean | null;
  nextReasoningType: QuizReasoningType | null;
};

export type QuizSessionPanelModel = {
  nextReasoningTypeLabel: QuizReasoningType | null;
  questionFormatLabel: string;
  reviewTarget: QuizReviewTarget;
  reviewTargetFollowUp: QuizReviewFollowUp;
  resolvedErrorType: QuizErrorTypeId;
  errorTargetFollowUp: QuizErrorFollowUp;
  progressValue: number;
  answerFeedbackTitle: string;
  answerFeedbackBody: string;
  selectedOptionsLabel: string;
  correctOptionsLabel: string;
  displayOptions: readonly string[];
  sourceIsExternal: boolean;
  collectiveRevealLabel: string;
  shouldHideChoices: boolean;
};

export function buildQuizSessionPanelModel({
  locale,
  question,
  questionIndex,
  selectedOptions,
  showAnswer,
  showChoices,
  isSchoolMode,
  isCollectiveMode,
  lastCheckResult,
  nextReasoningType,
}: QuizSessionPanelModelInput): QuizSessionPanelModel {
  const reviewTarget = getResolvedReviewTarget(question);
  const resolvedErrorType = getResolvedErrorType(question);

  return {
    nextReasoningTypeLabel: nextReasoningType,
    questionFormatLabel: getQuestionFormatLabel(question.type),
    reviewTarget,
    reviewTargetFollowUp: getQuizReviewFollowUp(reviewTarget),
    resolvedErrorType,
    errorTargetFollowUp: getQuizErrorFollowUp(resolvedErrorType),
    progressValue: questionIndex + 1,
    answerFeedbackTitle: getAnswerFeedbackTitle(question, lastCheckResult),
    answerFeedbackBody: getAnswerFeedbackBody(question, lastCheckResult),
    selectedOptionsLabel: getAnswerLabel(selectedOptions),
    correctOptionsLabel: getCorrectAnswerLabel(question.answer),
    displayOptions: getQuizLocalizedTextListFallback(
      locale,
      question.localized?.options,
      question.options ?? [],
    ),
    sourceIsExternal: Boolean(question.sourceUrl?.startsWith("http")),
    collectiveRevealLabel:
      isSchoolMode && isCollectiveMode
        ? getQuizUiCopy(locale, "session.school.revealAnswer")
        : getQuizUiCopy(locale, "session.checkAnswer"),
    shouldHideChoices: isSchoolMode && isCollectiveMode && !showChoices && !showAnswer,
  };
}

export { getQuizStateLabel };
