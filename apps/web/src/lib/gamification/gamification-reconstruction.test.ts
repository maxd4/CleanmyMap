import { describe, expect, it } from "vitest";
import type { GamificationRulesV1 } from "./gamification-rules";
import { computeExpectedGamificationState } from "./gamification-reconstruction";

const facts = {
  userId: "user-1",
  sourceFacts: [{
    mechanicId: "mechanic-a",
    eventType: "action_declare_validation",
    sourceTable: "actions",
    sourceId: "action-1",
    occurredOn: "2026-09-28",
    xpAwarded: 1,
    metadata: { actionId: "action-1" },
  }],
};

function rules(input: {
  version: string;
  category: "XP_MILESTONE" | "BADGE_ONLY";
  amount: number;
}): GamificationRulesV1 {
  return {
    version: input.version,
    rulesRevision: input.version === "v1" ? 1 : input.version === "v2" ? 2 : input.version === "v3" ? 3 : 4,
    mechanics: [{
      mechanicId: "mechanic-a",
      category: input.category,
      eventType: "action_declare_validation",
      progressionId: null,
      milestoneId: "mechanic-a",
      badgeId: "badge-a",
      sourceDomain: "actions",
      xpPolicy: input.amount > 0
        ? { kind: "fixed_one_shot", amount: input.amount }
        : { kind: "none", reason: "badge only" },
      awardPolicy: input.category === "BADGE_ONLY"
        ? { kind: "none" }
        : { kind: "fixed", amount: input.amount },
      eligibility: { kind: "canonical_fact", factKey: "action" },
      thresholds: [],
      introducedInRulesRevision: 1,
    }],
  };
}

describe("computeExpectedGamificationState", () => {
  it("replaces XP when a ruleset changes instead of adding a compensation event", () => {
    const v1 = computeExpectedGamificationState("user-1", facts, rules({
      version: "v1",
      category: "XP_MILESTONE",
      amount: 1,
    }));
    const v2 = computeExpectedGamificationState("user-1", facts, rules({
      version: "v2",
      category: "XP_MILESTONE",
      amount: 2,
    }));

    expect(v1.events).toHaveLength(1);
    expect(v1.events[0]?.xpAwarded).toBe(1);
    expect(v2.events[0]?.logicalId).toBe(v1.events[0]?.logicalId);
    expect(v2.events[0]?.xpAwarded).toBe(2);
    expect(v2.events[0]?.metadata.rulesVersion).toBe("v2");
    expect(v2.events[0]?.metadata.rulesRevision).toBe(2);
    expect(v2.events[0]?.metadata.introducedInRulesRevision).toBe(1);
  });

  it("keeps the badge proof while removing XP for BADGE_ONLY", () => {
    const state = computeExpectedGamificationState("user-1", facts, rules({
      version: "v3",
      category: "BADGE_ONLY",
      amount: 0,
    }));

    expect(state.events).toHaveLength(1);
    expect(state.events[0]?.xpAwarded).toBe(0);
    expect(state.expectedBadges).toEqual(["badge-a"]);
  });

  it("removes both event and badge when a mechanic is no longer gamified", () => {
    const state = computeExpectedGamificationState("user-1", facts, {
      version: "v4",
      rulesRevision: 4,
      mechanics: [{
        mechanicId: "mechanic-a",
        category: "NON_GAMIFIED",
        eventType: null,
        progressionId: null,
        milestoneId: null,
        badgeId: null,
        sourceDomain: "actions",
        xpPolicy: { kind: "none", reason: "business fact only" },
        awardPolicy: { kind: "none" },
        eligibility: { kind: "never", reason: "business fact only" },
        thresholds: [],
        introducedInRulesRevision: 1,
      }],
    });

    expect(state.events).toEqual([]);
    expect(state.expectedBadges).toEqual([]);
  });

  it("does not manufacture progress for an ineligible binary fact", () => {
    const state = computeExpectedGamificationState("user-1", {
      ...facts,
      sourceFacts: [{ ...facts.sourceFacts[0]!, eligible: false }],
    }, rules({ version: "v1", category: "BADGE_ONLY", amount: 0 }));

    expect(state.events).toEqual([]);
    expect(state.expectedBadges).toEqual([]);
  });
});
