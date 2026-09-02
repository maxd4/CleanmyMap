import { describe, expect, it } from "vitest";

import { buildQuizErrorGrid } from "./quiz-error-grid";
import { QUIZ_ACCESS_TYPES, matchesQuizAccessType } from "./quiz-access-types";
import { getQuizReviewTarget } from "./quiz-review-targets";
import { QUIZ_QUESTIONS } from "./quiz-question-bank";
import { buildQuizSchoolSessionDeck, buildQuizSessionDeck } from "./quiz-selection-engine";
import { QUIZ_SCHOOL_LEVEL_ORDER, QUIZ_SCHOOL_TRACK_ORDER } from "./school/quiz-school-types";

const NOW = new Date("2026-06-12T12:00:00.000Z");

function hasStableQuizQuestionStructure(question: (typeof QUIZ_QUESTIONS)[number]): boolean {
  return (
    question.structure.content.prompt === question.question &&
    question.structure.content.explanation === question.explanation &&
    question.structure.taxonomy.reasoningType === question.reasoningType &&
    question.structure.taxonomy.skill === (question.skill ?? question.reasoningType) &&
    question.structure.source.sourceUrl.length > 0 &&
    question.structure.review.target.href.length > 0 &&
    question.structure.review.followUp.href.length > 0 &&
    question.structure.review.feedbackCorrect.trim().length > 0 &&
    question.structure.review.feedbackWrong.trim().length > 0
  );
}

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

  it("exposes a stable nested structure for content, source and review data", () => {
    expect(QUIZ_QUESTIONS.every(hasStableQuizQuestionStructure)).toBe(true);
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

  it("exposes one normalized school eligibility profile without duplicating question content", () => {
    expect(QUIZ_QUESTIONS.every((question) => question.schoolEligibility)).toBe(true);

    const schoolQuestions = QUIZ_QUESTIONS.filter((question) => question.trackId);
    expect(schoolQuestions.length).toBeGreaterThanOrEqual(40);
    expect(new Set(schoolQuestions.map((question) => question.trackId)).size).toBe(QUIZ_SCHOOL_TRACK_ORDER.length);

    for (const question of schoolQuestions) {
      expect(Object.keys(question.schoolEligibility ?? {})).toEqual(
        expect.arrayContaining(
          QUIZ_SCHOOL_LEVEL_ORDER.filter((level) => Boolean(question.schoolEligibility?.[level])),
        ),
      );
      expect(Object.values(question.schoolEligibility ?? {}).every((profile) => profile.skills.length > 0)).toBe(true);
    }
  });
});
