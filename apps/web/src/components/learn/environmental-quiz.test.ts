import { describe, expect, it } from "vitest";

import { QUIZ_QUESTIONS } from "./environmental-quiz";
import { QUIZ_REVIEW_TARGETS } from "./quiz-review-targets";

describe("EnvironmentalQuiz", () => {
  const reasoningTypes = [
    "idée reçue",
    "terrain",
    "estimation",
    "comparaison",
    "conséquences indirectes",
    "questions contre-intuitives",
  ] as const;

  it("extends the bank with vulgarisation and contextual tri coverage", () => {
    const vulgarisationQuestions = QUIZ_QUESTIONS.filter(
      (question) => question.category === "Vulgarisation",
    );
    const contextualQuestions = QUIZ_QUESTIONS.filter((question) =>
      [
        "Tri, compost, comportements",
        "Action terrain",
        "Plage",
        "Ville",
        "Événement",
        "Compost domestique",
        "Cas limites",
      ].includes(question.category),
    );
    const trueFalseQuestions = QUIZ_QUESTIONS.filter((question) => question.type === "true-false");

    expect(vulgarisationQuestions.length).toBeGreaterThanOrEqual(3);
    expect(contextualQuestions.length).toBeGreaterThanOrEqual(14);
    expect(trueFalseQuestions.length).toBeGreaterThanOrEqual(4);
    expect(vulgarisationQuestions.every((question) => question.review?.href === QUIZ_REVIEW_TARGETS.vulgarisation.href)).toBe(true);
    expect(contextualQuestions.every((question) => question.review?.href === QUIZ_REVIEW_TARGETS.tri.href)).toBe(true);
    expect(trueFalseQuestions.every((question) => question.options?.length === 2)).toBe(true);
    expect(trueFalseQuestions.every((question) => ["Vrai", "Faux"].includes(question.answer))).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => reasoningTypes.includes(question.reasoningType))).toBe(true);
    expect(new Set(QUIZ_QUESTIONS.map((question) => question.reasoningType)).size).toBe(6);
    expect(contextualQuestions.some((question) => question.category === "Action terrain")).toBe(true);
    expect(contextualQuestions.some((question) => question.category === "Plage")).toBe(true);
    expect(contextualQuestions.some((question) => question.category === "Ville")).toBe(true);
    expect(contextualQuestions.some((question) => question.category === "Événement")).toBe(true);
    expect(contextualQuestions.some((question) => question.category === "Compost domestique")).toBe(true);
    expect(contextualQuestions.some((question) => question.category === "Cas limites")).toBe(true);
  });

  it("rewrites the weakest questions as tricky true-false prompts", () => {
    const targetIds = [
      "e1",
      "e3",
      "n1",
      "n2",
      "n3",
      "n4",
      "n5",
      "i1",
      "i2",
      "i3",
      "i4",
      "i5",
      "i6",
      "i7",
      "i8",
      "x1",
      "x2",
      "x3",
      "x4",
      "x5",
      "x6",
    ];

    const rewrittenQuestions = QUIZ_QUESTIONS.filter((question) => targetIds.includes(question.id));

    expect(rewrittenQuestions).toHaveLength(targetIds.length);
    expect(rewrittenQuestions.every((question) => question.type === "true-false")).toBe(true);
    expect(rewrittenQuestions.every((question) => question.options?.length === 2)).toBe(true);
    expect(rewrittenQuestions.every((question) => ["Vrai", "Faux"].includes(question.answer))).toBe(true);
    expect(rewrittenQuestions.every((question) => question.explanation.length > 20)).toBe(true);
  });
});
