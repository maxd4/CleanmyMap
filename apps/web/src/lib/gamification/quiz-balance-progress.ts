import type { SupabaseClient } from "@supabase/supabase-js";
import { listQuizQuestionFormatIds } from "@/components/learn/quiz-question-formats";
import { awardPointsOnce } from "./points/system";
import { insertProgressionEvent } from "./progression-data";
import { refreshProgressionProfile } from "./progression-tracking";
import { broadcastGamificationAnnouncement } from "./announcements";
import { getQuizPedagogicalTypeLabel } from "@/lib/learning/quiz-taxonomy";

export const QUIZ_BALANCE_MILESTONES = [
  { threshold: 10, xp: 1, badgeId: "quiz-balance-10" },
  { threshold: 50, xp: 1, badgeId: "quiz-balance-50" },
  { threshold: 100, xp: 2, badgeId: "quiz-balance-100" },
] as const;

export type QuizBalanceMilestoneThreshold = (typeof QUIZ_BALANCE_MILESTONES)[number]["threshold"];

export type QuizBalanceProgressRow = {
  user_id: string;
  question_type: string;
  correct_count: number;
  updated_at?: string;
};

export type QuizBalanceAward = {
  step: QuizBalanceMilestoneThreshold;
  threshold: QuizBalanceMilestoneThreshold;
  milestone: number;
  xp: number;
  badgeId: string;
  sourceId: string;
};

export type SyncQuizQuestionTypeBalanceProgressParams = {
  userId: string;
  questionType: string;
  questionId?: string;
};

export type QuizBalanceSyncResult = {
  previousBalancedCount: number;
  balancedCount: number;
  awards: QuizBalanceAward[];
  totalXpAwarded: number;
};

function computeBalancedCounts(rows: QuizBalanceProgressRow[], questionTypes: readonly string[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.question_type, Math.max(0, Math.trunc(row.correct_count)));
  }

  const values = questionTypes.map((questionType) => counts.get(questionType) ?? 0);
  return {
    counts,
    minimum: values.length > 0 ? Math.min(...values) : 0,
  };
}

export function computeQuizBalanceAwards(params: {
  previousBalancedCount: number;
  nextBalancedCount: number;
}): QuizBalanceAward[] {
  const awards: QuizBalanceAward[] = [];

  for (const milestone of QUIZ_BALANCE_MILESTONES) {
    if (params.previousBalancedCount < milestone.threshold && params.nextBalancedCount >= milestone.threshold) {
      awards.push({
        step: milestone.threshold,
        threshold: milestone.threshold,
        milestone: milestone.threshold,
        xp: milestone.xp,
        badgeId: milestone.badgeId,
        sourceId: `quiz:balanced:${milestone.threshold}`,
      });
    }
  }

  return awards.sort((left, right) => left.milestone - right.milestone || left.threshold - right.threshold);
}

export async function syncQuizQuestionTypeBalanceProgress(
  supabase: SupabaseClient,
  params: SyncQuizQuestionTypeBalanceProgressParams,
): Promise<QuizBalanceSyncResult> {
  const questionTypeLabel = getQuizPedagogicalTypeLabel(params.questionType);
  const questionTypes = listQuizQuestionFormatIds();

  const { data: rows, error } = await supabase
    .from("quiz_type_progress")
    .select("user_id, question_type, correct_count")
    .eq("user_id", params.userId);

  if (error) {
    throw error;
  }

  const afterRows = Array.isArray(rows) ? (rows as QuizBalanceProgressRow[]) : [];
  const afterState = computeBalancedCounts(afterRows, questionTypes);
  const currentQuestionTypeAfter = afterState.counts.get(params.questionType) ?? 0;
  const previousRows = afterRows.map((row) =>
    row.question_type === params.questionType
      ? { ...row, correct_count: Math.max(0, currentQuestionTypeAfter - 1) }
      : row,
  );
  const previousBalancedCount = computeBalancedCounts(previousRows, questionTypes).minimum;
  const awards = computeQuizBalanceAwards({
    previousBalancedCount,
    nextBalancedCount: afterState.minimum,
  });

  for (const award of awards) {
    await insertProgressionEvent(supabase, {
      userId: params.userId,
      eventType: "quiz_question_type_balance_milestone",
      sourceTable: "quiz_type_balance_progress",
      sourceId: award.sourceId,
      statusPhase: "validated",
      weight: 1,
      xpBase: award.xp,
      xpAwarded: award.xp,
      occurredOn: new Date().toISOString().slice(0, 10),
      metadata: {
        questionType: params.questionType,
        questionTypeLabel,
        milestone: award.milestone,
        step: award.step,
        threshold: award.threshold,
        badgeId: award.badgeId,
        balancedQuestionTypes: questionTypes,
        questionId: params.questionId ?? null,
      },
    });

    await awardPointsOnce(supabase, {
      userId: params.userId,
      xpEarned: award.xp,
      sourceEvent: "quiz_question_type_balance_milestone",
      sourceId: award.sourceId,
      reason: `Quiz équilibré - ${award.milestone} bonnes réponses sur chaque type`,
    });
  }

  if (awards.length > 0) {
    await broadcastGamificationAnnouncement(supabase, {
      type: "quiz_question_type_balance_milestone",
      source: "quiz",
      userId: params.userId,
      title: `+${awards.reduce((sum, award) => sum + award.xp, 0)} XP sur le quiz équilibré`,
      message:
        awards.length === 1
          ? `Quiz équilibré : ${awards[0]?.milestone ?? 0} bonnes réponses sur chaque type atteintes.`
          : `Quiz équilibré : ${awards.map((award) => award.milestone).join(" / ")} bonnes réponses sur chaque type atteintes.`,
      icon: "🧩",
      questionType: params.questionType,
      milestones: awards.map((award) => award.milestone),
      steps: awards.map((award) => award.step),
      xp: awards.reduce((sum, award) => sum + award.xp, 0),
      dedupeKey: `quiz_question_type_balance_milestone:${params.userId}:${params.questionType}:${afterState.minimum}`,
    });
  }

  if (awards.length > 0) {
    await refreshProgressionProfile(supabase, params.userId);
  }

  return {
    previousBalancedCount,
    balancedCount: afterState.minimum,
    awards,
    totalXpAwarded: awards.reduce((sum, award) => sum + award.xp, 0),
  };
}
