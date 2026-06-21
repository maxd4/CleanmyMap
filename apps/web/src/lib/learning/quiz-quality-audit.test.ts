import { describe, expect, it } from "vitest";
import type { QuizQuestion } from "../../components/learn/environmental-quiz";
import { QUIZ_QUESTIONS } from "./quiz-question-bank";
import { auditQuizBank, auditQuizQuestion } from "./quiz-quality-audit";
import { buildQuizSourceMetadata } from "./quiz-source-metadata";

describe("quiz quality audit", () => {
  it("accepts the current CleanMyMap quiz bank", () => {
    const report = auditQuizBank(QUIZ_QUESTIONS);

    expect(report.totalErrors, report.findings.map((finding) => finding.questionId).join(", ")).toBe(0);
  });

  it("attaches traceable source metadata to every quiz question", () => {
    for (const question of QUIZ_QUESTIONS) {
      const source = buildQuizSourceMetadata(question);

      expect(source.sourceUrl).toBeTruthy();
      expect(source.sourceLabel).toBeTruthy();
      expect(source.sourceType).toBeTruthy();
      expect(source.confidenceLevel).toBeTruthy();
      expect(source.lastCheckedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("flags overly directive and pedagogically weak prompts", () => {
    const weakQuestion: QuizQuestion = {
      id: "weak-directive",
      type: "multiple-choice",
      category: "action-terrain",
      question: "Que faut-il faire d'un déchet sale ?",
      answer: "L'isoler avant de le classer",
      options: [
        "L'isoler avant de le classer",
        "Le jeter au hasard",
        "Le mélanger aux autres",
        "Le laisser sans traitement",
      ],
      explanation: "Faux.",
      reasoningType: "terrain",
    };

    const report = auditQuizQuestion(weakQuestion);

    expect(report.errors.map((criterion) => criterion.id)).toContain("caractere-piegeux-mais-juste");
    expect(report.errors.map((criterion) => criterion.id)).toContain("qualite-de-l-explication");
  });
});
