import { describe, expect, it } from "vitest";
import type { IndividualLeaderboardItem } from "./progression-types";
import {
  buildPublicLeaderboardLabel,
  compareIndividualLeaderboardItems,
  isPublicLeaderboardProfile,
  rankIndividualLeaderboardItems,
} from "./progression-ranking";

type Candidate = IndividualLeaderboardItem & { userId: string };

function candidate(
  userId: string,
  publicLabel: string,
  overrides: Partial<IndividualLeaderboardItem> = {},
): Candidate {
  return {
    userId,
    rank: 0,
    publicLabel,
    level: 1,
    xpValidated: 0,
    badgeTotal: 0,
    gradeCount: 0,
    oneShotCount: 0,
    ...overrides,
  };
}

describe("CURRENT user leaderboard ranking", () => {
  it("exposes only opted-in profiles with a label owned by display_name_mode", () => {
    const base = { display_name: "Alice Martin", display_name_mode: "full_name", handle: "alice" };
    expect(isPublicLeaderboardProfile({ ...base, leaderboard_public_opt_in: false })).toBe(false);
    expect(isPublicLeaderboardProfile({ ...base, leaderboard_public_opt_in: true })).toBe(true);
    expect(buildPublicLeaderboardLabel({ ...base, display_name_mode: "pseudo" })).toBe("alice");
    expect(buildPublicLeaderboardLabel({ ...base, display_name_mode: "pseudo", handle: null })).toBeNull();
  });

  it.each([
    ["level", ["high-level", "high-xp", "high-badges", "high-grades"]],
    ["xp", ["high-xp", "high-level", "high-badges", "high-grades"]],
    ["badges", ["high-badges", "high-one-shot", "high-grades", "high-xp", "high-level", "alpha"]],
  ] as const)("applies the canonical %s order and recalculates ranks", (metric, expected) => {
    const items = [
      candidate("high-level", "Zulu", { level: 3, xpValidated: 1, badgeTotal: 1 }),
      candidate("high-xp", "Yves", { level: 2, xpValidated: 10, badgeTotal: 1 }),
      candidate("high-badges", "Victor", { level: 1, xpValidated: 1, badgeTotal: 5, gradeCount: 5 }),
      candidate("high-grades", "Ulysse", { badgeTotal: 5, gradeCount: 4, oneShotCount: 1 }),
      candidate("high-one-shot", "Tom", { badgeTotal: 5, gradeCount: 4, oneShotCount: 2, xpValidated: 1 }),
      candidate("alpha", "Alpha", { level: 1, xpValidated: 0 }),
    ];

    if (metric === "badges") {
      const ranked = rankIndividualLeaderboardItems(items, metric);
      expect(ranked.map((item) => item.userId)).toEqual(expected);
      expect(ranked.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5, 6]);
      return;
    }

    const ranked = rankIndividualLeaderboardItems(items.slice(0, 4), metric);
    expect(ranked.map((item) => item.userId)).toEqual(expected);
    expect(ranked.map((item) => item.rank)).toEqual([1, 2, 3, 4]);
  });

  it("uses publicLabel as the final deterministic tie-breaker", () => {
    const alpha = candidate("a", "Alpha", { level: 2, xpValidated: 5, badgeTotal: 1 });
    const bravo = candidate("b", "Bravo", { level: 2, xpValidated: 5, badgeTotal: 1 });
    expect(compareIndividualLeaderboardItems(alpha, bravo, "level")).toBeLessThan(0);
    expect(rankIndividualLeaderboardItems([bravo, alpha], "level").map((item) => item.userId)).toEqual(["a", "b"]);
  });

  it("never uses pending XP because candidates only carry validated XP", () => {
    const item = candidate("a", "Alice", { level: 2, xpValidated: 4 });
    expect(item).not.toHaveProperty("xpPending");
    expect(item).not.toHaveProperty("xpTotal");
    expect(item).not.toHaveProperty("score");
  });
});
