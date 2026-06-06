export type QuizQuestionCategory =
  | "tri-recyclage"
  | "action-terrain"
  | "climat-biodiversite"
  | "impact-methodologie";

export const QUIZ_CATEGORY_LABELS: Record<QuizQuestionCategory, string> = {
  "tri-recyclage": "Tri & Recyclage",
  "action-terrain": "Action terrain",
  "climat-biodiversite": "Climat & Biodiversité",
  "impact-methodologie": "Impact & Méthodologie",
};

export type QuizReviewTarget = {
  label: string;
  href: string;
};

export const QUIZ_REVIEW_TARGETS = {
  comprendre: {
    label: "Comprendre",
    href: "/learn/comprendre",
  },
  bonnes_pratiques: {
    label: "Bonnes pratiques",
    href: "/learn/bonnes-pratiques",
  },
} as const;

export const REVIEW_TARGET_BY_CATEGORY: Record<QuizQuestionCategory, QuizReviewTarget> = {
  "tri-recyclage": QUIZ_REVIEW_TARGETS.bonnes_pratiques,
  "action-terrain": QUIZ_REVIEW_TARGETS.bonnes_pratiques,
  "climat-biodiversite": QUIZ_REVIEW_TARGETS.comprendre,
  "impact-methodologie": QUIZ_REVIEW_TARGETS.comprendre,
};

export function getQuizReviewTarget(
  category: QuizQuestionCategory,
  explicitTarget?: QuizReviewTarget
): QuizReviewTarget {
  return explicitTarget ?? REVIEW_TARGET_BY_CATEGORY[category] ?? QUIZ_REVIEW_TARGETS.comprendre;
}
