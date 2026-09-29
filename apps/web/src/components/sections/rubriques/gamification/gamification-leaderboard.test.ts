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
    expect(buildLeaderboardKey(false, "individual")).toBeNull();
    expect(buildLeaderboardKey(true, "individual")).toBe(
      "/api/gamification/leaderboard?scope=individual&metric=level",
    );
    expect(buildLeaderboardKey(true, "collective")).toBe(
      "/api/gamification/leaderboard?scope=collective&metric=level",
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

  it("keeps only the supported scope and metric dimensions in the URL", () => {
    expect(buildLeaderboardUrl("individual", "badges")).toContain("scope=individual&metric=badges");
    expect(buildLeaderboardUrl("collective")).toContain("scope=collective&metric=level");
  });
});
