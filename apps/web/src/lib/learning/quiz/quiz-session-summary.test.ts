import { describe, expect, it } from "vitest";
import { QUIZ_QUESTIONS } from "@/lib/learning/quiz/quiz-question-bank";
import { buildQuizSessionSummary } from "./quiz-session-summary";

describe("buildQuizSessionSummary", () => {
  const questions = QUIZ_QUESTIONS.slice(0, 2);

  it("does not expose a summary before a completed answered session", () => {
    expect(
      buildQuizSessionSummary({
        score: 0,
        selectedAccessType: "ecole",
        sessionCompleted: false,
        sessionResults: {},
        sessionQuestions: questions,
        questions,
      }),
    ).toBeNull();
  });

  it("keeps totals, themes and recommendations deterministic", () => {
    const results = { [questions[0].id]: true, [questions[1].id]: false };
    const first = buildQuizSessionSummary({
      score: 1,
      selectedAccessType: "ecole",
      sessionCompleted: true,
      sessionResults: results,
      sessionQuestions: questions,
      questions,
    });
    const second = buildQuizSessionSummary({
      score: 1,
      selectedAccessType: "ecole",
      sessionCompleted: true,
      sessionResults: results,
      sessionQuestions: questions,
      questions,
    });

    expect(first).toEqual(second);
    expect(first).not.toBeNull();
    expect(first?.totalQuestions).toBe(2);
    expect(first?.totalAnswered).toBe(2);
    expect(first?.themesSucceeded.length).toBeGreaterThanOrEqual(0);
    expect(first?.themesToReview.length).toBeGreaterThanOrEqual(0);
    expect(first?.recommendedMode).not.toBeNull();
  });
});
