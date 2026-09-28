import { describe, expect, it } from "vitest";
import { CURRENT_GAMIFICATION_RULES_REVISION } from "./progression-types";
import { CURRENT_INFINITE_PROGRESSIONS, CURRENT_MILESTONES } from "./progression-utils";
import {
  buildGamificationCatalog,
  isMechanicNewSinceLastRulesMigration,
  milestoneFactsFromStates,
} from "./gamification-catalog";
import { buildCurrentMilestones } from "./milestones";

const tiers = [
  { id: "observer", title: "Observateur", threshold: 0 },
  { id: "first", title: "Premier", threshold: 1 },
  { id: "second", title: "Second", threshold: 3 },
];

function buildInput(overrides?: {
  participationValue?: number;
  participationStarted?: boolean;
  referral?: { invitedUsersCount: number };
}) {
  const milestones = buildCurrentMilestones({ completeActionsCount: 0 });
  return {
    progressions: {
      participation: {
        currentValue: overrides?.participationValue ?? 0,
        started: overrides?.participationStarted ?? false,
        tiers,
      },
    },
    milestones: milestoneFactsFromStates(milestones, overrides?.referral),
    applicableProgressionIds: ["participation"] as const,
    applicableMilestoneIds: ["parrainage_utile"] as const,
  };
}

describe("buildGamificationCatalog", () => {
  it("projects every current mechanic and never emits NON_GAMIFIED entries", () => {
    const catalog = buildGamificationCatalog({
      progressions: Object.fromEntries(
        CURRENT_INFINITE_PROGRESSIONS.map((definition) => [
          definition.id,
          { currentValue: 0, started: false, tiers },
        ]),
      ),
      milestones: Object.fromEntries(
        CURRENT_MILESTONES.map((definition) => [
          definition.id,
          { achieved: false, achievedAt: null },
        ]),
      ),
    });

    expect(catalog).toHaveLength(CURRENT_INFINITE_PROGRESSIONS.length + CURRENT_MILESTONES.length);
    expect(catalog.map((item) => item.category)).not.toContain("NON_GAMIFIED" as never);
  });

  it("keeps an empty infinite progression unstarted and does not unlock Observateur", () => {
    const [item] = buildGamificationCatalog(buildInput());

    expect(item.state).toBe("not_started");
    expect(item.progression).toMatchObject({
      currentValue: 0,
      currentTier: { title: "Observateur", achieved: false },
      currentTierAchieved: false,
      nextTier: { title: "Premier", threshold: 1 },
      nextThreshold: 1,
      progressPercent: 0,
    });
  });

  it("uses completed tiers as current and the next tier as the active target", () => {
    const [item] = buildGamificationCatalog(
      buildInput({ participationValue: 2, participationStarted: true }),
    );

    expect(item.state).toBe("in_progress");
    expect(item.progression).toMatchObject({
      currentTier: { title: "Premier", achieved: true },
      currentTierAchieved: true,
      nextTier: { title: "Second", threshold: 3, achieved: false },
      progressPercent: 50,
      previousTiers: [],
    });
  });

  it("represents referral progress only when an invite is actually registered", () => {
    const notStarted = buildGamificationCatalog(buildInput()).find(
      (item) => item.id === "parrainage_utile",
    )!;
    const inProgress = buildGamificationCatalog(
      buildInput({ referral: { invitedUsersCount: 1 } }),
    ).find((item) => item.id === "parrainage_utile")!;

    expect(notStarted.milestone).toMatchObject({
      achieved: false,
    });
    expect(notStarted.state).toBe("not_started");
    expect(inProgress.state).toBe("in_progress");
    expect(inProgress.milestone).toMatchObject({
      progressCurrent: 1,
      progressTarget: 1,
      progressPercent: 100,
    });
  });

  it("uses the canonical category and rules revision instead of inferring XP", () => {
    const items = buildGamificationCatalog(buildInput());
    const milestone = items.find((item) => item.kind === "milestone")!;

    expect(milestone.category).toBe("XP_MILESTONE");
    expect(milestone.grantsXp).toBe(true);
    expect(milestone.introducedInRulesRevision).toBe(1);
    expect(milestone.isNewSinceLastRulesMigration).toBe(false);
  });

  it("keeps NEW orthogonal to an already started or completed mechanic", () => {
    const catalog = buildGamificationCatalog({
      progressions: {
        moderation: {
          currentValue: 18,
          started: true,
          tiers,
        },
      },
      milestones: {
        boucle_bouclee: { achieved: true, achievedAt: "2026-09-28" },
      },
      applicableProgressionIds: ["moderation"],
      applicableMilestoneIds: ["boucle_bouclee"],
      currentAppliedRulesRevision: CURRENT_GAMIFICATION_RULES_REVISION,
      lastAcknowledgedRulesRevision: 11,
    });

    expect(catalog.find((item) => item.id === "moderation")).toMatchObject({
      state: "in_progress",
      isNewSinceLastRulesMigration: true,
    });
    expect(catalog.find((item) => item.id === "boucle_bouclee")).toMatchObject({
      state: "completed",
      isNewSinceLastRulesMigration: true,
    });
  });

  it("does not keep old mechanics NEW after acknowledgement or a later revision", () => {
    expect(isMechanicNewSinceLastRulesMigration(1, {
      currentAppliedRulesRevision: 12,
      lastAcknowledgedRulesRevision: 0,
    })).toBe(false);
    expect(isMechanicNewSinceLastRulesMigration(12, {
      currentAppliedRulesRevision: 12,
      lastAcknowledgedRulesRevision: 12,
    })).toBe(false);
    expect(isMechanicNewSinceLastRulesMigration(13, {
      currentAppliedRulesRevision: 13,
      lastAcknowledgedRulesRevision: 12,
    })).toBe(true);
  });
});
