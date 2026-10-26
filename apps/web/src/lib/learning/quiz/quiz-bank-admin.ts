import type { QuizAccessTypeId } from "./quiz-access-types";
import type { QuizQuestionCategory } from "@/lib/learning/quiz/quiz-question-categories";
import type { QuizConfidenceLevel, QuizLocalScope, QuizSourceType } from "@/lib/learning/quiz/quiz-source-metadata";
import type { QuizDifficultyId, QuizPedagogicalTypeId, QuizSkillId } from "@/lib/learning/quiz/quiz-taxonomy";
import type { QuizTrapLevelId } from "./quiz-trap-levels";
import type { QuizReasoningType } from "./quiz-reasoning-types";
export { buildQuizBankAdminSnapshot } from "./quiz-bank-admin-snapshot";

export type QuizBankSourceState = "missing" | "weak" | "sourced";

export type QuizBankAdminFilters = {
  mode: QuizAccessTypeId | "all";
  pedagogicalType: QuizPedagogicalTypeId | "all";
  skill: QuizSkillId | "all";
  difficulty: QuizDifficultyId | "all";
  trapLevel: QuizTrapLevelId | "all";
  sourceType: QuizSourceType | "all";
  sourceState: QuizBankSourceState | "all";
  needsReview: "all" | "only" | "excluded";
};

export type QuizBankAdminQuestion = {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  category: QuizQuestionCategory;
  categoryLabel: string;
  accessTypeIds: QuizAccessTypeId[];
  accessTypeLabels: string[];
  pedagogicalType: QuizPedagogicalTypeId;
  pedagogicalTypeLabel: string;
  skill: QuizSkillId;
  skillLabel: string;
  difficulty: QuizDifficultyId;
  trapLevel: QuizTrapLevelId;
  reasoningType: QuizReasoningType;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?: QuizSourceType;
  confidenceLevel?: QuizConfidenceLevel;
  isLocalRule?: boolean;
  localScope?: QuizLocalScope;
  lastCheckedAt?: string;
  needsReview?: boolean;
  sourceState: QuizBankSourceState;
  hasSource: boolean;
  qualityWarningCount: number;
  qualityErrorCount: number;
  qualityFlags: string[];
  sourceFlags: string[];
  reviewTargetLabel: string;
  reviewTargetHref: string;
  reviewReasons: string[];
  suggestions: string[];
  priorityScore: number;
  priorityLabel: string;
};

export type QuizBankAdminSnapshot = {
  questions: QuizBankAdminQuestion[];
  totalQuestions: number;
  reviewCount: number;
  missingSourceCount: number;
  weakSourceCount: number;
  obviousCount: number;
  needsReviewCount: number;
  byMode: Record<QuizAccessTypeId, number>;
};

export const DEFAULT_QUIZ_BANK_ADMIN_FILTERS: QuizBankAdminFilters = {
  mode: "all",
  pedagogicalType: "all",
  skill: "all",
  difficulty: "all",
  trapLevel: "all",
  sourceType: "all",
  sourceState: "all",
  needsReview: "all",
};

function matchesStringFilter(value: string | undefined, selected: string): boolean {
  return selected === "all" || value === selected;
}

export function filterQuizBankAdminQuestions(
  questions: readonly QuizBankAdminQuestion[],
  filters: QuizBankAdminFilters,
): QuizBankAdminQuestion[] {
  return questions.filter((question) => {
    if (filters.mode !== "all" && !question.accessTypeIds.includes(filters.mode)) return false;
    if (!matchesStringFilter(question.pedagogicalType, filters.pedagogicalType)) return false;
    if (!matchesStringFilter(question.skill, filters.skill)) return false;
    if (!matchesStringFilter(question.difficulty, filters.difficulty)) return false;
    if (!matchesStringFilter(question.trapLevel, filters.trapLevel)) return false;
    if (!matchesStringFilter(question.sourceType, filters.sourceType)) return false;
    if (filters.sourceState !== "all" && question.sourceState !== filters.sourceState) return false;
    if (filters.needsReview === "only" && !question.needsReview) return false;
    if (filters.needsReview === "excluded" && question.needsReview) return false;
    return true;
  });
}
