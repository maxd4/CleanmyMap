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

import { computeQuizProgressAwards, syncQuizQuestionTypeProgress } from "./quiz-progress";

describe("quiz progress awards", () => {
  it("does not return or announce a milestone when its idempotent event is a duplicate", async () => {
    insertProgressionEventMock.mockResolvedValueOnce(false);
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: "user-1", question_type: "vrai-faux-piegeux", correct_count: 49 },
      error: null,
    });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
        })),
        upsert,
      })),
    };

    const result = await syncQuizQuestionTypeProgress(supabase as never, {
      userId: "user-1",
      questionType: "vrai-faux-piegeux",
      questionId: "question-1",
    });

    expect(result.correctCount).toBe(50);
    expect(result.awards).toEqual([]);
    expect(result.totalXpAwarded).toBe(0);
    expect(upsert).toHaveBeenCalledWith(
      { user_id: "user-1", question_type: "vrai-faux-piegeux", correct_count: 50 },
      { onConflict: "user_id,question_type" },
    );
    expect(broadcastGamificationAnnouncementMock).not.toHaveBeenCalled();
    expect(refreshProgressionProfileMock).not.toHaveBeenCalled();
  });

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
