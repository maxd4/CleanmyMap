import { describe, expect, it } from "vitest";
import { QUIZ_QUESTIONS } from "./quiz-question-bank";
import {
  buildQuizPedagogicalMetricsSnapshot,
  normalizeQuizPedagogicalMetricRows,
  type QuizPedagogicalMetricRow,
} from "./quiz-pedagogical-metrics";

describe("quiz pedagogical metrics", () => {
  it("normalizes aggregate rows safely", () => {
    const rows = normalizeQuizPedagogicalMetricRows([
      {
        bucket_type: "mode",
        bucket_key: "mixte",
        attempts: 10,
        correct_count: 7,
        wrong_count: 3,
        session_count: 4,
        last_seen_at: "2026-06-23T10:00:00.000Z",
      },
      {
        bucket_type: "skill",
        bucket_key: "terrain",
        attempts: 12,
        correct_count: 4,
        wrong_count: 8,
        session_count: 0,
        last_seen_at: null,
      },
      { invalid: true },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.bucket_key).toBe("mixte");
  });

  it("builds an interpretable dashboard snapshot", () => {
    const questions = QUIZ_QUESTIONS.slice(0, 3);
    const rows: QuizPedagogicalMetricRow[] = [
      {
        bucket_type: "mode",
        bucket_key: "mixte",
        attempts: 32,
        correct_count: 20,
        wrong_count: 12,
        session_count: 8,
        last_seen_at: "2026-06-23T10:00:00.000Z",
      },
      {
        bucket_type: "question",
        bucket_key: questions[0].id,
        attempts: 10,
        correct_count: 9,
        wrong_count: 1,
        session_count: 0,
        last_seen_at: "2026-06-23T10:00:00.000Z",
      },
      {
        bucket_type: "question",
        bucket_key: questions[1].id,
        attempts: 8,
        correct_count: 2,
        wrong_count: 6,
        session_count: 0,
        last_seen_at: "2026-06-23T10:00:00.000Z",
      },
      {
        bucket_type: "skill",
        bucket_key: questions[0].reasoningType,
        attempts: 11,
        correct_count: 3,
        wrong_count: 8,
        session_count: 0,
        last_seen_at: "2026-06-23T10:00:00.000Z",
      },
      {
        bucket_type: "error_type",
        bucket_key: "raisonnement trop simpliste",
        attempts: 6,
        correct_count: 0,
        wrong_count: 6,
        session_count: 0,
        last_seen_at: "2026-06-23T10:00:00.000Z",
      },
    ];

    const snapshot = buildQuizPedagogicalMetricsSnapshot(rows, questions);

    expect(snapshot.totalAttempts).toBe(18);
    expect(snapshot.overallAccuracy).toBeCloseTo(11 / 18, 5);
    expect(snapshot.modeStats[0]?.id).toBe("mixte");
    expect(snapshot.questionStats[0]?.attempts).toBeGreaterThan(0);
    expect(snapshot.easyQuestions.length).toBe(1);
    expect(snapshot.hardQuestions.length).toBe(1);
    expect(snapshot.weakSkills.length).toBe(1);
    expect(snapshot.frequentErrors[0]?.errorType).toBe("raisonnement trop simpliste");
  });
});
