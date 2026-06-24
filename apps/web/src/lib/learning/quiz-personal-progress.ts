import { createLocalStorageStore, isRecord } from "@/lib/storage/local-storage";
import { QUIZ_ACCESS_TYPES, getQuizAccessType, type QuizAccessTypeId } from "@/components/learn/quiz-access-types";
import { getQuizReviewTarget, type QuizQuestionCategory, type QuizReviewTarget } from "@/components/learn/quiz-review-targets";
import type { QuizReasoningType } from "@/components/learn/quiz-reasoning-types";

type QuizPersonalModeProgress = {
  sessions: number;
  correctAnswers: number;
  totalQuestions: number;
  lastPlayedAt: string;
};

type QuizPersonalSkillProgress = {
  attempts: number;
  correctAnswers: number;
  lastPlayedAt: string;
};

type QuizPersonalErrorProgress = {
  count: number;
  lastSeenAt: string;
};

type QuizPersonalReviewTargetProgress = {
  label: string;
  href: string;
  attempts: number;
  correctAnswers: number;
  lastSeenAt: string;
};

export type QuizPersonalProgressState = {
  version: 1;
  modes: Partial<Record<QuizAccessTypeId, QuizPersonalModeProgress>>;
  skills: Partial<Record<QuizReasoningType, QuizPersonalSkillProgress>>;
  errorTypes: Record<string, QuizPersonalErrorProgress>;
  reviewTargets: Record<string, QuizPersonalReviewTargetProgress>;
  recentSessions: Array<{
    mode: QuizAccessTypeId;
    score: number;
    totalQuestions: number;
    accuracy: number;
    playedAt: string;
  }>;
};

export type QuizPersonalProgressQuestion = {
  id: string;
  category: QuizQuestionCategory;
  reasoningType: QuizReasoningType;
  review?: QuizReviewTarget;
  reviewTarget?: QuizReviewTarget;
};

export type QuizPersonalProgressSession = {
  mode: QuizAccessTypeId;
  score: number;
  totalQuestions: number;
  questions: readonly QuizPersonalProgressQuestion[];
  results: Record<string, boolean>;
  errorCounts: Record<string, number>;
  playedAt?: string;
};

export type QuizPersonalProgressModeStat = {
  id: QuizAccessTypeId;
  label: string;
  sessions: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  lastPlayedAt: string | null;
};

export type QuizPersonalProgressSkillStat = {
  label: QuizReasoningType;
  attempts: number;
  correctAnswers: number;
  accuracy: number;
  lastPlayedAt: string | null;
};

export type QuizPersonalProgressErrorStat = {
  label: string;
  count: number;
  lastSeenAt: string | null;
};

export type QuizPersonalProgressTargetStat = {
  label: string;
  href: string;
  attempts: number;
  correctAnswers: number;
  accuracy: number;
  lastSeenAt: string | null;
};

export type QuizPersonalProgressRecommendation = {
  id: QuizAccessTypeId;
  label: string;
  reason: string;
};

export type QuizPersonalProgressSnapshot = {
  modeStats: QuizPersonalProgressModeStat[];
  masteredSkills: QuizPersonalProgressSkillStat[];
  skillsToReview: QuizPersonalProgressSkillStat[];
  errorStats: QuizPersonalProgressErrorStat[];
  reviewTargets: QuizPersonalProgressTargetStat[];
  recommendedMode: QuizPersonalProgressRecommendation | null;
};

const QUIZ_PERSONAL_PROGRESS_STORAGE_KEY = "cleanmymap.quiz.personal-progress";

const quizPersonalProgressStorage = createLocalStorageStore<QuizPersonalProgressState>(
  QUIZ_PERSONAL_PROGRESS_STORAGE_KEY,
  {
    parse: (raw) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        return normalizeQuizPersonalProgressState(parsed);
      } catch {
        return null;
      }
    },
    serialize: (value) => JSON.stringify(value),
  },
);

function createEmptyQuizPersonalProgressState(): QuizPersonalProgressState {
  return {
    version: 1,
    modes: {},
    skills: {},
    errorTypes: {},
    reviewTargets: {},
    recentSessions: [],
  };
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeModeId(value: unknown): QuizAccessTypeId | null {
  if (!isString(value)) {
    return null;
  }

  return QUIZ_ACCESS_TYPES.some((accessType) => accessType.id === value) ? (value as QuizAccessTypeId) : null;
}

function normalizeQuizPersonalProgressState(value: unknown): QuizPersonalProgressState | null {
  if (!isRecord(value) || value.version !== 1) {
    return null;
  }

  const modes = isRecord(value.modes) ? value.modes : {};
  const skills = isRecord(value.skills) ? value.skills : {};
  const errorTypes = isRecord(value.errorTypes) ? value.errorTypes : {};
  const reviewTargets = isRecord(value.reviewTargets) ? value.reviewTargets : {};
  const recentSessions = Array.isArray(value.recentSessions) ? value.recentSessions : [];

  const normalized = createEmptyQuizPersonalProgressState();

  for (const [modeId, entry] of Object.entries(modes)) {
    const normalizedModeId = normalizeModeId(modeId);
    if (!normalizedModeId || !isRecord(entry)) {
      continue;
    }

    const sessions = Number(entry.sessions);
    const correctAnswers = Number(entry.correctAnswers);
    const totalQuestions = Number(entry.totalQuestions);
    const lastPlayedAt = isString(entry.lastPlayedAt) ? entry.lastPlayedAt : new Date().toISOString();

    normalized.modes[normalizedModeId] = {
      sessions: Number.isFinite(sessions) && sessions > 0 ? Math.trunc(sessions) : 0,
      correctAnswers: Number.isFinite(correctAnswers) && correctAnswers > 0 ? Math.trunc(correctAnswers) : 0,
      totalQuestions: Number.isFinite(totalQuestions) && totalQuestions > 0 ? Math.trunc(totalQuestions) : 0,
      lastPlayedAt,
    };
  }

  for (const [skillId, entry] of Object.entries(skills)) {
    if (!isString(skillId) || !isRecord(entry)) {
      continue;
    }

    const attempts = Number(entry.attempts);
    const correctAnswers = Number(entry.correctAnswers);
    const lastPlayedAt = isString(entry.lastPlayedAt) ? entry.lastPlayedAt : new Date().toISOString();

    normalized.skills[skillId as QuizReasoningType] = {
      attempts: Number.isFinite(attempts) && attempts > 0 ? Math.trunc(attempts) : 0,
      correctAnswers: Number.isFinite(correctAnswers) && correctAnswers > 0 ? Math.trunc(correctAnswers) : 0,
      lastPlayedAt,
    };
  }

  for (const [errorType, entry] of Object.entries(errorTypes)) {
    if (!isString(errorType) || !isRecord(entry)) {
      continue;
    }

    const count = Number(entry.count);
    const lastSeenAt = isString(entry.lastSeenAt) ? entry.lastSeenAt : new Date().toISOString();
    normalized.errorTypes[errorType] = {
      count: Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0,
      lastSeenAt,
    };
  }

  for (const [href, entry] of Object.entries(reviewTargets)) {
    if (!isString(href) || !isRecord(entry)) {
      continue;
    }

    const label = isString(entry.label) ? entry.label : href;
    const attempts = Number(entry.attempts);
    const correctAnswers = Number(entry.correctAnswers);
    const lastSeenAt = isString(entry.lastSeenAt) ? entry.lastSeenAt : new Date().toISOString();
    normalized.reviewTargets[href] = {
      label,
      href,
      attempts: Number.isFinite(attempts) && attempts > 0 ? Math.trunc(attempts) : 0,
      correctAnswers: Number.isFinite(correctAnswers) && correctAnswers > 0 ? Math.trunc(correctAnswers) : 0,
      lastSeenAt,
    };
  }

  for (const entry of recentSessions) {
    if (!isRecord(entry)) {
      continue;
    }

    const mode = normalizeModeId(entry.mode);
    const score = Number(entry.score);
    const totalQuestions = Number(entry.totalQuestions);
    const accuracy = Number(entry.accuracy);
    const playedAt = isString(entry.playedAt) ? entry.playedAt : new Date().toISOString();

    if (!mode) {
      continue;
    }

    normalized.recentSessions.push({
      mode,
      score: Number.isFinite(score) ? Math.max(0, Math.trunc(score)) : 0,
      totalQuestions: Number.isFinite(totalQuestions) ? Math.max(0, Math.trunc(totalQuestions)) : 0,
      accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : 0,
      playedAt,
    });
  }

  normalized.recentSessions = normalized.recentSessions.slice(0, 10);
  return normalized;
}

function getAccuracy(correctAnswers: number, totalQuestions: number): number {
  if (totalQuestions <= 0) {
    return 0;
  }

  return correctAnswers / totalQuestions;
}

function getPlayedModeStats(progress: QuizPersonalProgressState): QuizPersonalProgressModeStat[] {
  return QUIZ_ACCESS_TYPES.map((accessType) => {
    const entry = progress.modes[accessType.id];
    return {
      id: accessType.id,
      label: accessType.label,
      sessions: entry?.sessions ?? 0,
      correctAnswers: entry?.correctAnswers ?? 0,
      totalQuestions: entry?.totalQuestions ?? 0,
      accuracy: getAccuracy(entry?.correctAnswers ?? 0, entry?.totalQuestions ?? 0),
      lastPlayedAt: entry?.lastPlayedAt ?? null,
    };
  }).sort((left, right) => {
    if (left.sessions === 0 && right.sessions > 0) {
      return 1;
    }
    if (right.sessions === 0 && left.sessions > 0) {
      return -1;
    }

    return right.accuracy - left.accuracy || right.sessions - left.sessions || left.label.localeCompare(right.label, "fr");
  });
}

function getSkillStats(progress: QuizPersonalProgressState): QuizPersonalProgressSkillStat[] {
  return Object.entries(progress.skills)
    .map(([label, entry]) => ({
      label: label as QuizReasoningType,
      attempts: entry.attempts,
      correctAnswers: entry.correctAnswers,
      accuracy: getAccuracy(entry.correctAnswers, entry.attempts),
      lastPlayedAt: entry.lastPlayedAt,
    }))
    .sort((left, right) => right.attempts - left.attempts || right.accuracy - left.accuracy || left.label.localeCompare(right.label, "fr"));
}

function getErrorStats(progress: QuizPersonalProgressState): QuizPersonalProgressErrorStat[] {
  return Object.entries(progress.errorTypes)
    .map(([label, entry]) => ({
      label,
      count: entry.count,
      lastSeenAt: entry.lastSeenAt,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "fr"));
}

function getReviewTargetStats(progress: QuizPersonalProgressState): QuizPersonalProgressTargetStat[] {
  return Object.values(progress.reviewTargets)
    .map((entry) => ({
      label: entry.label,
      href: entry.href,
      attempts: entry.attempts,
      correctAnswers: entry.correctAnswers,
      accuracy: getAccuracy(entry.correctAnswers, entry.attempts),
      lastSeenAt: entry.lastSeenAt,
    }))
    .sort((left, right) => left.accuracy - right.accuracy || right.attempts - left.attempts || left.label.localeCompare(right.label, "fr"));
}

function buildRecommendation(modeStats: QuizPersonalProgressModeStat[]): QuizPersonalProgressRecommendation | null {
  const playedModes = modeStats.filter((mode) => mode.sessions > 0);
  if (playedModes.length === 0) {
    return {
      id: "mixte",
      label: getQuizAccessType("mixte").label,
      reason: "Aucun historique personnel encore enregistré. Le mode mixte reste le meilleur point de départ.",
    };
  }

  const weakestMode = [...playedModes].sort((left, right) => left.accuracy - right.accuracy || left.sessions - right.sessions || left.label.localeCompare(right.label, "fr"))[0];
  return {
    id: weakestMode.id,
    label: weakestMode.label,
    reason: `C'est ton mode le plus fragile dans l'historique (${Math.round(weakestMode.accuracy * 100)}% de réussite sur ${weakestMode.sessions} session${weakestMode.sessions > 1 ? "s" : ""}).`,
  };
}

export function readQuizPersonalProgress(): QuizPersonalProgressState | null {
  return quizPersonalProgressStorage.read();
}

export function saveQuizPersonalProgress(progress: QuizPersonalProgressState): boolean {
  return quizPersonalProgressStorage.write(progress);
}

export function mergeQuizPersonalProgress(
  previous: QuizPersonalProgressState | null,
  session: QuizPersonalProgressSession,
): QuizPersonalProgressState {
  const current = previous ?? createEmptyQuizPersonalProgressState();
  const playedAt = session.playedAt ?? new Date().toISOString();
  const next = {
    ...current,
    modes: { ...current.modes },
    skills: { ...current.skills },
    errorTypes: { ...current.errorTypes },
    reviewTargets: { ...current.reviewTargets },
    recentSessions: [{ mode: session.mode, score: session.score, totalQuestions: session.totalQuestions, accuracy: getAccuracy(session.score, session.totalQuestions), playedAt }, ...current.recentSessions].slice(0, 10),
  } satisfies QuizPersonalProgressState;

  const currentMode = next.modes[session.mode] ?? {
    sessions: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    lastPlayedAt: playedAt,
  };
  next.modes[session.mode] = {
    sessions: currentMode.sessions + 1,
    correctAnswers: currentMode.correctAnswers + session.score,
    totalQuestions: currentMode.totalQuestions + session.totalQuestions,
    lastPlayedAt: playedAt,
  };

  const answersByQuestionId = session.results;

  for (const question of session.questions) {
    const isAnswered = Object.prototype.hasOwnProperty.call(answersByQuestionId, question.id);
    if (!isAnswered) {
      continue;
    }

    const isCorrect = answersByQuestionId[question.id] ?? false;
    const currentSkill = next.skills[question.reasoningType] ?? {
      attempts: 0,
      correctAnswers: 0,
      lastPlayedAt: playedAt,
    };
    next.skills[question.reasoningType] = {
      attempts: currentSkill.attempts + 1,
      correctAnswers: currentSkill.correctAnswers + (isCorrect ? 1 : 0),
      lastPlayedAt: playedAt,
    };

    const reviewTarget =
      question.reviewTarget ?? question.review ?? getQuizReviewTarget(question.category, undefined, question.reasoningType);
    const currentReviewTarget = next.reviewTargets[reviewTarget.href] ?? {
      label: reviewTarget.label,
      href: reviewTarget.href,
      attempts: 0,
      correctAnswers: 0,
      lastSeenAt: playedAt,
    };
    next.reviewTargets[reviewTarget.href] = {
      label: reviewTarget.label,
      href: reviewTarget.href,
      attempts: currentReviewTarget.attempts + 1,
      correctAnswers: currentReviewTarget.correctAnswers + (isCorrect ? 1 : 0),
      lastSeenAt: playedAt,
    };
  }

  for (const [errorType, count] of Object.entries(session.errorCounts)) {
    if (!isFiniteNumber(count) || count <= 0) {
      continue;
    }

    const currentError = next.errorTypes[errorType] ?? {
      count: 0,
      lastSeenAt: playedAt,
    };
    next.errorTypes[errorType] = {
      count: currentError.count + Math.trunc(count),
      lastSeenAt: playedAt,
    };
  }

  return next;
}

export function buildQuizPersonalProgressSnapshot(
  progress: QuizPersonalProgressState | null,
): QuizPersonalProgressSnapshot | null {
  if (!progress) {
    return null;
  }

  const modeStats = getPlayedModeStats(progress);
  const skillStats = getSkillStats(progress);
  const errorStats = getErrorStats(progress);
  const reviewTargets = getReviewTargetStats(progress);
  const masteredSkills = skillStats.filter((skill) => skill.attempts >= 2 && skill.accuracy >= 0.75).slice(0, 3);
  const skillsToReview = skillStats.filter((skill) => skill.attempts >= 1 && skill.accuracy < 0.75).slice(0, 3);
  const recommendedMode = buildRecommendation(modeStats);

  const hasMeaningfulData =
    modeStats.some((mode) => mode.sessions > 0) ||
    skillStats.length > 0 ||
    errorStats.length > 0 ||
    reviewTargets.length > 0;

  if (!hasMeaningfulData) {
    return null;
  }

  return {
    modeStats,
    masteredSkills,
    skillsToReview,
    errorStats: errorStats.slice(0, 4),
    reviewTargets: reviewTargets.slice(0, 4),
    recommendedMode,
  };
}
