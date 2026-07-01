import { getQuizAccessType, type QuizAccessTypeId } from "./quiz-access-types.ts";
import type { QuizReasoningType } from "./quiz-reasoning-types.ts";
import type { QuizQuestionFormatId } from "./quiz-question-formats.ts";
import {
  QUIZ_REVIEW_TARGETS,
  getQuizReviewTarget,
  getQuizReviewFollowUp,
  type QuizQuestionCategory,
  type QuizReviewTarget,
} from "./quiz-review-targets.ts";

export type QuizErrorSeverityId = "low" | "medium" | "high";

export type QuizErrorTypeId =
  | "idée reçue"
  | "erreur de sécurité"
  | "mauvaise estimation"
  | "confusion entre recyclabilité et recyclage réel"
  | "mauvais réflexe terrain"
  | "confusion entre biodégradable et sans impact"
  | "mauvaise compréhension d'une filière de tri"
  | "raisonnement trop simpliste"
  | "manque de nuance"
  | "impact indirect ignoré";

export type QuizErrorGridSource = {
  category: QuizQuestionCategory;
  question: string;
  reasoningType: QuizReasoningType;
  type: "multiple-choice" | "multiple-select" | "true-false" | "flashcard";
  format?: QuizQuestionFormatId;
  review?: QuizReviewTarget;
  reviewTarget?: QuizReviewTarget;
};

export type QuizErrorGridEntry = {
  errorType: QuizErrorTypeId;
  misconception: string;
  severity: QuizErrorSeverityId;
  feedbackCorrect: string;
  feedbackWrong: string;
  reviewTarget: QuizReviewTarget;
};

export type QuizErrorFollowUp = QuizReviewTarget & {
  modeId: QuizAccessTypeId;
  modeLabel: string;
  reason: string;
};

const SAFETY_KEYWORDS = /(seringue|bidon|liquide inconnu|coupant|souillé|danger|risque|manipuler|ouvrir)/i;
const TRI_KEYWORDS = /(tri|filière|recycl|emballag|verre|papier|brique|collecte)/i;
const BIO_KEYWORDS = /(biodégrad|compost)/i;
const RECYCLING_KEYWORDS = /(recycl|recyclabilité|recyclage|réemploi)/i;

const ERROR_TYPE_METADATA: Record<
  QuizErrorTypeId,
  {
    misconception: string;
    severity: QuizErrorSeverityId;
    feedbackCorrect: string;
    feedbackWrong: string;
  }
> = {
  "idée reçue": {
    misconception: "Tu as pris une affirmation plausible pour une règle générale.",
    severity: "low",
    feedbackCorrect: "Bonne réponse : tu as évité une croyance trompeuse.",
    feedbackWrong: "Erreur pédagogique : une affirmation plausible n'est pas forcément vraie partout.",
  },
  "erreur de sécurité": {
    misconception: "Le risque concret a été sous-estimé au profit de la rapidité.",
    severity: "high",
    feedbackCorrect: "Bon réflexe : tu as protégé la sécurité avant la vitesse.",
    feedbackWrong: "Erreur pédagogique : en contexte terrain, la sécurité du geste passe avant le gain de temps.",
  },
  "mauvaise estimation": {
    misconception: "L'ordre de grandeur réel a été mal évalué.",
    severity: "medium",
    feedbackCorrect: "Bonne estimation : ton ordre de grandeur est cohérent.",
    feedbackWrong: "Erreur pédagogique : l'ordre de grandeur attendu n'était pas un chiffre exact mais une échelle réaliste.",
  },
  "confusion entre recyclabilité et recyclage réel": {
    misconception: "Recyclable ne veut pas dire effectivement recyclé dans cette filière.",
    severity: "medium",
    feedbackCorrect: "Bonne réponse : tu distingues le potentiel technique et la réalité de la filière.",
    feedbackWrong: "Erreur pédagogique : un matériau recyclable n'est pas forcément recyclé réellement dans ce contexte.",
  },
  "mauvais réflexe terrain": {
    misconception: "Le geste théorique a été choisi sans tenir compte du contexte réel.",
    severity: "medium",
    feedbackCorrect: "Bon réflexe : tu as priorisé le contexte de terrain.",
    feedbackWrong: "Erreur pédagogique : le bon geste dépend du site, du risque et de la consigne locale.",
  },
  "confusion entre biodégradable et sans impact": {
    misconception: "Biodégradable ne veut pas dire inoffensif ni acceptable partout.",
    severity: "medium",
    feedbackCorrect: "Bonne réponse : tu n'as pas confondu biodégradable et absence d'impact.",
    feedbackWrong: "Erreur pédagogique : biodégradable ne signifie ni sans impact ni automatiquement adapté à la situation.",
  },
  "mauvaise compréhension d'une filière de tri": {
    misconception: "La filière locale a été confondue avec une possibilité théorique.",
    severity: "medium",
    feedbackCorrect: "Bonne réponse : tu as suivi la filière réellement en vigueur.",
    feedbackWrong: "Erreur pédagogique : la filière de tri à appliquer est celle du site ou de la commune, pas une règle générale abstraite.",
  },
  "raisonnement trop simpliste": {
    misconception: "Un seul critère a été survalorisé alors que plusieurs facteurs interagissent.",
    severity: "medium",
    feedbackCorrect: "Bonne réponse : tu as évité la simplification excessive.",
    feedbackWrong: "Erreur pédagogique : le cas demande d'assembler plusieurs critères au lieu d'en isoler un seul.",
  },
  "manque de nuance": {
    misconception: "Le cas réel impose un arbitrage plutôt qu'une réponse binaire.",
    severity: "medium",
    feedbackCorrect: "Bonne réponse : tu as gardé la nuance nécessaire.",
    feedbackWrong: "Erreur pédagogique : la situation demande une lecture nuancée et pas une réponse tout ou rien.",
  },
  "impact indirect ignoré": {
    misconception: "Les effets en cascade ou à distance ont été sous-estimés.",
    severity: "high",
    feedbackCorrect: "Bonne réponse : tu as pris en compte les effets indirects.",
    feedbackWrong: "Erreur pédagogique : un geste local peut produire des effets en cascade qu'il faut intégrer au raisonnement.",
  },
};

const ERROR_REVIEW_TARGET_BY_TYPE: Record<QuizErrorTypeId, QuizReviewTarget> = {
  "idée reçue": QUIZ_REVIEW_TARGETS.comprendre,
  "erreur de sécurité": {
    label: "Organiser une action",
    href: "/sections/weather",
  },
  "mauvaise estimation": {
    label: "Méthodologie",
    href: "/methodologie",
  },
  "confusion entre recyclabilité et recyclage réel": {
    label: "Guide du tri",
    href: "/sections/recycling",
  },
  "mauvais réflexe terrain": {
    label: "Organiser une action",
    href: "/sections/weather",
  },
  "confusion entre biodégradable et sans impact": QUIZ_REVIEW_TARGETS.comprendre,
  "mauvaise compréhension d'une filière de tri": {
    label: "Guide du tri",
    href: "/sections/recycling",
  },
  "raisonnement trop simpliste": QUIZ_REVIEW_TARGETS.comprendre,
  "manque de nuance": QUIZ_REVIEW_TARGETS.sentrainer,
  "impact indirect ignoré": QUIZ_REVIEW_TARGETS.comprendre,
};

const ERROR_FOLLOW_UP_BY_TYPE: Record<
  QuizErrorTypeId,
  {
    modeId: QuizAccessTypeId;
    reason: string;
  }
> = {
  "idée reçue": {
    modeId: "sensibilisation",
    reason: "Cette rubrique remet le cadre juste avant de relancer une session plus claire.",
  },
  "erreur de sécurité": {
    modeId: "tri-securite",
    reason: "La page terrain recadre les gestes sûrs avant de rejouer le cas.",
  },
  "mauvaise estimation": {
    modeId: "ordres-de-grandeur",
    reason: "Le bon réflexe est de reprendre l'échelle avant de refaire l'estimation.",
  },
  "confusion entre recyclabilité et recyclage réel": {
    modeId: "tri-securite",
    reason: "Le guide du tri distingue ce qui est théorique de ce qui est réellement appliqué.",
  },
  "mauvais réflexe terrain": {
    modeId: "terrain",
    reason: "La page d'action rappelle les contraintes du site et les bons gestes.",
  },
  "confusion entre biodégradable et sans impact": {
    modeId: "donnees-scientifiques",
    reason: "Le cadre scientifique évite de confondre biodégradable et absence d'impact.",
  },
  "mauvaise compréhension d'une filière de tri": {
    modeId: "tri-securite",
    reason: "La filière locale doit être rechargée avant de rejouer le quiz.",
  },
  "raisonnement trop simpliste": {
    modeId: "donnees-scientifiques",
    reason: "Le cas demande de remettre plusieurs facteurs en relation avant de conclure.",
  },
  "manque de nuance": {
    modeId: "mixte",
    reason: "Une session mêlée aide à tester la même notion sous plusieurs angles.",
  },
  "impact indirect ignoré": {
    modeId: "donnees-scientifiques",
    reason: "La méthodologie aide à voir les effets en cascade avant la prochaine tentative.",
  },
};

export function getQuizErrorReviewTarget(errorType: QuizErrorTypeId): QuizReviewTarget {
  return ERROR_REVIEW_TARGET_BY_TYPE[errorType] ?? QUIZ_REVIEW_TARGETS.comprendre;
}

export function getQuizErrorFollowUp(errorType: QuizErrorTypeId): QuizErrorFollowUp {
  const target = getQuizErrorReviewTarget(errorType);
  const followUp = ERROR_FOLLOW_UP_BY_TYPE[errorType] ?? {
    modeId: "mixte" as const,
    reason: "Cette rubrique reste le meilleur point d'appui pour reprendre la notion.",
  };

  const targetAdvice = getQuizReviewFollowUp(target);

  return {
    ...target,
    modeId: followUp.modeId,
    modeLabel: getQuizAccessType(followUp.modeId).label,
    reason: followUp.reason || targetAdvice.reason,
  };
}

function classifyErrorType(source: QuizErrorGridSource): QuizErrorTypeId {
  switch (source.reasoningType) {
    case "idée reçue":
      return BIO_KEYWORDS.test(source.question) ? "confusion entre biodégradable et sans impact" : "idée reçue";
    case "terrain":
      if (source.category === "tri-recyclage" && TRI_KEYWORDS.test(source.question)) {
        return "mauvaise compréhension d'une filière de tri";
      }
      if (SAFETY_KEYWORDS.test(source.question)) {
        return "erreur de sécurité";
      }
      if (BIO_KEYWORDS.test(source.question)) {
        return "confusion entre biodégradable et sans impact";
      }
      return "mauvais réflexe terrain";
    case "estimation":
      return "mauvaise estimation";
    case "comparaison":
      if (RECYCLING_KEYWORDS.test(source.question)) {
        return "confusion entre recyclabilité et recyclage réel";
      }
      if (BIO_KEYWORDS.test(source.question)) {
        return "confusion entre biodégradable et sans impact";
      }
      return "raisonnement trop simpliste";
    case "conséquences indirectes":
      return "impact indirect ignoré";
    case "questions contre-intuitives":
      return BIO_KEYWORDS.test(source.question) ? "confusion entre biodégradable et sans impact" : "raisonnement trop simpliste";
    case "cas-limites":
      return "manque de nuance";
    case "mini-enquetes":
      return source.category === "tri-recyclage" ? "mauvaise compréhension d'une filière de tri" : "raisonnement trop simpliste";
    default:
      return "raisonnement trop simpliste";
  }
}

export function buildQuizErrorGrid(source: QuizErrorGridSource): QuizErrorGridEntry {
  const errorType = classifyErrorType(source);
  const meta = ERROR_TYPE_METADATA[errorType];
  return {
    errorType,
    misconception: meta.misconception,
    severity: meta.severity,
    feedbackCorrect: meta.feedbackCorrect,
    feedbackWrong: meta.feedbackWrong,
    reviewTarget:
      source.reviewTarget ??
      source.review ??
      getQuizErrorReviewTarget(errorType) ??
      getQuizReviewTarget(source.category, undefined, source.reasoningType),
  };
}
