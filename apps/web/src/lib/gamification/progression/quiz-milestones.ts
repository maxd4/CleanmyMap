export const QUIZ_PROGRESS_MILESTONES = [
  { threshold: 50, xp: 1, badgeId: "quiz-type-50" },
  { threshold: 100, xp: 2, badgeId: "quiz-type-100" },
] as const;

export const QUIZ_BALANCE_MILESTONES = [
  { threshold: 10, xp: 1, badgeId: "quiz-balance-10" },
  { threshold: 50, xp: 1, badgeId: "quiz-balance-50" },
  { threshold: 100, xp: 2, badgeId: "quiz-balance-100" },
] as const;

export type QuizMilestone = {
  threshold: number;
  xp: number;
  badgeId: string;
};

export type QuizMilestoneAward<T extends QuizMilestone = QuizMilestone> = T & {
  step: T["threshold"];
  milestone: T["threshold"];
  sourceId: string;
};

export function computeQuizMilestoneAwards<T extends QuizMilestone>({
  milestones,
  previousCount,
  nextCount,
  sourceIdPrefix,
}: {
  milestones: readonly T[];
  previousCount: number;
  nextCount: number;
  sourceIdPrefix: string;
}): QuizMilestoneAward<T>[] {
  return milestones
    .filter(({ threshold }) => previousCount < threshold && nextCount >= threshold)
    .map((milestone) => ({
      ...milestone,
      step: milestone.threshold,
      milestone: milestone.threshold,
      sourceId: `${sourceIdPrefix}:${milestone.threshold}`,
    }))
    .sort((left, right) => left.milestone - right.milestone || left.threshold - right.threshold);
}
