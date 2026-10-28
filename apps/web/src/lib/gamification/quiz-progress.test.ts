import { beforeEach, describe, expect, it, vi } from "vitest";

const recordQuizProgressionMock = vi.hoisted(() => vi.fn());
const broadcastGamificationAnnouncementMock = vi.hoisted(() => vi.fn());
const refreshProgressionProfileMock = vi.hoisted(() => vi.fn());

vi.mock("./progression-event-writer", () => ({ recordQuizProgression: recordQuizProgressionMock }));
vi.mock("./announcements", () => ({ broadcastGamificationAnnouncement: broadcastGamificationAnnouncementMock }));
vi.mock("./progression-tracking", () => ({ refreshProgressionProfile: refreshProgressionProfileMock }));

import { computeQuizProgressAwards, syncQuizQuestionTypeProgress } from "./quiz-progress";

describe("quiz progress awards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists type and balanced threshold crossings before announcing them", async () => {
    recordQuizProgressionMock.mockImplementation(async (_supabase, params) => ({
      previousCount: 49,
      correctCount: 50,
      previousBalancedCount: 9,
      balancedCount: 10,
      insertedEvents: params.events.filter((event: { threshold: number }) => event.threshold === 50 || event.threshold === 10),
    }));

    const supabase = { rpc: vi.fn() };
    const result = await syncQuizQuestionTypeProgress(supabase as never, {
      userId: "user-1",
      questionType: "vrai-faux-piegeux",
      questionId: "question-1",
    });

    expect(result).toMatchObject({ previousCount: 49, correctCount: 50, previousBalancedCount: 9, balancedCount: 10, totalXpAwarded: 1, balancedTotalXpAwarded: 1 });
    expect(result.awards).toEqual([expect.objectContaining({ sourceId: "quiz:vrai-faux-piegeux:50", xp: 1 })]);
    expect(result.balancedAwards).toEqual([expect.objectContaining({ sourceId: "quiz:balanced:10", xp: 1 })]);
    expect(recordQuizProgressionMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      userId: "user-1",
      questionType: "vrai-faux-piegeux",
      events: expect.arrayContaining([
        expect.objectContaining({ eventType: "quiz_question_type_milestone", sourceTable: "quiz_type_progress", sourceId: "quiz:vrai-faux-piegeux:50", xpBase: 1, xpAwarded: 1 }),
        expect.objectContaining({ eventType: "quiz_question_type_balance_milestone", sourceTable: "quiz_type_balance_progress", sourceId: "quiz:balanced:10", xpBase: 1, xpAwarded: 1 }),
      ]),
    }));
    expect(broadcastGamificationAnnouncementMock).toHaveBeenCalledTimes(2);
    expect(refreshProgressionProfileMock).toHaveBeenCalledWith(supabase, "user-1");
  });

  it("does not announce or refresh when the transaction reports only duplicates", async () => {
    recordQuizProgressionMock.mockResolvedValueOnce({ previousCount: 50, correctCount: 51, previousBalancedCount: 10, balancedCount: 10, insertedEvents: [] });
    const result = await syncQuizQuestionTypeProgress({ rpc: vi.fn() } as never, {
      userId: "user-1", questionType: "vrai-faux-piegeux", questionId: "question-2",
    });

    expect(result.awards).toEqual([]);
    expect(result.balancedAwards).toEqual([]);
    expect(result.totalXpAwarded).toBe(0);
    expect(result.balancedTotalXpAwarded).toBe(0);
    expect(broadcastGamificationAnnouncementMock).not.toHaveBeenCalled();
    expect(refreshProgressionProfileMock).not.toHaveBeenCalled();
  });

  it("awards the 50th answer milestone", () => {
    expect(computeQuizProgressAwards({ previousCount: 49, nextCount: 50, questionType: "vrai-faux-piegeux" })).toEqual([
      expect.objectContaining({ threshold: 50, milestone: 50, xp: 1, badgeId: "quiz-type-50", sourceId: "quiz:vrai-faux-piegeux:50" }),
    ]);
  });

  it("awards stacked milestones when a threshold is shared", () => {
    expect(computeQuizProgressAwards({ previousCount: 49, nextCount: 100, questionType: "situations-terrain" })).toEqual([
      expect.objectContaining({ threshold: 50, xp: 1, badgeId: "quiz-type-50" }),
      expect.objectContaining({ threshold: 100, xp: 2, badgeId: "quiz-type-100" }),
    ]);
  });
});
