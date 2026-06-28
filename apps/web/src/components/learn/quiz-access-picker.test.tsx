import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuizAccessPicker } from "./quiz-access-picker";
import { QUIZ_REVIEW_TARGETS } from "./quiz-review-targets";
import {
  buildQuizPersonalProgressSnapshot,
  mergeQuizPersonalProgress,
  type QuizPersonalProgressQuestion,
} from "@/lib/learning/quiz-personal-progress";

function makeQuestion(
  id: string,
  reasoningType: QuizPersonalProgressQuestion["reasoningType"],
  category: QuizPersonalProgressQuestion["category"],
): QuizPersonalProgressQuestion {
  return {
    id,
    category,
    reasoningType,
    reviewTarget: QUIZ_REVIEW_TARGETS.bonnes_pratiques,
  };
}

describe("QuizAccessPicker", () => {
  it("renders accessible mode cards and trap-level buttons", () => {
    const progress = mergeQuizPersonalProgress(null, {
      mode: "terrain",
      score: 2,
      totalQuestions: 3,
      questions: [makeQuestion("q1", "terrain", "action-terrain")],
      results: { q1: true },
      errorCounts: {},
      playedAt: "2026-06-24T08:00:00.000Z",
    });
    const snapshot = buildQuizPersonalProgressSnapshot(progress);

    const markup = renderToStaticMarkup(
      React.createElement(QuizAccessPicker, {
        locale: "fr",
        selectedTrapLevel: null,
        personalProgress: snapshot,
        onSelectTrapLevel: () => undefined,
        onSelectAccessType: () => undefined,
        onStartDemoMode: () => undefined,
      }),
    );

    expect(markup).toContain("type=\"button\"");
    expect(markup).toContain("Niveau actuel");
    expect(markup).toContain("Terrain");
    expect(markup).toContain("Mode de piège");
    expect(markup).toContain("Niveau de piégeage");
    expect(markup).toContain("Démo rapide");
    expect(markup).toContain("Lancer la démo");
    expect(markup).toContain("Mode École");
    expect(markup).toContain("Lancer le mode École");
    expect(markup).toContain("Voir le kit enseignant");
    expect(markup).toContain("sans compte obligatoire");
  });
});
