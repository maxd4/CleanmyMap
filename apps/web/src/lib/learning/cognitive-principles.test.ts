import { describe, expect, it } from "vitest";
import {
  COGNITIVE_MICRO_RECALLS,
  COGNITIVE_RUBRICS,
  COGNITIVE_QUIZ_STATE_LABELS,
  buildMixedQuizOrder,
  getQuizStateFromStats,
  getQuizStateLabel,
  summarizeQuizStates,
} from "./cognitive-principles";

describe("cognitive principles helpers", () => {
  const now = new Date("2026-04-29T12:00:00.000Z");

  it("classifies untouched questions as new", () => {
    expect(getQuizStateFromStats(undefined, now)).toBe("new");
    expect(
      getQuizStateFromStats(
        {
          question_id: "q1",
          next_review_at: now.toISOString(),
          success_count: 0,
          failure_count: 0,
          streak: 0,
          ease_factor: 2.5,
          mastery_level: 0,
        },
        now,
      ),
    ).toBe("new");
  });

  it("classifies failed, due and mastered states", () => {
    expect(
      getQuizStateFromStats(
        {
          question_id: "q2",
          next_review_at: "2026-04-29T12:10:00.000Z",
          success_count: 0,
          failure_count: 1,
          streak: 0,
          ease_factor: 2.3,
          mastery_level: 0,
        },
        now,
      ),
    ).toBe("failed");

    expect(
      getQuizStateFromStats(
        {
          question_id: "q3",
          next_review_at: "2026-04-29T11:55:00.000Z",
          success_count: 2,
          failure_count: 0,
          streak: 2,
          ease_factor: 2.7,
          mastery_level: 3,
        },
        now,
      ),
    ).toBe("due");

    expect(
      getQuizStateFromStats(
        {
          question_id: "q4",
          next_review_at: "2026-04-30T12:00:00.000Z",
          success_count: 2,
          failure_count: 0,
          streak: 2,
          ease_factor: 2.7,
          mastery_level: 4,
        },
        now,
      ),
    ).toBe("mastered");
  });

  it("summarizes counts and next review date", () => {
    const summary = summarizeQuizStates(
      {
        q1: {
          question_id: "q1",
          next_review_at: now.toISOString(),
          success_count: 0,
          failure_count: 0,
          streak: 0,
          ease_factor: 2.5,
          mastery_level: 0,
        },
        q2: {
          question_id: "q2",
          next_review_at: "2026-04-29T12:10:00.000Z",
          success_count: 0,
          failure_count: 1,
          streak: 0,
          ease_factor: 2.3,
          mastery_level: 0,
        },
        q3: {
          question_id: "q3",
          next_review_at: "2026-04-29T11:55:00.000Z",
          success_count: 2,
          failure_count: 0,
          streak: 2,
          ease_factor: 2.7,
          mastery_level: 3,
        },
        q4: {
          question_id: "q4",
          next_review_at: "2026-04-30T12:00:00.000Z",
          success_count: 2,
          failure_count: 0,
          streak: 2,
          ease_factor: 2.7,
          mastery_level: 4,
        },
      },
      ["q1", "q2", "q3", "q4"],
      now,
    );

    expect(summary.total).toBe(4);
    expect(summary.counts.new).toBe(1);
    expect(summary.counts.failed).toBe(1);
    expect(summary.counts.due).toBe(1);
    expect(summary.counts.mastered).toBe(1);
    expect(summary.nextReviewAt).toBe("2026-04-29T11:55:00.000Z");
  });

  it("returns localized labels for the quiz states", () => {
    expect(getQuizStateLabel("due", "fr")).toBe("À revoir");
    expect(getQuizStateLabel("mastered", "en")).toBe("Mastered");
  });

  it("mixes questions by state then theme", () => {
    const order = buildMixedQuizOrder(
      [
        { id: "a1", category: "Eau" },
        { id: "a2", category: "Energie" },
        { id: "a3", category: "Eau" },
        { id: "a4", category: "Biodiversite" },
      ],
      {
        a1: {
          question_id: "a1",
          next_review_at: "2026-04-29T11:55:00.000Z",
          success_count: 2,
          failure_count: 0,
          streak: 2,
          ease_factor: 2.7,
          mastery_level: 3,
        },
        a2: {
          question_id: "a2",
          next_review_at: "2026-04-29T11:40:00.000Z",
          success_count: 0,
          failure_count: 1,
          streak: 0,
          ease_factor: 2.1,
          mastery_level: 0,
        },
        a3: {
          question_id: "a3",
          next_review_at: "2026-04-29T12:10:00.000Z",
          success_count: 0,
          failure_count: 0,
          streak: 0,
          ease_factor: 2.5,
          mastery_level: 0,
        },
        a4: {
          question_id: "a4",
          next_review_at: "2026-04-30T12:00:00.000Z",
          success_count: 3,
          failure_count: 0,
          streak: 3,
          ease_factor: 2.8,
          mastery_level: 4,
        },
      },
      now,
    );

    expect(order.map((item) => item.id)).toEqual(["a2", "a1", "a3", "a4"]);
  });

  it("keeps the canonical cognitive labels aligned with the six rubrics", () => {
    expect(COGNITIVE_RUBRICS.map((rubric) => rubric.label.fr)).toEqual([
      "Quiz",
      "Apprendre",
      "Impact",
      "Actions",
      "Rapports",
      "Réseau",
    ]);

    expect(COGNITIVE_RUBRICS.map((rubric) => rubric.principle.fr)).toEqual([
      "Pratique de récupération",
      "Curiosité",
      "Consolidation",
      "Récupération avant geste",
      "Mémoire longue",
      "Interleaving social",
    ]);

    expect(COGNITIVE_QUIZ_STATE_LABELS.fr).toEqual({
      new: "Nouvelles",
      failed: "Échouées",
      due: "À revoir",
      mastered: "Maîtrisées",
    });

    expect(COGNITIVE_MICRO_RECALLS.map((item) => item.label.fr)).toEqual([
      "Feedback immédiat",
      "Rappel à revoir",
      "Reprendre demain",
    ]);
  });
});
