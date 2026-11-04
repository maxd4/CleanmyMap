import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const loadOverviewMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: requireActionRequestAccessMock }));
vi.mock("@/lib/gamification/territorial-legends", () => ({ loadTerritorialLegendOverview: loadOverviewMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));

import { GET } from "./route";

describe("GET /api/gamification/territorial-leaderboard/overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    loadOverviewMock.mockResolvedValue({ campaignYear: 2026, windowDays: 90, levels: [], territories: [] });
  });

  it("returns the owner-scoped overview without a shared cache", async () => {
    const request = new Request("http://localhost/api/gamification/territorial-leaderboard/overview");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ status: "ok", campaignYear: 2026, territories: [] });
    expect(requireActionRequestAccessMock).toHaveBeenCalledWith(request);
    expect(loadOverviewMock).toHaveBeenCalledWith({}, "user-1");
  });

  it("refuses unauthenticated requests before creating a privileged client", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: false, status: 401 });

    const response = await GET(new Request("http://localhost/api/gamification/territorial-leaderboard/overview"));

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(loadOverviewMock).not.toHaveBeenCalled();
  });

  it("keeps an administrative transport owner-scoped", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "admin-user", role: "admin" });

    const response = await GET(new Request("http://localhost/api/gamification/territorial-leaderboard/overview"));

    expect(response.status).toBe(200);
    expect(loadOverviewMock).toHaveBeenCalledWith({}, "admin-user");
    expect(loadOverviewMock).not.toHaveBeenCalledWith({}, expect.not.stringMatching("admin-user"));
  });
});
