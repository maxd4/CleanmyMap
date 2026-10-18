import { describe, expect, it, vi } from "vitest";

const insertProgressionEventMock = vi.hoisted(() => vi.fn());
const broadcastGamificationAnnouncementMock = vi.hoisted(() => vi.fn());
const refreshProgressionProfileMock = vi.hoisted(() => vi.fn());

vi.mock("./progression-data", () => ({
  insertProgressionEvent: insertProgressionEventMock,
}));
vi.mock("./announcements", () => ({
  broadcastGamificationAnnouncement: broadcastGamificationAnnouncementMock,
}));
vi.mock("./progression-tracking", () => ({
  refreshProgressionProfile: refreshProgressionProfileMock,
}));
import { listQuizQuestionFormatIds } from "@/lib/learning/quiz/quiz-question-formats";
import { computeQuizBalanceAwards, syncQuizQuestionTypeBalanceProgress } from "./quiz-balance-progress";

describe("quiz balance awards", () => {
  it("does not return or announce a balanced milestone when its event is a duplicate", async () => {
    insertProgressionEventMock.mockResolvedValueOnce(false);
    const limit = vi.fn().mockResolvedValue({
      data: listQuizQuestionFormatIds().map((questionType) => ({
        user_id: "user-1",
        question_type: questionType,
        correct_count: 10,
      })),
      error: null,
    });
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({ limit })),
            })),
          })),
        })),
      })),
    };

    const result = await syncQuizQuestionTypeBalanceProgress(supabase as never, {
      userId: "user-1",
      questionType: "true-false",
      questionId: "question-1",
    });

    expect(result.balancedCount).toBe(10);
    expect(result.awards).toEqual([]);
    expect(result.totalXpAwarded).toBe(0);
    expect(broadcastGamificationAnnouncementMock).not.toHaveBeenCalled();
    expect(refreshProgressionProfileMock).not.toHaveBeenCalled();
  });

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
