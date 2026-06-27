import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const appendFunnelEventMock = vi.hoisted(() => vi.fn());
const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const listFunnelEventsMock = vi.hoisted(() => vi.fn());
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/lib/analytics/funnel-store", () => ({
  appendFunnelEvent: appendFunnelEventMock,
  listFunnelEvents: listFunnelEventsMock,
}));

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: () => new Response("forbidden", { status: 403 }),
}));

vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: (error: unknown) =>
    new Response(error instanceof Error ? error.message : "error", { status: 500 }),
}));

vi.mock("@/lib/public-surface-snapshot-service", () => ({
  loadOrRefreshPublicSurfaceSnapshot: loadOrRefreshPublicSurfaceSnapshotMock,
}));

describe("POST /api/analytics/funnel", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    listFunnelEventsMock.mockResolvedValue([]);
    loadOrRefreshPublicSurfaceSnapshotMock.mockResolvedValue({
      payload: { status: "ok" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a batch of funnel events in one request", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/analytics/funnel", {
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
      }),
    );

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
});

describe("GET /api/analytics/funnel", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    listFunnelEventsMock.mockResolvedValue([]);
    loadOrRefreshPublicSurfaceSnapshotMock.mockResolvedValue({
      payload: { status: "ok" },
    });
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
