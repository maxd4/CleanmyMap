import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getGamificationLeaderboardMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({
  unstable_cache: (factory: () => Promise<unknown>) => factory,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/gamification/progression", async () => ({
  ...(await vi.importActual("@/lib/gamification/progression")),
  getGamificationLeaderboard: getGamificationLeaderboardMock,
}));

import { GET } from "./route";

beforeEach(() => {
  authMock.mockReset();
  getGamificationLeaderboardMock.mockReset();
  getSupabaseServerClientMock.mockReset();
  authMock.mockResolvedValue({ userId: "viewer-1" });
  getSupabaseServerClientMock.mockReturnValue({});
});

describe("gamification leaderboard route", () => {
  it("accepts a named leaderboard period", () => {
    const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");

    expect(source).toContain('const periodSchema = z.enum(["lifetime","yearToDate"]);');
    expect(source).toContain('const metricSchema = z.enum(["level", "xp", "badges"]);');
    expect(source).toContain('period: period.data,');
    expect(source).toContain('metric: metric.data,');
    expect(source).toContain('loadCachedGamificationLeaderboard(parsed.data, period.data, metric.data)');
  });

  it("projects the actual HTTP JSON without Clerk IDs or unused internal fields", async () => {
    getGamificationLeaderboardMock.mockResolvedValue({
      scope: "individual",
      generatedAt: "2026-09-29T10:00:00.000Z",
      items: [
        {
          userId: "clerk-user-1",
          publicLabel: " Alice ",
          rank: 1,
          level: 3,
          xpValidated: 4,
          badgeTotal: 2,
          gradeCount: 1,
          oneShotCount: 1,
          xpPending: 99,
        },
        {
          userId: "clerk-user-without-label",
          rank: 2,
          level: 2,
          xpValidated: 2,
          badgeTotal: 0,
          gradeCount: 0,
          oneShotCount: 0,
        },
      ],
      recognition: {
        topContributors: [{ userId: "recognition-user" }],
        currentContributor: { userId: "current-contributor" },
      },
    });

    const response = await GET(
      new Request("http://localhost/api/gamification/leaderboard?scope=individual&period=lifetime&metric=level"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toEqual([
      {
        publicLabel: "Alice",
        rank: 1,
        level: 3,
        xpValidated: 4,
        badgeTotal: 2,
        gradeCount: 1,
        oneShotCount: 1,
      },
    ]);
    expect(body.recognition).toEqual({ topContributors: [], currentContributor: null });
    expect(JSON.stringify(body)).not.toContain("clerk-user");
    expect(JSON.stringify(body)).not.toContain("xpPending");
  });

  it("keeps the fields required by the collective CURRENT rendering only", async () => {
    getGamificationLeaderboardMock.mockResolvedValue({
      scope: "collective",
      generatedAt: "2026-09-29T10:00:00.000Z",
      items: [
        {
          rank: 1,
          associationName: "Les Rives",
          score: 88,
          currentLevel: 3,
          potentialLevel: 4,
          members: 2,
          qualityAverage: 90,
          validatedActions: 3,
          wasteKg: 12,
          wasteCoverageRate: 100,
        },
      ],
      recognition: { topContributors: [], currentContributor: null },
    });

    const response = await GET(
      new Request("http://localhost/api/gamification/leaderboard?scope=collective&period=yearToDate"),
    );
    const body = await response.json();

    expect(body.items).toEqual([
      {
        rank: 1,
        associationName: "Les Rives",
        currentLevel: 3,
        members: 2,
        qualityAverage: 90,
        validatedActions: 3,
      },
    ]);
    expect(body.items[0]).not.toHaveProperty("score");
    expect(body.items[0]).not.toHaveProperty("wasteKg");
  });

  it("refuses an anonymous request before loading the leaderboard", async () => {
    authMock.mockResolvedValue({ userId: null });

    const response = await GET(new Request("http://localhost/api/gamification/leaderboard"));

    expect(response.status).toBe(401);
    expect(getGamificationLeaderboardMock).not.toHaveBeenCalled();
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
