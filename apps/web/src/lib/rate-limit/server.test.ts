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

function buildRequest(method = "GET", pathname = "/api/test") {
  return new Request(`https://cleanmymap.fr${pathname}`, {
    method,
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

  it("falls back to the local best-effort store for a cheap public read", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    distributedLimitMock.mockRejectedValue(new Error("network failure"));
    const { verifyRateLimit } = await import("./server");

    const first = await verifyRateLimit(buildRequest(), { limit: 1, window: 60 });
    const second = await verifyRateLimit(buildRequest(), { limit: 1, window: 60 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.retryAfter).toBeGreaterThanOrEqual(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[RateLimit] Upstash unavailable; applying route failure policy.",
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
      "[RateLimit] Upstash unavailable; applying route failure policy.",
      { reason: "not_configured" },
    );
    warnSpy.mockRestore();
  });

  it("treats a configured Upstash timeout as a local fallback for a cheap public read", async () => {
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
      "[RateLimit] Upstash unavailable; applying route failure policy.",
      { reason: "unavailable" },
    );
    warnSpy.mockRestore();
  });

  it("fails closed for a mutation when Redis is not configured", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    getRedisClientMock.mockReturnValue(null);
    const instance = await import("./server");

    const result = await instance.verifyRateLimit(buildRequest("POST"), {
      limit: 2,
      window: 60,
    });

    expect(result).toMatchObject({
      allowed: false,
      failure: "distributed-unavailable",
      failureMode: "fail-closed",
      source: "unavailable",
      remaining: 0,
    });
    const response = instance.createServerRateLimitResponse(
      result.allowed,
      result.retryAfter,
      result,
    );
    expect(response?.status).toBe(503);
    expect(await response?.json()).toMatchObject({
      code: "RATE_LIMIT_UNAVAILABLE",
      status: "unavailable",
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[RateLimit] Upstash unavailable; applying route failure policy.",
      { reason: "not_configured" },
    );
    warnSpy.mockRestore();
  });

  it("fails closed on timeout for a costly route", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    distributedLimitMock.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 19,
      reset: Date.now() + 60_000,
      reason: "timeout",
    });
    const instance = await import("./server");

    const result = await instance.verifyRateLimit(
      buildRequest("GET", "/api/ai/vision"),
      { limit: 20, window: 60 },
    );

    expect(result.failure).toBe("distributed-unavailable");
    expect(result.failureMode).toBe("fail-closed");
    expect(result.allowed).toBe(false);
    expect(result.source).toBe("unavailable");
    warnSpy.mockRestore();
  });

  it("keeps concurrent public fallback checks atomic within one instance", async () => {
    getRedisClientMock.mockReturnValue(null);
    const { verifyRateLimit } = await import("./server");

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        verifyRateLimit(buildRequest("GET"), { limit: 3, window: 60 }),
      ),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect(results.filter((result) => !result.allowed)).toHaveLength(5);
  });

  it("does not pretend the local fallback is shared across simulated instances", async () => {
    getRedisClientMock.mockReturnValue(null);
    const firstInstance = await import("./server");
    const first = await firstInstance.verifyRateLimit(buildRequest("GET"), {
      limit: 1,
      window: 60,
    });

    vi.resetModules();
    const secondInstance = await import("./server");
    const second = await secondInstance.verifyRateLimit(buildRequest("GET"), {
      limit: 1,
      window: 60,
    });

    expect(first.source).toBe("local-fallback");
    expect(second.source).toBe("local-fallback");
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
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
