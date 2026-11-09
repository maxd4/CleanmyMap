export type SpogomiRegistrationQuizOption = {
  id: string;
  label: string;
};

export type SpogomiRegistrationQuizQuestion = {
  id: string;
  prompt: string;
  critical: boolean;
  options: SpogomiRegistrationQuizOption[];
};

export type SpogomiRegistrationQuizMissingItem = {
  id: string;
  label: string;
  status: "incomplete" | "not_verified";
  href: string;
  detail?: string;
};

export type SpogomiRegistrationQuizDefinition = {
  eventId: string;
  divisionId: string;
  regulationVersion: string;
  quizVersion: string;
  available: boolean;
  sourceReference: string | null;
  missing: SpogomiRegistrationQuizMissingItem[];
  questions: SpogomiRegistrationQuizQuestion[];
};

export type SpogomiRegistrationQuizErrorReview = {
  questionId: string;
  explanation: string;
};

export type SpogomiRegistrationQuizEvaluation = {
  passed: boolean;
  quizVersion: string;
  score: number;
  totalQuestions: number;
  criticalCorrect: number;
  criticalTotal: number;
  otherCorrect: number;
  otherTotal: number;
  errors: SpogomiRegistrationQuizErrorReview[];
  proofId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseOptions(value: unknown): SpogomiRegistrationQuizOption[] | null {
  if (!Array.isArray(value)) return null;
  const options = value.map((option) => {
    if (!isRecord(option) || typeof option.id !== "string" || typeof option.label !== "string") return null;
    return { id: option.id, label: option.label };
  });
  return options.every(Boolean) && options.length >= 2 ? options as SpogomiRegistrationQuizOption[] : null;
}

function parseMissing(value: unknown): SpogomiRegistrationQuizMissingItem[] | null {
  if (!Array.isArray(value)) return null;
  const missing = value.map((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.label !== "string" || (item.status !== "incomplete" && item.status !== "not_verified") || typeof item.href !== "string") return null;
    return {
      id: item.id,
      label: item.label,
      status: item.status,
      href: item.href,
      ...(typeof item.detail === "string" ? { detail: item.detail } : {}),
    };
  });
  return missing.every(Boolean) ? missing as SpogomiRegistrationQuizMissingItem[] : null;
}

function parseQuestions(value: unknown): SpogomiRegistrationQuizQuestion[] | null {
  if (!Array.isArray(value)) return null;
  const questions = value.map((question) => {
    if (!isRecord(question) || typeof question.id !== "string" || typeof question.prompt !== "string" || typeof question.critical !== "boolean") return null;
    const options = parseOptions(question.options);
    return options ? { id: question.id, prompt: question.prompt, critical: question.critical, options } : null;
  });
  return questions.every(Boolean) ? questions as SpogomiRegistrationQuizQuestion[] : null;
}

export function parseSpogomiRegistrationQuizDefinition(value: unknown): SpogomiRegistrationQuizDefinition | null {
  if (!isRecord(value) || typeof value.eventId !== "string" || typeof value.divisionId !== "string" || typeof value.regulationVersion !== "string" || typeof value.quizVersion !== "string" || typeof value.available !== "boolean" || (value.sourceReference !== null && typeof value.sourceReference !== "string")) return null;
  const missing = parseMissing(value.missing);
  const questions = parseQuestions(value.questions);
  if (!missing || !questions) return null;
  return {
    eventId: value.eventId,
    divisionId: value.divisionId,
    regulationVersion: value.regulationVersion,
    quizVersion: value.quizVersion,
    available: value.available,
    sourceReference: value.sourceReference as string | null,
    missing,
    questions,
  };
}

export function parseSpogomiRegistrationQuizEvaluation(value: unknown): SpogomiRegistrationQuizEvaluation | null {
  if (!isRecord(value) || typeof value.passed !== "boolean" || typeof value.quizVersion !== "string" || typeof value.score !== "number" || typeof value.totalQuestions !== "number" || typeof value.criticalCorrect !== "number" || typeof value.criticalTotal !== "number" || typeof value.otherCorrect !== "number" || typeof value.otherTotal !== "number" || (value.proofId !== null && typeof value.proofId !== "string") || !Array.isArray(value.errors)) return null;
  const errors = value.errors.map((error) => isRecord(error) && typeof error.questionId === "string" && typeof error.explanation === "string" ? { questionId: error.questionId, explanation: error.explanation } : null);
  if (errors.some((error) => !error)) return null;
  return {
    passed: value.passed,
    quizVersion: value.quizVersion,
    score: value.score,
    totalQuestions: value.totalQuestions,
    criticalCorrect: value.criticalCorrect,
    criticalTotal: value.criticalTotal,
    otherCorrect: value.otherCorrect,
    otherTotal: value.otherTotal,
    errors: errors as SpogomiRegistrationQuizErrorReview[],
    proofId: value.proofId as string | null,
  };
}
