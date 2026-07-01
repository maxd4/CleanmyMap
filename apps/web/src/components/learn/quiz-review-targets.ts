import { getQuizAccessType, type QuizAccessTypeId } from "./quiz-access-types.ts";
import type { QuizReasoningType } from "./quiz-reasoning-types.ts";

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

export type QuizReviewFollowUp = QuizReviewTarget & {
  modeId: QuizAccessTypeId;
  modeLabel: string;
  reason: string;
};

export const QUIZ_REVIEW_TARGETS = {
  comprendre: {
    label: "Comprendre",
    href: "/learn/comprendre",
  },
  sentrainer: {
    label: "S'entraîner",
    href: "/learn/sentrainer",
  },
  bonnes_pratiques: {
    label: "Bonnes pratiques",
    href: "/learn/bonnes-pratiques",
  },
} as const;

const REASONING_REVIEW_TARGET_BY_TYPE: Partial<Record<QuizReasoningType, QuizReviewTarget>> = {
  estimation: QUIZ_REVIEW_TARGETS.sentrainer,
  comparaison: QUIZ_REVIEW_TARGETS.sentrainer,
  "conséquences indirectes": QUIZ_REVIEW_TARGETS.sentrainer,
  "questions contre-intuitives": QUIZ_REVIEW_TARGETS.sentrainer,
  "cas-limites": QUIZ_REVIEW_TARGETS.sentrainer,
  "mini-enquetes": QUIZ_REVIEW_TARGETS.sentrainer,
};

const REVIEW_TARGET_FOLLOW_UP_BY_HREF: Record<
  string,
  {
    modeId: QuizAccessTypeId;
    reason: string;
  }
> = {
  "/learn/comprendre": {
    modeId: "donnees-scientifiques",
    reason: "Cette rubrique remet le cadre avant de repartir sur des questions plus ciblées.",
  },
  "/learn/sentrainer": {
    modeId: "mixte",
    reason: "Une session mêlée permet de vérifier si le réflexe tient sans indice.",
  },
  "/learn/bonnes-pratiques": {
    modeId: "tri-securite",
    reason: "Les repères concrets du terrain aident à corriger les gestes de tri et de sécurité.",
  },
  "/methodologie": {
    modeId: "ordres-de-grandeur",
    reason: "La méthodologie aide à retrouver l'échelle et les limites de lecture.",
  },
  "/sections/recycling": {
    modeId: "tri-securite",
    reason: "Le guide du tri recadre la filière réelle avant de rejouer la question.",
  },
  "/sections/weather": {
    modeId: "terrain",
    reason: "La page terrain remet les contraintes du site et la sécurité au centre.",
  },
  "/sections/route": {
    modeId: "terrain",
    reason: "Le cadrage du parcours aide à reprendre les décisions de terrain.",
  },
  "/sections/climate": {
    modeId: "donnees-scientifiques",
    reason: "Le contexte scientifique permet de mieux lire les mécanismes et leurs effets.",
  },
  "/sections/open-data": {
    modeId: "donnees-scientifiques",
    reason: "Les données publiques aident à vérifier la lecture factuelle avant de reprendre.",
  },
};

export const REVIEW_TARGET_BY_CATEGORY: Record<QuizQuestionCategory, QuizReviewTarget> = {
  "tri-recyclage": QUIZ_REVIEW_TARGETS.bonnes_pratiques,
  "action-terrain": QUIZ_REVIEW_TARGETS.bonnes_pratiques,
  "climat-biodiversite": QUIZ_REVIEW_TARGETS.comprendre,
  "impact-methodologie": QUIZ_REVIEW_TARGETS.comprendre,
};

export function getQuizReviewTarget(
  category: QuizQuestionCategory,
  explicitTarget?: QuizReviewTarget,
  reasoningType?: QuizReasoningType,
): QuizReviewTarget {
  return (
    (reasoningType ? REASONING_REVIEW_TARGET_BY_TYPE[reasoningType] : null) ??
    explicitTarget ??
    REVIEW_TARGET_BY_CATEGORY[category] ??
    QUIZ_REVIEW_TARGETS.comprendre
  );
}

export function getQuizReviewFollowUp(target: QuizReviewTarget): QuizReviewFollowUp {
  const advice = REVIEW_TARGET_FOLLOW_UP_BY_HREF[target.href] ?? {
    modeId: "mixte" as const,
    reason: "Cette rubrique reste le point d'entrée le plus utile pour reprendre la notion.",
  };

  return {
    ...target,
    modeId: advice.modeId,
    modeLabel: getQuizAccessType(advice.modeId).label,
    reason: advice.reason,
  };
}
