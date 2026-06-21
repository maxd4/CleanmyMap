import { describe, expect, it } from "vitest";

import { QUIZ_QUESTIONS } from "./environmental-quiz";
import {
  QUIZ_ACCESS_TYPES,
  getQuizAccessTypesForQuestion,
  listQuizAccessTypeIds,
  matchesQuizAccessType,
} from "./quiz-access-types";
import { getQuizTrapLevel, matchesQuizTrapLevel } from "./quiz-trap-levels";
import { QUIZ_REVIEW_TARGETS, getQuizReviewTarget } from "./quiz-review-targets";

describe("EnvironmentalQuiz", () => {
  const reasoningTypes = [
    "idée reçue",
    "terrain",
    "estimation",
    "comparaison",
    "conséquences indirectes",
    "questions contre-intuitives",
    "cas-limites",
  ] as const;

  it("covers both access types and preserves the reasoning mix", () => {
    const trueFalseQuestions = QUIZ_QUESTIONS.filter((question) => question.type === "true-false");

    expect(QUIZ_ACCESS_TYPES).toHaveLength(7);
    expect(QUIZ_ACCESS_TYPES.every((accessType) => QUIZ_QUESTIONS.some((question) => matchesQuizAccessType(accessType.id, question)))).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => matchesQuizAccessType("mixte", question))).toBe(true);
    expect(trueFalseQuestions.length).toBeGreaterThanOrEqual(4);
    expect(QUIZ_QUESTIONS.some((question) => question.format === "cases-a-cocher")).toBe(true);
    expect(QUIZ_QUESTIONS.some((question) => String(question.format) === "classements")).toBe(false);
    expect(
      QUIZ_QUESTIONS.every((question) => {
        const reviewTargetHref = getQuizReviewTarget(question.category, question.review, question.reasoningType).href;
        return (
          reviewTargetHref === QUIZ_REVIEW_TARGETS.comprendre.href ||
          reviewTargetHref === QUIZ_REVIEW_TARGETS.sentrainer.href ||
          reviewTargetHref === QUIZ_REVIEW_TARGETS.bonnes_pratiques.href
        );
      }),
    ).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => Boolean(question.reviewTarget))).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => Boolean(question.errorType))).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => Boolean(question.misconception))).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => Boolean(question.feedbackCorrect))).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => Boolean(question.feedbackWrong))).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => Boolean(question.severity))).toBe(true);
    expect(new Set(QUIZ_QUESTIONS.map((question) => question.errorType)).size).toBeGreaterThanOrEqual(6);
    expect(trueFalseQuestions.every((question) => question.options?.length === 2)).toBe(true);
    expect(trueFalseQuestions.every((question) => ["Vrai", "Faux"].includes(question.answer as string))).toBe(true);
    expect(
      QUIZ_QUESTIONS.every((question) =>
        reasoningTypes.includes(question.reasoningType as (typeof reasoningTypes)[number]),
      ),
    ).toBe(true);
    expect(new Set(QUIZ_QUESTIONS.map((question) => question.reasoningType)).size).toBe(7);
    expect(QUIZ_QUESTIONS.every((question) => getQuizAccessTypesForQuestion(question).length > 0)).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => ["low", "medium", "high"].includes(getQuizTrapLevel(question)))).toBe(true);
  });

  it("routes the quiz into seven accessible study types", () => {
    expect(listQuizAccessTypeIds()).toEqual([
      "mixte",
      "terrain",
      "donnees-scientifiques",
      "sensibilisation",
      "habitudes-de-vie",
      "ordres-de-grandeur",
      "tri-securite",
    ]);

    const accessTypeCounts = QUIZ_ACCESS_TYPES.reduce(
      (counts, accessType) => {
        counts[accessType.id] = QUIZ_QUESTIONS.filter((question) => matchesQuizAccessType(accessType.id, question)).length;
        return counts;
      },
      {
        terrain: 0,
        "donnees-scientifiques": 0,
        sensibilisation: 0,
        "habitudes-de-vie": 0,
        "ordres-de-grandeur": 0,
        "tri-securite": 0,
        mixte: 0,
      },
    );

    expect(accessTypeCounts.mixte).toBeGreaterThan(0);
    expect(accessTypeCounts.terrain).toBeGreaterThan(0);
    expect(accessTypeCounts["donnees-scientifiques"]).toBeGreaterThan(0);
    expect(accessTypeCounts.sensibilisation).toBeGreaterThan(0);
    expect(accessTypeCounts["habitudes-de-vie"]).toBeGreaterThan(0);
    expect(accessTypeCounts["ordres-de-grandeur"]).toBeGreaterThan(0);
    expect(accessTypeCounts["tri-securite"]).toBeGreaterThan(0);
  });

  it("classifies questions by trap level", () => {
    expect(QUIZ_QUESTIONS.some((question) => matchesQuizTrapLevel("high", question))).toBe(true);
    expect(QUIZ_QUESTIONS.some((question) => matchesQuizTrapLevel("medium", question))).toBe(true);
    expect(QUIZ_QUESTIONS.some((question) => matchesQuizTrapLevel("low", question))).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => matchesQuizTrapLevel(null, question))).toBe(true);
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
    expect(rewrittenQuestions.every((question) => ["Vrai", "Faux"].includes(question.answer as string))).toBe(true);
    expect(rewrittenQuestions.every((question) => question.explanation.length > 20)).toBe(true);
  });
});
