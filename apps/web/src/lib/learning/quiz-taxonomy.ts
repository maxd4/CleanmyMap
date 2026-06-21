import type { QuizAccessTypeId } from "@/components/learn/quiz-access-types";
import { QUIZ_QUESTION_FORMATS, type QuizQuestionFormatId } from "../../components/learn/quiz-question-formats.ts";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";
import type { QuizReviewTarget } from "@/components/learn/quiz-review-targets";
import type { QuizTrapLevelId } from "@/components/learn/quiz-trap-levels";

export type QuizModeId = QuizAccessTypeId;

export type QuizPedagogicalTypeId =
  | QuizQuestionFormatId
  | "multiple-choice"
  | "true-false"
  | "flashcard";

export type QuizSkillId = QuizReasoningType;

export type QuizDifficultyId = "low" | "medium" | "high";

export type QuizQuestionTaxonomy = {
  pedagogicalType?: QuizPedagogicalTypeId;
  skill?: QuizSkillId;
  difficulty?: QuizDifficultyId;
  trapLevel?: QuizTrapLevelId;
  review?: QuizReviewTarget;
};

export type QuizQuestionTaxonomySource = {
  type: "multiple-choice" | "multiple-select" | "true-false" | "flashcard";
  format?: QuizPedagogicalTypeId;
  pedagogicalType?: QuizPedagogicalTypeId;
  reasoningType: QuizReasoningType;
  skill?: QuizSkillId;
  difficulty?: QuizDifficultyId;
};

export const QUIZ_PEDAGOGICAL_TYPE_PRIORITY: readonly QuizPedagogicalTypeId[] = [
  "vrai-faux-piegeux",
  "true-false",
  "situations-terrain",
  "questions-contre-intuitives",
  "estimations",
  "comparaisons",
  "cases-a-cocher",
  "mini-enquetes",
  "cas-limites",
  "mythes-et-realites",
  "consequences-indirectes",
  "multiple-choice",
  "flashcard",
];

export const QUIZ_DIFFICULTY_PRIORITY: readonly QuizDifficultyId[] = ["low", "medium", "high"];

const QUIZ_SPECIAL_PEDAGOGICAL_LABELS: Record<"multiple-choice" | "true-false" | "flashcard", string> = {
  "multiple-choice": "QCM",
  "true-false": "Vrai / Faux",
  flashcard: "Carte flash",
};

const QUIZ_FORMAT_LABELS: Record<QuizQuestionFormatId, string> = Object.fromEntries(
  QUIZ_QUESTION_FORMATS.map((format) => [format.id, format.label]),
) as Record<QuizQuestionFormatId, string>;

const DIFFICULTY_BY_PEDAGOGICAL_TYPE: Record<QuizPedagogicalTypeId, QuizDifficultyId> = {
  "vrai-faux-piegeux": "low",
  "true-false": "low",
  "situations-terrain": "medium",
  comparaisons: "medium",
  "cases-a-cocher": "medium",
  estimations: "medium",
  "consequences-indirectes": "high",
  "questions-contre-intuitives": "medium",
  "mini-enquetes": "high",
  "cas-limites": "high",
  "mythes-et-realites": "low",
  "multiple-choice": "medium",
  flashcard: "low",
};

export function getQuizPedagogicalType(question: QuizQuestionTaxonomySource): QuizPedagogicalTypeId {
  if (question.pedagogicalType) {
    return question.pedagogicalType;
  }

  if (question.format) {
    return question.format;
  }

  return question.type === "multiple-select" ? "cases-a-cocher" : question.type;
}

export function getQuizSkill(question: QuizQuestionTaxonomySource): QuizSkillId {
  return question.skill ?? question.reasoningType;
}

export function getQuizDifficulty(question: QuizQuestionTaxonomySource): QuizDifficultyId {
  if (question.difficulty) {
    return question.difficulty;
  }

  const pedagogicalType = getQuizPedagogicalType(question);
  return DIFFICULTY_BY_PEDAGOGICAL_TYPE[pedagogicalType] ?? "medium";
}

export function getQuizPedagogicalTypeIndex(pedagogicalType: QuizPedagogicalTypeId): number {
  const index = QUIZ_PEDAGOGICAL_TYPE_PRIORITY.indexOf(pedagogicalType);
  return index === -1 ? QUIZ_PEDAGOGICAL_TYPE_PRIORITY.length : index;
}

export function getQuizDifficultyIndex(difficulty: QuizDifficultyId): number {
  const index = QUIZ_DIFFICULTY_PRIORITY.indexOf(difficulty);
  return index === -1 ? QUIZ_DIFFICULTY_PRIORITY.length : index;
}

export function getQuizPedagogicalTypeLabel(pedagogicalType: QuizPedagogicalTypeId | string): string {
  return (
    QUIZ_SPECIAL_PEDAGOGICAL_LABELS[pedagogicalType as "multiple-choice" | "true-false" | "flashcard"] ??
    QUIZ_FORMAT_LABELS[pedagogicalType as QuizQuestionFormatId] ??
    pedagogicalType
  );
}
