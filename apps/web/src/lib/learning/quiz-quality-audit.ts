import type { QuizQuestion } from "../../components/learn/environmental-quiz";
import { getQuizAccessTypesForQuestion } from "../../components/learn/quiz-access-types.ts";
import { getQuizReviewTarget } from "../../components/learn/quiz-review-targets.ts";
import type {
  QuizConfidenceLevel,
  QuizLocalScope,
  QuizSourceType,
} from "./quiz-source-metadata.ts";

export type QuizQualityCriterionId =
  | "interet-pedagogique"
  | "niveau-de-reflexion"
  | "caractere-piegeux-mais-juste"
  | "qualite-de-l-explication"
  | "lien-avec-cleanmymap"
  | "utilite-terrain-ou-scientifique"
  | "absence-de-reponse-evidente"
  | "traçabilité-des-sources";

export type QuizQualityCriterionState = "pass" | "warn" | "fail";

export type QuizQualityCriterion = {
  id: QuizQualityCriterionId;
  label: string;
  state: QuizQualityCriterionState;
  message: string;
};

export type QuizQualityFinding = {
  questionId: string;
  question: string;
  answer: string;
  reviewTarget: string;
  criteria: QuizQualityCriterion[];
  warnings: QuizQualityCriterion[];
  errors: QuizQualityCriterion[];
};

export type QuizQualityReport = {
  totalQuestions: number;
  totalWarnings: number;
  totalErrors: number;
  findings: QuizQualityFinding[];
};

const REFLECTION_PATTERNS = [
  /\bpourquoi\b/i,
  /\bcomment\b/i,
  /\bqu['’]est-ce qui\b/i,
  /\bdans quel cas\b/i,
  /\bquelle différence\b/i,
  /\bquel effet\b/i,
  /\bquel impact\b/i,
  /\bquelle conséquence\b/i,
  /\bselon\b/i,
  /\blorsque\b/i,
  /\bquand\b/i,
  /\bsi\b/i,
];

const DOMAIN_PATTERNS = [
  /\btri\b/i,
  /\brecycl/i,
  /\bcompost/i,
  /\bdéchet/i,
  /\bdechet/i,
  /\bplast/i,
  /\bimpact\b/i,
  /\bconsigne\b/i,
  /\bcleanwalk\b/i,
  /\bterrain\b/i,
  /\bco2\b/i,
  /\bbiodivers/i,
  /\bclimat\b/i,
  /\bocéan\b/i,
  /\bocean\b/i,
  /\beau\b/i,
  /\bénergie\b/i,
  /\benergie\b/i,
  /\bméthodolog/i,
  /\bmethodolog/i,
  /\bacv\b/i,
  /\bproxy\b/i,
  /\bcontexte\b/i,
  /\béchelle\b/i,
  /\bechelle\b/i,
  /\bmesure\b/i,
  /\bindicateur\b/i,
  /\bcomparaison\b/i,
  /\bréemploi\b/i,
  /\breemploi\b/i,
  /\bproportion\b/i,
  /\bquestion\b/i,
  /\bnettoyage\b/i,
  /\bsource\b/i,
  /\bmégot\b/i,
  /\bmegot\b/i,
];

const MECHANISM_PATTERNS = [
  /\bparce que\b/i,
  /\bcar\b/i,
  /\bdonc\b/i,
  /\bainsi\b/i,
  /\bce qui\b/i,
  /\bmécanisme\b/i,
  /\bmecanisme\b/i,
  /\bconséquence\b/i,
  /\bconsequence\b/i,
  /\bcontamin/i,
  /\bfilière\b/i,
  /\bfiliere\b/i,
  /\bcycle\b/i,
  /\bénergie\b/i,
  /\benergie\b/i,
  /\beau\b/i,
  /\bimpact\b/i,
  /\btraitement\b/i,
  /\bcollecte\b/i,
  /\brisque\b/i,
  /\btransfert\b/i,
  /\bacidifi/i,
  /\bprox[iy]/i,
  /\bpermet\b/i,
  /\bpermettre\b/i,
  /\bévite\b/i,
  /\bevite\b/i,
  /\blimite\b/i,
  /\blimite\b/i,
  /\bréduit\b/i,
  /\breduit\b/i,
  /\baugmente\b/i,
  /\bmontre\b/i,
  /\baide\b/i,
  /\borganise\b/i,
  /\bchange\b/i,
  /\bprotège\b/i,
  /\bprotege\b/i,
  /\bdepend\b/i,
  /\bdépend\b/i,
  /\bgarde\b/i,
  /\bprolonge\b/i,
  /\bfragilise\b/i,
  /\btransporte\b/i,
  /\brelie\b/i,
  /\bindique\b/i,
  /\breste\b/i,
  /\bnécessite\b/i,
  /\bnecessite\b/i,
  /\breprésente\b/i,
  /\brepresente\b/i,
  /\bprovient\b/i,
  /\bproduit\b/i,
  /\babsorbe\b/i,
  /\bconcentre\b/i,
  /\brévèle\b/i,
  /\brevele\b/i,
];

const DIRECT_PROMPT_PATTERNS = [
  /\bquel est le bon réflexe\b/i,
  /\bquel est le meilleur réflexe\b/i,
  /\bquelle est la bonne attitude\b/i,
  /\bque faut-il faire\b/i,
  /\bque doit-on faire\b/i,
  /\bquel réflexe adopter\b/i,
  /\bque faire\b/i,
];

const OBVIOUS_PROMPT_PATTERNS = [
  /^quel réflexe\b/i,
  /^quel déchet\b/i,
  /^quel objet\b/i,
  /^quel dispositif\b/i,
  /^quel avantage\b/i,
  /^quel est l'avantage principal\b/i,
  /^quelle consigne\b/i,
];

const ABSURD_DISTRACTOR_PATTERNS = [
  /\btout mélanger\b/i,
  /\btout melanger\b/i,
  /\bau hasard\b/i,
  /\bn'importe où\b/i,
  /\bnimporte ou\b/i,
  /\bpremier bac venu\b/i,
  /\bsans vérifier\b/i,
  /\bsans verifier\b/i,
  /\blaisser au sable\b/i,
  /\blaisser de côté\b/i,
  /\blaisser de cote\b/i,
  /\battendre la fin\b/i,
  /\bimproviser\b/i,
  /\bjeter directement\b/i,
  /\ble laisser sans traitement\b/i,
];

const REASONING_TYPES_WITH_STRONG_REFLECTION = new Set([
  "estimation",
  "comparaison",
  "conséquences indirectes",
  "consequences indirectes",
  "questions contre-intuitives",
  "mini-enquetes",
  "cas-limites",
]);

const REASONING_TYPES_WITH_FIELD_CONTEXT = new Set([
  "terrain",
  "idée reçue",
  "idee reçue",
  "estimation",
  "comparaison",
  "conséquences indirectes",
  "consequences indirectes",
  "questions contre-intuitives",
  "mini-enquetes",
  "cas-limites",
]);

const VALID_SOURCE_TYPES = new Set<QuizSourceType>([
  "institutionnelle",
  "scientifique",
  "associative",
  "presse",
  "interne",
  "estimation",
]);

const VALID_CONFIDENCE_LEVELS = new Set<QuizConfidenceLevel>(["élevé", "moyen", "faible"]);

const VALID_LOCAL_SCOPES = new Set<QuizLocalScope>([
  "national",
  "regional",
  "departemental",
  "communal",
  "variable",
]);

const SOURCE_REQUIRED_CATEGORIES = new Set([
  "tri-recyclage",
  "climat-biodiversite",
  "impact-methodologie",
  "action-terrain",
]);

const ESTIMATION_KEYWORDS = [
  /\bordre de grandeur\b/i,
  /\benviron\b/i,
  /\bpourcentage\b/i,
  /\b%\b/i,
  /\blitres?\b/i,
  /\bans?\b/i,
  /\bannées?\b/i,
  /\bcombien\b/i,
];

const LOCAL_RULE_KEYWORDS = [
  /\bconsigne locale\b/i,
  /\bpanneaux? de tri\b/i,
  /\bdéchetterie\b/i,
  /\bbac de tri\b/i,
];

const SAFETY_KEYWORDS = [
  /\bseringue\b/i,
  /\bbidon\b/i,
  /\bgaz\b/i,
  /\bcoupant\b/i,
  /\bsouillé\b/i,
  /\bouvrir\b/i,
  /\bmanipuler\b/i,
  /\bblesse\b/i,
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function wordCount(value: string): number {
  return normalizeText(value)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;
}

function containsPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function getAnswerText(question: QuizQuestion): string {
  return Array.isArray(question.answer) ? question.answer.join(" / ") : question.answer;
}

function getQuestionSummary(question: QuizQuestion): string {
  return `${question.question} ${question.explanation} ${getAnswerText(question)}`;
}

function hasDomainLink(question: QuizQuestion): boolean {
  return containsPattern(getQuestionSummary(question), DOMAIN_PATTERNS);
}

function hasSourceMetadata(question: QuizQuestion): boolean {
  return Boolean(
    question.sourceUrl &&
      question.sourceLabel &&
      question.sourceType &&
      question.confidenceLevel &&
      question.localScope &&
      question.lastCheckedAt,
  );
}

function isExternalSourceUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isValidSourceDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function requiresSource(question: QuizQuestion): boolean {
  return SOURCE_REQUIRED_CATEGORIES.has(question.category) || containsPattern(getQuestionSummary(question), [
    /\d/,
    /%/,
    /\benviron\b/i,
    /\border de grandeur\b/i,
  ]);
}

function hasEstimationCue(question: QuizQuestion): boolean {
  return question.reasoningType === "estimation" || containsPattern(getQuestionSummary(question), ESTIMATION_KEYWORDS);
}

function hasLocalRuleCue(question: QuizQuestion): boolean {
  return containsPattern(getQuestionSummary(question), LOCAL_RULE_KEYWORDS);
}

function hasSafetyCue(question: QuizQuestion): boolean {
  return containsPattern(getQuestionSummary(question), SAFETY_KEYWORDS);
}

function explanationTeaches(question: QuizQuestion): boolean {
  const explanation = question.explanation.trim();
  const normalizedExplanation = normalizeText(explanation);
  const normalizedAnswer = normalizeText(getAnswerText(question));

  if (explanation.length < 40) {
    return false;
  }

  if (normalizedExplanation === normalizedAnswer) {
    return false;
  }

  if (normalizedExplanation === `faux` || normalizedExplanation === `vrai`) {
    return false;
  }

  return containsPattern(explanation, MECHANISM_PATTERNS);
}

function explanationLength(question: QuizQuestion): number {
  return wordCount(question.explanation);
}

function hasDirectPrompt(question: QuizQuestion): boolean {
  return containsPattern(question.question, DIRECT_PROMPT_PATTERNS);
}

function hasObviousPrompt(question: QuizQuestion): boolean {
  return containsPattern(question.question, OBVIOUS_PROMPT_PATTERNS);
}

function hasAbsurdDistractors(question: QuizQuestion): boolean {
  if (question.type !== "multiple-choice" || !question.options?.length) {
    return false;
  }

  const answerText = normalizeText(getAnswerText(question));
  const wrongOptions = question.options.filter((option) => normalizeText(option) !== answerText);
  const suspiciousWrongOptions = wrongOptions.filter((option) =>
    containsPattern(option, ABSURD_DISTRACTOR_PATTERNS),
  );

  return suspiciousWrongOptions.length >= 2;
}

function hasMeaningfulReflection(question: QuizQuestion): boolean {
  if (REASONING_TYPES_WITH_STRONG_REFLECTION.has(question.reasoningType)) {
    return true;
  }

  return containsPattern(question.question, REFLECTION_PATTERNS);
}

function hasFieldUtility(question: QuizQuestion): boolean {
  const accessTypes = getQuizAccessTypesForQuestion(question);
  const questionReviewTarget = getQuizReviewTarget(question.category, question.reviewTarget, question.reasoningType);

  return accessTypes.length > 0 && Boolean(questionReviewTarget.href);
}

function isQuestionTooEasy(question: QuizQuestion): boolean {
  return hasDirectPrompt(question) || hasObviousPrompt(question);
}

function validateSourceMetadata(question: QuizQuestion): QuizQualityCriterion {
  if (!hasSourceMetadata(question)) {
    if (question.needsReview && question.reasoningType === "terrain" && !requiresSource(question)) {
      return buildCriterion(
        "traçabilité-des-sources",
        "Traçabilité des sources",
        "warn",
        "La question peut rester sans source seulement si elle demeure un raisonnement terrain général et qu'elle est marquée needsReview.",
      );
    }

    return buildCriterion(
      "traçabilité-des-sources",
      "Traçabilité des sources",
      "fail",
      "La question doit afficher une source, un type de source, un niveau de confiance, un périmètre local et une date de vérification.",
    );
  }

  const issues: string[] = [];

  if (!VALID_SOURCE_TYPES.has(question.sourceType!)) {
    issues.push("le type de source est invalide");
  }

  if (!VALID_CONFIDENCE_LEVELS.has(question.confidenceLevel!)) {
    issues.push("le niveau de confiance est invalide");
  }

  if (!VALID_LOCAL_SCOPES.has(question.localScope!)) {
    issues.push("le périmètre local est invalide");
  }

  if (!isValidSourceDate(question.lastCheckedAt!)) {
    issues.push("la date de vérification n'est pas au format ISO attendu");
  }

  if (question.sourceType === "estimation" && !hasEstimationCue(question)) {
    issues.push("la source est marquée en estimation sans question d'ordre de grandeur");
  }

  if (question.isLocalRule && question.localScope !== "variable") {
    issues.push("une consigne locale doit être marquée comme variable");
  }

  if (!question.isLocalRule && hasLocalRuleCue(question)) {
    issues.push("la question ressemble à une consigne locale mais n'est pas marquée comme telle");
  }

  if (question.sourceUrl && isExternalSourceUrl(question.sourceUrl) && !question.sourceLabel?.trim()) {
    issues.push("une URL externe doit être accompagnée d'un libellé de source");
  }

  const severity: QuizQualityCriterionState = issues.length > 0 ? "fail" : "pass";
  const message =
    issues.length > 0
      ? `Traçabilité incomplète: ${issues.join(", ")}.`
      : question.needsReview
        ? "Source documentée; la question reste signalée needsReview pour relecture éditoriale."
        : "La source est documentée et cohérente avec le type de question.";

  return buildCriterion("traçabilité-des-sources", "Traçabilité des sources", severity, message);
}

function buildCriterion(
  id: QuizQualityCriterionId,
  label: string,
  state: QuizQualityCriterionState,
  message: string,
): QuizQualityCriterion {
  return { id, label, state, message };
}

export function auditQuizQuestion(question: QuizQuestion): QuizQualityFinding {
  const criteria: QuizQualityCriterion[] = [
    buildCriterion(
      "interet-pedagogique",
      "Intérêt pédagogique",
      hasDomainLink(question) && question.reasoningType ? "pass" : "warn",
      hasDomainLink(question)
        ? "La question reste ancrée dans un contenu CleanMyMap identifiable."
        : "La question manque de lien explicite avec le vocabulaire et les enjeux CleanMyMap.",
    ),
    buildCriterion(
      "niveau-de-reflexion",
      "Niveau de réflexion demandé",
      hasMeaningfulReflection(question) ? "pass" : "warn",
      hasMeaningfulReflection(question)
        ? "La formulation pousse à interpréter, comparer ou contextualiser."
        : "La formulation gagne à créer davantage de doute utile ou de mise en contexte.",
    ),
    buildCriterion(
      "caractere-piegeux-mais-juste",
      "Caractère piégeux mais juste",
      hasDirectPrompt(question) || hasAbsurdDistractors(question) ? "fail" : "pass",
      hasDirectPrompt(question)
        ? "La question emploie une consigne trop directive."
        : hasAbsurdDistractors(question)
          ? "Les mauvaises réponses paraissent trop caricaturales."
          : "Le piège reste lisible sans orienter trop vite la réponse.",
    ),
    buildCriterion(
      "qualite-de-l-explication",
      "Qualité de l'explication",
      explanationLength(question) >= 15 && !explanationTeaches(question)
        ? "warn"
        : explanationLength(question) >= 8 && explanationTeaches(question)
          ? "pass"
          : "fail",
      explanationLength(question) >= 15 && explanationTeaches(question)
        ? "L'explication apporte un mécanisme ou une conséquence utile."
        : explanationLength(question) >= 15
          ? "L'explication est lisible, mais elle gagnerait à expliciter davantage le mécanisme."
          : "L'explication doit enseigner quelque chose de plus que la réponse brute.",
    ),
    buildCriterion(
      "lien-avec-cleanmymap",
      "Lien avec CleanMyMap",
      hasDomainLink(question) ? "pass" : "warn",
      hasDomainLink(question)
        ? "Le vocabulaire renvoie clairement à un enjeu utile pour CleanMyMap."
        : "La question ne se rattache pas assez nettement au champ CleanMyMap.",
    ),
    buildCriterion(
      "utilite-terrain-ou-scientifique",
      "Utilité terrain ou scientifique",
      hasFieldUtility(question) && REASONING_TYPES_WITH_FIELD_CONTEXT.has(question.reasoningType)
        ? "pass"
        : "fail",
      hasFieldUtility(question)
        ? "La question se relie à un mode, une compétence et une rubriques de révision utilisables."
        : "La question devrait mieux s'adosser à un mode de quiz ou à une compétence ciblée.",
    ),
    validateSourceMetadata(question),
    buildCriterion(
      "absence-de-reponse-evidente",
      "Absence de réponse évidente",
      isQuestionTooEasy(question) ? "warn" : "pass",
      isQuestionTooEasy(question)
        ? "La bonne réponse paraît trop vite devinable."
        : "La réponse ne saute pas aux yeux avant lecture attentive.",
    ),
  ];

  const warnings = criteria.filter((criterion) => criterion.state === "warn");
  const errors = criteria.filter((criterion) => criterion.state === "fail");
  const reviewTarget = getQuizReviewTarget(question.category, question.reviewTarget, question.reasoningType);

  return {
    questionId: question.id,
    question: question.question,
    answer: getAnswerText(question),
    reviewTarget: reviewTarget.href,
    criteria,
    warnings,
    errors,
  };
}

export function auditQuizBank(questions: readonly QuizQuestion[]): QuizQualityReport {
  const findings = questions.map((question) => auditQuizQuestion(question));

  return {
    totalQuestions: findings.length,
    totalWarnings: findings.reduce((sum, finding) => sum + finding.warnings.length, 0),
    totalErrors: findings.reduce((sum, finding) => sum + finding.errors.length, 0),
    findings,
  };
}

export function formatQuizQualityReport(report: QuizQualityReport): string {
  const lines = [
    "Audit qualité quiz CleanMyMap",
    `Questions inspectées: ${report.totalQuestions}`,
    `Avertissements: ${report.totalWarnings}`,
    `Erreurs: ${report.totalErrors}`,
  ];

  for (const finding of report.findings) {
    if (finding.errors.length === 0 && finding.warnings.length === 0) {
      continue;
    }

    lines.push("");
    lines.push(`- ${finding.questionId}: ${finding.question}`);
    for (const criterion of finding.criteria) {
      if (criterion.state === "pass") {
        continue;
      }

      const prefix = criterion.state === "fail" ? "ERREUR" : "AVERTISSEMENT";
      lines.push(`  ${prefix} [${criterion.label}] ${criterion.message}`);
    }
  }

  return lines.join("\n");
}
