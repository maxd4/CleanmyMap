import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuizPersonalProgressOverview } from "./quiz-personal-progress-overview";
import { QUIZ_REVIEW_TARGETS, type QuizReviewTarget } from "@/lib/learning/quiz/quiz-review-targets";
import {
  buildQuizPersonalProgressSnapshot,
  mergeQuizPersonalProgress,
  type QuizPersonalProgressQuestion,
} from "@/lib/learning/quiz/quiz-personal-progress";

function makeQuestion(
  id: string,
  reasoningType: QuizPersonalProgressQuestion["reasoningType"],
  category: QuizPersonalProgressQuestion["category"],
  reviewTarget: QuizReviewTarget = QUIZ_REVIEW_TARGETS.comprendre,
): QuizPersonalProgressQuestion {
  return {
    id,
    category,
    reasoningType,
    reviewTarget,
  };
}

describe("QuizPersonalProgressOverview", () => {
  it("renders mode levels, progression signals and pedagogical badges", () => {
    const firstSession = mergeQuizPersonalProgress(null, {
      mode: "terrain",
      score: 2,
      totalQuestions: 3,
      questions: [
        makeQuestion("q1", "terrain", "action-terrain", QUIZ_REVIEW_TARGETS.bonnes_pratiques),
        makeQuestion("q2", "terrain", "action-terrain", QUIZ_REVIEW_TARGETS.bonnes_pratiques),
        makeQuestion("q3", "estimation", "climat-biodiversite", QUIZ_REVIEW_TARGETS.comprendre),
      ],
      results: {
        q1: true,
        q2: true,
        q3: false,
      },
      errorCounts: {
        "mauvaise estimation": 1,
      },
      playedAt: "2026-06-22T08:00:00.000Z",
    });

    const secondSession = mergeQuizPersonalProgress(firstSession, {
      mode: "terrain",
      score: 3,
      totalQuestions: 3,
      questions: [
        makeQuestion("q4", "idée reçue", "climat-biodiversite", QUIZ_REVIEW_TARGETS.comprendre),
        makeQuestion("q5", "conséquences indirectes", "impact-methodologie", QUIZ_REVIEW_TARGETS.comprendre),
        makeQuestion("q6", "terrain", "action-terrain", QUIZ_REVIEW_TARGETS.bonnes_pratiques),
      ],
      results: {
        q4: true,
        q5: true,
        q6: true,
      },
      errorCounts: {},
      playedAt: "2026-06-24T08:00:00.000Z",
    });

    const snapshot = buildQuizPersonalProgressSnapshot(secondSession);

    expect(snapshot).not.toBeNull();

    const markup = renderToStaticMarkup(
      React.createElement(QuizPersonalProgressOverview, {
        locale: "fr",
        snapshot,
      }),
    );

    expect(markup).toContain("Progression récente");
    expect(markup).toContain("Niveau par mode");
    expect(markup).toContain("Badges pédagogiques");
    expect(markup).toContain("Gamification sobre");
    expect(markup).toContain("Prochain badge");
    expect(markup).toContain("Sécurité terrain");
    expect(markup).toContain("Tri fiable");
    expect(markup).toContain("Score récent");
    expect(markup).toContain("Régularité");
    expect(markup).toContain("Amélioration");
  });

  it("fails closed for no session and keeps compact views bounded", () => {
    expect(renderToStaticMarkup(
      React.createElement(QuizPersonalProgressOverview, { locale: "fr", snapshot: null }),
    )).toBe("");

    const session = mergeQuizPersonalProgress(null, {
      mode: "terrain",
      score: 1,
      totalQuestions: 2,
      questions: [
        makeQuestion("compact-1", "terrain", "action-terrain"),
        makeQuestion("compact-2", "estimation", "climat-biodiversite"),
      ],
      results: { "compact-1": true, "compact-2": false },
      errorCounts: { "erreur terrain": 1, "erreur estimation": 2, "erreur troisième": 3 },
      playedAt: "2026-10-30T08:00:00.000Z",
    });
    const snapshot = buildQuizPersonalProgressSnapshot(session);
    expect(snapshot).not.toBeNull();

    const markup = renderToStaticMarkup(
      React.createElement(QuizPersonalProgressOverview, {
        locale: "en",
        density: "compact",
        snapshot: {
          ...snapshot!,
          badges: [
            { id: "badge-unlocked", label: "Unlocked", description: "Done", detail: "Done", href: "/learn", tone: "emerald", unlocked: true, attempts: 2, targetAttempts: 2, accuracy: 1, thresholdAccuracy: 0.8 },
            { id: "badge-locked", label: "Locked", description: "Next", detail: "Next", href: "/learn", tone: "sky", unlocked: false, attempts: 1, targetAttempts: 3, accuracy: 0.33, thresholdAccuracy: 0.8 },
          ],
          errorStats: [
            { label: "First", count: 1, lastSeenAt: null },
            { label: "Second", count: 2, lastSeenAt: null },
            { label: "Third", count: 3, lastSeenAt: null },
          ],
          reviewTargets: [
            { label: "First target", href: "/learn/first", attempts: 2, correctAnswers: 1, accuracy: 0.4, lastSeenAt: null },
            { label: "Second target", href: "/learn/second", attempts: 2, correctAnswers: 0, accuracy: 0.2, lastSeenAt: null },
            { label: "Third target", href: "/learn/third", attempts: 3, correctAnswers: 0, accuracy: 0.1, lastSeenAt: null },
          ],
        },
      }),
    );

    expect(markup).toContain("Personal progress");
    expect(markup).toContain("1 badge unlocked");
    expect(markup).toContain("First target");
    expect(markup).toContain("Second target");
    expect(markup).not.toContain("Third target");
    expect(markup).not.toContain("Third</span>");
  });
});
