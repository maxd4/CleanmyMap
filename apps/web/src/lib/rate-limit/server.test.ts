import { beforeEach, describe, expect, it, vi } from "vitest";

const redisClient = vi.hoisted(() => ({ name: "redis" }));
const getRedisClientMock = vi.hoisted(() => vi.fn());
const distributedLimitMock = vi.hoisted(() => vi.fn());
const slidingWindowMock = vi.hoisted(() => vi.fn((limit: number, duration: string) => ({
  limit,
  duration,
})));
const RatelimitMock = vi.hoisted(() => {
  return class MockRatelimit {
    static slidingWindow = slidingWindowMock;
    limit = distributedLimitMock;
  };
});
const authMock = vi.hoisted(() => vi.fn());
const getAuthMock = vi.hoisted(() => vi.fn());

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: RatelimitMock,
}));

vi.mock("@/lib/services/upstash", () => ({
  getRedisClient: getRedisClientMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  getAuth: getAuthMock,
}));

function buildRequest() {
  return new Request("https://cleanmymap.fr/api/test", {
    method: "POST",
    headers: {
      host: "cleanmymap.fr",
      "x-real-ip": "198.51.100.10",
    },
  });
}

describe("server rate-limit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getRedisClientMock.mockReturnValue(redisClient);
    getAuthMock.mockReturnValue({ userId: null });
    authMock.mockResolvedValue({ userId: null });
  });

  it("shares a sliding-window counter across simulated instances", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T10:00:00.000Z"));
    distributedLimitMock
      .mockResolvedValueOnce({
        success: true,
        limit: 2,
        remaining: 1,
        reset: Date.now() + 60_000,
      })
      .mockResolvedValueOnce({
        success: false,
        limit: 2,
        remaining: 0,
        reset: Date.now() + 5_000,
      });

    const firstInstance = await import("./server");
    const first = await firstInstance.verifyRateLimit(buildRequest(), {
      limit: 2,
      window: 60,
    });

    vi.resetModules();
    const secondInstance = await import("./server");
    const second = await secondInstance.verifyRateLimit(buildRequest(), {
      limit: 2,
      window: 60,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.retryAfter).toBe(5);
    expect(distributedLimitMock).toHaveBeenCalledTimes(2);
    expect(distributedLimitMock.mock.calls[0][0]).toBe(
      distributedLimitMock.mock.calls[1][0],
    );
    expect(slidingWindowMock).toHaveBeenCalledWith(2, "60 s");

    const response = secondInstance.createServerRateLimitResponse(
      second.allowed,
      second.retryAfter,
      second,
    );
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("5");
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(response?.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response?.headers.get("X-RateLimit-Reset")).toBe(String(second.reset));
    vi.useRealTimers();
  });

  it("falls back to the local best-effort store when Redis is unavailable", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    distributedLimitMock.mockRejectedValue(new Error("network failure"));
    const { verifyRateLimit } = await import("./server");

    const first = await verifyRateLimit(buildRequest(), { limit: 1, window: 60 });
    const second = await verifyRateLimit(buildRequest(), { limit: 1, window: 60 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.retryAfter).toBeGreaterThanOrEqual(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[RateLimit] Upstash unavailable; using local best-effort fallback.",
      { reason: "unavailable" },
    );
    warnSpy.mockRestore();
  });

  it("falls back immediately when Upstash is not configured", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    getRedisClientMock.mockReturnValue(null);
    const { verifyRateLimit } = await import("./server");

    const result = await verifyRateLimit(buildRequest(), { limit: 2, window: 60 });

    expect(result.allowed).toBe(true);
    expect(distributedLimitMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "[RateLimit] Upstash unavailable; using local best-effort fallback.",
      { reason: "not_configured" },
    );
    warnSpy.mockRestore();
  });

  it("treats a configured Upstash timeout as a local fallback", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    distributedLimitMock.mockResolvedValue({
      success: true,
      limit: 2,
      remaining: 1,
      reset: Date.now() + 60_000,
      reason: "timeout",
    });
    const { verifyRateLimit } = await import("./server");

    const result = await verifyRateLimit(buildRequest(), { limit: 2, window: 60 });

    expect(result.allowed).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      "[RateLimit] Upstash unavailable; using local best-effort fallback.",
      { reason: "unavailable" },
    );
    warnSpy.mockRestore();
  });

  it("returns a stable 429 payload", async () => {
    const { createServerRateLimitResponse } = await import("./server");
    const response = createServerRateLimitResponse(false, 42);

    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);
    expect(response!.headers.get("Retry-After")).toBe("42");
    expect(await response!.json()).toMatchObject({
      code: "RATE_LIMIT_EXCEEDED",
      retryAfterSeconds: 42,
    });
  });
});
