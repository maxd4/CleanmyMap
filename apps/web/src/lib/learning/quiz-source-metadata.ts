import type { QuizQuestion } from "@/components/learn/environmental-quiz";

export type QuizSourceType =
  | "institutionnelle"
  | "scientifique"
  | "associative"
  | "presse"
  | "interne"
  | "estimation";

export type QuizConfidenceLevel = "élevé" | "moyen" | "faible";

export type QuizLocalScope = "national" | "regional" | "departemental" | "communal" | "variable";

export type QuizSourceMetadata = {
  sourceUrl: string;
  sourceLabel: string;
  sourceType: QuizSourceType;
  confidenceLevel: QuizConfidenceLevel;
  isLocalRule: boolean;
  localScope: QuizLocalScope;
  lastCheckedAt: string;
  needsReview: boolean;
};

const LAST_CHECKED_AT = "2026-06-20";

const INTERNAL_PEDAGOGY_SOURCE: QuizSourceMetadata = {
  sourceUrl: "/documentation/features/quiz-authoring-guide.md",
  sourceLabel: "CleanMyMap - Guide pédagogique du quiz",
  sourceType: "interne",
  confidenceLevel: "moyen",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: true,
};

const INTERNAL_TERRAIN_SOURCE: QuizSourceMetadata = {
  sourceUrl: "/documentation/features/quiz-quality-control.md",
  sourceLabel: "CleanMyMap - Grille de contrôle du quiz",
  sourceType: "interne",
  confidenceLevel: "moyen",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: true,
};

const LOCAL_RULE_SOURCE: QuizSourceMetadata = {
  sourceUrl: "/documentation/features/quiz-authoring-guide.md",
  sourceLabel: "CleanMyMap - Consignes locales de tri",
  sourceType: "interne",
  confidenceLevel: "moyen",
  isLocalRule: true,
  localScope: "variable",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: true,
};

const TRI_SOURCE: QuizSourceMetadata = {
  sourceUrl: "https://www.citeo.com/le-tri",
  sourceLabel: "Citeo - Le tri",
  sourceType: "institutionnelle",
  confidenceLevel: "élevé",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: false,
};

const ACTION_SAFETY_SOURCE: QuizSourceMetadata = {
  sourceUrl: "https://www.inrs.fr/",
  sourceLabel: "INRS - Prévention des risques en situation terrain",
  sourceType: "institutionnelle",
  confidenceLevel: "élevé",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: false,
};

const IPCC_SOURCE: QuizSourceMetadata = {
  sourceUrl: "https://www.ipcc.ch/report/ar6/syr/",
  sourceLabel: "IPCC AR6 - Synthesis Report",
  sourceType: "scientifique",
  confidenceLevel: "élevé",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: false,
};

const IPBES_SOURCE: QuizSourceMetadata = {
  sourceUrl: "https://ipbes.net/global-assessment",
  sourceLabel: "IPBES - Global Assessment",
  sourceType: "scientifique",
  confidenceLevel: "élevé",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: false,
};

const WWF_SOURCE: QuizSourceMetadata = {
  sourceUrl: "https://livingplanet.panda.org/en-US/",
  sourceLabel: "WWF - Living Planet Index",
  sourceType: "associative",
  confidenceLevel: "élevé",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: false,
};

const IEA_SOURCE: QuizSourceMetadata = {
  sourceUrl: "https://www.iea.org/reports/renewables-2024",
  sourceLabel: "IEA - Renewables 2024",
  sourceType: "institutionnelle",
  confidenceLevel: "élevé",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: false,
};

const ADEME_METHOD_SOURCE: QuizSourceMetadata = {
  sourceUrl: "https://www.ademe.fr/",
  sourceLabel: "ADEME - Méthode, ACV et sobriété",
  sourceType: "institutionnelle",
  confidenceLevel: "moyen",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: false,
};

const PLASTIC_STATS_SOURCE: QuizSourceMetadata = {
  sourceUrl: "https://doi.org/10.1126/sciadv.1700782",
  sourceLabel: "Geyer et al. (2017), Science Advances",
  sourceType: "scientifique",
  confidenceLevel: "élevé",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: false,
};

const UNEP_SOURCE: QuizSourceMetadata = {
  sourceUrl: "https://www.unep.org/",
  sourceLabel: "UNEP - pollution plastique et milieux marins",
  sourceType: "institutionnelle",
  confidenceLevel: "moyen",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: false,
};

const ESTIMATION_SOURCE: QuizSourceMetadata = {
  sourceUrl: "/documentation/features/quiz-authoring-guide.md",
  sourceLabel: "CleanMyMap - Ordres de grandeur pédagogiques",
  sourceType: "estimation",
  confidenceLevel: "moyen",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: true,
};

const INTERNAL_METHOD_SOURCE: QuizSourceMetadata = {
  sourceUrl: "/documentation/features/quiz-authoring-guide.md",
  sourceLabel: "CleanMyMap - Méthodologie et arbitrages de quiz",
  sourceType: "interne",
  confidenceLevel: "moyen",
  isLocalRule: false,
  localScope: "national",
  lastCheckedAt: LAST_CHECKED_AT,
  needsReview: true,
};

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function summarizeQuestion(question: QuizQuestion): string {
  const answer = Array.isArray(question.answer) ? question.answer.join(" ") : question.answer;
  return `${question.question} ${question.explanation} ${answer}`;
}

function isLocalRuleQuestion(question: QuizQuestion): boolean {
  const summary = summarizeQuestion(question);
  return hasPattern(summary, [
    /\bconsigne locale\b/i,
    /\bsuivre la consigne\b/i,
    /\bbac de tri\b/i,
    /\bdéchetterie\b/i,
  ]);
}

function isSafetyQuestion(question: QuizQuestion): boolean {
  return hasPattern(summarizeQuestion(question), [
    /\bseringue\b/i,
    /\bbidon\b/i,
    /\bgaz\b/i,
    /\bcoupant\b/i,
    /\bsouillé\b/i,
    /\brisque\b/i,
    /\bouvrir\b/i,
    /\bmanipuler\b/i,
    /\bblesse\b/i,
  ]);
}

function isEstimationQuestion(question: QuizQuestion): boolean {
  const summary = summarizeQuestion(question);
  return (
    question.reasoningType === "estimation" ||
    hasPattern(summary, [
      /\bordre de grandeur\b/i,
      /\benviron\b/i,
      /\b%/i,
      /\bpourcent/i,
      /\bcombien\b/i,
      /\blitres?\b/i,
      /\bannées?\b/i,
      /\bans?\b/i,
    ])
  );
}

function isClimateQuestion(question: QuizQuestion): boolean {
  return hasPattern(summarizeQuestion(question), [
    /\bbudget carbone\b/i,
    /\b1[,.]5\s?°?c\b/i,
    /\bco2\b/i,
    /\bméthane\b/i,
    /\bprotoxyde\b/i,
    /\bréchauffement\b/i,
    /\bémissions\b/i,
    /\benergie\b/i,
    /\bénergie\b/i,
  ]);
}

function isBiodiversityQuestion(question: QuizQuestion): boolean {
  return hasPattern(summarizeQuestion(question), [
    /\bbiodivers/i,
    /\bextinction\b/i,
    /\bespèces?\b/i,
    /\bterrain\b/i,
    /\bliving planet\b/i,
  ]);
}

function isPlasticPollutionQuestion(question: QuizQuestion): boolean {
  return hasPattern(summarizeQuestion(question), [
    /\bmicroplast/i,
    /\bplastique\b/i,
    /\bocéan\b/i,
    /\bocean\b/i,
    /\bplage\b/i,
    /\bmer\b/i,
    /\bfonds marins\b/i,
    /\btortues?\b/i,
    /\bdéchets flottants\b/i,
    /\bdechets flottants\b/i,
  ]);
}

function isRenewablesQuestion(question: QuizQuestion): boolean {
  return hasPattern(summarizeQuestion(question), [
    /\bénergies renouvelables\b/i,
    /\brenewables\b/i,
    /\bélectricité mondiale\b/i,
    /\belectricité mondiale\b/i,
  ]);
}

function isLivingPlanetQuestion(question: QuizQuestion): boolean {
  return hasPattern(summarizeQuestion(question), [/\bliving planet index\b/i, /\bwwf\b/i]);
}

export function buildQuizSourceMetadata(question: QuizQuestion): QuizSourceMetadata {
  if (isEstimationQuestion(question)) {
    const summary = summarizeQuestion(question);

    if (hasPattern(summary, [/\bbudget carbone\b/i, /\b1[,.]5\s?°?c\b/i])) {
      return IPCC_SOURCE;
    }

    if (hasPattern(summary, [/\bénergies renouvelables\b/i, /\bélectricité mondiale\b/i, /\brenewables\b/i])) {
      return IEA_SOURCE;
    }

    if (hasPattern(summary, [/\bplastique\b/i, /\brecycl/i])) {
      return PLASTIC_STATS_SOURCE;
    }

    if (hasPattern(summary, [/\bemballag/i, /\bdéchets ménagers\b/i, /\bdechets menagers\b/i])) {
      return ADEME_METHOD_SOURCE;
    }

    return ESTIMATION_SOURCE;
  }

  if (question.category === "action-terrain") {
    if (isLocalRuleQuestion(question)) {
      return LOCAL_RULE_SOURCE;
    }

    return isSafetyQuestion(question) ? ACTION_SAFETY_SOURCE : INTERNAL_TERRAIN_SOURCE;
  }

  if (question.category === "tri-recyclage") {
    return isLocalRuleQuestion(question) ? LOCAL_RULE_SOURCE : TRI_SOURCE;
  }

  if (question.category === "climat-biodiversite") {
    if (isLivingPlanetQuestion(question)) {
      return WWF_SOURCE;
    }

    if (isBiodiversityQuestion(question)) {
      return IPBES_SOURCE;
    }

    if (isClimateQuestion(question)) {
      return IPCC_SOURCE;
    }

    if (isPlasticPollutionQuestion(question)) {
      return UNEP_SOURCE;
    }

    return INTERNAL_METHOD_SOURCE;
  }

  if (question.category === "impact-methodologie") {
    if (isLocalRuleQuestion(question)) {
      return LOCAL_RULE_SOURCE;
    }

    if (isRenewablesQuestion(question)) {
      return IEA_SOURCE;
    }

    if (hasPattern(summarizeQuestion(question), [/\bdepuis 1950\b/i, /\b9\s?%\b/i, /\bproportion\b/i])) {
      return PLASTIC_STATS_SOURCE;
    }

    if (hasPattern(summarizeQuestion(question), [/\bacv\b/i, /\bbilan carbone\b/i])) {
      return ADEME_METHOD_SOURCE;
    }

    if (hasPattern(summarizeQuestion(question), [/\brecycl/i, /\bemballag/i, /\bvrac\b/i, /\btote bag\b/i, /\bproxy\b/i])) {
      return ADEME_METHOD_SOURCE;
    }

    return INTERNAL_METHOD_SOURCE;
  }

  return INTERNAL_PEDAGOGY_SOURCE;
}
