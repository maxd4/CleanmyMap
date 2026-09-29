import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const buildPublicUserLeaderboardMock = vi.hoisted(() => vi.fn());
const buildPublicStructureLeaderboardMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  unstable_cache: (factory: () => Promise<unknown>) => factory,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: rateLimitMock,
  createServerRateLimitResponse: (allowed: boolean) =>
    allowed ? null : new Response(JSON.stringify({ code: "RATE_LIMIT_EXCEEDED" }), { status: 429 }),
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/gamification/progression-ranking", () => ({
  buildPublicUserLeaderboard: buildPublicUserLeaderboardMock,
}));
vi.mock("@/lib/gamification/progression-structure-ranking", () => ({
  buildPublicStructureLeaderboard: buildPublicStructureLeaderboardMock,
}));

import { GET } from "./route";

beforeEach(() => {
  rateLimitMock.mockReset();
  getSupabaseServerClientMock.mockReset();
  buildPublicUserLeaderboardMock.mockReset();
  buildPublicStructureLeaderboardMock.mockReset();
  rateLimitMock.mockResolvedValue({ allowed: true, limit: 50, remaining: 49, reset: 0 });
  getSupabaseServerClientMock.mockReturnValue({});
  buildPublicUserLeaderboardMock.mockResolvedValue([
    {
      rank: 1,
      publicLabel: "Alice",
      level: 3,
      xpValidated: 4,
      badgeTotal: 2,
      gradeCount: 1,
      oneShotCount: 1,
    },
  ]);
  buildPublicStructureLeaderboardMock.mockResolvedValue([
    {
      rank: 1,
      publicLabel: "Les Rives",
      structureType: "association",
      level: 2,
      xpValidated: 3,
      badgeTotal: 1,
      gradeCount: 1,
      oneShotCount: 0,
    },
  ]);
});

describe("GET /api/gamification/leaderboard/public", () => {
  it.each([
    ["user", buildPublicUserLeaderboardMock],
    ["structure", buildPublicStructureLeaderboardMock],
  ] as const)("returns the sanitized %s projection", async (scope, loader) => {
    const response = await GET(
      new Request(`http://localhost/api/gamification/leaderboard/public?scope=${scope}&metric=level`),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(loader).toHaveBeenCalledWith({}, "level");
    expect(body.scope).toBe(scope);
    expect(body.items[0]).toEqual(expect.objectContaining({ publicLabel: expect.any(String) }));
    expect(JSON.stringify(body)).not.toContain("userId");
    expect(JSON.stringify(body)).not.toContain("email");
    expect(JSON.stringify(body)).not.toContain("metadata");
    expect(JSON.stringify(body)).not.toContain("authorized_moderation");
    expect(JSON.stringify(body)).not.toMatch(/xpPending|role|contributions|impact|history/iu);
    if (scope === "structure") {
      expect(body.items[0]).toEqual(expect.objectContaining({ structureType: "association" }));
    }
  });

  it.each(["level", "xp", "badges"])("accepts metric=%s", async (metric) => {
    const response = await GET(
      new Request(`http://localhost/api/gamification/leaderboard/public?scope=user&metric=${metric}`),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).metric).toBe(metric);
  });

  it("rejects unbounded scope and metric values before loading Supabase", async () => {
    const response = await GET(
      new Request("http://localhost/api/gamification/leaderboard/public?scope=admin&metric=score"),
    );
    expect(response.status).toBe(400);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("is public but rate limited", async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, limit: 50, remaining: 0, reset: 1, retryAfter: 60 });
    const response = await GET(new Request("http://localhost/api/gamification/leaderboard/public"));
    expect(response.status).toBe(429);
    expect(buildPublicUserLeaderboardMock).not.toHaveBeenCalled();
  });
});
