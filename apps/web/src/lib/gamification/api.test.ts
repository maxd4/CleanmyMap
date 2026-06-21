import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { featureFlags } from "@/lib/feature-flags";
import { recordQuizQuestionCorrectAnswer } from "./api";

describe("recordQuizQuestionCorrectAnswer", () => {
  beforeEach(() => {
    featureFlags.disable("quizServerSync");
  });

  afterEach(() => {
    featureFlags.disable("quizServerSync");
    vi.unstubAllGlobals();
  });

  it("keeps quiz progress local when server sync is disabled", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      recordQuizQuestionCorrectAnswer("quiz-type", "question-1", "user-1"),
    ).resolves.toBeNull();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("syncs quiz progress only when server sync is explicitly enabled", async () => {
    featureFlags.enable("quizServerSync");

    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        status: "ok",
        questionType: "quiz-type",
        questionTypeLabel: "Quiz",
        previousCount: 0,
        correctCount: 1,
        awards: [],
        totalXpAwarded: 0,
        balancedAwards: [],
        balancedCount: 0,
        previousBalancedCount: 0,
        balancedTotalXpAwarded: 0,
      }),
    }));
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      recordQuizQuestionCorrectAnswer("quiz-type", "question-1", "user-1"),
    ).resolves.toEqual({
      questionType: "quiz-type",
      questionTypeLabel: "Quiz",
      previousCount: 0,
      correctCount: 1,
      awards: [],
      totalXpAwarded: 0,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
