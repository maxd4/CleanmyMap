import type { SupabaseClient } from "@supabase/supabase-js";
import { listQuizQuestionFormatIds } from "@/lib/learning/quiz/quiz-question-formats";
import { QUIZ_BALANCE_MILESTONES, QUIZ_PROGRESS_MILESTONES } from "./quiz-milestones";

export type QuizLearningProgressRow = {
  question_type: string;
  correct_count: number;
};

type LearningProgressionTier = {
  id: string;
  label: string;
  description: string;
  icon: string;
  threshold: number;
};

export type LearningProgressionSummary = {
  id: "learning";
  name: "Apprentissage";
  description: string;
  status: "active";
  tiers: LearningProgressionTier[];
  currentValue: number;
  currentBadge: { id: string; label: string } | null;
  nextBadge: { id: string; label: string } | null;
  progressPercent: number;
  totalCorrectAnswers: number;
  masteredQuestionTypes: number;
  totalQuestionTypes: number;
  balancedCorrectAnswers: number;
  correctAnswersByType: Record<string, number>;
};

/**
 * The existing quiz thresholds remain the source of truth for the single
 * learning scale. No new calibration threshold is introduced here.
 */
export const LEARNING_PROGRESS_THRESHOLDS = [...new Set([
  ...QUIZ_PROGRESS_MILESTONES.map((milestone) => milestone.threshold),
  ...QUIZ_BALANCE_MILESTONES.map((milestone) => milestone.threshold),
])].sort((left, right) => left - right);

function badgeForThreshold(threshold: number): { id: string; label: string } {
  return {
    id: `learning-${threshold}`,
    label: `${threshold} réponses justes`,
  };
}

function buildLearningTiers(): LearningProgressionTier[] {
  return LEARNING_PROGRESS_THRESHOLDS.map((threshold) => ({
    ...badgeForThreshold(threshold),
    description: `Palier Apprentissage à ${threshold} réponses justes cumulées, avec la diversité et l'équilibre suivis comme sous-signaux.`,
    icon: threshold >= 100 ? "🏅" : threshold >= 50 ? "✨" : "🧠",
    threshold,
  }));
}

function safeCount(value: number): number {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

function computeBalance(rows: readonly QuizLearningProgressRow[], questionTypes: readonly string[]) {
  const counts = new Map(rows.map((row) => [row.question_type, safeCount(row.correct_count)]));
  return questionTypes.length > 0
    ? Math.min(...questionTypes.map((questionType) => counts.get(questionType) ?? 0))
    : 0;
}

export function buildQuizLearningProgressionSummary(
  rows: readonly QuizLearningProgressRow[],
  questionTypes: readonly string[] = listQuizQuestionFormatIds(),
): LearningProgressionSummary {
  const correctAnswersByType = Object.fromEntries(
    rows.map((row) => [row.question_type, safeCount(row.correct_count)]),
  );
  const totalCorrectAnswers = Object.values(correctAnswersByType).reduce(
    (total, count) => total + count,
    0,
  );
  const masteredQuestionTypes = Object.values(correctAnswersByType).filter((count) => count > 0).length;
  const currentThresholdIndex = LEARNING_PROGRESS_THRESHOLDS.reduce(
    (index, threshold, candidateIndex) =>
      totalCorrectAnswers >= threshold ? candidateIndex : index,
    -1,
  );
  const currentThreshold = currentThresholdIndex >= 0
    ? LEARNING_PROGRESS_THRESHOLDS[currentThresholdIndex]!
    : 0;
  const nextThreshold = LEARNING_PROGRESS_THRESHOLDS.find((threshold) => threshold > totalCorrectAnswers)
    ?? currentThreshold + 5;
  const currentBadge = currentThresholdIndex >= 0 ? badgeForThreshold(currentThreshold) : null;
  const nextBadge = badgeForThreshold(nextThreshold);
  const progressSpan = Math.max(1, nextThreshold - currentThreshold);

  return {
    id: "learning",
    name: "Apprentissage",
    description: "Une progression globale nourrie par les réponses justes, la diversité des types et leur équilibre.",
    status: "active",
    tiers: buildLearningTiers(),
    currentValue: totalCorrectAnswers,
    currentBadge,
    nextBadge,
    progressPercent: Math.round(
      (Math.max(0, Math.min(totalCorrectAnswers - currentThreshold, progressSpan)) / progressSpan) * 100,
    ),
    totalCorrectAnswers,
    masteredQuestionTypes,
    totalQuestionTypes: questionTypes.length,
    balancedCorrectAnswers: computeBalance(rows, questionTypes),
    correctAnswersByType,
  };
}

type QuizLearningProgressClient = {
  from(table: "quiz_type_progress"): {
    select(columns: string): {
      eq(column: "user_id", value: string): {
        limit(value: number): Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

export async function loadQuizLearningProgression(
  supabase: SupabaseClient,
  userId: string,
): Promise<LearningProgressionSummary> {
  const client = supabase as unknown as QuizLearningProgressClient;
  const result = await client
    .from("quiz_type_progress")
    .select("question_type, correct_count")
    .eq("user_id", userId)
    .limit(100);

  if (result.error) {
    throw result.error;
  }

  const rows = Array.isArray(result.data) ? result.data as QuizLearningProgressRow[] : [];
  return buildQuizLearningProgressionSummary(rows);
}
