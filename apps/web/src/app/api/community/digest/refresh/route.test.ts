import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedAccess: vi.fn(),
  unauthorizedJsonResponse: vi.fn(() => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })),
  enforceRateLimit: vi.fn(),
  getSupabaseServerClient: vi.fn(() => ({}) as never),
  listSubscriptions: vi.fn(),
  getDuePeriods: vi.fn(),
  listProcessed: vi.fn(),
  loadReferences: vi.fn(),
  buildItems: vi.fn(),
  commitRun: vi.fn(),
}));

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: mocks.requireAuthenticatedAccess }));
vi.mock("@/lib/http/auth-responses", () => ({ unauthorizedJsonResponse: mocks.unauthorizedJsonResponse }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: mocks.enforceRateLimit }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabaseServerClient }));
vi.mock("@/lib/community/digest-service", () => ({
  listEnabledCommunitySubscriptions: mocks.listSubscriptions,
  getDueCommunityDigestPeriods: mocks.getDuePeriods,
  listProcessedCommunityDigestRuns: mocks.listProcessed,
  loadPublicCommunityDigestReferences: mocks.loadReferences,
  buildCommunityDigestItems: mocks.buildItems,
  commitCommunityDigestRun: mocks.commitRun,
}));

import { POST } from "./route";

const request = () => new Request("http://localhost/api/community/digest/refresh", { method: "POST" });
const period = { cadence: "daily", periodKey: "2026-01-15" };

describe("POST /api/community/digest/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: true, userId: "user-1" });
    mocks.enforceRateLimit.mockResolvedValue(null);
    mocks.listSubscriptions.mockResolvedValue([{ enabled: true, cadence: "daily" }]);
    mocks.getDuePeriods.mockReturnValue([period]);
    mocks.listProcessed.mockResolvedValue(new Set());
    mocks.loadReferences.mockResolvedValue([]);
    mocks.buildItems.mockReturnValue([]);
    mocks.commitRun.mockResolvedValue({ cadence: "daily", periodKey: period.periodKey, itemCount: 0, notificationId: null, status: "generated" });
  });

  it("rejects unauthenticated requests before the server client or limiter", async () => {
    mocks.requireAuthenticatedAccess.mockResolvedValue({ ok: false });
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("does not aggregate when the due period has already been processed", async () => {
    mocks.listProcessed.mockResolvedValue(new Set(["daily:2026-01-15"]));
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.loadReferences).not.toHaveBeenCalled();
    expect(mocks.commitRun).not.toHaveBeenCalled();
  });

  it("commits an empty run without inventing a notification", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.loadReferences).toHaveBeenCalledOnce();
    expect(mocks.buildItems).toHaveBeenCalledWith([], [{ enabled: true, cadence: "daily" }], period);
    expect(mocks.commitRun).toHaveBeenCalledWith({}, "user-1", period, []);
  });

  it("stops at the abuse boundary before reading subscriptions", async () => {
    mocks.enforceRateLimit.mockResolvedValue(new Response("limited", { status: 429 }));
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(mocks.listSubscriptions).not.toHaveBeenCalled();
  });
});
