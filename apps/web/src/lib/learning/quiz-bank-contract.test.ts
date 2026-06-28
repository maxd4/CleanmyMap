import { describe, expect, it } from "vitest";

import { buildQuizErrorGrid } from "@/components/learn/quiz-error-grid";
import { QUIZ_ACCESS_TYPES, matchesQuizAccessType } from "@/components/learn/quiz-access-types";
import { getQuizReviewTarget } from "@/components/learn/quiz-review-targets";
import { QUIZ_QUESTIONS } from "./quiz-question-bank";
import { buildQuizSchoolSessionDeck, buildQuizSessionDeck } from "./quiz-selection-engine";

const NOW = new Date("2026-06-12T12:00:00.000Z");

describe("quiz bank contract", () => {
  it("selects only questions that match each quiz mode", () => {
    for (const accessType of QUIZ_ACCESS_TYPES.filter((item) => item.id !== "mixte" && item.id !== "ecole")) {
      const deck = buildQuizSessionDeck(
        QUIZ_QUESTIONS,
        {},
        {
          accessTypeId: accessType.id,
          mode: accessType.id,
          sessionSize: QUIZ_QUESTIONS.length,
          now: NOW,
        },
      );

      const expected = QUIZ_QUESTIONS.filter((question) => matchesQuizAccessType(accessType.id, question));

      expect(deck.length, accessType.id).toBe(expected.length);
      expect(deck.every((question) => matchesQuizAccessType(accessType.id, question))).toBe(true);
    }
  });

  it("builds the school deck from curated track lists", () => {
    const schoolDeck = buildQuizSchoolSessionDeck(QUIZ_QUESTIONS, "debat-classe");

    expect(schoolDeck).toHaveLength(15);
    expect(
      schoolDeck.every((question) =>
        [
          "e1",
          "e2",
          "e3",
          "n1",
          "n2",
          "n5",
          "v4",
          "v5",
          "v3",
          "im1",
          "im4",
          "im5",
          "im6",
          "im9",
          "hb2",
        ].includes(question.id),
      ),
    ).toBe(true);
  });

  it("keeps every question assigned to at least one mode and with an explanation", () => {
    expect(QUIZ_QUESTIONS.every((question) => question.explanation.trim().length > 0)).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => question.sourceUrl || question.needsReview)).toBe(true);
    expect(
      QUIZ_QUESTIONS.every((question) =>
        question.needsReview
          ? Boolean(question.sourceUrl && question.sourceLabel && question.sourceType && question.confidenceLevel)
          : true,
      ),
    ).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => question.type !== "multiple-select" || Array.isArray(question.answer))).toBe(true);
    expect(QUIZ_QUESTIONS.every((question) => question.type !== "true-false" || question.options?.length === 2)).toBe(true);
  });

  it("keeps skill, error type and review target coherent", () => {
    expect(QUIZ_QUESTIONS.every((question) => (question.skill ?? question.reasoningType) === question.reasoningType)).toBe(true);
    expect(
      QUIZ_QUESTIONS.every((question) => {
        const derivedErrorType = buildQuizErrorGrid(question).errorType;
        return question.errorType === derivedErrorType;
      }),
    ).toBe(true);
    expect(
      QUIZ_QUESTIONS.every((question) => Boolean(question.reviewTarget ?? question.review)),
    ).toBe(true);
    expect(
      QUIZ_QUESTIONS.every((question) => {
        const derivedTarget = getQuizReviewTarget(question.category, question.reviewTarget ?? question.review, question.reasoningType);
        return [
          "/learn/comprendre",
          "/learn/sentrainer",
          "/learn/bonnes-pratiques",
          "/methodologie",
          "/sections/recycling",
          "/sections/weather",
          "/sections/route",
        ].includes(derivedTarget.href);
      }),
    ).toBe(true);
  });

  it("does not contain duplicate question ids", () => {
    const ids = QUIZ_QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
