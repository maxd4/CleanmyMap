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

export type QuizProgressTone = "emerald" | "sky" | "amber" | "violet";

export type QuizPersonalProgressSignal = {
  id: "score" | "regularity" | "improvement";
  label: string;
  value: string;
  detail: string;
  tone: QuizProgressTone;
};

export type QuizPersonalModeLevelStat = QuizPersonalProgressModeStat & {
  level: number;
  levelLabel: string;
  detail: string;
  nextLabel: string | null;
  nextSessions: number | null;
};

export type QuizPersonalBadgeStat = {
  id: string;
  label: string;
  description: string;
  href: string;
  attempts: number;
  targetAttempts: number;
  accuracy: number;
  thresholdAccuracy: number;
  unlocked: boolean;
  tone: QuizProgressTone;
  detail: string;
};

export type QuizPersonalProgressSnapshot = {
  modeStats: QuizPersonalProgressModeStat[];
  modeLevels: QuizPersonalModeLevelStat[];
  masteredSkills: QuizPersonalProgressSkillStat[];
  skillsToReview: QuizPersonalProgressSkillStat[];
  errorStats: QuizPersonalProgressErrorStat[];
  reviewTargets: QuizPersonalProgressTargetStat[];
  progressSignals: QuizPersonalProgressSignal[];
  badges: QuizPersonalBadgeStat[];
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
  if (!isRecord(value) || value["version"] !== 1) {
    return null;
  }

  const modes = isRecord(value["modes"]) ? value["modes"] : {};
  const skills = isRecord(value["skills"]) ? value["skills"] : {};
  const errorTypes = isRecord(value["errorTypes"]) ? value["errorTypes"] : {};
  const reviewTargets = isRecord(value["reviewTargets"]) ? value["reviewTargets"] : {};
  const recentSessions = Array.isArray(value["recentSessions"]) ? value["recentSessions"] : [];

  const normalized = createEmptyQuizPersonalProgressState();

  for (const [modeId, entry] of Object.entries(modes)) {
    const normalizedModeId = normalizeModeId(modeId);
    if (!normalizedModeId || !isRecord(entry)) {
      continue;
    }

    const sessions = Number(entry["sessions"]);
    const correctAnswers = Number(entry["correctAnswers"]);
    const totalQuestions = Number(entry["totalQuestions"]);
    const lastPlayedAt = isString(entry["lastPlayedAt"]) ? entry["lastPlayedAt"] : new Date().toISOString();

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

    const attempts = Number(entry["attempts"]);
    const correctAnswers = Number(entry["correctAnswers"]);
    const lastPlayedAt = isString(entry["lastPlayedAt"]) ? entry["lastPlayedAt"] : new Date().toISOString();

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

    const count = Number(entry["count"]);
    const lastSeenAt = isString(entry["lastSeenAt"]) ? entry["lastSeenAt"] : new Date().toISOString();
    normalized.errorTypes[errorType] = {
      count: Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0,
      lastSeenAt,
    };
  }

  for (const [href, entry] of Object.entries(reviewTargets)) {
    if (!isString(href) || !isRecord(entry)) {
      continue;
    }

    const label = isString(entry["label"]) ? entry["label"] : href;
    const attempts = Number(entry["attempts"]);
    const correctAnswers = Number(entry["correctAnswers"]);
    const lastSeenAt = isString(entry["lastSeenAt"]) ? entry["lastSeenAt"] : new Date().toISOString();
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

    const mode = normalizeModeId(entry["mode"]);
    const score = Number(entry["score"]);
    const totalQuestions = Number(entry["totalQuestions"]);
    const accuracy = Number(entry["accuracy"]);
    const playedAt = isString(entry["playedAt"]) ? entry["playedAt"] : new Date().toISOString();

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

const QUIZ_MODE_LEVELS = [
  { level: 0, label: "Démarrage", minSessions: 0, minAccuracy: 0 },
  { level: 1, label: "Découverte", minSessions: 1, minAccuracy: 0.45 },
  { level: 2, label: "Consolidation", minSessions: 3, minAccuracy: 0.55 },
  { level: 3, label: "Rythme stable", minSessions: 5, minAccuracy: 0.65 },
  { level: 4, label: "Maîtrise", minSessions: 8, minAccuracy: 0.75 },
  { level: 5, label: "Référence", minSessions: 12, minAccuracy: 0.82 },
] as const;

function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDeltaPoints(value: number): string {
  const rounded = Math.round(value * 100);
  return `${rounded > 0 ? "+" : ""}${rounded} points`;
}

function getRecentDistinctDays(recentSessions: QuizPersonalProgressState["recentSessions"]): string[] {
  const distinctDays = new Set<string>();

  for (const session of recentSessions) {
    const playedAt = new Date(session.playedAt);
    if (Number.isNaN(playedAt.getTime())) {
      continue;
    }

    distinctDays.add(playedAt.toISOString().slice(0, 10));
  }

  return [...distinctDays].sort((left, right) => right.localeCompare(left, "fr"));
}

function countSessionsSince(recentSessions: QuizPersonalProgressState["recentSessions"], days: number): number {
  const limit = Date.now() - days * 24 * 60 * 60 * 1000;
  return recentSessions.filter((session) => {
    const playedAt = new Date(session.playedAt);
    return !Number.isNaN(playedAt.getTime()) && playedAt.getTime() >= limit;
  }).length;
}

function computeImprovementDelta(recentSessions: QuizPersonalProgressState["recentSessions"]): number | null {
  const lastSix = recentSessions.slice(0, 6);
  if (lastSix.length < 4) {
    return null;
  }

  const recentWindow = lastSix.slice(0, 3);
  const previousWindow = lastSix.slice(3, 6);
  if (previousWindow.length === 0) {
    return null;
  }

  const recentAverage = recentWindow.reduce((sum, session) => sum + session.accuracy, 0) / recentWindow.length;
  const previousAverage = previousWindow.reduce((sum, session) => sum + session.accuracy, 0) / previousWindow.length;
  return recentAverage - previousAverage;
}

function resolveModeLevel(mode: QuizPersonalProgressModeStat): QuizPersonalModeLevelStat {
  const eligibleLevel = [...QUIZ_MODE_LEVELS]
    .reverse()
    .find((level) => mode.sessions >= level.minSessions && mode.accuracy >= level.minAccuracy) ?? QUIZ_MODE_LEVELS[0];

  const nextLevel = QUIZ_MODE_LEVELS.find((level) => level.level === eligibleLevel.level + 1) ?? null;
  const nextSessions = nextLevel ? Math.max(0, nextLevel.minSessions - mode.sessions) : null;

  return {
    ...mode,
    level: eligibleLevel.level,
    levelLabel: eligibleLevel.label,
    detail:
      mode.sessions === 0
        ? "Aucune séance enregistrée."
        : `${mode.sessions} session${mode.sessions > 1 ? "s" : ""} • ${formatPercentage(mode.accuracy)} de réussite`,
    nextLabel: nextLevel ? nextLevel.label : null,
    nextSessions,
  };
}

function buildProgressSignals(
  progress: QuizPersonalProgressState,
): QuizPersonalProgressSignal[] {
  const recentSession = progress.recentSessions[0];
  const activeDays = getRecentDistinctDays(progress.recentSessions);
  const sessionsThisWeek = countSessionsSince(progress.recentSessions, 7);
  const improvementDelta = computeImprovementDelta(progress.recentSessions);

  const scoreSignal: QuizPersonalProgressSignal = recentSession
    ? {
        id: "score",
        label: "Score récent",
        value: `${recentSession.score}/${recentSession.totalQuestions}`,
        detail: `Dernière séance: ${formatPercentage(recentSession.accuracy)} de réussite.`,
        tone: "emerald",
      }
    : {
        id: "score",
        label: "Score récent",
        value: "Aucun score",
        detail: "Commence une première séance pour ouvrir le suivi.",
        tone: "emerald",
      };

  const regularitySignal: QuizPersonalProgressSignal = {
    id: "regularity",
    label: "Régularité",
    value: activeDays.length > 0 ? `${activeDays.length} jour${activeDays.length > 1 ? "s" : ""}` : "0 jour",
    detail:
      sessionsThisWeek > 0
        ? `${sessionsThisWeek} séance${sessionsThisWeek > 1 ? "s" : ""} sur les 7 derniers jours.`
        : "Aucune séance enregistrée cette semaine.",
    tone: "sky",
  };

  const improvementSignal: QuizPersonalProgressSignal = improvementDelta === null
    ? {
        id: "improvement",
        label: "Amélioration",
        value: "À venir",
        detail: "Il faut au moins quelques séances pour mesurer une tendance.",
        tone: "violet",
      }
    : {
        id: "improvement",
        label: "Amélioration",
        value: formatDeltaPoints(improvementDelta),
        detail:
          improvementDelta > 0
            ? "La moyenne des trois dernières séances progresse."
            : improvementDelta < 0
              ? "La moyenne récente baisse légèrement. Le prochain cycle doit rester centré."
              : "La moyenne récente est stable.",
        tone: improvementDelta > 0 ? "emerald" : improvementDelta < 0 ? "amber" : "violet",
      };

  return [scoreSignal, regularitySignal, improvementSignal];
}

function buildBadgeFromStat(params: {
  id: string;
  label: string;
  description: string;
  href: string;
  stat: { attempts: number; accuracy: number } | null;
  targetAttempts: number;
  thresholdAccuracy: number;
  tone: QuizProgressTone;
}): QuizPersonalBadgeStat {
  const attempts = params.stat?.attempts ?? 0;
  const accuracy = params.stat?.accuracy ?? 0;
  const unlocked = attempts >= params.targetAttempts && accuracy >= params.thresholdAccuracy;
  const detail =
    attempts === 0
      ? "Aucune séance enregistrée."
      : `${attempts}/${params.targetAttempts} séances • ${formatPercentage(accuracy)}`;

  return {
    id: params.id,
    label: params.label,
    description: params.description,
    href: params.href,
    attempts,
    targetAttempts: params.targetAttempts,
    accuracy,
    thresholdAccuracy: params.thresholdAccuracy,
    unlocked,
    tone: params.tone,
    detail,
  };
}

function buildProgressBadges(
  skillStats: QuizPersonalProgressSkillStat[],
  reviewTargets: QuizPersonalProgressTargetStat[],
): QuizPersonalBadgeStat[] {
  const skillLookup = new Map(skillStats.map((skill) => [skill.label, skill] as const));
  const reviewTargetLookup = new Map(reviewTargets.map((target) => [target.href, target] as const));

  return [
    buildBadgeFromStat({
      id: "quiz-security-terrain",
      label: "Sécurité terrain",
      description: "Réflexes fiables pour les décisions de terrain et la sécurité.",
      href: "/sections/weather",
      stat: skillLookup.get("terrain") ?? null,
      targetAttempts: 3,
      thresholdAccuracy: 0.75,
      tone: "emerald",
    }),
    buildBadgeFromStat({
      id: "quiz-tri-fiable",
      label: "Tri fiable",
      description: "Repères solides pour suivre la bonne filière de tri.",
      href: "/learn/bonnes-pratiques",
      stat: reviewTargetLookup.get("/learn/bonnes-pratiques") ?? null,
      targetAttempts: 3,
      thresholdAccuracy: 0.75,
      tone: "sky",
    }),
    buildBadgeFromStat({
      id: "quiz-ordres-grandeur",
      label: "Ordres de grandeur",
      description: "Estimations cohérentes et comparaison à la bonne échelle.",
      href: "/learn/comprendre",
      stat: skillLookup.get("estimation") ?? null,
      targetAttempts: 3,
      thresholdAccuracy: 0.75,
      tone: "violet",
    }),
    buildBadgeFromStat({
      id: "quiz-idees-recues",
      label: "Idées reçues",
      description: "Lecture prudente face aux affirmations trop rapides.",
      href: "/learn/comprendre",
      stat: skillLookup.get("idée reçue") ?? null,
      targetAttempts: 3,
      thresholdAccuracy: 0.75,
      tone: "amber",
    }),
    buildBadgeFromStat({
      id: "quiz-impact-local",
      label: "Impact local",
      description: "Prise en compte des effets indirects et des conséquences locales.",
      href: "/learn/comprendre",
      stat: skillLookup.get("conséquences indirectes") ?? null,
      targetAttempts: 3,
      thresholdAccuracy: 0.75,
      tone: "emerald",
    }),
  ].sort((left, right) => Number(right.unlocked) - Number(left.unlocked) || right.attempts - left.attempts || left.label.localeCompare(right.label, "fr"));
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
    .map(([label, entry]) => {
      const attempts = entry["attempts"];
      const correctAnswers = entry["correctAnswers"];
      const lastPlayedAt = entry["lastPlayedAt"];
      return {
        label: label as QuizReasoningType,
        attempts,
        correctAnswers,
        accuracy: getAccuracy(correctAnswers, attempts),
        lastPlayedAt,
      };
    })
    .sort((left, right) => right.attempts - left.attempts || right.accuracy - left.accuracy || left.label.localeCompare(right.label, "fr"));
}

function getErrorStats(progress: QuizPersonalProgressState): QuizPersonalProgressErrorStat[] {
  return Object.entries(progress.errorTypes)
    .map(([label, entry]) => ({
      label,
      count: entry["count"],
      lastSeenAt: entry["lastSeenAt"],
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "fr"));
}

function getReviewTargetStats(progress: QuizPersonalProgressState): QuizPersonalProgressTargetStat[] {
  return Object.values(progress.reviewTargets)
    .map((entry) => {
      const attempts = entry["attempts"];
      const correctAnswers = entry["correctAnswers"];
      const lastSeenAt = entry["lastSeenAt"];
      return {
        label: entry["label"],
        href: entry["href"],
        attempts,
        correctAnswers,
        accuracy: getAccuracy(correctAnswers, attempts),
        lastSeenAt,
      };
    })
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
    label: getQuizAccessType(weakestMode.id).label,
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
  const modeLevels = modeStats.map(resolveModeLevel);
  const progressSignals = buildProgressSignals(progress);
  const badges = buildProgressBadges(skillStats, reviewTargets);
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
    modeLevels,
    masteredSkills,
    skillsToReview,
    errorStats: errorStats.slice(0, 4),
    reviewTargets: reviewTargets.slice(0, 4),
    progressSignals,
    badges,
    recommendedMode,
  };
}
