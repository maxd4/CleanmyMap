import type { QuizQuestion } from "@/components/learn/environmental-quiz";
import type { QuizConfidenceLevel, QuizLocalScope, QuizSourceType } from "./quiz-source-metadata.ts";

export type QuizSourceAuditFinding = {
  questionId: string;
  question: string;
  answer: string;
  sourceLabel: string;
  sourceType: QuizSourceType | null;
  confidenceLevel: QuizConfidenceLevel | null;
  localScope: QuizLocalScope | null;
  isLocalRule: boolean;
  needsReview: boolean;
  reason: string;
};

export type QuizSourceAuditReport = {
  totalQuestions: number;
  questionsWithoutSource: QuizSourceAuditFinding[];
  questionsWithUnsourcedFigures: QuizSourceAuditFinding[];
  questionsWithLocalRulesNotVariable: QuizSourceAuditFinding[];
  questionsToReview: QuizSourceAuditFinding[];
  weakOrVagueSources: QuizSourceAuditFinding[];
  blockingIssuesCount: number;
};

const SOURCE_FIELD_KEYS: (keyof Pick<
  QuizQuestion,
  "sourceUrl" | "sourceLabel" | "sourceType" | "confidenceLevel" | "localScope" | "lastCheckedAt"
>)[] = ["sourceUrl", "sourceLabel", "sourceType", "confidenceLevel", "localScope", "lastCheckedAt"];

const NUMBER_CUE_PATTERNS = [/\d/, /%/];

const LOCAL_RULE_CUE_PATTERNS = [
  /\bconsigne locale\b/i,
  /\bconsigne du site\b/i,
  /\bcommune\b/i,
  /\bpanneaux? de tri\b/i,
  /\bbac de tri\b/i,
  /\bdéchetterie\b/i,
];

const VAGUE_SOURCE_LABEL_PATTERNS = [
  /\bguide\b/i,
  /\bgrille\b/i,
  /\bmethodolog/i,
  /\barbitrage\b/i,
  /\bpedagog/i,
  /\bterrain\b/i,
  /\bordres de grandeur\b/i,
  /\bmethode\b/i,
];

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getAnswerText(question: QuizQuestion): string {
  return Array.isArray(question.answer) ? question.answer.join(" / ") : question.answer;
}

function getQuestionSummary(question: QuizQuestion): string {
  return `${question.question} ${question.explanation} ${getAnswerText(question)}`;
}

function hasSourceMetadata(question: QuizQuestion): boolean {
  return SOURCE_FIELD_KEYS.every((key) => Boolean(question[key]));
}

function hasNumberCue(question: QuizQuestion): boolean {
  return hasPattern(getQuestionSummary(question), NUMBER_CUE_PATTERNS);
}

function hasLocalRuleCue(question: QuizQuestion): boolean {
  return hasPattern(getQuestionSummary(question), LOCAL_RULE_CUE_PATTERNS);
}

function isWeakOrVagueSource(question: QuizQuestion): boolean {
  if (!hasSourceMetadata(question)) {
    return false;
  }

  return (
    question.confidenceLevel === "faible" ||
    question.sourceType === "interne" ||
    question.sourceType === "estimation" ||
    hasPattern(normalizeText(question.sourceLabel ?? ""), VAGUE_SOURCE_LABEL_PATTERNS)
  );
}

function toFinding(question: QuizQuestion, reason: string): QuizSourceAuditFinding {
  return {
    questionId: question.id,
    question: question.question,
    answer: getAnswerText(question),
    sourceLabel: question.sourceLabel ?? "",
    sourceType: question.sourceType ?? null,
    confidenceLevel: question.confidenceLevel ?? null,
    localScope: question.localScope ?? null,
    isLocalRule: Boolean(question.isLocalRule),
    needsReview: Boolean(question.needsReview),
    reason,
  };
}

type QuizSourceAuditState = {
  questionsWithoutSource: QuizSourceAuditFinding[];
  questionsWithUnsourcedFigures: QuizSourceAuditFinding[];
  questionsWithLocalRulesNotVariable: QuizSourceAuditFinding[];
  questionsToReview: QuizSourceAuditFinding[];
  weakOrVagueSources: QuizSourceAuditFinding[];
  blockingQuestionIds: Set<string>;
};

function addBlockingFinding(
  target: QuizSourceAuditFinding[],
  question: QuizQuestion,
  reason: string,
  blockingQuestionIds: Set<string>,
): void {
  target.push(toFinding(question, reason));
  blockingQuestionIds.add(question.id);
}

function handleMissingQuizSource(
  question: QuizQuestion,
  state: QuizSourceAuditState,
  questionHasNumberCue: boolean,
): void {
  addBlockingFinding(
    state.questionsWithoutSource,
    question,
    questionHasNumberCue
      ? "La question contient un chiffre ou un pourcentage sans source documentée."
      : "La question n'a pas de source documentée.",
    state.blockingQuestionIds,
  );
}

function handleUnsourcedFigure(
  question: QuizQuestion,
  state: QuizSourceAuditState,
): void {
  addBlockingFinding(
    state.questionsWithUnsourcedFigures,
    question,
    "La question chiffrée n'est pas reliée à une source.",
    state.blockingQuestionIds,
  );
}

function handleLocalRuleCue(
  question: QuizQuestion,
  state: QuizSourceAuditState,
): void {
  addBlockingFinding(
    state.questionsWithLocalRulesNotVariable,
    question,
    question.isLocalRule
      ? "La règle locale devrait être marquée `localScope: variable`."
      : "La question ressemble à une règle locale mais n'est pas marquée comme telle.",
    state.blockingQuestionIds,
  );
}

function handleReviewFlag(
  question: QuizQuestion,
  state: QuizSourceAuditState,
): void {
  state.questionsToReview.push(
    toFinding(question, "La question reste signalée needsReview pour relecture éditoriale."),
  );
}

function handleWeakOrVagueSource(
  question: QuizQuestion,
  state: QuizSourceAuditState,
): void {
  state.weakOrVagueSources.push(
    toFinding(
      question,
      question.confidenceLevel === "faible"
        ? "La source est explicitement faible."
        : question.sourceType === "estimation"
          ? "La source est une estimation pédagogique."
          : question.sourceType === "interne"
            ? "La source est interne et reste peu vérifiable publiquement."
            : "Le libellé de source est trop générique.",
    ),
  );
}

function collectQuizSourceAuditFindings(
  question: QuizQuestion,
  state: QuizSourceAuditState,
): void {
  const questionHasSource = hasSourceMetadata(question);
  const questionHasNumberCue = hasNumberCue(question);
  const questionHasLocalCue = hasLocalRuleCue(question);

  if (!questionHasSource) {
    handleMissingQuizSource(question, state, questionHasNumberCue);
  }

  if (!questionHasSource && questionHasNumberCue) {
    handleUnsourcedFigure(question, state);
  }

  if (questionHasLocalCue && (!question.isLocalRule || question.localScope !== "variable")) {
    handleLocalRuleCue(question, state);
  }

  if (question.needsReview) {
    handleReviewFlag(question, state);
  }

  if (isWeakOrVagueSource(question)) {
    handleWeakOrVagueSource(question, state);
  }
}

function formatQuestionLine(finding: QuizSourceAuditFinding): string {
  const details = [
    finding.sourceType ? `source=${finding.sourceType}` : null,
    finding.confidenceLevel ? `confiance=${finding.confidenceLevel}` : null,
    finding.localScope ? `périmètre=${finding.localScope}` : null,
    finding.needsReview ? "needsReview" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return `- ${finding.questionId}: ${finding.question}${details ? ` [${details}]` : ""}${finding.reason ? ` — ${finding.reason}` : ""}`;
}

function formatSection(title: string, items: QuizSourceAuditFinding[]): string {
  const header = `${title} (${items.length})`;
  if (items.length === 0) {
    return `${header}\n- Aucun`;
  }

  return [header, ...items.map(formatQuestionLine)].join("\n");
}

export function auditQuizSources(questions: readonly QuizQuestion[]): QuizSourceAuditReport {
  const state: QuizSourceAuditState = {
    questionsWithoutSource: [],
    questionsWithUnsourcedFigures: [],
    questionsWithLocalRulesNotVariable: [],
    questionsToReview: [],
    weakOrVagueSources: [],
    blockingQuestionIds: new Set<string>(),
  };

  for (const question of questions) {
    collectQuizSourceAuditFindings(question, state);
  }

  return {
    totalQuestions: questions.length,
    questionsWithoutSource: state.questionsWithoutSource,
    questionsWithUnsourcedFigures: state.questionsWithUnsourcedFigures,
    questionsWithLocalRulesNotVariable: state.questionsWithLocalRulesNotVariable,
    questionsToReview: state.questionsToReview,
    weakOrVagueSources: state.weakOrVagueSources,
    blockingIssuesCount: state.blockingQuestionIds.size,
  };
}

export function formatQuizSourceAuditReport(report: QuizSourceAuditReport): string {
  const sections = [
    "Audit des sources du quiz CleanMyMap",
    `Questions inspectées: ${report.totalQuestions}`,
    `Questions sans source: ${report.questionsWithoutSource.length}`,
    `Questions avec chiffres non sourcés: ${report.questionsWithUnsourcedFigures.length}`,
    `Questions locales non marquées comme variables: ${report.questionsWithLocalRulesNotVariable.length}`,
    `Questions à relire: ${report.questionsToReview.length}`,
    `Sources faibles ou trop vagues: ${report.weakOrVagueSources.length}`,
    "",
    formatSection("Questions sans source", report.questionsWithoutSource),
    "",
    formatSection("Questions avec chiffres non sourcés", report.questionsWithUnsourcedFigures),
    "",
    formatSection("Questions locales non marquées comme variables", report.questionsWithLocalRulesNotVariable),
    "",
    formatSection("Questions à relire", report.questionsToReview),
    "",
    formatSection("Sources faibles ou trop vagues", report.weakOrVagueSources),
  ];

  return sections.join("\n");
}
