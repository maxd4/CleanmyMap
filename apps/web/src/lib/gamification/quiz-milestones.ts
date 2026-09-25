export const QUIZ_PROGRESS_MILESTONES = [
  { threshold: 50, xp: 1, badgeId: "quiz-type-50" },
  { threshold: 100, xp: 2, badgeId: "quiz-type-100" },
] as const;

export const QUIZ_BALANCE_MILESTONES = [
  { threshold: 10, xp: 1, badgeId: "quiz-balance-10" },
  { threshold: 50, xp: 1, badgeId: "quiz-balance-50" },
  { threshold: 100, xp: 2, badgeId: "quiz-balance-100" },
] as const;
