import type { QuizAccessTypeId } from "./quiz-access-types";
import type { QuizErrorSeverityId, QuizErrorTypeId } from "./quiz-error-grid.ts";
import type { QuizQuestionCategory } from "./quiz-question-categories.ts";
import type { QuizReviewTarget } from "./quiz-review-targets.ts";
import type { QuizReasoningType } from "./quiz-reasoning-types.ts";
import type { QuizQuestionFormatId } from "./quiz-question-formats.ts";
import type { QuizTrapLevelId } from "./quiz-trap-levels.ts";
import type { QuizConfidenceLevel, QuizLocalScope, QuizSourceType } from "./quiz-source-types.ts";
import type { ImpactReferenceMetadata } from "./impact-reference-types.ts";
import type { QuizQuestionLocalizedFields } from "./quiz-i18n";
import type { QuizDifficultyId, QuizPedagogicalTypeId, QuizSkillId } from "./quiz-taxonomy.ts";

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
