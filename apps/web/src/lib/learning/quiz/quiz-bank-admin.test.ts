import { describe, expect, it } from "vitest";
import { QUIZ_QUESTIONS } from "./quiz-question-bank";
import { buildQuizBankAdminSnapshot } from "./quiz-bank-admin";

describe("quiz bank admin snapshot", () => {
  it("prioritizes review questions and exposes filterable metadata", () => {
    const snapshot = buildQuizBankAdminSnapshot(QUIZ_QUESTIONS);

    expect(snapshot.totalQuestions).toBe(QUIZ_QUESTIONS.length);
    expect(snapshot.questions[0]?.priorityScore ?? 0).toBeGreaterThanOrEqual(
      snapshot.questions.at(-1)?.priorityScore ?? 0,
    );
    expect(snapshot.reviewCount).toBeGreaterThan(0);
    expect(snapshot.questions.some((question) => question.reviewReasons.length > 0)).toBe(true);
    expect(snapshot.byMode.mixte).toBeGreaterThan(0);
    expect(snapshot.byMode.terrain).toBeGreaterThan(0);
  });
});
