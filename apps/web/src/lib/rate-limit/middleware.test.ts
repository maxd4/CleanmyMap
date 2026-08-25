import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearRateLimitStore } from "./store";
import { rateLimitMiddleware } from "./middleware";

const getRateLimitIdentityMock = vi.hoisted(() => vi.fn());
const getClientIpMock = vi.hoisted(() => vi.fn());

vi.mock("./utils", async () => {
  const actual = await vi.importActual<typeof import("./utils")>("./utils");
  return {
    ...actual,
    getRateLimitIdentity: getRateLimitIdentityMock,
    getClientIp: getClientIpMock,
  };
});

describe("rateLimitMiddleware", () => {
  beforeEach(() => {
    clearRateLimitStore();
    vi.clearAllMocks();
    getRateLimitIdentityMock.mockResolvedValue({
      scope: "anonymous",
      value: "198.51.100.20",
      key: "anonymous:198.51.100.20",
    });
    getClientIpMock.mockResolvedValue("198.51.100.20");
  });

  it("returns 429 with Retry-After after the local limit is exhausted", async () => {
    const request = new NextRequest("https://example.com/api/test", { method: "POST" });

    const first = await rateLimitMiddleware(request, request.method, {
      customLimit: 1,
      customWindow: 60,
    });
    const second = await rateLimitMiddleware(request, request.method, {
      customLimit: 1,
      customWindow: 60,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.response?.status).toBe(429);
    expect(second.response?.headers.get("Retry-After")).toBe("60");
    expect(getRateLimitIdentityMock).toHaveBeenCalledWith(request);
    expect(getClientIpMock).toHaveBeenCalledWith(request);
  });
});
