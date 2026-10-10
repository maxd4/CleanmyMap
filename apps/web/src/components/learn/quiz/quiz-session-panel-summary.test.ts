import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QUIZ_REVIEW_TARGETS } from "@/lib/learning/quiz/quiz-review-targets";
import type { QuizSessionSummary } from "@/lib/learning/quiz/quiz-session-types";
import { QuizSessionPanelSummary } from "./quiz-session-panel-summary";
import { QuizSessionPanelSummaryRestart } from "./quiz-session-panel-summary-restart";
import { QuizSessionPanelSummaryReview } from "./quiz-session-panel-summary-review";

const baseSummary: QuizSessionSummary = {
  score: 2,
  totalQuestions: 3,
  totalAnswered: 3,
  themesSucceeded: [{ label: "Comprendre", href: "/learn/comprendre", total: 2, correct: 2, accuracy: 1 }],
  themesToReview: [{ label: "S’entraîner", href: "/learn/sentrainer", total: 1, correct: 0, accuracy: 0 }],
  frequentErrorTypes: [{ label: "erreur de sécurité", count: 1 }],
  recommendedMode: {
    id: "terrain",
    label: "Terrain",
    reason: "Ce mode couvre le mieux tes erreurs récentes.",
  },
  recommendedLearningTarget: QUIZ_REVIEW_TARGETS.sentrainer,
  nextReviewTarget: QUIZ_REVIEW_TARGETS.sentrainer,
};

const noop = () => undefined;

function renderSummary(overrides: Partial<React.ComponentProps<typeof QuizSessionPanelSummary>> = {}) {
  return renderToStaticMarkup(
    React.createElement(QuizSessionPanelSummary, {
      locale: "fr",
      isSchoolMode: false,
      isCollectiveMode: false,
      sessionSummary: baseSummary,
      personalProgress: null,
      onResetQuiz: noop,
      onReplayRecommendedMode: noop,
      ...overrides,
    }),
  );
}

function findElements(
  node: React.ReactNode,
  predicate: (element: React.ReactElement<Record<string, unknown>>) => boolean,
): React.ReactElement<Record<string, unknown>>[] {
  if (!React.isValidElement<Record<string, unknown>>(node)) {
    return [];
  }

  const matches = predicate(node) ? [node] : [];
  return matches.concat(
    React.Children.toArray(node.props.children as React.ReactNode).flatMap((child) => findElements(child, predicate)),
  );
}

function invokeFirstButton(node: React.ReactNode) {
  const button = findElements(node, (element) => element.type === "button")[0];
  if (typeof button?.props.onClick === "function") {
    button.props.onClick();
  }
}

describe("QuizSessionPanelSummary", () => {
  it("renders the individual summary with errors, recommendations and an empty-state fallback", () => {
    const markup = renderSummary({
      sessionSummary: {
        ...baseSummary,
        themesSucceeded: [],
        themesToReview: [],
        frequentErrorTypes: [],
        recommendedMode: null,
        recommendedLearningTarget: null,
        nextReviewTarget: null,
      },
    });

    expect(markup).toContain("Bilan de session");
    expect(markup).toContain("Aucune compétence totalement maîtrisée");
    expect(markup).toContain("Types d&#x27;erreurs fréquentes");
    expect(markup).toContain("Aucun mode recommandé");
    expect(markup).toContain("Reprendre la session");
    expect(markup).toContain("Recommencer");
  });

  it("keeps the school individual mode distinct from the collective mode", () => {
    const markup = renderSummary({
      isSchoolMode: true,
      schoolTrackLabel: "Débat en classe",
      schoolKeyMessages: [],
    });

    expect(markup).toContain("Mode École");
    expect(markup).not.toContain("Mode collectif");
    expect(markup).toContain("Atelier de classe: Débat en classe.");
    expect(markup).toContain("On vote d&#x27;abord, puis on explique.");
    expect(markup).toContain("Bilan de l’atelier");
  });

  it("renders the collective school mode and localized catalog labels in English", () => {
    const markup = renderSummary({
      locale: "en",
      isSchoolMode: true,
      isCollectiveMode: true,
      schoolKeyMessages: ["Vote, discuss, then reveal."],
    });

    expect(markup).toContain("Mode collectif");
    expect(markup).toContain("Class workshop");
    expect(markup).toContain("Mastered skills");
    expect(markup).toContain("Notions covered");
    expect(markup).toContain("Frequent error types");
    expect(markup).toContain("Review this notion");
    expect(markup).toContain("Vote, discuss, then reveal.");
  });
});

describe("QuizSessionPanelSummary sections", () => {
  it("keeps replay and restart callbacks attached to their actions", () => {
    let replayCount = 0;
    let resetCount = 0;
    const reviewView = QuizSessionPanelSummaryReview({
      locale: "fr",
      sessionSummary: baseSummary,
      recommendedMode: baseSummary.recommendedMode,
      onReplayRecommendedMode: () => {
        replayCount += 1;
      },
    });
    const restartView = QuizSessionPanelSummaryRestart({
      nextReviewTarget: baseSummary.nextReviewTarget,
      onResetQuiz: () => {
        resetCount += 1;
      },
    });

    invokeFirstButton(reviewView);
    invokeFirstButton(restartView);

    expect(replayCount).toBe(1);
    expect(resetCount).toBe(1);
  });
});
