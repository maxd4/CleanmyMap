import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLeaderboardKey,
  buildLeaderboardUrl,
  filterLeaderboardItems,
  fetchGamificationLeaderboard,
  type PublicIndividualLeaderboardItem,
} from "./gamification-leaderboard";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gamification leaderboard contract", () => {
  it("loads no variant before explicit detail interaction and one active variant after", () => {
    expect(buildLeaderboardKey(false, "individual", "lifetime")).toBeNull();
    expect(buildLeaderboardKey(true, "individual", "lifetime")).toBe(
      "/api/gamification/leaderboard?scope=individual&period=lifetime&metric=level",
    );
    expect(buildLeaderboardKey(true, "collective", "yearToDate")).toBe(
      "/api/gamification/leaderboard?scope=collective&period=yearToDate&metric=level",
    );
  });

  it("filters loaded rows instead of leaving search decorative", () => {
    const items = [
      { rank: 1, publicLabel: "Alice Rives", level: 3, xpValidated: 4, badgeTotal: 1, gradeCount: 1, oneShotCount: 0 },
      { rank: 2, publicLabel: "Bruno", level: 2, xpValidated: 2, badgeTotal: 0, gradeCount: 0, oneShotCount: 0 },
    ];

    expect(filterLeaderboardItems(items, "individual", "rives")).toHaveLength(1);
    expect(filterLeaderboardItems(items, "individual", "")).toHaveLength(2);
  });

  it("consumes the server projection without a client privacy sanitizer", async () => {
    const responseBody = {
      status: "ok" as const,
      scope: "individual" as const,
      period: "lifetime" as const,
      generatedAt: "2026-09-29T10:00:00.000Z",
      items: [
        {
          rank: 1,
          publicLabel: "Alice",
          level: 3,
          xpValidated: 4,
          badgeTotal: 2,
          gradeCount: 1,
          oneShotCount: 1,
        },
      ],
      recognition: { topContributors: [], currentContributor: null },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), { status: 200 }),
    ));

    await expect(fetchGamificationLeaderboard("/api/gamification/leaderboard")).resolves.toEqual(responseBody);
    expect((responseBody.items[0] as PublicIndividualLeaderboardItem).publicLabel).toBe("Alice");
  });

  it("keeps only the supported scope and period dimensions in the URL", () => {
    expect(buildLeaderboardUrl("individual", "yearToDate", "badges")).toContain("scope=individual&period=yearToDate&metric=badges");
    expect(buildLeaderboardUrl("collective", "lifetime")).toContain("scope=collective&period=lifetime&metric=level");
  });
});
