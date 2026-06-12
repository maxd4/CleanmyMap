import { describe, expect, it } from "vitest";

import type { SRSStats } from "@/lib/gamification/quiz-srs";
import type { QuizSelectionQuestionLike } from "./quiz-selection-engine";
import { buildQuizSessionDeck } from "./quiz-selection-engine";

function makeStats(
  questionId: string,
  nextReviewAt: string,
  overrides: Partial<SRSStats> = {},
): SRSStats {
  return {
    question_id: questionId,
    next_review_at: nextReviewAt,
    success_count: 0,
    failure_count: 0,
    streak: 0,
    ease_factor: 2.5,
    mastery_level: 0,
    ...overrides,
  };
}

describe("quiz selection engine", () => {
  const now = new Date("2026-06-12T12:00:00.000Z");

  it("orders focused modes by their trap progression while keeping categories interleaved", () => {
    const questions: QuizSelectionQuestionLike[] = [
      { id: "a1", type: "true-false" as const, category: "action-terrain", reasoningType: "terrain", trapLevel: "medium" as const },
      { id: "a2", type: "multiple-choice" as const, category: "action-terrain", reasoningType: "terrain", trapLevel: "high" as const },
      { id: "b1", type: "true-false" as const, category: "tri-recyclage", reasoningType: "terrain", trapLevel: "medium" as const },
      { id: "b2", type: "multiple-choice" as const, category: "tri-recyclage", reasoningType: "terrain", trapLevel: "high" as const },
    ];

    const ordered = buildQuizSessionDeck(questions, {
      a1: makeStats("a1", "2026-06-12T15:00:00.000Z"),
      a2: makeStats("a2", "2026-06-12T15:00:00.000Z"),
      b1: makeStats("b1", "2026-06-12T15:00:00.000Z"),
      b2: makeStats("b2", "2026-06-12T15:00:00.000Z"),
    }, {
      accessTypeId: "terrain",
      now,
    });

    expect(ordered.map((question) => question.id)).toEqual(["b1", "a1", "b2", "a2"]);
  });

  it("prioritizes the most surprising trap levels in sensibilisation mode", () => {
    const questions: QuizSelectionQuestionLike[] = [
      { id: "h", type: "true-false" as const, category: "impact-methodologie", reasoningType: "idée reçue", trapLevel: "high" as const },
      { id: "m", type: "multiple-choice" as const, category: "impact-methodologie", reasoningType: "questions contre-intuitives", trapLevel: "medium" as const },
      { id: "l", type: "true-false" as const, category: "impact-methodologie", reasoningType: "idée reçue", trapLevel: "low" as const },
    ];

    const ordered = buildQuizSessionDeck(questions, {
      h: makeStats("h", "2026-06-12T15:00:00.000Z"),
      m: makeStats("m", "2026-06-12T15:00:00.000Z"),
      l: makeStats("l", "2026-06-12T15:00:00.000Z"),
    }, {
      accessTypeId: "sensibilisation",
      now,
    });

    expect(ordered.map((question) => question.id)).toEqual(["l", "m", "h"]);
  });

  it("keeps mixte mode state-driven before category interleaving", () => {
    const questions: QuizSelectionQuestionLike[] = [
      { id: "failed", type: "true-false" as const, category: "action-terrain", reasoningType: "terrain", trapLevel: "high" as const },
      { id: "due", type: "true-false" as const, category: "tri-recyclage", reasoningType: "idée reçue", trapLevel: "medium" as const },
      { id: "new", type: "multiple-choice" as const, category: "climat-biodiversite", reasoningType: "estimation", trapLevel: "low" as const },
      { id: "mastered", type: "multiple-choice" as const, category: "impact-methodologie", reasoningType: "comparaison", trapLevel: "low" as const },
    ];

    const ordered = buildQuizSessionDeck(questions, {
      failed: makeStats("failed", "2026-06-12T12:30:00.000Z", { failure_count: 1, streak: 0 }),
      due: makeStats("due", "2026-06-12T11:50:00.000Z", { success_count: 2, streak: 2 }),
      new: makeStats("new", "2026-06-12T15:00:00.000Z"),
      mastered: makeStats("mastered", "2026-06-13T15:00:00.000Z", { success_count: 3, streak: 3, mastery_level: 4 }),
    }, {
      accessTypeId: "mixte",
      now,
    });

    expect(ordered.map((question) => question.id)).toEqual(["failed", "due", "new", "mastered"]);
  });

  it("respects an explicit trap level filter", () => {
    const questions: QuizSelectionQuestionLike[] = [
      { id: "keep", type: "true-false" as const, category: "tri-recyclage", reasoningType: "idée reçue", trapLevel: "high" as const },
      { id: "drop", type: "true-false" as const, category: "tri-recyclage", reasoningType: "idée reçue", trapLevel: "low" as const },
    ];

    const ordered = buildQuizSessionDeck(questions, {
      keep: makeStats("keep", "2026-06-12T15:00:00.000Z"),
      drop: makeStats("drop", "2026-06-12T15:00:00.000Z"),
    }, {
      accessTypeId: "tri-securite",
      trapLevel: "high",
      now,
    });

    expect(ordered.map((question) => question.id)).toEqual(["keep"]);
  });

  it("limits the mixed session size by default", () => {
    const questions: QuizSelectionQuestionLike[] = Array.from({ length: 14 }, (_, index) => ({
      id: `q${index + 1}`,
      type: index % 2 === 0 ? ("true-false" as const) : ("multiple-choice" as const),
      category: index % 3 === 0 ? ("action-terrain" as const) : index % 3 === 1 ? ("tri-recyclage" as const) : ("climat-biodiversite" as const),
      reasoningType: index % 2 === 0 ? ("terrain" as const) : ("estimation" as const),
      trapLevel: index < 5 ? ("low" as const) : index < 9 ? ("medium" as const) : ("high" as const),
    }));

    const stats = Object.fromEntries(
      questions.map((question, index) => [
        question.id,
        makeStats(question.id, `2026-06-12T${String(13 + (index % 3)).padStart(2, "0")}:00:00.000Z`),
      ]),
    );

    const ordered = buildQuizSessionDeck(questions, stats, {
      accessTypeId: "mixte",
      now,
    });

    expect(ordered).toHaveLength(10);
  });
});
