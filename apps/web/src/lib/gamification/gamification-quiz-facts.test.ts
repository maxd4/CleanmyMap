import { describe, expect, it } from "vitest";
import { buildQuizFacts } from "./gamification-quiz-facts";
import { listQuizQuestionFormatIds } from "@/lib/learning/quiz/quiz-question-formats";

describe("CURRENT quiz source facts", () => {
  it("treats absent, negative and malformed progress as zero", () => {
    expect(buildQuizFacts(null)).toEqual({ facts: [], totalCorrectAnswers: 0 });
    expect(buildQuizFacts([
      { question_type: "vrai-faux-piegeux", correct_count: -3 },
      { question_type: "situations-terrain", correct_count: "invalid" },
    ])).toEqual({ facts: [], totalCorrectAnswers: 0 });
  });

  it("emits type thresholds exactly at 50 and 100", () => {
    const result = buildQuizFacts([
      { question_type: "vrai-faux-piegeux", correct_count: 49, updated_at: "2026-01-01" },
      { question_type: "situations-terrain", correct_count: 50, updated_at: "2026-02-01" },
      { question_type: "comparaisons", correct_count: 100, updated_at: "2026-03-01" },
    ]);
    expect(result.totalCorrectAnswers).toBe(199);
    expect(result.facts.filter((fact) => fact.sourceTable === "quiz_type_progress").map((fact) => fact.threshold))
      .toEqual([50, 50, 100]);
  });

  it("emits balanced thresholds only when every CURRENT question type reaches them", () => {
    const rows = listQuizQuestionFormatIds().map((question_type) => ({
      question_type,
      correct_count: 100,
      updated_at: question_type === "cas-limites" ? "2026-05-01" : "2026-04-01",
    }));
    const result = buildQuizFacts(rows);
    const balanceFacts = result.facts.filter((fact) => fact.sourceTable === "quiz_type_balance_progress");
    expect(balanceFacts.map((fact) => fact.threshold)).toEqual([10, 50, 100]);
    expect(balanceFacts.every((fact) => fact.occurredOn === "2026-05-01")).toBe(true);
    expect(result.totalCorrectAnswers).toBe(100 * listQuizQuestionFormatIds().length);
  });
});
