import type { QuizQuestion } from "@/components/learn/environmental-quiz";
import { getQuizAccessTypesForQuestion, getQuizAccessType, type QuizAccessTypeId } from "@/components/learn/quiz-access-types";
import { QUIZ_CATEGORY_LABELS, type QuizQuestionCategory, getQuizReviewTarget } from "@/components/learn/quiz-review-targets";
import { auditQuizBank, type QuizQualityFinding } from "@/lib/learning/quiz-quality-audit";
import { auditQuizSources } from "@/lib/learning/quiz-source-audit";
import type { QuizConfidenceLevel, QuizLocalScope, QuizSourceType } from "@/lib/learning/quiz-source-metadata";
import { getQuizDifficulty, getQuizPedagogicalType, getQuizPedagogicalTypeLabel, type QuizDifficultyId, type QuizPedagogicalTypeId, type QuizSkillId } from "@/lib/learning/quiz-taxonomy";
import { getQuizTrapLevel, type QuizTrapLevelId } from "@/components/learn/quiz-trap-levels";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";

export type QuizBankSourceState = "missing" | "weak" | "sourced";

export type QuizBankAdminFilters = {
  mode: QuizAccessTypeId | "all";
  pedagogicalType: QuizPedagogicalTypeId | "all";
  skill: QuizSkillId | "all";
  difficulty: QuizDifficultyId | "all";
  trapLevel: QuizTrapLevelId | "all";
  sourceType: QuizSourceType | "all";
  sourceState: QuizBankSourceState | "all";
  needsReview: "all" | "only" | "excluded";
};

export type QuizBankAdminQuestion = {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  category: QuizQuestionCategory;
  categoryLabel: string;
  accessTypeIds: QuizAccessTypeId[];
  accessTypeLabels: string[];
  pedagogicalType: QuizPedagogicalTypeId;
  pedagogicalTypeLabel: string;
  skill: QuizSkillId;
  skillLabel: string;
  difficulty: QuizDifficultyId;
  trapLevel: QuizTrapLevelId;
  reasoningType: QuizReasoningType;
  sourceUrl?: string;
  sourceLabel?: string;
  sourceType?: QuizSourceType;
  confidenceLevel?: QuizConfidenceLevel;
  isLocalRule?: boolean;
  localScope?: QuizLocalScope;
  lastCheckedAt?: string;
  needsReview?: boolean;
  sourceState: QuizBankSourceState;
  hasSource: boolean;
  qualityWarningCount: number;
  qualityErrorCount: number;
  qualityFlags: string[];
  sourceFlags: string[];
  reviewTargetLabel: string;
  reviewTargetHref: string;
  reviewReasons: string[];
  suggestions: string[];
  priorityScore: number;
  priorityLabel: string;
};

export type QuizBankAdminSnapshot = {
  questions: QuizBankAdminQuestion[];
  totalQuestions: number;
  reviewCount: number;
  missingSourceCount: number;
  weakSourceCount: number;
  obviousCount: number;
  needsReviewCount: number;
  byMode: Record<QuizAccessTypeId, number>;
};

const QUALITY_REASON_LABELS: Partial<Record<string, string>> = {
  "interet-pedagogique": "Intérêt pédagogique à renforcer",
  "niveau-de-reflexion": "Niveau de réflexion trop faible",
  "caractere-piegeux-mais-juste": "Piège ou distracteurs à retravailler",
  "qualite-de-l-explication": "Explication à enrichir",
  "lien-avec-cleanmymap": "Lien CleanMyMap trop faible",
  "utilite-terrain-ou-scientifique": "Ancrage terrain ou scientifique à clarifier",
  "absence-de-reponse-evidente": "Réponse trop évidente",
  "traçabilité-des-sources": "Traçabilité des sources à consolider",
};

const REASONING_TYPE_LABELS: Record<QuizReasoningType, string> = {
  "idée reçue": "Idée reçue",
  terrain: "Terrain",
  estimation: "Estimation",
  comparaison: "Comparaison",
  "conséquences indirectes": "Conséquences indirectes",
  "questions contre-intuitives": "Question contre-intuitive",
  "cas-limites": "Cas limite",
  "mini-enquetes": "Mini enquête",
};

function getAnswerText(question: QuizQuestion): string {
  return Array.isArray(question.answer) ? question.answer.join(" / ") : question.answer;
}

function getQuestionSummary(question: QuizQuestion): string {
  return `${question.question} ${question.explanation} ${getAnswerText(question)}`;
}

function containsPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function getQualityFlagLabels(finding: QuizQualityFinding): string[] {
  return finding.criteria
    .filter((criterion) => criterion.state !== "pass")
    .map((criterion) => QUALITY_REASON_LABELS[criterion.id] ?? criterion.label);
}

function getSuggestionsFromFinding(finding: QuizQualityFinding): string[] {
  return finding.criteria.flatMap((criterion) => {
    if (criterion.state === "pass") {
      return [];
    }

    switch (criterion.id) {
      case "interet-pedagogique":
        return ["Ancrer la question dans un usage, une erreur ou un apprentissage CleanMyMap clairement utile."];
      case "niveau-de-reflexion":
        return ["Faire comparer, estimer, arbitrer ou relier plusieurs indices au lieu d'appeler le bon sens."];
      case "caractere-piegeux-mais-juste":
        return ["Rendre les distracteurs plausibles et retirer toute formulation qui oriente la réponse."];
      case "qualite-de-l-explication":
        return ["Ajouter un mécanisme, une conséquence ou une nuance pédagogique concrète."];
      case "lien-avec-cleanmymap":
        return ["Rattacher plus explicitement la question à un mode, une compétence ou un risque CleanMyMap."];
      case "utilite-terrain-ou-scientifique":
        return ["Relier la question à une décision de terrain ou à une lecture scientifique exploitable."];
      case "absence-de-reponse-evidente":
        return ["Remplacer la réponse évidente par un vrai choix de raisonnement."];
      case "traçabilité-des-sources":
        return ["Compléter la source, le périmètre et le niveau de confiance avant publication."];
      default:
        return [criterion.message];
    }
  });
}

function getPriorityLabel(score: number): string {
  if (score >= 140) {
    return "Priorité haute";
  }
  if (score >= 80) {
    return "À relire";
  }
  if (score > 0) {
    return "À surveiller";
  }
  return "Conforme";
}

function buildSourceState(params: {
  hasSource: boolean;
  weakOrVagueSource: boolean;
}): QuizBankSourceState {
  if (!params.hasSource) {
    return "missing";
  }

  if (params.weakOrVagueSource) {
    return "weak";
  }

  return "sourced";
}

function buildSourceFlags(params: {
  hasSource: boolean;
  missingSource: boolean;
  unsourcedFigure: boolean;
  localRuleMismatch: boolean;
  weakOrVagueSource: boolean;
  sourceType?: QuizSourceType;
  confidenceLevel?: QuizConfidenceLevel;
  isLocalRule?: boolean;
  localScope?: QuizLocalScope;
}): string[] {
  const flags: string[] = [];

  if (!params.hasSource || params.missingSource) {
    flags.push("Sans source");
  }
  if (params.unsourcedFigure) {
    flags.push("Chiffre non sourcé");
  }
  if (params.localRuleMismatch) {
    flags.push("Consigne locale à corriger");
  }
  if (params.weakOrVagueSource) {
    flags.push("Source faible");
  }
  if (params.sourceType === "estimation") {
    flags.push("Marqué estimation");
  }
  if (params.sourceType === "interne") {
    flags.push("Source interne");
  }
  if (params.confidenceLevel === "faible") {
    flags.push("Confiance faible");
  }
  if (params.isLocalRule) {
    flags.push(`Variable: ${params.localScope ?? "n/a"}`);
  }

  return flags;
}

function buildReviewReasons(params: {
  needsReview?: boolean;
  sourceFlags: string[];
  qualityFlags: string[];
  qualityFinding: QuizQualityFinding;
}): string[] {
  const reasons: string[] = [];

  if (params.needsReview) {
    reasons.push("Question signalée needsReview");
  }

  reasons.push(...params.sourceFlags);
  reasons.push(...params.qualityFlags);

  const qualityCriterion = params.qualityFinding.criteria.find(
    (criterion) => criterion.id === "traçabilité-des-sources" && criterion.state !== "pass",
  );
  if (qualityCriterion && !reasons.includes(QUALITY_REASON_LABELS[qualityCriterion.id] ?? qualityCriterion.label)) {
    reasons.push(QUALITY_REASON_LABELS[qualityCriterion.id] ?? qualityCriterion.label);
  }

  return Array.from(new Set(reasons));
}

function getSpecificSuggestions(question: QuizQuestion, finding: QuizQualityFinding): string[] {
  const suggestions = new Set<string>(getSuggestionsFromFinding(finding));
  const summary = getQuestionSummary(question);

  if (question.needsReview) {
    suggestions.add("Conserver la question en relecture éditoriale tant que la source ou le piège n'est pas consolidé.");
  }

  if (!question.sourceUrl || !question.sourceLabel || !question.sourceType || !question.confidenceLevel || !question.localScope || !question.lastCheckedAt) {
    suggestions.add("Compléter le bloc de source avant toute mise en ligne.");
  }

  if (containsPattern(summary, [/\bque faut-il faire\b/i, /\bquel est le bon réflexe\b/i, /\bque doit-on faire\b/i])) {
    suggestions.add("Réécrire la consigne pour forcer un arbitrage ou une comparaison.");
  }

  if (question.difficulty === "high" && finding.criteria.some((criterion) => criterion.id === "absence-de-reponse-evidente" && criterion.state !== "pass")) {
    suggestions.add("La difficulté est trop haute pour une question qui reste trop lisible.");
  }

  return Array.from(suggestions);
}

export function buildQuizBankAdminSnapshot(questions: readonly QuizQuestion[]): QuizBankAdminSnapshot {
  const qualityReport = auditQuizBank(questions);
  const sourceReport = auditQuizSources(questions);
  const qualityById = new Map(qualityReport.findings.map((finding) => [finding.questionId, finding]));
  const missingSourceIds = new Set(sourceReport.questionsWithoutSource.map((item) => item.questionId));
  const unsourcedFigureIds = new Set(sourceReport.questionsWithUnsourcedFigures.map((item) => item.questionId));
  const localRuleMismatchIds = new Set(
    sourceReport.questionsWithLocalRulesNotVariable.map((item) => item.questionId),
  );
  const weakSourceIds = new Set(sourceReport.weakOrVagueSources.map((item) => item.questionId));

  const questionsWithMetadata = questions
    .map((question) => {
      const finding = qualityById.get(question.id);
      if (!finding) {
        throw new Error(`Question quiz introuvable dans l'audit: ${question.id}`);
      }

      const accessTypeIds = getQuizAccessTypesForQuestion(question);
      const accessTypeLabels = accessTypeIds.map((modeId) => getQuizAccessType(modeId).label);
      const pedagogicalType = question.pedagogicalType ?? question.format ?? getQuizPedagogicalType(question);
      const skill = question.skill ?? question.reasoningType;
      const difficulty = question.difficulty ?? getQuizDifficulty(question);
      const trapLevel = question.trapLevel ?? getQuizTrapLevel(question);
      const reviewTarget = getQuizReviewTarget(question.category, question.reviewTarget, question.reasoningType);
      const hasSource = Boolean(
        question.sourceUrl &&
          question.sourceLabel &&
          question.sourceType &&
          question.confidenceLevel &&
          question.localScope &&
          question.lastCheckedAt,
      );
      const sourceState = buildSourceState({
        hasSource,
        weakOrVagueSource: weakSourceIds.has(question.id),
      });
      const sourceFlags = buildSourceFlags({
        hasSource,
        missingSource: missingSourceIds.has(question.id),
        unsourcedFigure: unsourcedFigureIds.has(question.id),
        localRuleMismatch: localRuleMismatchIds.has(question.id),
        weakOrVagueSource: weakSourceIds.has(question.id),
        sourceType: question.sourceType,
        confidenceLevel: question.confidenceLevel,
        isLocalRule: question.isLocalRule,
        localScope: question.localScope,
      });
      const qualityFlags = getQualityFlagLabels(finding);
      const reviewReasons = buildReviewReasons({
        needsReview: question.needsReview,
        sourceFlags,
        qualityFlags,
        qualityFinding: finding,
      });
      const suggestions = getSpecificSuggestions(question, finding);
      const qualityWarningCount = finding.warnings.length;
      const qualityErrorCount = finding.errors.length;
      const priorityScore =
        (question.needsReview ? 100 : 0) +
        (missingSourceIds.has(question.id) ? 90 : 0) +
        (unsourcedFigureIds.has(question.id) ? 80 : 0) +
        (localRuleMismatchIds.has(question.id) ? 70 : 0) +
        (weakSourceIds.has(question.id) ? 45 : 0) +
        qualityErrorCount * 30 +
        qualityWarningCount * 12 +
        (finding.criteria.some((criterion) => criterion.id === "absence-de-reponse-evidente" && criterion.state !== "pass") ? 20 : 0) +
        (finding.criteria.some((criterion) => criterion.id === "qualite-de-l-explication" && criterion.state !== "pass") ? 14 : 0);

      return {
        id: question.id,
        question: question.question,
        answer: getAnswerText(question),
        explanation: question.explanation,
        category: question.category,
        categoryLabel: QUIZ_CATEGORY_LABELS[question.category],
        accessTypeIds,
        accessTypeLabels,
        pedagogicalType,
        pedagogicalTypeLabel: getQuizPedagogicalTypeLabel(pedagogicalType),
        skill,
        skillLabel: REASONING_TYPE_LABELS[skill],
        difficulty,
        trapLevel,
        reasoningType: question.reasoningType,
        sourceUrl: question.sourceUrl,
        sourceLabel: question.sourceLabel,
        sourceType: question.sourceType,
        confidenceLevel: question.confidenceLevel,
        isLocalRule: question.isLocalRule,
        localScope: question.localScope,
        lastCheckedAt: question.lastCheckedAt,
        needsReview: question.needsReview,
        sourceState,
        hasSource,
        qualityWarningCount,
        qualityErrorCount,
        qualityFlags,
        sourceFlags,
        reviewTargetLabel: reviewTarget.label,
        reviewTargetHref: reviewTarget.href,
        reviewReasons,
        suggestions,
        priorityScore,
        priorityLabel: getPriorityLabel(priorityScore),
      } satisfies QuizBankAdminQuestion;
    })
    .sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) {
        return right.priorityScore - left.priorityScore;
      }

      if (right.qualityErrorCount !== left.qualityErrorCount) {
        return right.qualityErrorCount - left.qualityErrorCount;
      }

      if (right.qualityWarningCount !== left.qualityWarningCount) {
        return right.qualityWarningCount - left.qualityWarningCount;
      }

      return left.id.localeCompare(right.id, "fr");
    });

  const byMode = Object.fromEntries(
    [
      "mixte",
      "terrain",
      "donnees-scientifiques",
      "sensibilisation",
      "habitudes-de-vie",
      "ordres-de-grandeur",
      "tri-securite",
    ].map((mode) => [mode, 0]),
  ) as Record<QuizAccessTypeId, number>;

  for (const question of questions) {
    const accessTypeIds = getQuizAccessTypesForQuestion(question);
    for (const mode of accessTypeIds) {
      byMode[mode] = (byMode[mode] ?? 0) + 1;
    }
  }

  return {
    questions: questionsWithMetadata,
    totalQuestions: questionsWithMetadata.length,
    reviewCount: questionsWithMetadata.filter((question) => question.reviewReasons.length > 0).length,
    missingSourceCount: questionsWithMetadata.filter((question) => question.sourceState === "missing").length,
    weakSourceCount: questionsWithMetadata.filter((question) => question.sourceState === "weak").length,
    obviousCount: questionsWithMetadata.filter((question) =>
      question.qualityFlags.includes("Réponse trop évidente") ||
      question.qualityFlags.includes("Piège ou distracteurs à retravailler"),
    ).length,
    needsReviewCount: questionsWithMetadata.filter((question) => Boolean(question.needsReview)).length,
    byMode,
  };
}
