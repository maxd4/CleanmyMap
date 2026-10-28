import { describe, expect, it } from "vitest";
import { buildQuizBalanceEventCandidates, computeBalancedCount, computeQuizBalanceAwards } from "./quiz-balance-progress";

describe("quiz balance awards", () => {
  it("computes the minimum across all canonical quiz types and treats missing as zero", () => {
    expect(computeBalancedCount([
      { user_id: "user-1", question_type: "a", correct_count: 10 },
      { user_id: "user-1", question_type: "b", correct_count: -2 },
    ], ["a", "b", "c"])).toBe(0);
  });

  it("awards the 10-type milestone when every quiz type reaches 10 correct answers", () => {
    expect(computeQuizBalanceAwards({ previousBalancedCount: 9, nextBalancedCount: 10 })).toEqual([
      expect.objectContaining({ threshold: 10, milestone: 10, xp: 1, badgeId: "quiz-balance-10", sourceId: "quiz:balanced:10" }),
    ]);
  });

  it("builds complete balance candidates without duplicating persistence or announcement logic", () => {
    const candidates = buildQuizBalanceEventCandidates({ userId: "user-1", questionType: "a", questionId: "question-1", questionTypes: ["a", "b"] });
    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        metric: "balance", threshold: 10, eventType: "quiz_question_type_balance_milestone",
        sourceTable: "quiz_type_balance_progress", sourceId: "quiz:balanced:10", userId: "user-1", xpBase: 1, xpAwarded: 1,
        metadata: expect.objectContaining({ balancedQuestionTypes: ["a", "b"], questionId: "question-1" }),
      }),
    ]));
  });

  it("awards stacked balanced milestones when the minimum crosses 50 and 100", () => {
    expect(computeQuizBalanceAwards({ previousBalancedCount: 49, nextBalancedCount: 100 })).toEqual([
      expect.objectContaining({ threshold: 50, xp: 1, badgeId: "quiz-balance-50" }),
      expect.objectContaining({ threshold: 100, xp: 2, badgeId: "quiz-balance-100" }),
    ]);
  });
});
