import type { GamificationRulesV1 } from "../gamification-rules";
import type { GamificationFacts } from "../gamification-reconstruction";

export function rules(
  version: string,
  category: "XP_MILESTONE" | "BADGE_ONLY" | "NON_GAMIFIED",
  amount = 1,
  milestoneId = category === "NON_GAMIFIED" ? null : "milestone-a",
): GamificationRulesV1 {
  return {
    version,
    rulesRevision: version === "v1" ? 1 : version === "v2" ? 2 : version === "v3" ? 3 : 4,
    mechanics: [{
      mechanicId: "mechanic-a",
      category,
      eventType: category === "NON_GAMIFIED" ? null : "action_declare_validation",
      progressionId: null,
      milestoneId,
      badgeId: category === "NON_GAMIFIED" ? null : "badge-a",
      sourceDomain: "actions",
      xpPolicy: category === "BADGE_ONLY" || category === "NON_GAMIFIED"
        ? { kind: "none", reason: "test" }
        : { kind: "fixed_one_shot", amount },
      awardPolicy: category === "XP_MILESTONE"
        ? { kind: "fixed", amount }
        : { kind: "none" },
      eligibility: category === "NON_GAMIFIED"
        ? { kind: "never", reason: "test" }
        : { kind: "canonical_fact", factKey: "action" },
      thresholds: [],
      introducedInRulesRevision: 1,
    }],
  };
}

export const facts: GamificationFacts = {
  userId: "user-1",
  sourceFacts: [{
    mechanicId: "mechanic-a",
    eventType: "action_declare_validation",
    sourceTable: "actions",
    sourceId: "action-1",
    occurredOn: "2026-09-28",
    xpAwarded: 1,
  }],
};
