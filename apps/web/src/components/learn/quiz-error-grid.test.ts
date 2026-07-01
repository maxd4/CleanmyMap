import { describe, expect, it } from "vitest";

import { buildQuizErrorGrid, getQuizErrorFollowUp, getQuizErrorReviewTarget } from "./quiz-error-grid";

describe("quiz error grid follow-up", () => {
  it("routes security and tri errors toward the existing field rubrics", () => {
    expect(getQuizErrorReviewTarget("erreur de sécurité").href).toBe("/sections/weather");
    expect(getQuizErrorReviewTarget("mauvaise compréhension d'une filière de tri").href).toBe("/sections/recycling");
    expect(getQuizErrorReviewTarget("mauvaise estimation").href).toBe("/methodologie");
  });

  it("attaches a concrete follow-up mode and a short explanation", () => {
    const followUp = getQuizErrorFollowUp("impact indirect ignoré");

    expect(followUp.href).toBe("/learn/comprendre");
    expect(followUp.modeId).toBe("donnees-scientifiques");
    expect(followUp.modeLabel).toBe("Données scientifiques");
    expect(followUp.reason).toContain("méthodologie");
  });

  it("routes tri and security errors to the matching field rubrics", () => {
    expect(getQuizErrorFollowUp("mauvaise compréhension d'une filière de tri").href).toBe("/sections/recycling");
    expect(getQuizErrorFollowUp("mauvaise compréhension d'une filière de tri").modeId).toBe("tri-securite");
    expect(getQuizErrorFollowUp("erreur de sécurité").href).toBe("/sections/weather");
  });

  it("builds a review target from the detected error when no explicit target is provided", () => {
    const grid = buildQuizErrorGrid({
      category: "action-terrain",
      question: "Quels gestes de sécurité faut-il garder face à une seringue usagée ?",
      reasoningType: "terrain",
      type: "multiple-choice",
    });

    expect(grid.errorType).toBe("erreur de sécurité");
    expect(grid.reviewTarget.href).toBe("/sections/weather");
  });
});
