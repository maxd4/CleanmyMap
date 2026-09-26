import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminAuthResponseModule, createAdminAuthzModule, createApiErrorModule, createPublicSnapshotModule, createRateLimitModule, rateLimitMocks } from "@/app/api/test-helpers";

const authMock = vi.hoisted(() => vi.fn());
const appendFunnelEventMock = vi.hoisted(() => vi.fn());
const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const listFunnelEventsMock = vi.hoisted(() => vi.fn());
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());
const hasAnalyticsConsentCookieMock = vi.hoisted(() => vi.fn());
const { verifyRateLimit: verifyRateLimitMock, createServerRateLimitResponse: createServerRateLimitResponseMock } = rateLimitMocks;

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/analytics/funnel-store", () => ({
  appendFunnelEvent: appendFunnelEventMock,
  listFunnelEvents: listFunnelEventsMock,
}));

vi.mock("@/lib/authz", () => createAdminAuthzModule(requireAdminAccessMock));

vi.mock("@/lib/http/auth-responses", () => createAdminAuthResponseModule());

vi.mock("@/lib/http/api-errors", () => createApiErrorModule());

vi.mock("@/lib/public-surface-snapshot-service", () => createPublicSnapshotModule(loadOrRefreshPublicSurfaceSnapshotMock));

vi.mock("@/lib/analytics-consent", () => ({
  hasAnalyticsConsentCookie: hasAnalyticsConsentCookieMock,
}));

vi.mock("@/lib/rate-limit/server", () => createRateLimitModule());

function resetFunnelMocks() {
  vi.resetModules();
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "user-1" });
  requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
  listFunnelEventsMock.mockResolvedValue([]);
  loadOrRefreshPublicSurfaceSnapshotMock.mockResolvedValue({
    payload: { status: "ok" },
  });
}

describe("POST /api/analytics/funnel", () => {
  beforeEach(() => {
    resetFunnelMocks();
    hasAnalyticsConsentCookieMock.mockReturnValue(true);
    verifyRateLimitMock.mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60_000,
    });
    createServerRateLimitResponseMock.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a batch of funnel events in one request", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/analytics/funnel", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session-123",
          events: [
            {
              step: "page_view",
              mode: "complete",
              at: "2026-06-27T10:00:00.000Z",
              meta: { pagePath: "/reports" },
            },
            {
              step: "page_view",
              mode: "complete",
              at: "2026-06-27T10:00:05.000Z",
              meta: { pagePath: "/actions" },
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
      });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", count: 2 });
    expect(appendFunnelEventMock).toHaveBeenCalledTimes(2);
    expect(appendFunnelEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        sessionId: "session-123",
        step: "page_view",
        mode: "complete",
        meta: { pagePath: "/reports" },
      }),
    );
    expect(appendFunnelEventMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sessionId: "session-123",
        step: "page_view",
        mode: "complete",
        meta: { pagePath: "/actions" },
      }),
    );
    expect(verifyRateLimitMock).toHaveBeenCalledWith(request, {
      limit: 60,
      window: 60,
    });
  });

  it("ignores events without server-side analytics consent", async () => {
    hasAnalyticsConsentCookieMock.mockReturnValue(false);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/analytics/funnel", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session-no-consent",
          step: "page_view",
          mode: "complete",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ignored", count: 0 });
    expect(appendFunnelEventMock).not.toHaveBeenCalled();
    expect(verifyRateLimitMock).not.toHaveBeenCalled();
  });

  it("does not write events when the consented request is rate limited", async () => {
    const rateLimitResponse = new Response(
      JSON.stringify({ status: "rate_limited" }),
      { status: 429 },
    );
    verifyRateLimitMock.mockResolvedValueOnce({
      allowed: false,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 60_000,
      retryAfter: 60,
    });
    createServerRateLimitResponseMock.mockReturnValueOnce(rateLimitResponse);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/analytics/funnel", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session-rate-limited",
          step: "submit_success",
          mode: "quick",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(429);
    expect(appendFunnelEventMock).not.toHaveBeenCalled();
  });

  it("still accepts a single funnel event payload", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/analytics/funnel", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session-456",
          step: "start_form",
          mode: "complete",
          meta: { source: "form" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", count: 1 });
    expect(appendFunnelEventMock).toHaveBeenCalledTimes(1);
    expect(appendFunnelEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-456",
        step: "start_form",
        mode: "complete",
        meta: { source: "form" },
      }),
    );
  });

  it("rejects oversized or unbounded analytics metadata before writing", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/analytics/funnel", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session-large",
          step: "page_view",
          mode: "complete",
          meta: { pagePath: "x".repeat(70_000) },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(413);
    expect(appendFunnelEventMock).not.toHaveBeenCalled();
  });

  it("rejects nested metadata values even when the body is small", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/analytics/funnel", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "session-nested",
          step: "page_view",
          mode: "complete",
          meta: { nested: { unsupported: true } },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(appendFunnelEventMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/analytics/funnel", () => {
  beforeEach(() => {
    resetFunnelMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the admin snapshot endpoint intact", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/analytics/funnel?periodDays=30"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(requireAdminAccessMock).toHaveBeenCalledTimes(1);
    expect(loadOrRefreshPublicSurfaceSnapshotMock).toHaveBeenCalledTimes(1);
  });
});
