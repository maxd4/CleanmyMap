import { expect, it } from "vitest";

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

const now = new Date("2026-06-12T12:00:00.000Z");

  it("prioritizes failed and due questions before the rest", () => {
    const questions: QuizSelectionQuestionLike[] = [
      {
        id: "failed",
        type: "true-false" as const,
        category: "action-terrain",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "low" as const,
      },
      {
        id: "due",
        type: "true-false" as const,
        category: "tri-recyclage",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "low" as const,
      },
      {
        id: "new",
        type: "true-false" as const,
        category: "climat-biodiversite",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "low" as const,
      },
      {
        id: "mastered",
        type: "true-false" as const,
        category: "impact-methodologie",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "low" as const,
      },
    ];

    const ordered = buildQuizSessionDeck(
      questions,
      {
        failed: makeStats("failed", "2026-06-12T12:30:00.000Z", { failure_count: 1, streak: 0 }),
        due: makeStats("due", "2026-06-12T11:50:00.000Z", { success_count: 2, streak: 2 }),
        new: makeStats("new", "2026-06-12T15:00:00.000Z"),
        mastered: makeStats("mastered", "2026-06-13T15:00:00.000Z", { success_count: 3, streak: 3, mastery_level: 4 }),
      },
      {
        accessTypeId: "mixte",
        mode: "mixte",
        now,
      },
    );

    expect(ordered.map((question) => question.id)).toEqual(["failed", "due", "new", "mastered"]);
  });

  it("alternates skills within the same review state", () => {
    const questions: QuizSelectionQuestionLike[] = [
      {
        id: "terrain-1",
        type: "true-false" as const,
        category: "action-terrain",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "low" as const,
      },
      {
        id: "terrain-2",
        type: "true-false" as const,
        category: "action-terrain",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "low" as const,
      },
      {
        id: "estimation-1",
        type: "true-false" as const,
        category: "climat-biodiversite",
        reasoningType: "estimation",
        skill: "estimation",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "low" as const,
      },
      {
        id: "estimation-2",
        type: "true-false" as const,
        category: "climat-biodiversite",
        reasoningType: "estimation",
        skill: "estimation",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "low" as const,
      },
    ];

    const ordered = buildQuizSessionDeck(
      questions,
      {
        "terrain-1": makeStats("terrain-1", "2026-06-12T15:00:00.000Z"),
        "terrain-2": makeStats("terrain-2", "2026-06-12T15:00:00.000Z"),
        "estimation-1": makeStats("estimation-1", "2026-06-12T15:00:00.000Z"),
        "estimation-2": makeStats("estimation-2", "2026-06-12T15:00:00.000Z"),
      },
      {
        accessTypeId: "mixte",
        mode: "mixte",
        now,
      },
    );

    expect(ordered.map((question) => question.id)).toEqual([
      "terrain-1",
      "estimation-1",
      "terrain-2",
      "estimation-2",
    ]);
  });

  it("rotates pedagogical types before repeating the same format", () => {
    const questions: QuizSelectionQuestionLike[] = [
      {
        id: "vf-1",
        type: "true-false" as const,
        category: "tri-recyclage",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "medium" as const,
      },
      {
        id: "vf-2",
        type: "true-false" as const,
        category: "tri-recyclage",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "true-false",
        difficulty: "low",
        trapLevel: "medium" as const,
      },
      {
        id: "comp-1",
        type: "multiple-choice" as const,
        category: "tri-recyclage",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "situations-terrain",
        difficulty: "medium",
        trapLevel: "low" as const,
      },
      {
        id: "comp-2",
        type: "multiple-choice" as const,
        category: "tri-recyclage",
        reasoningType: "terrain",
        skill: "terrain",
        pedagogicalType: "situations-terrain",
        difficulty: "medium",
        trapLevel: "low" as const,
      },
    ];

    const ordered = buildQuizSessionDeck(
      questions,
      {
        "vf-1": makeStats("vf-1", "2026-06-12T15:00:00.000Z"),
        "vf-2": makeStats("vf-2", "2026-06-12T15:00:00.000Z"),
        "comp-1": makeStats("comp-1", "2026-06-12T15:00:00.000Z"),
        "comp-2": makeStats("comp-2", "2026-06-12T15:00:00.000Z"),
      },
      {
        accessTypeId: "mixte",
        mode: "mixte",
        now,
      },
    );

    expect(ordered.map((question) => question.id)).toEqual(["vf-1", "comp-1", "vf-2", "comp-2"]);
  });

  it("keeps difficulty before trap level", () => {
    const questions: QuizSelectionQuestionLike[] = [
      {
        id: "easy-trappy",
        type: "multiple-choice" as const,
        category: "impact-methodologie",
        reasoningType: "comparaison",
        skill: "comparaison",
        pedagogicalType: "comparaisons",
        difficulty: "low",
        trapLevel: "high" as const,
      },
      {
        id: "hard-clear",
        type: "multiple-choice" as const,
        category: "impact-methodologie",
        reasoningType: "comparaison",
        skill: "comparaison",
        pedagogicalType: "comparaisons",
        difficulty: "high",
        trapLevel: "low" as const,
      },
    ];

    const ordered = buildQuizSessionDeck(
      questions,
      {
        "easy-trappy": makeStats("easy-trappy", "2026-06-12T15:00:00.000Z"),
        "hard-clear": makeStats("hard-clear", "2026-06-12T15:00:00.000Z"),
      },
      {
        accessTypeId: "donnees-scientifiques",
        mode: "donnees-scientifiques",
        now,
      },
    );

    expect(ordered.map((question) => question.id)).toEqual(["easy-trappy", "hard-clear"]);
  });

  it("respects an explicit trap level filter", () => {
    const questions: QuizSelectionQuestionLike[] = [
      {
        id: "keep",
        type: "true-false" as const,
        category: "tri-recyclage",
        reasoningType: "idée reçue",
        skill: "idée reçue",
        pedagogicalType: "vrai-faux-piegeux",
        difficulty: "low",
        trapLevel: "high" as const,
      },
      {
        id: "drop",
        type: "true-false" as const,
        category: "tri-recyclage",
        reasoningType: "idée reçue",
        skill: "idée reçue",
        pedagogicalType: "vrai-faux-piegeux",
        difficulty: "low",
        trapLevel: "low" as const,
      },
    ];

    const ordered = buildQuizSessionDeck(
      questions,
      {
        keep: makeStats("keep", "2026-06-12T15:00:00.000Z"),
        drop: makeStats("drop", "2026-06-12T15:00:00.000Z"),
      },
      {
        accessTypeId: "tri-securite",
        mode: "tri-securite",
        trapLevel: "high",
        now,
      },
    );

    expect(ordered.map((question) => question.id)).toEqual(["keep"]);
  });

  it("limits the mixed session size by default", () => {
    const questions: QuizSelectionQuestionLike[] = Array.from({ length: 14 }, (_, index) => ({
      id: `q${index + 1}`,
      type: index % 2 === 0 ? ("true-false" as const) : ("multiple-choice" as const),
      category:
        index % 3 === 0
          ? ("action-terrain" as const)
          : index % 3 === 1
            ? ("tri-recyclage" as const)
            : ("climat-biodiversite" as const),
      reasoningType: index % 2 === 0 ? ("terrain" as const) : ("estimation" as const),
      skill: index % 2 === 0 ? ("terrain" as const) : ("estimation" as const),
      pedagogicalType: index % 2 === 0 ? ("true-false" as const) : ("multiple-choice" as const),
      difficulty: index < 5 ? ("low" as const) : index < 9 ? ("medium" as const) : ("high" as const),
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
      mode: "mixte",
      now,
    });

    expect(ordered).toHaveLength(10);
  });
