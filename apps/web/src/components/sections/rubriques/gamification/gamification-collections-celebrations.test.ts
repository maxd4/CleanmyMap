import { describe, expect, it } from "vitest";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import { buildCollectionSections } from "./gamification-collections-celebrations";

function makeSummary(
  overrides: Partial<GamificationSummary> = {},
): GamificationSummary {
  return {
    xpTotal: 12,
    currentLevel: 2,
    potentialLevel: 2,
    nextLevel: {} as GamificationSummary["nextLevel"],
    progressions: [],
    milestones: [],
    xpReconciliation: {
      progressionXp: 0,
      milestoneXp: 0,
      compatibilityXp: 12,
      total: 12,
      isBalanced: true,
    },
    rulesMigration: {
      currentAppliedRulesRevision: 12,
      lastAcknowledgedRulesRevision: 12,
      latestRulesRevision: 12,
      hasUnacknowledgedChanges: false,
    },
    ...overrides,
  };
}

describe("buildCollectionSections", () => {
  it("keeps the empty inventory empty without adding examples", () => {
    expect(buildCollectionSections(makeSummary())).toEqual({
      acquired: [],
      inProgress: [],
      toDiscover: [],
    });
  });

  it("separates acquired milestones, active progressions and new mechanics", () => {
    const sections = buildCollectionSections(
      makeSummary({
        progressions: [
          {
            id: "participation",
            label: "Participation",
            description: "Contributions confirmées.",
            currentValue: 2,
            metricLabel: "actions",
            grantsXp: true,
            xpContribution: 2,
            currentBadge: { id: "participant-1", label: "Participant" },
            nextBadge: { id: "participant-2", label: "Régulier" },
            progressPercent: 40,
            state: "in_progress",
            introducedInRulesRevision: 12,
            isNewSinceLastRulesMigration: false,
          },
          {
            id: "learning",
            label: "Apprentissage",
            description: "Événements validés.",
            currentValue: 0,
            metricLabel: "quiz",
            grantsXp: true,
            xpContribution: 0,
            currentBadge: null,
            nextBadge: { id: "learning-1", label: "Curieux" },
            progressPercent: 0,
            state: "not_started",
            introducedInRulesRevision: 12,
            isNewSinceLastRulesMigration: true,
          },
        ],
        milestones: [
          {
            id: "premiere_trace_utile",
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
          },
        ],
      }),
    );

    expect(sections.acquired.map((entry) => entry.label)).toEqual(["Première trace utile"]);
    expect(sections.inProgress.map((entry) => entry.label)).toEqual(["Participation"]);
    expect(sections.toDiscover.map((entry) => entry.label)).toEqual(["Apprentissage"]);
    expect(sections.inProgress[0]?.state).toBe("in_progress");
    expect(sections.toDiscover[0]?.isNewSinceLastRulesMigration).toBe(true);
  });
});
