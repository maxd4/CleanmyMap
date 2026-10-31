import type { SupabaseClient } from "@supabase/supabase-js";
import { getQuizPedagogicalTypeLabel } from "@/lib/learning/quiz/quiz-taxonomy";
import { listQuizQuestionFormatIds } from "@/lib/learning/quiz/quiz-question-formats";
import { broadcastGamificationAnnouncement } from "./announcements";
import {
  buildQuizBalanceEventCandidates,
  computeQuizBalanceAwards,
  type QuizBalanceAward,
} from "./quiz-balance-progress";
import {
  computeQuizMilestoneAwards,
  QUIZ_PROGRESS_MILESTONES,
  type QuizMilestoneAward,
} from "./quiz-milestones";
import {
  recordQuizProgression,
  type QuizProgressionCommitResult,
  type QuizProgressionEventCandidate,
} from "./progression-event-writer";
import { refreshProgressionProfile } from "./progression-tracking";

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
  previousBalancedCount: number;
  balancedCount: number;
  balancedAwards: QuizBalanceAward[];
  balancedTotalXpAwarded: number;
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

export function buildQuizProgressEventCandidates(params: {
  userId: string;
  questionType: string;
  questionId: string;
}): QuizProgressionEventCandidate[] {
  const questionTypeLabel = getQuizPedagogicalTypeLabel(params.questionType);
  return QUIZ_PROGRESS_MILESTONES.map((milestone) => ({
    metric: "type" as const,
    threshold: milestone.threshold,
    userId: params.userId,
    eventType: "quiz_question_type_milestone" as const,
    sourceTable: "quiz_type_progress",
    sourceId: `quiz:${params.questionType}:${milestone.threshold}`,
    statusPhase: "validated" as const,
    weight: 1,
    xpBase: milestone.xp,
    xpAwarded: milestone.xp,
    occurredOn: new Date().toISOString().slice(0, 10),
    metadata: {
      questionType: params.questionType,
      questionTypeLabel,
      milestone: milestone.threshold,
      step: milestone.threshold,
      threshold: milestone.threshold,
      badgeId: milestone.badgeId,
      questionId: params.questionId,
    },
  }));
}

export async function syncQuizQuestionTypeProgress(
  supabase: SupabaseClient,
  params: SyncQuizQuestionTypeProgressParams,
): Promise<QuizProgressSyncResult> {
  const questionTypes = listQuizQuestionFormatIds();
  const typeCandidates = buildQuizProgressEventCandidates(params);
  const balanceCandidates = buildQuizBalanceEventCandidates({
    ...params,
    questionTypes,
  });
  const commit = await recordQuizProgression(supabase, {
    userId: params.userId,
    questionType: params.questionType,
    questionTypes,
    events: [...typeCandidates, ...balanceCandidates],
  });

  const { typeAwards, balanceAwards } = buildQuizAwardSets(commit, params.questionType);

  await announceQuizProgressAwards(supabase, params, typeAwards);
  await announceQuizBalanceAwards(supabase, params, balanceAwards, commit.balancedCount);

  if (commit.insertedEvents.length > 0) {
    await refreshProgressionProfile(supabase, params.userId);
  }

  return buildQuizProgressResult(params, commit, typeAwards, balanceAwards);
}

function buildQuizAwardSets(
  commit: QuizProgressionCommitResult,
  questionType: string,
): { typeAwards: QuizProgressAward[]; balanceAwards: QuizBalanceAward[] } {
  const insertedSourceIds = new Set(commit.insertedEvents.map((event) => event.sourceId));
  return {
    typeAwards: computeQuizProgressAwards({
      previousCount: commit.previousCount,
      nextCount: commit.correctCount,
      questionType,
    }).filter((award) => insertedSourceIds.has(award.sourceId)),
    balanceAwards: computeQuizBalanceAwards({
      previousBalancedCount: commit.previousBalancedCount,
      nextBalancedCount: commit.balancedCount,
    }).filter((award) => insertedSourceIds.has(award.sourceId)),
  };
}

function buildQuizProgressResult(
  params: SyncQuizQuestionTypeProgressParams,
  commit: QuizProgressionCommitResult,
  typeAwards: QuizProgressAward[],
  balanceAwards: QuizBalanceAward[],
): QuizProgressSyncResult {
  return {
    questionType: params.questionType,
    questionTypeLabel: getQuizPedagogicalTypeLabel(params.questionType),
    previousCount: commit.previousCount,
    correctCount: commit.correctCount,
    awards: typeAwards,
    totalXpAwarded: typeAwards.reduce((sum, award) => sum + award.xp, 0),
    previousBalancedCount: commit.previousBalancedCount,
    balancedCount: commit.balancedCount,
    balancedAwards: balanceAwards,
    balancedTotalXpAwarded: balanceAwards.reduce((sum, award) => sum + award.xp, 0),
  };
}

async function announceQuizProgressAwards(
  supabase: SupabaseClient,
  params: SyncQuizQuestionTypeProgressParams,
  awards: QuizProgressAward[],
): Promise<void> {
  if (awards.length === 0) return;
  const questionTypeLabel = getQuizPedagogicalTypeLabel(params.questionType);
  await broadcastGamificationAnnouncement(supabase, {
    type: "quiz_question_type_milestone",
    source: "quiz",
    userId: params.userId,
    title: `+${awards.reduce((sum, award) => sum + award.xp, 0)} XP sur le quiz`,
    message: awards.length === 1
      ? `${questionTypeLabel} : ${awards[0]?.milestone ?? 0} bonnes réponses atteintes.`
      : `${questionTypeLabel} : ${awards.map((award) => award.milestone).join(" / ")} bonnes réponses atteintes.`,
    icon: "🧠",
    questionType: params.questionType,
    milestones: awards.map((award) => award.milestone),
    steps: awards.map((award) => award.step),
    xp: awards.reduce((sum, award) => sum + award.xp, 0),
    dedupeKey: `quiz_question_type_milestone:${params.userId}:${params.questionType}:${awards.map((award) => award.milestone).join("-")}`,
  });
}

async function announceQuizBalanceAwards(
  supabase: SupabaseClient,
  params: SyncQuizQuestionTypeProgressParams,
  awards: QuizBalanceAward[],
  balancedCount: number,
): Promise<void> {
  if (awards.length === 0) return;
  await broadcastGamificationAnnouncement(supabase, {
    type: "quiz_question_type_balance_milestone",
    source: "quiz",
    userId: params.userId,
    title: `+${awards.reduce((sum, award) => sum + award.xp, 0)} XP sur le quiz équilibré`,
    message: awards.length === 1
      ? `Quiz équilibré : ${awards[0]?.milestone ?? 0} bonnes réponses sur chaque type atteintes.`
      : `Quiz équilibré : ${awards.map((award) => award.milestone).join(" / ")} bonnes réponses sur chaque type atteintes.`,
    icon: "🧩",
    questionType: params.questionType,
    milestones: awards.map((award) => award.milestone),
    steps: awards.map((award) => award.step),
    xp: awards.reduce((sum, award) => sum + award.xp, 0),
    dedupeKey: `quiz_question_type_balance_milestone:${params.userId}:${balancedCount}`,
  });
}
