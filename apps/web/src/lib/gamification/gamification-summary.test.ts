import { describe, expect, it } from "vitest";
import { buildGamificationCatalog } from "./gamification-catalog";
import { buildGamificationSummary } from "./gamification-summary";
import { CURRENT_INFINITE_PROGRESSIONS, CURRENT_MILESTONES } from "./progression-utils";
import { PROGRESSION_RULES_V2 } from "./progression-formulas";

const nextLevel = {
  level: 2,
  xpRequired: PROGRESSION_RULES_V2.xpRequired(2),
  xpRemaining: 0,
  frozen: false,
  requirements: {} as never,
};

function catalog(participationValue = 1) {
  const tiers = [
    { id: "observer", title: "Observateur", threshold: 0 },
    { id: "first", title: "Premier", threshold: 1 },
  ];
  return buildGamificationCatalog({
    progressions: Object.fromEntries(
      CURRENT_INFINITE_PROGRESSIONS.map((definition) => [
        definition.id,
        { currentValue: definition.id === "participation" ? participationValue : 0, started: definition.id === "participation" && participationValue > 0, tiers },
      ]),
    ),
    milestones: Object.fromEntries(
      CURRENT_MILESTONES.map((definition) => [definition.id, { achieved: false, achievedAt: null }]),
    ),
  });
}

describe("buildGamificationSummary", () => {
  it("derives the total and contributions from the canonical ledger", () => {
    const summary = buildGamificationSummary({
      catalog: catalog(),
      events: [
        {
          event_type: "participant_tier_unlock",
          status_phase: "validated",
          source_table: "progression_events",
          source_id: "participation:1",
          xp_awarded: 2,
          occurred_on: null,
          metadata: null,
        },
        {
          event_type: "first_trace_utile",
          status_phase: "validated",
          source_table: "progression_events",
          source_id: "action-1",
          xp_awarded: 1,
          occurred_on: null,
          metadata: null,
        },
        {
          event_type: "sensitive_zone_milestone",
          status_phase: "validated",
          source_table: "progression_events",
          source_id: "zone-1",
          xp_awarded: 1,
          occurred_on: null,
          metadata: null,
        },
      ],
      currentLevel: 2,
      potentialLevel: 2,
      nextLevel,
    });

    expect(summary.xpTotal).toBe(4);
    expect(summary.progressions.find((item) => item.id === "participation")?.xpContribution).toBe(2);
    expect(summary.progressions.find((item) => item.id === "participation")).toMatchObject({
      awardCategory: "XP_PROGRESSION",
      currentTier: { label: "Premier", threshold: 1, achieved: true },
      nextTier: { threshold: 6, achieved: false },
      previousTiers: [],
    });
    expect(summary.milestones.find((item) => item.id === "premiere_trace_utile")?.xpContribution).toBe(1);
    expect(summary.milestones.find((item) => item.id === "premiere_trace_utile")).toMatchObject({
      awardCategory: "XP_MILESTONE",
      grantsXp: true,
    });
    expect(summary.xpReconciliation).toMatchObject({
      progressionXp: 2,
      milestoneXp: 1,
      compatibilityXp: 1,
      total: 4,
      isBalanced: true,
    });
  });

  it("keeps a zero-data user explicitly unstarted", () => {
    const summary = buildGamificationSummary({
      catalog: catalog(0),
      events: [],
      currentLevel: 1,
      potentialLevel: 1,
      nextLevel,
    });

    expect(summary.xpTotal).toBe(0);
    expect(summary.progressions.every((item) => item.state === "not_started")).toBe(true);
    expect(summary.milestones.every((item) => item.state === "not_started")).toBe(true);
  });
});
