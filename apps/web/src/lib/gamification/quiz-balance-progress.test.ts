import { describe, expect, it } from "vitest";
import { computeQuizBalanceAwards } from "./quiz-balance-progress";

describe("quiz balance awards", () => {
  it("awards the 10-type milestone when every quiz type reaches 10 correct answers", () => {
    const awards = computeQuizBalanceAwards({
      previousBalancedCount: 9,
      nextBalancedCount: 10,
    });

    expect(awards).toEqual([
      expect.objectContaining({
        threshold: 10,
        milestone: 10,
        xp: 1,
        badgeId: "quiz-balance-10",
        sourceId: "quiz:balanced:10",
      }),
    ]);
  });

  it("awards stacked balanced milestones when the minimum count crosses 50 and 100", () => {
    const awards = computeQuizBalanceAwards({
      previousBalancedCount: 49,
      nextBalancedCount: 100,
    });

    expect(awards).toEqual([
      expect.objectContaining({
        threshold: 50,
        milestone: 50,
        xp: 1,
        badgeId: "quiz-balance-50",
      }),
      expect.objectContaining({
        threshold: 100,
        milestone: 100,
        xp: 2,
        badgeId: "quiz-balance-100",
      }),
    ]);
  });
});
