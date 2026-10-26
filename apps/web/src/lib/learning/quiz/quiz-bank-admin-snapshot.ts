import type { QuizQuestion } from "./quiz-question-contract";
import { getQuizAccessTypesForQuestion, getQuizAccessType, type QuizAccessTypeId } from "./quiz-access-types";
import { QUIZ_CATEGORY_LABELS, getQuizReviewTarget } from "./quiz-review-targets";
import { auditQuizBank, type QuizQualityFinding } from "@/lib/learning/quiz/quiz-quality-audit";
import { auditQuizSources } from "@/lib/learning/quiz/quiz-source-audit";
import { getQuizDifficulty, getQuizPedagogicalType, getQuizPedagogicalTypeLabel } from "@/lib/learning/quiz/quiz-taxonomy";
import { getQuizTrapLevel } from "./quiz-trap-levels";
import type { QuizReasoningType } from "./quiz-reasoning-types";
import { getQuizAnswerText } from "./quiz-answer-text";
import type { QuizBankAdminQuestion, QuizBankAdminSnapshot } from "./quiz-bank-admin";

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

type SnapshotContext = {
  qualityById: Map<string, QuizQualityFinding>;
  missingSourceIds: Set<string>;
  unsourcedFigureIds: Set<string>;
  localRuleMismatchIds: Set<string>;
  weakSourceIds: Set<string>;
};

function getQuestionSummary(question: QuizQuestion): string {
  return `${question.question} ${question.explanation} ${getQuizAnswerText(question)}`;
}

function containsPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function getQualityFlagLabels(finding: QuizQualityFinding): string[] {
  return finding.criteria.filter((criterion) => criterion.state !== "pass").map((criterion) => QUALITY_REASON_LABELS[criterion.id] ?? criterion.label);
}

function getSuggestionsFromFinding(finding: QuizQualityFinding): string[] {
  return finding.criteria.flatMap((criterion) => {
    if (criterion.state === "pass") return [];
    switch (criterion.id) {
      case "interet-pedagogique": return ["Ancrer la question dans un usage, une erreur ou un apprentissage CleanMyMap clairement utile."];
      case "niveau-de-reflexion": return ["Faire comparer, estimer, arbitrer ou relier plusieurs indices au lieu d'appeler le bon sens."];
      case "caractere-piegeux-mais-juste": return ["Rendre les distracteurs plausibles et retirer toute formulation qui oriente la réponse."];
      case "qualite-de-l-explication": return ["Ajouter un mécanisme, une conséquence ou une nuance pédagogique concrète."];
      case "lien-avec-cleanmymap": return ["Rattacher plus explicitement la question à un mode, une compétence ou un risque CleanMyMap."];
      case "utilite-terrain-ou-scientifique": return ["Relier la question à une décision de terrain ou à une lecture scientifique exploitable."];
      case "absence-de-reponse-evidente": return ["Remplacer la réponse évidente par un vrai choix de raisonnement."];
      case "traçabilité-des-sources": return ["Compléter la source, le périmètre et le niveau de confiance avant publication."];
      default: return [criterion.message];
    }
  });
}

function getPriorityLabel(score: number): string {
  if (score >= 140) return "Priorité haute";
  if (score >= 80) return "À relire";
  if (score > 0) return "À surveiller";
  return "Conforme";
}

function buildSourceFlags(question: QuizQuestion, context: SnapshotContext, hasSource: boolean): string[] {
  const flags: string[] = [];
  if (!hasSource || context.missingSourceIds.has(question.id)) flags.push("Sans source");
  if (context.unsourcedFigureIds.has(question.id)) flags.push("Chiffre non sourcé");
  if (context.localRuleMismatchIds.has(question.id)) flags.push("Consigne locale à corriger");
  if (context.weakSourceIds.has(question.id)) flags.push("Source faible");
  if (question.sourceType === "estimation") flags.push("Marqué estimation");
  if (question.sourceType === "interne") flags.push("Source interne");
  if (question.confidenceLevel === "faible") flags.push("Confiance faible");
  if (question.isLocalRule) flags.push(`Variable: ${question.localScope ?? "n/a"}`);
  return flags;
}

function buildReviewReasons(question: QuizQuestion, sourceFlags: string[], qualityFlags: string[], finding: QuizQualityFinding): string[] {
  const reasons = [...(question.needsReview ? ["Question signalée needsReview"] : []), ...sourceFlags, ...qualityFlags];
  const criterion = finding.criteria.find((item) => item.id === "traçabilité-des-sources" && item.state !== "pass");
  if (criterion) reasons.push(QUALITY_REASON_LABELS[criterion.id] ?? criterion.label);
  return Array.from(new Set(reasons));
}

function buildSuggestions(question: QuizQuestion, finding: QuizQualityFinding): string[] {
  const suggestions = new Set(getSuggestionsFromFinding(finding));
  const summary = getQuestionSummary(question);
  if (question.needsReview) suggestions.add("Conserver la question en relecture éditoriale tant que la source ou le piège n'est pas consolidé.");
  if (!question.sourceUrl || !question.sourceLabel || !question.sourceType || !question.confidenceLevel || !question.localScope || !question.lastCheckedAt) suggestions.add("Compléter le bloc de source avant toute mise en ligne.");
  if (containsPattern(summary, [/\bque faut-il faire\b/i, /\bquel est le bon réflexe\b/i, /\bque doit-on faire\b/i])) suggestions.add("Réécrire la consigne pour forcer un arbitrage ou une comparaison.");
  if (question.difficulty === "high" && finding.criteria.some((item) => item.id === "absence-de-reponse-evidente" && item.state !== "pass")) suggestions.add("La difficulté est trop haute pour une question qui reste trop lisible.");
  return Array.from(suggestions);
}

function buildPriorityScore(question: QuizQuestion, finding: QuizQualityFinding, context: SnapshotContext): number {
  return (
    (question.needsReview ? 100 : 0) +
    (context.missingSourceIds.has(question.id) ? 90 : 0) +
    (context.unsourcedFigureIds.has(question.id) ? 80 : 0) +
    (context.localRuleMismatchIds.has(question.id) ? 70 : 0) +
    (context.weakSourceIds.has(question.id) ? 45 : 0) +
    finding.errors.length * 30 +
    finding.warnings.length * 12 +
    (finding.criteria.some((item) => item.id === "absence-de-reponse-evidente" && item.state !== "pass") ? 20 : 0) +
    (finding.criteria.some((item) => item.id === "qualite-de-l-explication" && item.state !== "pass") ? 14 : 0)
  );
}

function buildQuizBankAdminQuestion(question: QuizQuestion, context: SnapshotContext): QuizBankAdminQuestion {
  const finding = context.qualityById.get(question.id);
  if (!finding) throw new Error(`Question quiz introuvable dans l'audit: ${question.id}`);
  const accessTypeIds = getQuizAccessTypesForQuestion(question);
  const pedagogicalType = question.pedagogicalType ?? question.format ?? getQuizPedagogicalType(question);
  const skill = question.skill ?? question.reasoningType;
  const difficulty = question.difficulty ?? getQuizDifficulty(question);
  const trapLevel = question.trapLevel ?? getQuizTrapLevel(question);
  const reviewTarget = getQuizReviewTarget(question.category, question.reviewTarget, question.reasoningType);
  const hasSource = Boolean(question.sourceUrl && question.sourceLabel && question.sourceType && question.confidenceLevel && question.localScope && question.lastCheckedAt);
  const sourceFlags = buildSourceFlags(question, context, hasSource);
  const qualityFlags = getQualityFlagLabels(finding);
  const reviewReasons = buildReviewReasons(question, sourceFlags, qualityFlags, finding);
  const priorityScore = buildPriorityScore(question, finding, context);
  return {
    id: question.id,
    question: question.question,
    answer: getQuizAnswerText(question),
    explanation: question.explanation,
    category: question.category,
    categoryLabel: QUIZ_CATEGORY_LABELS[question.category],
    accessTypeIds,
    accessTypeLabels: accessTypeIds.map((modeId) => getQuizAccessType(modeId).label),
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
    sourceState: hasSource ? (context.weakSourceIds.has(question.id) ? "weak" : "sourced") : "missing",
    hasSource,
    qualityWarningCount: finding.warnings.length,
    qualityErrorCount: finding.errors.length,
    qualityFlags,
    sourceFlags,
    reviewTargetLabel: reviewTarget.label,
    reviewTargetHref: reviewTarget.href,
    reviewReasons,
    suggestions: buildSuggestions(question, finding),
    priorityScore,
    priorityLabel: getPriorityLabel(priorityScore),
  };
}

function sortQuestions(left: QuizBankAdminQuestion, right: QuizBankAdminQuestion): number {
  if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore;
  if (right.qualityErrorCount !== left.qualityErrorCount) return right.qualityErrorCount - left.qualityErrorCount;
  if (right.qualityWarningCount !== left.qualityWarningCount) return right.qualityWarningCount - left.qualityWarningCount;
  return left.id.localeCompare(right.id, "fr");
}

function buildModeCounts(questions: readonly QuizQuestion[]): Record<QuizAccessTypeId, number> {
  const byMode = Object.fromEntries(["mixte", "terrain", "donnees-scientifiques", "sensibilisation", "habitudes-de-vie", "ordres-de-grandeur", "tri-securite"].map((mode) => [mode, 0])) as Record<QuizAccessTypeId, number>;
  for (const question of questions) for (const mode of getQuizAccessTypesForQuestion(question)) byMode[mode] = (byMode[mode] ?? 0) + 1;
  return byMode;
}

export function buildQuizBankAdminSnapshot(questions: readonly QuizQuestion[]): QuizBankAdminSnapshot {
  const qualityReport = auditQuizBank(questions);
  const sourceReport = auditQuizSources(questions);
  const context: SnapshotContext = {
    qualityById: new Map(qualityReport.findings.map((finding) => [finding.questionId, finding])),
    missingSourceIds: new Set(sourceReport.questionsWithoutSource.map((item) => item.questionId)),
    unsourcedFigureIds: new Set(sourceReport.questionsWithUnsourcedFigures.map((item) => item.questionId)),
    localRuleMismatchIds: new Set(sourceReport.questionsWithLocalRulesNotVariable.map((item) => item.questionId)),
    weakSourceIds: new Set(sourceReport.weakOrVagueSources.map((item) => item.questionId)),
  };
  const projectedQuestions = questions.map((question) => buildQuizBankAdminQuestion(question, context)).sort(sortQuestions);
  return {
    questions: projectedQuestions,
    totalQuestions: projectedQuestions.length,
    reviewCount: projectedQuestions.filter((question) => question.reviewReasons.length > 0).length,
    missingSourceCount: projectedQuestions.filter((question) => question.sourceState === "missing").length,
    weakSourceCount: projectedQuestions.filter((question) => question.sourceState === "weak").length,
    obviousCount: projectedQuestions.filter((question) => question.qualityFlags.includes("Réponse trop évidente") || question.qualityFlags.includes("Piège ou distracteurs à retravailler")).length,
    needsReviewCount: projectedQuestions.filter((question) => Boolean(question.needsReview)).length,
    byMode: buildModeCounts(questions),
  };
}
