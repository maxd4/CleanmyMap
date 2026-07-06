import type { QuizAccessTypeId } from "@/components/learn/quiz-access-types";
import { buildQuizErrorGrid, getQuizErrorFollowUp, type QuizErrorSeverityId, type QuizErrorTypeId } from "../../components/learn/quiz-error-grid.ts";
import type { QuizQuestionCategory, QuizReviewTarget } from "../../components/learn/quiz-review-targets.ts";
import type { QuizReasoningType } from "../../components/learn/quiz-reasoning-types.ts";
import type { QuizQuestionFormatId } from "../../components/learn/quiz-question-formats.ts";
import type { QuizTrapLevelId } from "../../components/learn/quiz-trap-levels.ts";
import type { QuizConfidenceLevel, QuizLocalScope, QuizSourceType } from "./quiz-source-metadata.ts";
import type { ImpactReferenceMetadata } from "./impact-reference-types.ts";
import type { QuizQuestionLocalizedFields } from "./quiz-i18n";
import { buildQuizSourceMetadata } from "./quiz-source-metadata.ts";
import { getQuizDifficulty, getQuizPedagogicalType, type QuizDifficultyId, type QuizPedagogicalTypeId, type QuizSkillId } from "./quiz-taxonomy.ts";
import { getQuizTrapLevel } from "../../components/learn/quiz-trap-levels.ts";

export type QuizQuestion = {
  id: string;
  type: "multiple-choice" | "multiple-select" | "true-false" | "flashcard";
  category: QuizQuestionCategory;
  question: string;
  answer: string | string[];
  options?: string[];
  explanation: string;
  review?: QuizReviewTarget;
  reviewTarget?: QuizReviewTarget;
  format?: QuizQuestionFormatId;
  pedagogicalType?: QuizPedagogicalTypeId;
  reasoningType: QuizReasoningType;
  skill?: QuizSkillId;
  difficulty?: QuizDifficultyId;
  trapLevel?: QuizTrapLevelId;
  errorType?: QuizErrorTypeId;
  misconception?: string;
  severity?: QuizErrorSeverityId;
  feedbackCorrect?: string;
  feedbackWrong?: string;
  takeaway?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?: QuizSourceType;
  confidenceLevel?: QuizConfidenceLevel;
  isLocalRule?: boolean;
  localScope?: QuizLocalScope;
  lastCheckedAt?: string;
  needsReview?: boolean;
  reference?: ImpactReferenceMetadata;
  localized?: QuizQuestionLocalizedFields;
};

export type QuizQuestionFollowUp = {
  label: string;
  href: string;
  modeId: QuizAccessTypeId;
  modeLabel: string;
  reason: string;
};

export type QuizQuestionContentBlock = {
  prompt: string;
  answer: string | string[];
  options?: string[];
  explanation: string;
  takeaway?: string;
  localized?: QuizQuestionLocalizedFields;
};

export type QuizQuestionTaxonomyBlock = {
  category: QuizQuestionCategory;
  type: QuizQuestion["type"];
  reasoningType: QuizReasoningType;
  format: QuizQuestionFormatId | undefined;
  pedagogicalType: QuizPedagogicalTypeId;
  skill: QuizSkillId;
  difficulty: QuizDifficultyId;
  trapLevel: QuizTrapLevelId;
};

export type QuizQuestionSourceBlock = {
  sourceUrl: string;
  sourceLabel: string;
  sourceType: QuizSourceType;
  confidenceLevel: QuizConfidenceLevel;
  isLocalRule: boolean;
  localScope: QuizLocalScope;
  lastCheckedAt: string;
  needsReview: boolean;
};

export type QuizQuestionReviewBlock = {
  target: QuizReviewTarget;
  errorType: QuizErrorTypeId;
  misconception: string;
  severity: QuizErrorSeverityId;
  feedbackCorrect: string;
  feedbackWrong: string;
  followUp: QuizQuestionFollowUp;
};

export type QuizQuestionStructure = {
  content: QuizQuestionContentBlock;
  taxonomy: QuizQuestionTaxonomyBlock;
  source: QuizQuestionSourceBlock;
  reference?: ImpactReferenceMetadata;
  review: QuizQuestionReviewBlock;
};

export type ResolvedQuizQuestion = QuizQuestion & {
  structure: QuizQuestionStructure;
};

export function stabilizeQuizQuestion(question: QuizQuestion): ResolvedQuizQuestion {
  const errorGrid = buildQuizErrorGrid(question);
  const sourceMetadata = buildQuizSourceMetadata(question);
  const reviewTarget = question.reviewTarget ?? question.review ?? errorGrid.reviewTarget;
  const followUp = getQuizErrorFollowUp(errorGrid.errorType);
  const pedagogicalType = question.pedagogicalType ?? question.format ?? getQuizPedagogicalType(question);
  const skill = question.skill ?? question.reasoningType;
  const difficulty = question.difficulty ?? getQuizDifficulty(question);

  return {
    ...question,
    structure: {
      content: {
        prompt: question.question,
        answer: question.answer,
        options: question.options,
        explanation: question.explanation,
        takeaway: question.takeaway,
        localized: question.localized,
      },
      taxonomy: {
        category: question.category,
        type: question.type,
        reasoningType: question.reasoningType,
        format: question.format,
        pedagogicalType,
        skill,
        difficulty,
        trapLevel: question.trapLevel ?? getQuizTrapLevel(question),
      },
      source: {
        sourceUrl: sourceMetadata.sourceUrl,
        sourceLabel: sourceMetadata.sourceLabel,
        sourceType: sourceMetadata.sourceType,
        confidenceLevel: sourceMetadata.confidenceLevel,
        isLocalRule: sourceMetadata.isLocalRule,
        localScope: sourceMetadata.localScope,
        lastCheckedAt: sourceMetadata.lastCheckedAt,
        needsReview: sourceMetadata.needsReview,
      },
      reference: question.reference,
      review: {
        target: reviewTarget,
        errorType: errorGrid.errorType,
        misconception: question.misconception ?? errorGrid.misconception,
        severity: question.severity ?? errorGrid.severity,
        feedbackCorrect: question.feedbackCorrect ?? errorGrid.feedbackCorrect,
        feedbackWrong: question.feedbackWrong ?? errorGrid.feedbackWrong,
        followUp,
      },
    },
  };
}
