import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuizPedagogicalTypeLabel } from "@/lib/learning/quiz/quiz-taxonomy";
import { insertProgressionEvent } from "./progression-data";
import { refreshProgressionProfile } from "./progression-tracking";
import { broadcastGamificationAnnouncement } from "./announcements";
import { computeQuizMilestoneAwards, QUIZ_PROGRESS_MILESTONES, type QuizMilestoneAward } from "./quiz-milestones";

type QuizTypeProgressRow = {
  user_id: string;
  question_type: string;
  correct_count: number;
  updated_at?: string;
};

export type QuizProgressAward = QuizMilestoneAward<(typeof QUIZ_PROGRESS_MILESTONES)[number]>;

export type SyncQuizQuestionTypeProgressParams = {
  userId: string;
  questionType: string;
  questionId: string;
};

export type QuizProgressSyncResult = {
  questionType: string;
  questionTypeLabel: string;
  previousCount: number;
  correctCount: number;
  awards: QuizProgressAward[];
  totalXpAwarded: number;
};

type QuizProgressTableClient = {
  from(table: "quiz_type_progress"): {
    select(columns: string): {
      eq(column: "user_id", value: string): {
        eq(column: "question_type", value: string): {
          maybeSingle(): Promise<{ data: QuizTypeProgressRow | null; error: unknown }>;
        };
      };
    };
    upsert(
      value: {
        user_id: string;
        question_type: string;
        correct_count: number;
      },
      options: { onConflict: string },
    ): Promise<{ error: unknown }>;
  };
};

export function computeQuizProgressAwards(params: {
  previousCount: number;
  nextCount: number;
  questionType: string;
}): QuizProgressAward[] {
  return computeQuizMilestoneAwards({
    milestones: QUIZ_PROGRESS_MILESTONES,
    previousCount: params.previousCount,
    nextCount: params.nextCount,
    sourceIdPrefix: `quiz:${params.questionType}`,
  });
}

export async function syncQuizQuestionTypeProgress(
  supabase: SupabaseClient,
  params: SyncQuizQuestionTypeProgressParams,
): Promise<QuizProgressSyncResult> {
  const client = supabase as unknown as QuizProgressTableClient;
  const questionTypeLabel = getQuizPedagogicalTypeLabel(params.questionType);

  const current = await client
    .from("quiz_type_progress")
    .select("user_id, question_type, correct_count")
    .eq("user_id", params.userId)
    .eq("question_type", params.questionType)
    .maybeSingle();

  if (current.error) {
    throw current.error;
  }

  const previousCount = current.data?.correct_count ?? 0;
  const correctCount = previousCount + 1;
  const awards = computeQuizProgressAwards({
    previousCount,
    nextCount: correctCount,
    questionType: params.questionType,
  });

  for (const award of awards) {
    await insertProgressionEvent(supabase, {
      userId: params.userId,
      eventType: "quiz_question_type_milestone",
      sourceTable: "quiz_type_progress",
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
        questionId: params.questionId,
      },
    });

  }

  if (awards.length > 0) {
    await broadcastGamificationAnnouncement(supabase, {
      type: "quiz_question_type_milestone",
      source: "quiz",
      userId: params.userId,
      title: `+${awards.reduce((sum, award) => sum + award.xp, 0)} XP sur le quiz`,
      message:
        awards.length === 1
          ? `${questionTypeLabel} : ${awards[0]?.milestone ?? 0} bonnes réponses atteintes.`
          : `${questionTypeLabel} : ${awards.map((award) => award.milestone).join(" / ")} bonnes réponses atteintes.`,
      icon: "🧠",
      questionType: params.questionType,
      milestones: awards.map((award) => award.milestone),
      steps: awards.map((award) => award.step),
      xp: awards.reduce((sum, award) => sum + award.xp, 0),
      dedupeKey: `quiz_question_type_milestone:${params.userId}:${params.questionType}:${correctCount}`,
    });
  }

  const updated = await client.from("quiz_type_progress").upsert(
    {
      user_id: params.userId,
      question_type: params.questionType,
      correct_count: correctCount,
    },
    { onConflict: "user_id,question_type" },
  );

  if (updated.error) {
    throw updated.error;
  }

  if (awards.length > 0) {
    await refreshProgressionProfile(supabase, params.userId);
  }

  return {
    questionType: params.questionType,
    questionTypeLabel,
    previousCount,
    correctCount,
    awards,
    totalXpAwarded: awards.reduce((sum, award) => sum + award.xp, 0),
  };
}
