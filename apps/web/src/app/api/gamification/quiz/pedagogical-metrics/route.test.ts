import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const syncQuizPedagogicalMetricsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/learning/quiz-pedagogical-metrics", () => ({
  syncQuizPedagogicalMetrics: syncQuizPedagogicalMetricsMock,
}));

function buildValidPayload() {
  return {
    mode: "mixte",
    playedAt: new Date().toISOString(),
    totalQuestions: 1,
    score: 1,
    questions: [
      {
        questionId: "q-1",
        correct: true,
        skill: "terrain",
        pedagogicalType: "multiple-choice",
        category: "action-terrain",
        difficulty: "medium",
        trapLevel: "medium",
      },
    ],
  };
}

describe("POST /api/gamification/quiz/pedagogical-metrics", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
    syncQuizPedagogicalMetricsMock.mockResolvedValue(undefined);
  });

  it("accepts a valid session through the server service-role path", async () => {
    const { POST } = await import("./route");
    const payload = buildValidPayload();

    const response = await POST(
      new Request("http://localhost/api/gamification/quiz/pedagogical-metrics", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      totalQuestions: 1,
      score: 1,
    });
    expect(getSupabaseServerClientMock).toHaveBeenCalledWith(true);
    expect(syncQuizPedagogicalMetricsMock).toHaveBeenCalledWith({}, payload);
  });

  it("rejects a score greater than totalQuestions", async () => {
    const { POST } = await import("./route");
    const payload = { ...buildValidPayload(), score: 2 };

    const response = await POST(
      new Request("http://localhost/api/gamification/quiz/pedagogical-metrics", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(422);
    expect(syncQuizPedagogicalMetricsMock).not.toHaveBeenCalled();
  });

  it("rejects an incoherent questions length", async () => {
    const { POST } = await import("./route");
    const payload = { ...buildValidPayload(), totalQuestions: 2 };

    const response = await POST(
      new Request("http://localhost/api/gamification/quiz/pedagogical-metrics", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(422);
    expect(syncQuizPedagogicalMetricsMock).not.toHaveBeenCalled();
  });

  it("rejects excessive session sizes and string fields", async () => {
    const { POST } = await import("./route");
    const excessiveSession = {
      ...buildValidPayload(),
      totalQuestions: 51,
    };
    const excessiveString = {
      ...buildValidPayload(),
      questions: [{ ...buildValidPayload().questions[0], questionId: "q".repeat(201) }],
    };

    const sessionResponse = await POST(
      new Request("http://localhost/api/gamification/quiz/pedagogical-metrics", {
        method: "POST",
        body: JSON.stringify(excessiveSession),
      }),
    );
    const stringResponse = await POST(
      new Request("http://localhost/api/gamification/quiz/pedagogical-metrics", {
        method: "POST",
        body: JSON.stringify(excessiveString),
      }),
    );

    expect(sessionResponse.status).toBe(422);
    expect(stringResponse.status).toBe(422);
    expect(syncQuizPedagogicalMetricsMock).not.toHaveBeenCalled();
  });

  it("rejects a playedAt timestamp that is too old", async () => {
    const { POST } = await import("./route");
    const payload = {
      ...buildValidPayload(),
      playedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    };

    const response = await POST(
      new Request("http://localhost/api/gamification/quiz/pedagogical-metrics", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(422);
    expect(syncQuizPedagogicalMetricsMock).not.toHaveBeenCalled();
  });
});
