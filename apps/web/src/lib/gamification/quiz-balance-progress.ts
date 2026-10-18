import type { SupabaseClient } from "@supabase/supabase-js";
import { listQuizQuestionFormatIds } from "@/lib/learning/quiz/quiz-question-formats";
import { insertProgressionEvent } from "./progression-data";
import { refreshProgressionProfile } from "./progression-tracking";
import { broadcastGamificationAnnouncement } from "./announcements";
import { getQuizPedagogicalTypeLabel } from "@/lib/learning/quiz/quiz-taxonomy";
import {
  computeQuizMilestoneAwards,
  QUIZ_BALANCE_MILESTONES,
  type QuizMilestoneAward,
} from "./quiz-milestones";

type QuizBalanceProgressRow = {
  user_id: string;
  question_type: string;
  correct_count: number;
  updated_at?: string;
};

export type QuizBalanceAward = QuizMilestoneAward<(typeof QUIZ_BALANCE_MILESTONES)[number]>;

export type SyncQuizQuestionTypeBalanceProgressParams = {
  userId: string;
  questionType: string;
  questionId: string;
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
  return computeQuizMilestoneAwards({
    milestones: QUIZ_BALANCE_MILESTONES,
    previousCount: params.previousBalancedCount,
    nextCount: params.nextBalancedCount,
    sourceIdPrefix: "quiz:balanced",
  });
}

export async function syncQuizQuestionTypeBalanceProgress(
  supabase: SupabaseClient,
  params: SyncQuizQuestionTypeBalanceProgressParams,
): Promise<QuizBalanceSyncResult> {
  const questionTypeLabel = getQuizPedagogicalTypeLabel(params.questionType);
  const questionTypes = listQuizQuestionFormatIds();
  const balancedQuestionTypeLimit = Math.max(1, questionTypes.length);

  const { data: rows, error } = await supabase
    .from("quiz_type_progress")
    .select("user_id, question_type, correct_count")
    .eq("user_id", params.userId)
    .in("question_type", questionTypes)
    .order("question_type", { ascending: true })
    .limit(balancedQuestionTypeLimit);

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

  const persistedAwards: QuizBalanceAward[] = [];
  for (const award of awards) {
    const inserted = await insertProgressionEvent(supabase, {
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
        questionId: params.questionId,
      },
    });

    if (inserted) {
      persistedAwards.push(award);
    }
  }

  if (persistedAwards.length > 0) {
    await broadcastGamificationAnnouncement(supabase, {
      type: "quiz_question_type_balance_milestone",
      source: "quiz",
      userId: params.userId,
      title: `+${persistedAwards.reduce((sum, award) => sum + award.xp, 0)} XP sur le quiz équilibré`,
      message:
        persistedAwards.length === 1
          ? `Quiz équilibré : ${persistedAwards[0]?.milestone ?? 0} bonnes réponses sur chaque type atteintes.`
          : `Quiz équilibré : ${persistedAwards.map((award) => award.milestone).join(" / ")} bonnes réponses sur chaque type atteintes.`,
      icon: "🧩",
      questionType: params.questionType,
      milestones: persistedAwards.map((award) => award.milestone),
      steps: persistedAwards.map((award) => award.step),
      xp: persistedAwards.reduce((sum, award) => sum + award.xp, 0),
      dedupeKey: `quiz_question_type_balance_milestone:${params.userId}:${params.questionType}:${afterState.minimum}`,
    });
  }

  if (persistedAwards.length > 0) {
    await refreshProgressionProfile(supabase, params.userId);
  }

  return {
    previousBalancedCount,
    balancedCount: afterState.minimum,
    awards: persistedAwards,
    totalXpAwarded: persistedAwards.reduce((sum, award) => sum + award.xp, 0),
  };
}
