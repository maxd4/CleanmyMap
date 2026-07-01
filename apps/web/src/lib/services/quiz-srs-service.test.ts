import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseBrowserClientMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  inMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: mocks.getSupabaseBrowserClientMock,
}));

describe("quiz SRS service", () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("caches the loaded SRS rows for the same user and question set", async () => {
    const dbRows = [
      {
        question_id: "q-1",
        last_seen_at: "2026-06-25T08:00:00.000Z",
        next_review_at: "2026-06-26T08:00:00.000Z",
        success_count: 2,
        failure_count: 1,
        streak: 1,
        ease_factor: 2.4,
        mastery_level: 1,
      },
    ];

    mocks.inMock.mockResolvedValue({ data: dbRows, error: null });
    mocks.eqMock.mockReturnValue({ in: mocks.inMock });
    mocks.selectMock.mockReturnValue({ eq: mocks.eqMock });
    mocks.upsertMock.mockResolvedValue({ error: null });
    mocks.getSupabaseBrowserClientMock.mockReturnValue({
      from: () => ({
        select: mocks.selectMock,
        upsert: mocks.upsertMock,
      }),
    });

    const { loadQuizSRSData, saveQuizSRSState } = await import("./quiz-srs-service");

    const firstLoad = await loadQuizSRSData("user-1", ["q-1", "q-2"], async () => "token");
    await saveQuizSRSState(
      "user-1",
      {
        question_id: "q-2",
        next_review_at: "2026-06-27T08:00:00.000Z",
        success_count: 4,
        failure_count: 0,
        streak: 3,
        ease_factor: 2.8,
        mastery_level: 4,
      },
      async () => "token",
    );
    const secondLoad = await loadQuizSRSData("user-1", ["q-2", "q-1"], async () => "token");

    expect(mocks.selectMock).toHaveBeenCalledTimes(1);
    expect(mocks.upsertMock).toHaveBeenCalledTimes(1);
    expect(firstLoad["q-1"]?.success_count).toBe(2);
    expect(secondLoad["q-2"]?.mastery_level).toBe(4);
    expect(secondLoad["q-1"]?.success_count).toBe(2);
  });
});
