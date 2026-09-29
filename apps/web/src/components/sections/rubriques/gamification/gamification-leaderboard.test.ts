import { describe, expect, it } from "vitest";
import {
  buildLeaderboardKey,
  buildLeaderboardUrl,
  filterLeaderboardItems,
  sanitizeLeaderboardResponse,
  type PublicIndividualLeaderboardItem,
} from "./gamification-leaderboard";
import type { IndividualLeaderboardItem } from "@/lib/gamification/progression-types";

describe("gamification leaderboard contract", () => {
  it("loads no variant before explicit detail interaction and one active variant after", () => {
    expect(buildLeaderboardKey(false, "individual", "lifetime")).toBeNull();
    expect(buildLeaderboardKey(true, "individual", "lifetime")).toBe(
      "/api/gamification/leaderboard?scope=individual&period=lifetime",
    );
    expect(buildLeaderboardKey(true, "collective", "yearToDate")).toBe(
      "/api/gamification/leaderboard?scope=collective&period=yearToDate",
    );
  });

  it("filters loaded rows instead of leaving search decorative", () => {
    const items = [
      { rank: 1, actorName: "Alice", associationName: "Les Rives", currentLevel: 3 } as never,
      { rank: 2, actorName: "Bruno", associationName: "Ville propre", currentLevel: 2 } as never,
    ];

    expect(filterLeaderboardItems(items, "individual", "rives")).toHaveLength(1);
    expect(filterLeaderboardItems(items, "individual", "")).toHaveLength(2);
  });

  it("removes user and Clerk identifiers before rendering other contributors", () => {
    const response = sanitizeLeaderboardResponse({
      status: "ok",
      scope: "individual",
      period: "lifetime",
      generatedAt: "2026-09-29T10:00:00.000Z",
      items: [
        {
          userId: "clerk-user-1",
          rank: 1,
          actorName: "Alice",
          associationName: "Les Rives",
          score: 80,
          xpValidated: 4,
          xpTotal: 4,
          currentLevel: 3,
          potentialLevel: 3,
          qualityAverage: 90,
          validatedActions: 2,
          wasteKg: 3,
          wasteCoverageRate: 100,
          totalButts: 2,
          badges: [],
        } as IndividualLeaderboardItem,
      ],
      recognition: {
        topContributors: [],
        currentContributor: null,
      },
    });

    expect(response.items[0]).not.toHaveProperty("userId");
    expect((response.items[0] as PublicIndividualLeaderboardItem | undefined)?.actorName).toBe("Alice");
  });

  it("keeps only the supported scope and period dimensions in the URL", () => {
    expect(buildLeaderboardUrl("individual", "yearToDate")).toContain("scope=individual&period=yearToDate");
    expect(buildLeaderboardUrl("collective", "lifetime")).toContain("scope=collective&period=lifetime");
  });
});
