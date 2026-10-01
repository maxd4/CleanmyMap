import { describe, expect, it } from "vitest";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import { acquiredGamificationSummary } from "./gamification-collections-celebrations";

function makeSummary(overrides: Partial<GamificationSummary> = {}): GamificationSummary {
  return {
    xpTotal: 12,
    currentLevel: 2,
    potentialLevel: 2,
    nextLevel: {} as GamificationSummary["nextLevel"],
    progressions: [],
    milestones: [],
    xpReconciliation: { progressionXp: 0, milestoneXp: 0, compatibilityXp: 12, total: 12, isBalanced: true },
    rulesMigration: { currentAppliedRulesRevision: 12, lastAcknowledgedRulesRevision: 12, latestRulesRevision: 12, hasUnacknowledgedChanges: false },
    ...overrides,
  };
}

describe("acquiredGamificationSummary", () => {
  it("returns a compact empty summary without inventing collections", () => {
    expect(acquiredGamificationSummary(makeSummary())).toEqual({ tiers: 0, milestones: 0, xp: 12 });
  });

  it("counts reached tiers and completed milestones without duplicating the catalog", () => {
    expect(acquiredGamificationSummary(makeSummary({
      progressions: [{
        id: "participation",
        label: "Participation",
        description: "Contributions confirmées.",
        currentValue: 8,
        metricLabel: "actions",
        awardCategory: "XP_PROGRESSION",
        grantsXp: true,
        xpContribution: 2,
        currentBadge: { id: "participant-4", label: "Rubis" },
        nextBadge: { id: "participant-5", label: "Émeraude" },
        currentTier: { id: "participant-4", label: "Rubis", threshold: 8, achieved: true },
        nextTier: { id: "participant-5", label: "Émeraude", threshold: 10, achieved: false },
        previousTiers: [
          { id: "participant-1", label: "Quartz", threshold: 1, achieved: true },
          { id: "participant-2", label: "Topaze", threshold: 3, achieved: true },
          { id: "participant-3", label: "Saphir", threshold: 5, achieved: true },
        ],
        progressPercent: 80,
        state: "in_progress",
        introducedInRulesRevision: 12,
        isNewSinceLastRulesMigration: false,
      }],
      milestones: [{
        id: "premiere_trace_utile",
        awardCategory: "XP_MILESTONE",
        category: "XP_MILESTONE",
        label: "Première trace utile",
        description: "Première action validée.",
        grantsXp: true,
        xpAmountOrPolicy: { kind: "fixed_one_shot", amount: 1 },
        state: "completed",
        xpContribution: 1,
        achieved: true,
        achievedAt: "2026-09-29T10:00:00.000Z",
        introducedInRulesRevision: 1,
        isNewSinceLastRulesMigration: false,
      }],
    }))).toEqual({ tiers: 4, milestones: 1, xp: 12 });
  });
});
