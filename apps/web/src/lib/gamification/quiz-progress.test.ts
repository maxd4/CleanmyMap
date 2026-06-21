import { describe, expect, it } from "vitest";
import { computeQuizProgressAwards } from "./quiz-progress";

describe("quiz progress awards", () => {
  it("awards the 50th answer milestone", () => {
    const awards = computeQuizProgressAwards({
      previousCount: 49,
      nextCount: 50,
      questionType: "vrai-faux-piegeux",
    });

    expect(awards).toEqual([
      expect.objectContaining({
        threshold: 50,
        milestone: 50,
        xp: 1,
        badgeId: "quiz-type-50",
        sourceId: "quiz:vrai-faux-piegeux:50",
      }),
    ]);
  });

  it("awards stacked milestones when a threshold is shared", () => {
    const awards = computeQuizProgressAwards({
      previousCount: 49,
      nextCount: 100,
      questionType: "situations-terrain",
    });

    expect(awards).toEqual([
      expect.objectContaining({
        threshold: 50,
        milestone: 50,
        xp: 1,
        badgeId: "quiz-type-50",
      }),
      expect.objectContaining({
        threshold: 100,
        milestone: 100,
        xp: 2,
        badgeId: "quiz-type-100",
      }),
    ]);
  });
});
