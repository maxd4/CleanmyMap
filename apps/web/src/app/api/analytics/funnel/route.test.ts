import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminAuthResponseModule, createAdminAuthzModule, createApiErrorModule, createPublicSnapshotModule, createRateLimitModule, rateLimitMocks } from "@/app/api/test-helpers";

const authMock = vi.hoisted(() => vi.fn());
const appendFunnelEventMock = vi.hoisted(() => vi.fn());
const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const listFunnelEventsMock = vi.hoisted(() => vi.fn());
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());
const hasAnalyticsConsentCookieMock = vi.hoisted(() => vi.fn());
const getAnalyticsAgeBandCookieDecisionMock = vi.hoisted(() => vi.fn());
const optionalTreatmentAllowedMock = vi.hoisted(() => vi.fn());
const { verifyRateLimit: verifyRateLimitMock, createServerRateLimitResponse: createServerRateLimitResponseMock } = rateLimitMocks;
const validSessionId = "550e8400-e29b-41d4-a716-446655440001";

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
  getAnalyticsAgeBandCookieDecision: getAnalyticsAgeBandCookieDecisionMock,
}));

vi.mock("@/lib/minor-consent-server", () => ({
  isOptionalConsentTreatmentAllowedForUser: optionalTreatmentAllowedMock,
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
  getAnalyticsAgeBandCookieDecisionMock.mockReturnValue("15_or_over");
  optionalTreatmentAllowedMock.mockResolvedValue(true);
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
          sessionId: validSessionId,
          events: [
            {
              step: "page_view",
              mode: "complete",
              at: "2026-06-27T10:00:00.000Z",
              meta: { pagePath: "/reports", routeKind: "reports" },
            },
            {
              step: "page_view",
              mode: "complete",
              at: "2026-06-27T10:00:05.000Z",
              meta: { pagePath: "/actions", routeKind: "actions" },
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
        sessionId: validSessionId,
        step: "page_view",
        mode: "complete",
        meta: { pagePath: "/reports", routeKind: "reports" },
      }),
    );
    expect(appendFunnelEventMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        sessionId: validSessionId,
        step: "page_view",
        mode: "complete",
        meta: { pagePath: "/actions", routeKind: "actions" },
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

  it("ignores events for an under-15 user without joint parental consent", async () => {
    optionalTreatmentAllowedMock.mockResolvedValue(false);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/analytics/funnel", {
      method: "POST",
      body: JSON.stringify({ sessionId: "session-under-15", step: "page_view", mode: "complete" }),
      headers: { "Content-Type": "application/json", cookie: "cleanmymap_age_band=under_15" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ignored", count: 0 });
    expect(appendFunnelEventMock).not.toHaveBeenCalled();
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
          sessionId: "550e8400-e29b-41d4-a716-446655440002",
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
        sessionId: "550e8400-e29b-41d4-a716-446655440002",
        step: "start_form",
        mode: "complete",
        meta: { source: "form" },
      }),
    );
  });

  it("stores only allowlisted funnel metadata", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/analytics/funnel", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "550e8400-e29b-41d4-a716-446655440003",
          step: "submit_success",
          mode: "quick",
          meta: {
            routeKind: "actions",
            email: "personne@example.com",
            formValue: "secret",
            createdId: "private-action-id",
            isAuthenticated: true,
          },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(appendFunnelEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { routeKind: "actions", isAuthenticated: true },
      }),
    );
  });

  it("normalizes dynamic paths and rejects arbitrary values for known categories", async () => {
    const { POST } = await import("./route");
    const inviteToken = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_abcde";
    const missionId = "550e8400-e29b-41d4-a716-446655440000";
    const response = await POST(
      new Request("http://localhost/api/analytics/funnel", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "550e8400-e29b-41d4-a716-446655440004",
          step: "page_view",
          mode: "complete",
          meta: {
            pagePath: `/actions/invite/${inviteToken}?token=${inviteToken}`,
            routeKind: "actions",
            routeSection: missionId,
            source: "private-source",
          },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(appendFunnelEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { pagePath: "/actions/invite", routeKind: "actions" },
      }),
    );
    const storedMeta = appendFunnelEventMock.mock.calls[0]?.[0]?.meta;
    expect(JSON.stringify(storedMeta)).not.toContain(inviteToken);
    expect(JSON.stringify(storedMeta)).not.toContain(missionId);
  });

  it("replaces a private session id before it reaches persistence", async () => {
    const { POST } = await import("./route");
    const privateSessionId = "personne@example.com";
    const response = await POST(
      new Request("http://localhost/api/analytics/funnel", {
        method: "POST",
        body: JSON.stringify({
          sessionId: privateSessionId,
          step: "page_view",
          mode: "complete",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    const persisted = appendFunnelEventMock.mock.calls[0]?.[0] as { sessionId?: string };
    expect(persisted.sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu);
    expect(JSON.stringify(persisted)).not.toContain(privateSessionId);
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
