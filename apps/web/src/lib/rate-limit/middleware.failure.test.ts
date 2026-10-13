import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const checkServerRateLimitMock = vi.hoisted(() => vi.fn());
const getRateLimitIdentityMock = vi.hoisted(() => vi.fn());
const getClientIpMock = vi.hoisted(() => vi.fn());

vi.mock("./server", () => ({
  checkServerRateLimit: checkServerRateLimitMock,
}));

vi.mock("./utils", async () => {
  const actual = await vi.importActual<typeof import("./utils")>("./utils");
  return {
    ...actual,
    getRateLimitIdentity: getRateLimitIdentityMock,
    getClientIp: getClientIpMock,
  };
});

import { rateLimitMiddleware } from "./middleware";
import { configureRateLimitIdentityMocks } from "@/__tests__/support/rate-limit-test-helpers";

describe("rateLimitMiddleware degraded protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureRateLimitIdentityMocks(getRateLimitIdentityMock, getClientIpMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 503 without presenting a store outage as quota exhaustion", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    checkServerRateLimitMock.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: 1_800_000_060,
      retryAfter: 60,
      failure: "distributed-unavailable",
      failureMode: "fail-closed",
      source: "unavailable",
    });

    const request = new NextRequest("https://example.com/api/contact", { method: "POST" });
    const results = await Promise.all(
      Array.from({ length: 3 }, () => rateLimitMiddleware(request, request.method)),
    );

    for (const result of results) {
      expect(result.allowed).toBe(false);
      expect(result.response?.status).toBe(503);
      expect(await result.response?.json()).toMatchObject({
        code: "RATE_LIMIT_UNAVAILABLE",
        status: "unavailable",
      });
      expect(result.response?.headers.get("X-RateLimit-Limit")).toBe("10");
      expect(result.response?.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(result.response?.headers.get("X-RateLimit-Reset")).toBe("1800000060");
      expect(result.response?.headers.get("Retry-After")).toBe("60");
    }

    expect(getRateLimitIdentityMock).not.toHaveBeenCalled();
    expect(getClientIpMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalledWith(
      "[RateLimit] Abuse pattern detected:",
      expect.anything(),
    );
    expect(errorSpy).not.toHaveBeenCalledWith(
      "[RateLimit] Critical abuse - key locked:",
      expect.anything(),
    );
  });

  it("keeps logging a real quota refusal after outage refusals", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    checkServerRateLimitMock.mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: 1_800_000_060,
      retryAfter: 42,
    });

    const request = new NextRequest("https://example.com/api/contact", { method: "POST" });
    const result = await rateLimitMiddleware(request, request.method);

    expect(result.allowed).toBe(false);
    expect(result.response?.status).toBe(429);
    expect(await result.response?.json()).toMatchObject({
      code: "RATE_LIMIT_EXCEEDED",
      status: "rate_limited",
    });
    expect(result.response?.headers.get("Retry-After")).toBe("42");
    expect(getRateLimitIdentityMock).toHaveBeenCalledWith(request);
    expect(getClientIpMock).toHaveBeenCalledWith(request);
    expect(warnSpy).toHaveBeenCalledWith(
      "[RateLimit] Abuse pattern detected:",
      expect.objectContaining({
        route: "/api/contact",
        count: 1,
      }),
    );
    expect(errorSpy).not.toHaveBeenCalledWith(
      "[RateLimit] Critical abuse - key locked:",
      expect.anything(),
    );
  });
});
