import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

describe("rateLimitMiddleware degraded protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRateLimitIdentityMock.mockResolvedValue({
      scope: "anonymous",
      value: "198.51.100.20",
      key: "anonymous:198.51.100.20",
    });
    getClientIpMock.mockResolvedValue("198.51.100.20");
  });

  it("returns 503 without presenting a store outage as quota exhaustion", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
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

    const request = new NextRequest("https://example.com/api/contact", {
      method: "POST",
    });
    const result = await rateLimitMiddleware(request, request.method);

    expect(result.allowed).toBe(false);
    expect(result.response?.status).toBe(503);
    expect(await result.response?.json()).toMatchObject({
      code: "RATE_LIMIT_UNAVAILABLE",
      status: "unavailable",
    });
    expect(result.response?.headers.get("Retry-After")).toBe("60");
    expect(getRateLimitIdentityMock).toHaveBeenCalledWith(request);
    expect(getClientIpMock).toHaveBeenCalledWith(request);
    warnSpy.mockRestore();
  });
});
