import { listQuizQuestionFormatIds } from "@/lib/learning/quiz/quiz-question-formats";
import { occurredOnFrom, latestOccurredOn } from "./gamification-fact-timestamps";
import { QUIZ_BALANCE_MILESTONES, QUIZ_PROGRESS_MILESTONES } from "./quiz-milestones";
import { sourceFact } from "./gamification-fact-builders";
import type { GamificationSourceFact } from "./gamification-reconstruction";

type QuizProgressFactRow = {
  question_type?: string;
  correct_count?: number;
  updated_at?: string;
};

export function buildQuizFacts(
  rows: unknown,
): { facts: GamificationSourceFact[]; totalCorrectAnswers: number } {
  const facts: GamificationSourceFact[] = [];
  const quizRows = (rows ?? []) as QuizProgressFactRow[];
  const questionTypes = listQuizQuestionFormatIds();
  for (const row of quizRows) {
    const count = Math.max(0, Math.trunc(Number(row.correct_count) || 0));
    for (const milestone of QUIZ_PROGRESS_MILESTONES) {
      if (count < milestone.threshold) continue;
      facts.push(sourceFact({
        mechanicId: "learning",
        eventType: "quiz_question_type_milestone",
        sourceTable: "quiz_type_progress",
        sourceId: `quiz:${row.question_type}:${milestone.threshold}`,
        occurredOn: occurredOnFrom(row.updated_at),
        xpAwarded: milestone.xp,
        threshold: milestone.threshold,
        badgeId: milestone.badgeId,
        metadata: { questionType: row.question_type, milestone: milestone.threshold },
      }));
    }
  }
  const quizCounts = new Map(quizRows.map((row) => [row.question_type, Math.max(0, Math.trunc(Number(row.correct_count) || 0))]));
  const balancedCount = questionTypes.length > 0
    ? Math.min(...questionTypes.map((type) => quizCounts.get(type) ?? 0))
    : 0;
  for (const milestone of QUIZ_BALANCE_MILESTONES) {
    if (balancedCount < milestone.threshold) continue;
    facts.push(sourceFact({
      mechanicId: "learning",
      eventType: "quiz_question_type_balance_milestone",
      sourceTable: "quiz_type_balance_progress",
      sourceId: `quiz:balanced:${milestone.threshold}`,
      occurredOn: latestOccurredOn(quizRows, (row) => row.updated_at),
      xpAwarded: milestone.xp,
      threshold: milestone.threshold,
      badgeId: milestone.badgeId,
      metadata: { balancedCount, milestone: milestone.threshold },
    }));
  }
  return {
    facts,
    totalCorrectAnswers: quizRows.reduce(
      (sum, row) => sum + Math.max(0, Math.trunc(Number(row.correct_count) || 0)),
      0,
    ),
  };
}
