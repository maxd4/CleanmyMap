import { describe, expect, it } from "vitest";

import type { TerritorialLegendOverviewItem } from "@/lib/gamification/territorial-legends/overview";

import {
  getConquestStatus,
  getTerritorialRewardStatus,
  TERRITORIAL_REWARD_STEPS,
} from "./territorial-legends-panel.model";

function territory(overrides: Partial<TerritorialLegendOverviewItem> = {}): TerritorialLegendOverviewItem {
  return {
    level: "commune",
    territoryCode: "75056",
    territoryLabel: "Paris",
    private: { rank: 1, score: 2, distinctActions: 2, tied: true, tieSize: 2, title: "Légende de Paris" },
    public: { competitorCount: 2, maxScore: 2, titleEligible: true, title: "Légende de Paris", items: [] },
    currentHold: { startedOn: "2026-11-01", lastVerifiedOn: "2026-11-04", days: 4 },
    bestHistory: { campaignYear: 2026, startedOn: "2026-11-01", endedOn: "2026-11-04", days: 4 },
    rewards: [{ awardKind: "conquest", thresholdDays: 0, validityStatus: "active" }],
    ...overrides,
  };
}

describe("territorial legends presentation model", () => {
  it("keeps the five conquest challenges and six current reward markers server-aligned", () => {
    expect(TERRITORIAL_REWARD_STEPS).toHaveLength(6);
    expect(TERRITORIAL_REWARD_STEPS.map((step) => step.awardKind)).toEqual([
      "conquest",
      "longevity",
      "longevity",
      "longevity",
      "longevity",
      "season_end",
    ]);
    expect(TERRITORIAL_REWARD_STEPS.at(-1)?.description).toContain("après la clôture civile");
  });

  it("does not expose an acquired title or reward from a partial private projection", () => {
    const partial = territory({
      private: null,
      currentHold: null,
      rewards: [],
    });

    expect(getConquestStatus([partial], "commune")).toBe("non_acquis");
    expect(getTerritorialRewardStatus(partial, TERRITORIAL_REWARD_STEPS[0]!)).toBe("non_acquis");
    expect(partial.private).toBeNull();
  });

  it("marks a verified reward acquired and an unverified next threshold in progress", () => {
    const current = territory({
      rewards: [
        { awardKind: "conquest", thresholdDays: 0, validityStatus: "active" },
        { awardKind: "longevity", thresholdDays: 7, validityStatus: "active" },
      ],
    });

    expect(getConquestStatus([current], "commune")).toBe("acquis");
    expect(getTerritorialRewardStatus(current, TERRITORIAL_REWARD_STEPS[1]!)).toBe("acquis");
    expect(getTerritorialRewardStatus(current, TERRITORIAL_REWARD_STEPS[2]!)).toBe("en_cours");
  });
});
