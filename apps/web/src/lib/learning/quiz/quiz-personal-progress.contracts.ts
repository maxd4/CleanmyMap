import type { QuizQuestionCategory } from "@/lib/learning/quiz/quiz-question-categories";
import type { QuizReviewTarget } from "./quiz-review-targets";
import type { QuizReasoningType } from "./quiz-reasoning-types";
import type { QuizAccessTypeId } from "./quiz-access-types";

export type QuizPersonalModeProgress = {
  sessions: number;
  correctAnswers: number;
  totalQuestions: number;
  lastPlayedAt: string;
};

export type QuizPersonalSkillProgress = {
  attempts: number;
  correctAnswers: number;
  lastPlayedAt: string;
};

export type QuizPersonalErrorProgress = {
  count: number;
  lastSeenAt: string;
};

export type QuizPersonalReviewTargetProgress = {
  label: string;
  href: string;
  attempts: number;
  correctAnswers: number;
  lastSeenAt: string;
};

export type QuizPersonalProgressState = {
  version: 1;
  modes: Partial<Record<QuizAccessTypeId, QuizPersonalModeProgress>>;
  skills: Partial<Record<QuizReasoningType, QuizPersonalSkillProgress>>;
  errorTypes: Record<string, QuizPersonalErrorProgress>;
  reviewTargets: Record<string, QuizPersonalReviewTargetProgress>;
  recentSessions: Array<{
    mode: QuizAccessTypeId;
    score: number;
    totalQuestions: number;
    accuracy: number;
    playedAt: string;
  }>;
};

export type QuizPersonalProgressQuestion = {
  id: string;
  category: QuizQuestionCategory;
  reasoningType: QuizReasoningType;
  review?: QuizReviewTarget;
  reviewTarget?: QuizReviewTarget;
};

export type QuizPersonalProgressSession = {
  mode: QuizAccessTypeId;
  score: number;
  totalQuestions: number;
  questions: readonly QuizPersonalProgressQuestion[];
  results: Record<string, boolean>;
  errorCounts: Record<string, number>;
  playedAt?: string;
};

export type QuizPersonalProgressModeStat = {
  id: QuizAccessTypeId;
  label: string;
  sessions: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  lastPlayedAt: string | null;
};

export type QuizPersonalProgressSkillStat = {
  label: QuizReasoningType;
  attempts: number;
  correctAnswers: number;
  accuracy: number;
  lastPlayedAt: string | null;
};

export type QuizPersonalProgressErrorStat = {
  label: string;
  count: number;
  lastSeenAt: string | null;
};

export type QuizPersonalProgressTargetStat = {
  label: string;
  href: string;
  attempts: number;
  correctAnswers: number;
  accuracy: number;
  lastSeenAt: string | null;
};

export type QuizPersonalProgressRecommendation = {
  id: QuizAccessTypeId;
  label: string;
  reason: string;
};

export type QuizProgressTone = "emerald" | "sky" | "amber" | "violet";

export type QuizPersonalProgressSignal = {
  id: "score" | "regularity" | "improvement";
  label: string;
  value: string;
  detail: string;
  tone: QuizProgressTone;
};

export type QuizPersonalModeLevelStat = QuizPersonalProgressModeStat & {
  level: number;
  levelLabel: string;
  detail: string;
  nextLabel: string | null;
  nextSessions: number | null;
};

export type QuizPersonalBadgeStat = {
  id: string;
  label: string;
  description: string;
  href: string;
  attempts: number;
  targetAttempts: number;
  accuracy: number;
  thresholdAccuracy: number;
  unlocked: boolean;
  tone: QuizProgressTone;
  detail: string;
};

export type QuizPersonalProgressSnapshot = {
  modeStats: QuizPersonalProgressModeStat[];
  modeLevels: QuizPersonalModeLevelStat[];
  masteredSkills: QuizPersonalProgressSkillStat[];
  skillsToReview: QuizPersonalProgressSkillStat[];
  errorStats: QuizPersonalProgressErrorStat[];
  reviewTargets: QuizPersonalProgressTargetStat[];
  progressSignals: QuizPersonalProgressSignal[];
  badges: QuizPersonalBadgeStat[];
  recommendedMode: QuizPersonalProgressRecommendation | null;
};
