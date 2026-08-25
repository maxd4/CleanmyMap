import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimitedHandler, withApiRateLimit } from "./api-wrapper";

const rateLimitMiddlewareMock = vi.hoisted(() => vi.fn());

vi.mock("./middleware", () => ({
  rateLimitMiddleware: rateLimitMiddlewareMock,
}));

describe("rate-limit API wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the real request method through withApiRateLimit", async () => {
    rateLimitMiddlewareMock.mockResolvedValue({ allowed: true });
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const request = new NextRequest("https://example.com/api/test", { method: "POST" });

    const response = await withApiRateLimit(handler, { customLimit: 3 })(request);

    expect(response.status).toBe(200);
    expect(rateLimitMiddlewareMock).toHaveBeenCalledWith(request, "POST", {
      customLimit: 3,
      skipPaths: [],
    });
    expect(handler).toHaveBeenCalledWith(request);
  });

  it("selects the handler after applying the real method to the limit check", async () => {
    rateLimitMiddlewareMock.mockResolvedValue({ allowed: true });
    const getHandler = vi.fn(async () => NextResponse.json({ method: "GET" }));
    const postHandler = vi.fn(async () => NextResponse.json({ method: "POST" }));
    const request = new NextRequest("https://example.com/api/test", { method: "GET" });

    const response = await createRateLimitedHandler({
      GET: getHandler,
      POST: postHandler,
    })(request);

    expect(response.status).toBe(200);
    expect(rateLimitMiddlewareMock).toHaveBeenCalledWith(request, "GET", undefined);
    expect(getHandler).toHaveBeenCalledWith(request);
    expect(postHandler).not.toHaveBeenCalled();
  });

  it("does not call the wrapped handler when the limit middleware returns 429", async () => {
    const limitedResponse = NextResponse.json({ code: "RATE_LIMIT_EXCEEDED" }, { status: 429 });
    rateLimitMiddlewareMock.mockResolvedValue({ allowed: false, response: limitedResponse });
    const handler = vi.fn(async () => NextResponse.json({ ok: true }));
    const request = new NextRequest("https://example.com/api/test", { method: "DELETE" });

    const response = await withApiRateLimit(handler)(request);

    expect(response).toBe(limitedResponse);
    expect(response.status).toBe(429);
    expect(handler).not.toHaveBeenCalled();
  });
});
