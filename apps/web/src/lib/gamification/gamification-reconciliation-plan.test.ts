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

  it("adds missing CURRENT events and preserves a mixed legacy/current version inventory", () => {
    const currentRules = rules("v2", "XP_MILESTONE", 2);
    const expected = computeExpectedGamificationState("user-1", facts, currentRules);
    const plan = buildGamificationReconciliationPlan({
      userId: "user-1",
      rules: currentRules,
      expected,
      persisted: [
        ...persisted("v1", 1),
        {
          ...persisted("v0", 1)[0],
          id: 2,
          metadata: { rulesVersion: "v0", gamificationEngine: "CURRENT_RECONCILABLE", logicalId: "unrelated-current" },
        },
      ],
      profile: { xp_total: 2, xp_validated: 2, current_level: 1, potential_level: 1, current_applied_rules_revision: 1 },
      stats: null,
    });

    expect(plan.rulesVersionBefore).toBe("mixed");
    expect(plan.eventsToAdd).toHaveLength(0);
    expect(plan.eventsToRemove.map((event) => event.logicalId)).toContain("unrelated-current");
    expect(plan.levelBefore).toBe(1);
    expect(plan.levelAfter).toBe(1);
  });

  it("removes duplicate identities deterministically and exposes badge/milestone additions", () => {
    const currentRules = rules("v5", "XP_MILESTONE", 1);
    const expected = computeExpectedGamificationState("user-1", facts, currentRules);
    const existing = persisted("v5", 1)[0];
    const duplicate = { ...existing, id: 77 };
    const emptyPlan = buildGamificationReconciliationPlan({
      userId: "user-1",
      rules: currentRules,
      expected,
      persisted: [],
      stats: null,
    });
    expect(emptyPlan.eventsToAdd).toHaveLength(1);
    expect(emptyPlan.badgesAdded).toEqual(["badge-a"]);
    expect(emptyPlan.milestonesAdded).toEqual(["milestone-a"]);

    const duplicatePlan = buildGamificationReconciliationPlan({
      userId: "user-1",
      rules: currentRules,
      expected,
      persisted: [existing, duplicate],
      profile: null,
      stats: null,
    });
    expect(duplicatePlan.eventsToRemove).toHaveLength(1);
    expect(duplicatePlan.eventsToRemove[0]?.id).toBe(77);
  });

  it("handles opaque metadata, stale fields and nullable profile levels without losing CURRENT ownership", () => {
    const currentRules = rules("v6", "XP_MILESTONE", 1);
    const expected = computeExpectedGamificationState("user-1", facts, currentRules);
    const first = expected.events[0]!;
    const stale = {
      ...persisted("legacy-version", 0)[0],
      id: 5,
      event_type: first.eventType as "action_declare_validation",
      source_table: first.sourceTable,
      source_id: first.sourceId,
      occurred_on: "2020-01-01",
      xp_base: 0,
      xp_awarded: 0,
      metadata: {
        ...first.metadata,
        logicalId: first.logicalId,
        rulesVersion: undefined,
        badgeId: "badge-a",
        milestoneId: undefined,
      },
    };
    const legacyOpaque = {
      ...stale,
      id: 6,
      event_type: "sensitive_zone_milestone" as const,
      source_table: "sensitive_zone_progression",
      source_id: "legacy",
      metadata: ["opaque"],
    };
    const plan = buildGamificationReconciliationPlan({
      userId: "user-1",
      rules: currentRules,
      expected,
      persisted: [stale, legacyOpaque],
      profile: {
        xp_total: null,
        xp_validated: null,
        current_level: null,
        potential_level: null,
      },
    });

    expect(plan.rulesVersionBefore).toBe(null);
    expect(plan.eventsToUpdate).toHaveLength(1);
    expect(plan.eventsToUpdate[0]?.id).toBe(5);
    expect(plan.legacyEventCountPreserved).toBe(1);
    expect(plan.levelBefore).toBe(1);
    expect(plan.levelAfter).toBe(1);
    expect(plan.badgesRemoved).toEqual([]);
    expect(plan.milestonesRemoved).toEqual([]);
  });
});
