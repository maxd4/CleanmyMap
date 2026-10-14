import { describe, expect, it } from "vitest";
import { isQuizAnswerCorrect, normalizeQuizAnswer } from "./quiz-answer-evaluation";

describe("quiz answer evaluation", () => {
  it("normalizes submitted answers without changing their meaning", () => {
    expect(normalizeQuizAnswer("  Faux ")).toBe("Faux");
    expect(normalizeQuizAnswer([" Vrai ", " Faux "])).toEqual(["Vrai", "Faux"]);
  });

  it("checks single-answer questions against the canonical answer", () => {
    const question = { type: "true-false" as const, answer: "Faux" };

    expect(isQuizAnswerCorrect(question, "Faux")).toBe(true);
    expect(isQuizAnswerCorrect(question, "Vrai")).toBe(false);
  });

  it("checks multiple-select answers independently of selection order", () => {
    const question = { type: "multiple-select" as const, answer: ["A", "C"] };

    expect(isQuizAnswerCorrect(question, ["C", "A"])).toBe(true);
    expect(isQuizAnswerCorrect(question, ["A"])).toBe(false);
    expect(isQuizAnswerCorrect(question, ["A", "B"])).toBe(false);
  });

  it("keeps duplicate selections and boundary cardinalities distinct", () => {
    const question = { type: "multiple-select" as const, answer: ["A", "C"] };

    expect(isQuizAnswerCorrect(question, ["A", "C"])).toBe(true);
    expect(isQuizAnswerCorrect(question, ["A", "A", "C"])).toBe(false);
    expect(isQuizAnswerCorrect(question, [])).toBe(false);
  });
});
