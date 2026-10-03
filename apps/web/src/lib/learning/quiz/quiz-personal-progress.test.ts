import { afterEach, describe, expect, it, vi } from "vitest";

import { QUIZ_REVIEW_TARGETS } from "./quiz-review-targets";
import type { QuizReasoningType } from "./quiz-reasoning-types";
import {
  buildQuizPersonalProgressSnapshot,
  mergeQuizPersonalProgress,
  readQuizPersonalProgress,
  type QuizPersonalProgressQuestion,
} from "./quiz-personal-progress";
import {
  createEmptyQuizPersonalProgressState,
  normalizeQuizPersonalProgressState,
} from "./quiz-personal-progress.normalization";

function makeQuestion(
  id: string,
  reasoningType: QuizReasoningType,
  category: QuizPersonalProgressQuestion["category"],
  overrides: Partial<QuizPersonalProgressQuestion> = {},
): QuizPersonalProgressQuestion {
  return {
    id,
    category,
    reasoningType,
    ...overrides,
  };
}

describe("quiz personal progress", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns no projection for an empty state", () => {
    expect(buildQuizPersonalProgressSnapshot(createEmptyQuizPersonalProgressState())).toBeNull();
  });

  it("rejects invalid versions and malformed storage payloads", () => {
    expect(normalizeQuizPersonalProgressState({ version: 2 })).toBeNull();

    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "{invalid-json",
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });

    expect(readQuizPersonalProgress()).toBeNull();
  });

  it("normalizes finite counters and drops invalid modes or sessions", () => {
    const normalized = normalizeQuizPersonalProgressState({
      version: 1,
      modes: {
        terrain: {
          sessions: "2.9",
          correctAnswers: "Infinity",
          totalQuestions: -4,
          lastPlayedAt: "2026-06-22T08:00:00.000Z",
        },
        invalid: { sessions: 4 },
      },
      skills: {
        terrain: { attempts: "3.9", correctAnswers: 2, lastPlayedAt: "seen" },
      },
      errorTypes: {
        "mauvaise estimation": { count: "2.8", lastSeenAt: "seen" },
      },
      reviewTargets: {
        "/learn/comprendre": { attempts: 1, correctAnswers: 0, lastSeenAt: "seen" },
      },
      recentSessions: [
        { mode: "invalid", score: 4, totalQuestions: 4, accuracy: 1, playedAt: "ignored" },
        { mode: "terrain", score: "2.9", totalQuestions: "4.8", accuracy: "Infinity", playedAt: "kept" },
      ],
    });

    expect(normalized).toEqual({
      version: 1,
      modes: {
        terrain: {
          sessions: 2,
          correctAnswers: 0,
          totalQuestions: 0,
          lastPlayedAt: "2026-06-22T08:00:00.000Z",
        },
      },
      skills: {
        terrain: { attempts: 3, correctAnswers: 2, lastPlayedAt: "seen" },
      },
      errorTypes: {
        "mauvaise estimation": { count: 2, lastSeenAt: "seen" },
      },
      reviewTargets: {
        "/learn/comprendre": {
          label: "/learn/comprendre",
          href: "/learn/comprendre",
          attempts: 1,
          correctAnswers: 0,
          lastSeenAt: "seen",
        },
      },
      recentSessions: [
        {
          mode: "terrain",
          score: 2,
          totalQuestions: 4,
          accuracy: 0,
          playedAt: "kept",
        },
      ],
    });
  });

  it("accumulates mode, skills, errors and rubrics across sessions", () => {
    const firstSession = mergeQuizPersonalProgress(null, {
      mode: "terrain",
      score: 2,
      totalQuestions: 3,
      questions: [
        makeQuestion("q1", "terrain", "action-terrain", { reviewTarget: QUIZ_REVIEW_TARGETS.bonnes_pratiques }),
        makeQuestion("q2", "terrain", "action-terrain", { reviewTarget: QUIZ_REVIEW_TARGETS.bonnes_pratiques }),
        makeQuestion("q3", "comparaison", "climat-biodiversite", { reviewTarget: QUIZ_REVIEW_TARGETS.comprendre }),
      ],
      results: {
        q1: true,
        q2: true,
        q3: false,
      },
      errorCounts: {
        "raisonnement trop simpliste": 1,
      },
      playedAt: "2026-06-22T08:00:00.000Z",
    });

    const nextSession = mergeQuizPersonalProgress(firstSession, {
      mode: "donnees-scientifiques",
      score: 0,
      totalQuestions: 2,
      questions: [
        makeQuestion("q3", "estimation", "impact-methodologie", { reviewTarget: QUIZ_REVIEW_TARGETS.sentrainer }),
        makeQuestion("q4", "estimation", "impact-methodologie", { reviewTarget: QUIZ_REVIEW_TARGETS.sentrainer }),
      ],
      results: {
        q3: false,
        q4: false,
      },
      errorCounts: {
        "mauvaise estimation": 2,
      },
      playedAt: "2026-06-22T09:00:00.000Z",
    });

    const snapshot = buildQuizPersonalProgressSnapshot(nextSession);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.modeStats[0].id).toBe("terrain");
    expect(snapshot?.modeStats.some((mode) => mode.id === "donnees-scientifiques")).toBe(true);
    expect(snapshot?.masteredSkills.some((skill) => skill.label === "terrain")).toBe(true);
    expect(snapshot?.skillsToReview.some((skill) => skill.label === "estimation")).toBe(true);
    expect(snapshot?.errorStats[0]).toEqual(
      expect.objectContaining({ label: "mauvaise estimation", count: 2 }),
    );
    expect(snapshot?.reviewTargets.some((target) => target.href === QUIZ_REVIEW_TARGETS.sentrainer.href)).toBe(true);
    expect(snapshot?.recommendedMode?.id).toBe("donnees-scientifiques");
    expect(snapshot?.modeLevels.some((mode) => mode.id === "terrain" && mode.level >= 1)).toBe(true);
    expect(snapshot?.progressSignals.map((signal) => signal.id)).toEqual([
      "score",
      "regularity",
      "improvement",
    ]);
    expect(snapshot?.badges.some((badge) => badge.label === "Sécurité terrain")).toBe(true);
    expect(snapshot?.badges.some((badge) => badge.label === "Tri fiable")).toBe(true);
  });
});
