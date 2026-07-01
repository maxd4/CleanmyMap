import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuizPersonalProgressOverview } from "./quiz-personal-progress-overview";
import { QUIZ_REVIEW_TARGETS, type QuizReviewTarget } from "./quiz-review-targets";
import {
  buildQuizPersonalProgressSnapshot,
  mergeQuizPersonalProgress,
  type QuizPersonalProgressQuestion,
} from "@/lib/learning/quiz-personal-progress";

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
});
