import { describe, expect, it } from "vitest";
import type { GamificationCatalogItem } from "./gamification-catalog";
import { countCurrentLeaderboardBadges } from "./leaderboard-badges";

function progression(
  id: string,
  previousTiers: Array<{ id: string; title: string; threshold: number; achieved: boolean }>,
  currentTier: { id: string; title: string; threshold: number; achieved: boolean },
): GamificationCatalogItem {
  return {
    id,
    kind: "progression",
    category: "XP_PROGRESSION",
    title: id,
    description: id,
    grantsXp: true,
    xpAmountOrPolicy: { kind: "progression_paliers", rule: "common_current_scale" },
    applicability: "applicable",
    state: "in_progress",
    introducedInRulesRevision: 1,
    isNewSinceLastRulesMigration: false,
    progression: {
      currentValue: 5,
      currentTier,
      currentTierAchieved: currentTier.achieved,
      nextTier: { id: "next", title: "Next", threshold: 8, achieved: false },
      nextThreshold: 8,
      progressPercent: 0,
      previousTiers,
    },
  };
}

function milestone(
  id: string,
  achieved: boolean,
  category: "XP_MILESTONE" | "BADGE_ONLY" = "BADGE_ONLY",
): GamificationCatalogItem {
  return {
    id,
    kind: "milestone",
    category,
    title: id,
    description: id,
    grantsXp: category === "XP_MILESTONE",
    xpAmountOrPolicy: category === "XP_MILESTONE"
      ? { kind: "fixed_one_shot", amount: 2 }
      : { kind: "none", reason: "test" },
    applicability: "applicable",
    state: achieved ? "completed" : "not_started",
    introducedInRulesRevision: 1,
    isNewSinceLastRulesMigration: false,
    milestone: { achieved, achievedAt: achieved ? "2026-09-29" : null },
  };
}

describe("countCurrentLeaderboardBadges", () => {
  it("counts acquired grades and one-shot badges, excluding Observateur and deduplicating IDs", () => {
    const result = countCurrentLeaderboardBadges([
      progression(
        "participation",
        [{ id: "participant-1", title: "Premier", threshold: 1, achieved: true }],
        { id: "participant-1", title: "Premier", threshold: 1, achieved: true },
      ),
      progression(
        "organisation",
        [],
        { id: "observateur", title: "Observateur", threshold: 0, achieved: false },
      ),
      milestone("trace_fondatrice", true, "BADGE_ONLY"),
      milestone("boucle_bouclee", true, "XP_MILESTONE"),
      milestone("boucle_bouclee", true, "XP_MILESTONE"),
    ]);

    expect(result).toEqual({ badgeTotal: 3, gradeCount: 1, oneShotCount: 2 });
  });

  it("excludes legacy, forms and authorized moderation definitions", () => {
    expect(
      countCurrentLeaderboardBadges([
        milestone("forms", true),
        milestone("premiere_moderation", true),
        milestone("legacy-level-recognition", true),
      ]),
    ).toEqual({ badgeTotal: 0, gradeCount: 0, oneShotCount: 0 });
  });
});
