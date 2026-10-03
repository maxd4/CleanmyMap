import { isRecord } from "@/lib/storage/local-storage";
import { QUIZ_ACCESS_TYPES, type QuizAccessTypeId } from "./quiz-access-types";
import type {
  QuizPersonalErrorProgress,
  QuizPersonalModeProgress,
  QuizPersonalProgressState,
  QuizPersonalReviewTargetProgress,
  QuizPersonalSkillProgress,
} from "./quiz-personal-progress.contracts";

export function createEmptyQuizPersonalProgressState(): QuizPersonalProgressState {
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

function normalizePositiveInteger(value: unknown): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? Math.trunc(normalized) : 0;
}

function normalizeNonNegativeInteger(value: unknown): number {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? Math.max(0, Math.trunc(normalized)) : 0;
}

function normalizeTimestamp(value: unknown): string {
  return isString(value) ? value : new Date().toISOString();
}

function normalizeModeId(value: unknown): QuizAccessTypeId | null {
  if (!isString(value)) {
    return null;
  }

  return QUIZ_ACCESS_TYPES.some((accessType) => accessType.id === value)
    ? (value as QuizAccessTypeId)
    : null;
}

function normalizeModes(value: unknown): QuizPersonalProgressState["modes"] {
  const modes: QuizPersonalProgressState["modes"] = {};
  if (!isRecord(value)) {
    return modes;
  }

  for (const [modeId, entry] of Object.entries(value)) {
    const normalizedModeId = normalizeModeId(modeId);
    if (!normalizedModeId || !isRecord(entry)) {
      continue;
    }

    const normalized: QuizPersonalModeProgress = {
      sessions: normalizePositiveInteger(entry["sessions"]),
      correctAnswers: normalizePositiveInteger(entry["correctAnswers"]),
      totalQuestions: normalizePositiveInteger(entry["totalQuestions"]),
      lastPlayedAt: normalizeTimestamp(entry["lastPlayedAt"]),
    };
    modes[normalizedModeId] = normalized;
  }

  return modes;
}

function normalizeSkills(value: unknown): QuizPersonalProgressState["skills"] {
  const skills: QuizPersonalProgressState["skills"] = {};
  if (!isRecord(value)) {
    return skills;
  }

  for (const [skillId, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue;
    }

    const normalized: QuizPersonalSkillProgress = {
      attempts: normalizePositiveInteger(entry["attempts"]),
      correctAnswers: normalizePositiveInteger(entry["correctAnswers"]),
      lastPlayedAt: normalizeTimestamp(entry["lastPlayedAt"]),
    };
    skills[skillId as keyof QuizPersonalProgressState["skills"]] = normalized;
  }

  return skills;
}

function normalizeErrors(value: unknown): Record<string, QuizPersonalErrorProgress> {
  const errorTypes: Record<string, QuizPersonalErrorProgress> = {};
  if (!isRecord(value)) {
    return errorTypes;
  }

  for (const [errorType, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue;
    }

    errorTypes[errorType] = {
      count: normalizePositiveInteger(entry["count"]),
      lastSeenAt: normalizeTimestamp(entry["lastSeenAt"]),
    };
  }

  return errorTypes;
}

function normalizeReviewTargets(
  value: unknown,
): Record<string, QuizPersonalReviewTargetProgress> {
  const reviewTargets: Record<string, QuizPersonalReviewTargetProgress> = {};
  if (!isRecord(value)) {
    return reviewTargets;
  }

  for (const [href, entry] of Object.entries(value)) {
    if (!isRecord(entry)) {
      continue;
    }

    reviewTargets[href] = {
      label: isString(entry["label"]) ? entry["label"] : href,
      href,
      attempts: normalizePositiveInteger(entry["attempts"]),
      correctAnswers: normalizePositiveInteger(entry["correctAnswers"]),
      lastSeenAt: normalizeTimestamp(entry["lastSeenAt"]),
    };
  }

  return reviewTargets;
}

function normalizeRecentSessions(value: unknown): QuizPersonalProgressState["recentSessions"] {
  if (!Array.isArray(value)) {
    return [];
  }

  const recentSessions: QuizPersonalProgressState["recentSessions"] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const mode = normalizeModeId(entry["mode"]);
    if (!mode) {
      continue;
    }

    const score = Number(entry["score"]);
    const accuracy = Number(entry["accuracy"]);
    recentSessions.push({
      mode,
      score: normalizeNonNegativeInteger(score),
      totalQuestions: normalizeNonNegativeInteger(entry["totalQuestions"]),
      accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : 0,
      playedAt: normalizeTimestamp(entry["playedAt"]),
    });
  }

  return recentSessions.slice(0, 10);
}

export function normalizeQuizPersonalProgressState(
  value: unknown,
): QuizPersonalProgressState | null {
  if (!isRecord(value) || value["version"] !== 1) {
    return null;
  }

  return {
    version: 1,
    modes: normalizeModes(value["modes"]),
    skills: normalizeSkills(value["skills"]),
    errorTypes: normalizeErrors(value["errorTypes"]),
    reviewTargets: normalizeReviewTargets(value["reviewTargets"]),
    recentSessions: normalizeRecentSessions(value["recentSessions"]),
  };
}
