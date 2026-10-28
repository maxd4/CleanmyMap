import { listQuizQuestionFormatIds } from "@/lib/learning/quiz/quiz-question-formats";
import { getQuizPedagogicalTypeLabel } from "@/lib/learning/quiz/quiz-taxonomy";
import {
  computeQuizMilestoneAwards,
  QUIZ_BALANCE_MILESTONES,
  type QuizMilestoneAward,
} from "./quiz-milestones";
import type { QuizProgressionEventCandidate } from "./progression-event-writer";

type QuizBalanceProgressRow = {
  user_id: string;
  question_type: string;
  correct_count: number;
  updated_at?: string;
};

export type QuizBalanceAward = QuizMilestoneAward<(typeof QUIZ_BALANCE_MILESTONES)[number]>;

export function computeBalancedCount(
  rows: QuizBalanceProgressRow[],
  questionTypes: readonly string[],
): number {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.question_type, Math.max(0, Math.trunc(row.correct_count)));
  }

  const values = questionTypes.map((questionType) => counts.get(questionType) ?? 0);
  return values.length > 0 ? Math.min(...values) : 0;
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
export function buildQuizBalanceEventCandidates(params: {
  userId: string;
  questionType: string;
  questionId: string;
  questionTypes?: readonly string[];
}): QuizProgressionEventCandidate[] {
  const questionTypes = params.questionTypes ?? listQuizQuestionFormatIds();
  const questionTypeLabel = getQuizPedagogicalTypeLabel(params.questionType);
  return QUIZ_BALANCE_MILESTONES.map((milestone) => ({
    metric: "balance" as const,
    threshold: milestone.threshold,
    userId: params.userId,
    eventType: "quiz_question_type_balance_milestone" as const,
    sourceTable: "quiz_type_balance_progress",
    sourceId: `quiz:balanced:${milestone.threshold}`,
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
      balancedQuestionTypes: questionTypes,
      questionId: params.questionId,
    },
  }));
}
