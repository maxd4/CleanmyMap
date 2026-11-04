import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const loadPageMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: requireActionRequestAccessMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/gamification/territorial-legends", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gamification/territorial-legends")>("@/lib/gamification/territorial-legends");
  return { ...actual, loadTerritorialLegendPage: loadPageMock };
});

import { GET } from "./route";

describe("GET /api/gamification/territorial-leaderboard/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseServerClientMock.mockReturnValue({});
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-mobile" });
    loadPageMock.mockResolvedValue({
      level: "commune",
      campaignYear: 2026,
      territoryCode: "75056",
      territoryLabel: "Paris",
      generatedAt: "2026-11-04T12:00:00.000Z",
      windowDays: 90,
      competitorCount: 2,
      maxScore: 2,
      titleEligible: true,
      title: "Légende de Paris",
      owner: { rank: null, score: 1, distinctActions: 1, tied: false, tieSize: 1 },
      items: [],
      nextCursor: null,
    });
  });

  it("accepts the Clerk mobile bearer boundary and keeps the response private", async () => {
    const request = new Request("http://localhost/api/gamification/territorial-leaderboard/me?level=commune&territoryCode=75056", {
      headers: { Authorization: "Bearer native-session-token" },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toMatchObject({ owner: { score: 1 }, items: [] });
    expect(requireActionRequestAccessMock).toHaveBeenCalledWith(request);
    expect(loadPageMock).toHaveBeenCalledWith({}, expect.objectContaining({ ownerUserId: "user-mobile" }));
  });

  it("refuses an unauthorized bearer or cookie request before loading facts", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: false, status: 401 });
    const response = await GET(new Request("http://localhost/api/gamification/territorial-leaderboard/me?level=commune&territoryCode=75056"));

    expect(response.status).toBe(401);
    expect(loadPageMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
