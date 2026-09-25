import { describe, expect, it } from "vitest";
import {
  buildQuizLearningProgressionSummary,
  LEARNING_PROGRESS_THRESHOLDS,
} from "./quiz-learning-progression";

describe("quiz learning progression", () => {
  it("exposes one learning axis while retaining diversity and balance signals", () => {
    const summary = buildQuizLearningProgressionSummary([
      { question_type: "spontaneous", correct_count: 8 },
      { question_type: "association", correct_count: 4 },
      { question_type: "enterprise", correct_count: 2 },
    ], ["spontaneous", "association", "enterprise"]);

    expect(summary).toMatchObject({
      id: "learning",
      name: "Apprentissage",
      currentValue: 14,
      totalCorrectAnswers: 14,
      masteredQuestionTypes: 3,
      totalQuestionTypes: 3,
      balancedCorrectAnswers: 2,
      currentBadge: { id: "learning-10", label: "10 réponses justes" },
      nextBadge: { id: "learning-50", label: "50 réponses justes" },
    });
    expect(summary.tiers.map((tier) => tier.threshold)).toEqual([10, 50, 100]);
    expect(summary.correctAnswersByType).toEqual({
      spontaneous: 8,
      association: 4,
      enterprise: 2,
    });
  });

  it("keeps the learning scale extensible after the last named threshold", () => {
    const summary = buildQuizLearningProgressionSummary([
      { question_type: "spontaneous", correct_count: 103 },
    ], ["spontaneous"]);

    expect(LEARNING_PROGRESS_THRESHOLDS).toEqual([10, 50, 100]);
    expect(summary.currentBadge).toEqual({ id: "learning-100", label: "100 réponses justes" });
    expect(summary.nextBadge).toEqual({ id: "learning-105", label: "105 réponses justes" });
    expect(summary.progressPercent).toBe(60);
  });

  it("does not create a learning badge before the first existing milestone", () => {
    const summary = buildQuizLearningProgressionSummary([
      { question_type: "spontaneous", correct_count: 9 },
    ], ["spontaneous"]);

    expect(summary.currentBadge).toBeNull();
    expect(summary.nextBadge).toEqual({ id: "learning-10", label: "10 réponses justes" });
    expect(summary.progressPercent).toBe(90);
  });
});
