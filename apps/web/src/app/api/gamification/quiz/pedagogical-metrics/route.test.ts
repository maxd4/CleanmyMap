import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const syncQuizPedagogicalMetricsMock = vi.hoisted(() => vi.fn());
const requireBotIdHumanMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/learning/quiz-pedagogical-metrics", () => ({
  syncQuizPedagogicalMetrics: syncQuizPedagogicalMetricsMock,
}));

vi.mock("@/lib/botid/server", () => ({
  requireBotIdHuman: requireBotIdHumanMock,
}));

vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
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
    requireBotIdHumanMock.mockResolvedValue(null);
    verifyRateLimitMock.mockResolvedValue({ allowed: true, retryAfter: undefined });
    createServerRateLimitResponseMock.mockReturnValue(null);
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
    expect(verifyRateLimitMock).toHaveBeenCalledWith(
      expect.any(Request),
      { limit: 10, window: 60 },
    );
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

  it("returns BotID 403 before Redis rate limiting or Supabase", async () => {
    requireBotIdHumanMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Access denied", code: "BOT_DETECTED" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/gamification/quiz/pedagogical-metrics", {
        method: "POST",
        body: "not-json-and-never-parsed",
      }),
    );

    expect(response.status).toBe(403);
    expect(verifyRateLimitMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(syncQuizPedagogicalMetricsMock).not.toHaveBeenCalled();
  });

  it("returns rate-limit 429 before parsing or Supabase", async () => {
    verifyRateLimitMock.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60_000,
      retryAfter: 60,
    });
    createServerRateLimitResponseMock.mockReturnValue(
      new Response(JSON.stringify({ code: "RATE_LIMIT_EXCEEDED" }), { status: 429 }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/gamification/quiz/pedagogical-metrics", {
        method: "POST",
        body: "not-json-and-never-parsed",
      }),
    );

    expect(response.status).toBe(429);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(syncQuizPedagogicalMetricsMock).not.toHaveBeenCalled();
  });
});
