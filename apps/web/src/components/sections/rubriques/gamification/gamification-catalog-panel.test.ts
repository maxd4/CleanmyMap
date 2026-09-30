import { describe, expect, it } from "vitest";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import { buildCatalogGroups } from "./gamification-catalog-panel";

function summary(overrides: Partial<GamificationSummary> = {}): GamificationSummary {
  return {
    xpTotal: 0,
    currentLevel: 1,
    potentialLevel: 1,
    nextLevel: {} as GamificationSummary["nextLevel"],
    progressions: [],
    milestones: [],
    xpReconciliation: { progressionXp: 0, milestoneXp: 0, compatibilityXp: 0, total: 0, isBalanced: true },
    rulesMigration: { currentAppliedRulesRevision: 12, lastAcknowledgedRulesRevision: 12, latestRulesRevision: 12, hasUnacknowledgedChanges: false },
    ...overrides,
  };
}

function progression(id: "participation" | "organisation", state: "in_progress" | "not_started", isNewSinceLastRulesMigration: boolean) {
  return {
    id,
    label: id,
    description: id,
    currentValue: state === "in_progress" ? 1 : 0,
    metricLabel: "actions",
    grantsXp: true,
    xpContribution: 0,
    currentBadge: null,
    nextBadge: { id: `${id}-1`, label: "Premier" },
    progressPercent: state === "in_progress" ? 50 : 0,
    state,
    introducedInRulesRevision: 12,
    isNewSinceLastRulesMigration,
  } as const;
}

describe("buildCatalogGroups", () => {
  it("keeps new mechanics out of the regular state groups", () => {
    const groups = buildCatalogGroups(summary({
      progressions: [
        progression("participation", "in_progress", true),
        progression("organisation", "not_started", false),
      ],
      milestones: [
        {
          id: "premiere_trace_utile",
          category: "XP_MILESTONE",
          label: "Trace",
          description: "Trace",
          grantsXp: true,
          xpAmountOrPolicy: { kind: "fixed_one_shot", amount: 1 },
          state: "completed",
          xpContribution: 1,
          achieved: true,
          achievedAt: "2026-10-01T00:00:00.000Z",
          introducedInRulesRevision: 12,
          isNewSinceLastRulesMigration: true,
        },
      ],
    }));

    expect(groups.progressions.newItems.map((item) => item.id)).toEqual(["participation"]);
    expect(groups.progressions.inProgress).toEqual([]);
    expect(groups.progressions.toDiscover.map((item) => item.id)).toEqual(["organisation"]);
    expect(groups.milestones.newItems.map((item) => item.id)).toEqual(["premiere_trace_utile"]);
    expect(groups.milestones.completed).toEqual([]);
  });
});
