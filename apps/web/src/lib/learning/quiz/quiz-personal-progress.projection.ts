import { getQuizAccessType, QUIZ_ACCESS_TYPES } from "./quiz-access-types";
import type {
  QuizPersonalModeLevelStat,
  QuizPersonalProgressErrorStat,
  QuizPersonalProgressModeStat,
  QuizPersonalProgressRecommendation,
  QuizPersonalProgressSignal,
  QuizPersonalProgressSkillStat,
  QuizPersonalProgressSnapshot,
  QuizPersonalProgressState,
  QuizPersonalProgressTargetStat,
  QuizPersonalBadgeStat,
  QuizProgressTone,
} from "./quiz-personal-progress.contracts";

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

function getRecentDistinctDays(
  recentSessions: QuizPersonalProgressState["recentSessions"],
): string[] {
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

function countSessionsSince(
  recentSessions: QuizPersonalProgressState["recentSessions"],
  days: number,
): number {
  const limit = Date.now() - days * 24 * 60 * 60 * 1000;
  return recentSessions.filter((session) => {
    const playedAt = new Date(session.playedAt);
    return !Number.isNaN(playedAt.getTime()) && playedAt.getTime() >= limit;
  }).length;
}

function computeImprovementDelta(
  recentSessions: QuizPersonalProgressState["recentSessions"],
): number | null {
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

type QuizBadgeDefinition = {
  id: string;
  label: string;
  description: string;
  href: string;
  source: { type: "skill" | "review"; key: string };
  tone: QuizProgressTone;
};

const QUIZ_BADGE_DEFINITIONS: readonly QuizBadgeDefinition[] = [
  {
    id: "quiz-security-terrain",
    label: "Sécurité terrain",
    description: "Réflexes fiables pour les décisions de terrain et la sécurité",
    href: "/actions/new?panel=meteo",
    source: { type: "skill", key: "terrain" },
    tone: "emerald",
  },
  {
    id: "quiz-tri-fiable",
    label: "Tri fiable",
    description: "Repères solides pour suivre la bonne filière de tri.",
    href: "/learn/bonnes-pratiques",
    source: { type: "review", key: "/learn/bonnes-pratiques" },
    tone: "sky",
  },
  {
    id: "quiz-ordres-grandeur",
    label: "Ordres de grandeur",
    description: "Estimations cohérentes et comparaison à la bonne échelle.",
    href: "/learn/comprendre",
    source: { type: "skill", key: "estimation" },
    tone: "violet",
  },
  {
    id: "quiz-idees-recues",
    label: "Idées reçues",
    description: "Lecture prudente face aux affirmations trop rapides.",
    href: "/learn/comprendre",
    source: { type: "skill", key: "idée reçue" },
    tone: "amber",
  },
  {
    id: "quiz-impact-local",
    label: "Impact local",
    description: "Prise en compte des effets indirects et des conséquences locales.",
    href: "/learn/comprendre",
    source: { type: "skill", key: "conséquences indirectes" },
    tone: "emerald",
  },
] as const;

function buildProgressBadges(
  skillStats: QuizPersonalProgressSkillStat[],
  reviewTargets: QuizPersonalProgressTargetStat[],
): QuizPersonalBadgeStat[] {
  const skillLookup = new Map(skillStats.map((skill) => [skill.label, skill] as const));
  const reviewTargetLookup = new Map(reviewTargets.map((target) => [target.href, target] as const));

  return QUIZ_BADGE_DEFINITIONS.map((definition) =>
    buildBadgeFromStat({
      ...definition,
      stat:
        definition.source.type === "skill"
          ? skillLookup.get(definition.source.key as QuizPersonalProgressSkillStat["label"]) ?? null
          : reviewTargetLookup.get(definition.source.key) ?? null,
      targetAttempts: 3,
      thresholdAccuracy: 0.75,
    }),
  ).sort(
    (left, right) =>
      Number(right.unlocked) - Number(left.unlocked) ||
      right.attempts - left.attempts ||
      left.label.localeCompare(right.label, "fr"),
  );
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
      label: label as QuizPersonalProgressSkillStat["label"],
      attempts: entry["attempts"],
      correctAnswers: entry["correctAnswers"],
      accuracy: getAccuracy(entry["correctAnswers"], entry["attempts"]),
      lastPlayedAt: entry["lastPlayedAt"],
    }))
    .sort(
      (left, right) =>
        right.attempts - left.attempts ||
        right.accuracy - left.accuracy ||
        left.label.localeCompare(right.label, "fr"),
    );
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
    .map((entry) => ({
      label: entry["label"],
      href: entry["href"],
      attempts: entry["attempts"],
      correctAnswers: entry["correctAnswers"],
      accuracy: getAccuracy(entry["correctAnswers"], entry["attempts"]),
      lastSeenAt: entry["lastSeenAt"],
    }))
    .sort(
      (left, right) =>
        left.accuracy - right.accuracy ||
        right.attempts - left.attempts ||
        left.label.localeCompare(right.label, "fr"),
    );
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

  const weakestMode = [...playedModes].sort(
    (left, right) =>
      left.accuracy - right.accuracy ||
      left.sessions - right.sessions ||
      left.label.localeCompare(right.label, "fr"),
  )[0];
  return {
    id: weakestMode.id,
    label: getQuizAccessType(weakestMode.id).label,
    reason: `C'est ton mode le plus fragile dans l'historique (${Math.round(weakestMode.accuracy * 100)}% de réussite sur ${weakestMode.sessions} session${weakestMode.sessions > 1 ? "s" : ""}).`,
  };
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
