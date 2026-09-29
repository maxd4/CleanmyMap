import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getGamificationLeaderboardMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: requireAuthenticatedAccessMock }));
vi.mock("next/cache", () => ({ unstable_cache: (factory: () => Promise<unknown>) => factory }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/gamification/progression", async () => ({
  ...(await vi.importActual("@/lib/gamification/progression")),
  getGamificationLeaderboard: getGamificationLeaderboardMock,
}));

import { GET } from "./route";

beforeEach(() => {
  requireAuthenticatedAccessMock.mockReset();
  getGamificationLeaderboardMock.mockReset();
  getSupabaseServerClientMock.mockReset();
  requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "viewer-1" });
  getSupabaseServerClientMock.mockReturnValue({});
});

describe("gamification leaderboard route", () => {
  it("accepts only scope and the three CURRENT metrics", async () => {
    getGamificationLeaderboardMock.mockResolvedValue({
      scope: "individual",
      generatedAt: "2026-09-29T10:00:00.000Z",
      items: [],
      recognition: { topContributors: [], currentContributor: null },
    });
    const response = await GET(new Request("http://localhost/api/gamification/leaderboard?scope=individual&metric=badges"));
    expect(response.status).toBe(200);
    expect(getGamificationLeaderboardMock).toHaveBeenCalledWith({}, "individual", "badges");
    expect((await response.json()).period).toBeUndefined();
  });

  it("projects the server DTO without Clerk IDs or unused internal fields", async () => {
    getGamificationLeaderboardMock.mockResolvedValue({
      scope: "individual",
      generatedAt: "2026-09-29T10:00:00.000Z",
      items: [{ userId: "clerk-user-1", publicLabel: " Alice ", rank: 1, level: 3, xpValidated: 4, badgeTotal: 2, gradeCount: 1, oneShotCount: 1, xpPending: 99 }],
      recognition: { topContributors: [{ userId: "recognition-user" }], currentContributor: { userId: "current-contributor" } },
    });
    const response = await GET(new Request("http://localhost/api/gamification/leaderboard?scope=individual&metric=level"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.items).toEqual([{ publicLabel: "Alice", rank: 1, level: 3, xpValidated: 4, badgeTotal: 2, gradeCount: 1, oneShotCount: 1 }]);
    expect(body.recognition).toEqual({ topContributors: [], currentContributor: null });
    expect(JSON.stringify(body)).not.toContain("clerk-user");
    expect(JSON.stringify(body)).not.toContain("xpPending");
  });

  it("converges the collective scope to the current structure projection", async () => {
    getGamificationLeaderboardMock.mockResolvedValue({
      scope: "collective",
      generatedAt: "2026-09-29T10:00:00.000Z",
      items: [{ rank: 1, publicLabel: "Les Rives", structureType: "association", level: 3, xpValidated: 12, badgeTotal: 2, gradeCount: 2, oneShotCount: 0, score: 88, currentLevel: 3 }],
      recognition: { topContributors: [], currentContributor: null },
    });
    const response = await GET(new Request("http://localhost/api/gamification/leaderboard?scope=collective&metric=xp"));
    const body = await response.json();
    expect(body.items).toEqual([{ rank: 1, publicLabel: "Les Rives", structureType: "association", level: 3, xpValidated: 12, badgeTotal: 2, gradeCount: 2, oneShotCount: 0 }]);
    expect(body.items[0]).not.toHaveProperty("score");
    expect(body.items[0]).not.toHaveProperty("currentLevel");
  });

  it("refuses an anonymous request before loading the leaderboard", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    const response = await GET(new Request("http://localhost/api/gamification/leaderboard"));
    expect(response.status).toBe(401);
    expect(getGamificationLeaderboardMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
