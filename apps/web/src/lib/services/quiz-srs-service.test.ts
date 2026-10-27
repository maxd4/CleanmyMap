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
    expect(mocks.upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", question_id: "q-2" }),
      { onConflict: "user_id,question_id" },
    );
    expect(firstLoad["q-1"]?.success_count).toBe(2);
    expect(secondLoad["q-2"]?.mastery_level).toBe(4);
    expect(secondLoad["q-1"]?.success_count).toBe(2);
  });

  it("uses only valid local rows and initializes missing questions", async () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => JSON.stringify({
        "q-valid": {
          question_id: "q-valid",
          next_review_at: "2026-06-26T08:00:00.000Z",
          success_count: 1,
          failure_count: 0,
          streak: 1,
          ease_factor: 2.5,
          mastery_level: 1,
        },
        "q-invalid": { question_id: "q-invalid", success_count: "not-a-number" },
      })),
    });

    const { loadQuizSRSData } = await import("./quiz-srs-service");
    const loaded = await loadQuizSRSData(null, ["q-valid", "q-invalid", "q-new"]);

    expect(loaded["q-valid"]?.success_count).toBe(1);
    expect(loaded["q-invalid"]?.success_count).toBe(0);
    expect(loaded["q-new"]?.question_id).toBe("q-new");
    expect(mocks.getSupabaseBrowserClientMock).not.toHaveBeenCalled();
  });

  it("fails open to initialized client state when the database read fails", async () => {
    mocks.inMock.mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    mocks.eqMock.mockReturnValue({ in: mocks.inMock });
    mocks.selectMock.mockReturnValue({ eq: mocks.eqMock });
    mocks.getSupabaseBrowserClientMock.mockReturnValue({
      from: () => ({ select: mocks.selectMock, upsert: mocks.upsertMock }),
    });

    const { loadQuizSRSData } = await import("./quiz-srs-service");
    const loaded = await loadQuizSRSData("user-read-error", ["q-1"]);

    expect(loaded["q-1"]?.question_id).toBe("q-1");
    expect(loaded["q-1"]?.success_count).toBe(0);
  });

  it("persists local state by merging valid rows and tolerates a database write error", async () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => "not-json"),
      setItem,
    });
    const localStats = {
      question_id: "q-local",
      next_review_at: "2026-06-27T08:00:00.000Z",
      success_count: 2,
      failure_count: 0,
      streak: 2,
      ease_factor: 2.6,
      mastery_level: 2,
    };
    const { saveQuizSRSState } = await import("./quiz-srs-service");
    await saveQuizSRSState(null, localStats);
    expect(setItem).toHaveBeenCalledWith("cleanmymap_quiz_srs", JSON.stringify({ "q-local": localStats }));

    mocks.upsertMock.mockResolvedValue({ error: { message: "database unavailable" } });
    mocks.getSupabaseBrowserClientMock.mockReturnValue({
      from: () => ({ upsert: mocks.upsertMock, select: mocks.selectMock }),
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(saveQuizSRSState("user-write-error", localStats)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("[QuizSRS] Error saving to DB:", { message: "database unavailable" });
    errorSpy.mockRestore();
  });
});
