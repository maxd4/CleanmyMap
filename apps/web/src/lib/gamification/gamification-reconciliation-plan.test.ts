import { describe, expect, it } from "vitest";
import {
  buildGamificationReconciliationPlan,
} from "./gamification-reconciliation-plan";
import {
  computeExpectedGamificationState,
  type GamificationFacts,
} from "./gamification-reconstruction";
import { facts, rules } from "./__tests__/reconciliation-fixtures";

function persisted(version: string, xpAwarded: number) {
  return [{
    id: 1,
    event_type: "action_declare_validation" as const,
    source_table: "actions",
    source_id: "action-1",
    status_phase: "validated" as const,
    weight: 1,
    xp_base: xpAwarded,
    xp_awarded: xpAwarded,
    occurred_on: "2026-09-28",
    metadata: {
      gamificationEngine: "CURRENT_RECONCILABLE",
      rulesVersion: version,
      mechanicId: "mechanic-a",
      milestoneId: "milestone-a",
      badgeId: "badge-a",
      logicalId: "user-1:mechanic-a:actions:action-1::validated",
    },
  }];
}

describe("gamification reconciliation plan", () => {
  it("previews a rule amount change without mutating the persisted event", () => {
    const currentRules = rules("v2", "XP_MILESTONE", 2);
    const expected = computeExpectedGamificationState("user-1", facts, currentRules);
    const plan = buildGamificationReconciliationPlan({
      userId: "user-1",
      rules: currentRules,
      expected,
      persisted: persisted("v1", 1),
    });

    expect(plan.rulesVersionBefore).toBe("v1");
    expect(plan.rulesVersionAfter).toBe("v2");
    expect(plan.xpBefore).toBe(1);
    expect(plan.xpExpected).toBe(2);
    expect(plan.xpDelta).toBe(1);
    expect(plan.eventsToUpdate).toHaveLength(1);
    expect(plan.eventsToAdd).toHaveLength(0);
    expect(plan.eventsToRemove).toHaveLength(0);
  });

  it("previews removal of CURRENT XP while retaining the legacy row", () => {
    const currentRules = rules("v4", "NON_GAMIFIED");
    const legacy = {
      id: 99,
      event_type: "sensitive_zone_milestone" as const,
      source_table: "sensitive_zone_progression",
      source_id: "legacy-1",
      status_phase: "validated" as const,
      weight: 1,
      xp_base: 4,
      xp_awarded: 4,
      occurred_on: "2025-01-01",
      metadata: {},
    };
    const plan = buildGamificationReconciliationPlan({
      userId: "user-1",
      rules: currentRules,
      expected: computeExpectedGamificationState("user-1", facts, currentRules),
      persisted: [...persisted("v3", 2), legacy],
    });

    expect(plan.xpBefore).toBe(6);
    expect(plan.xpExpected).toBe(4);
    expect(plan.xpDelta).toBe(-2);
    expect(plan.eventsToRemove).toHaveLength(1);
    expect(plan.legacyEventCountPreserved).toBe(1);
    expect(plan.badgesRemoved).toEqual(["badge-a"]);
    expect(plan.milestonesRemoved).toEqual(["milestone-a"]);
  });

  it("returns a zero diff for a user without facts or persisted events", () => {
    const currentRules = rules("v1", "XP_MILESTONE");
    const emptyFacts: GamificationFacts = { userId: "empty-user", sourceFacts: [] };
    const plan = buildGamificationReconciliationPlan({
      userId: "empty-user",
      rules: currentRules,
      expected: computeExpectedGamificationState("empty-user", emptyFacts, currentRules),
      persisted: [],
    });

    expect(plan.xpDelta).toBe(0);
    expect(plan.eventsToAdd).toEqual([]);
    expect(plan.eventsToUpdate).toEqual([]);
    expect(plan.eventsToRemove).toEqual([]);
    expect(plan.levelBefore).toBe(1);
    expect(plan.levelAfter).toBe(1);
  });
});
