import { describe, expect, it } from "vitest";
import type { ExpectedGamificationState } from "./gamification-reconstruction";
import type { GamificationReconciliationPlan } from "./gamification-reconciliation-plan";
import type { GamificationRulesV1 } from "./gamification-rules";
import {
  buildGamificationReconciliationReceipt,
  persistGamificationReconciliationReceipt,
} from "./gamification-reconciliation-receipt";

function event(
  logicalId: string,
  xpAwarded: number,
  metadata: Record<string, unknown>,
) {
  return {
    logicalId,
    userId: "user-1",
    mechanicId: "mechanic-a",
    eventType: "action_declare_validation",
    category: "XP_PROGRESSION" as const,
    progressionId: typeof metadata.progressionId === "string" ? metadata.progressionId : null,
    milestoneId: null,
    sourceTable: "actions",
    sourceId: logicalId,
    statusPhase: "validated" as const,
    weight: 1,
    xpBase: xpAwarded,
    xpAwarded,
    occurredOn: "2026-09-28",
    threshold: typeof metadata.threshold === "number" ? metadata.threshold : null,
    metadata,
  };
}

function plan(overrides: Partial<GamificationReconciliationPlan> = {}): GamificationReconciliationPlan {
  const expectedEvent = event("user-1:expected", 2, {
    gamificationEngine: "CURRENT_RECONCILABLE",
    progressionId: "participation",
    badgeId: "badge-sapphire",
    threshold: 5,
    rulesVersion: "v2",
  });
  const currentEvent = {
    id: 10,
    event_type: expectedEvent.eventType as "action_declare_validation",
    source_table: expectedEvent.sourceTable,
    source_id: expectedEvent.sourceId,
    status_phase: expectedEvent.statusPhase,
    weight: 1,
    xp_base: 1,
    xp_awarded: 1,
    occurred_on: expectedEvent.occurredOn,
    metadata: {
      gamificationEngine: "CURRENT_RECONCILABLE",
      progressionId: "participation",
      badgeId: "badge-observer",
      threshold: 1,
      rulesVersion: "v1",
      logicalId: expectedEvent.logicalId,
    },
  };
  return {
    userId: "user-1",
    rulesVersionBefore: "v1",
    rulesVersionAfter: "v2",
    rulesRevisionBefore: 1,
    rulesRevisionAfter: 2,
    xpBefore: 1,
    xpExpected: 2,
    xpDelta: 1,
    levelBefore: 1,
    levelAfter: 2,
    eventsToAdd: [],
    eventsToUpdate: [{
      id: 10,
      logicalId: expectedEvent.logicalId,
      sourceTable: expectedEvent.sourceTable,
      sourceId: expectedEvent.sourceId,
      eventType: expectedEvent.eventType,
      xpAwarded: 2,
      metadata: expectedEvent.metadata,
    }],
    eventsToRemove: [],
    badgesAdded: ["badge-sapphire"],
    badgesRemoved: ["badge-observer"],
    milestonesAdded: ["milestone-a"],
    milestonesRemoved: [],
    currentEventCountBefore: 1,
    legacyEventCountPreserved: 0,
    expected: {
      userId: "user-1",
      rulesVersion: "v2",
      rulesRevision: 2,
      events: [expectedEvent],
      expectedMilestones: [],
      expectedBadges: ["badge-sapphire"],
      progressionCounters: {},
      applicableMechanicIds: ["mechanic-a"],
    } satisfies ExpectedGamificationState,
    currentPersisted: [currentEvent],
    ...overrides,
  };
}

function emptyPlan(): GamificationReconciliationPlan {
  const base = plan();
  return plan({
    xpBefore: 0,
    xpExpected: 0,
    xpDelta: 0,
    levelBefore: 1,
    levelAfter: 1,
    eventsToUpdate: [],
    currentPersisted: [],
    expected: { ...base.expected, events: [], expectedBadges: [] },
    badgesAdded: [],
    badgesRemoved: [],
    milestonesAdded: [],
    milestonesRemoved: [],
  });
}

describe("GamificationReconciliationReceipt", () => {
  it("describes XP, level, progression, badge and milestone consequences", () => {
    const receipt = buildGamificationReconciliationReceipt(plan(), {
      occurredAt: "2026-09-28T10:00:00.000Z",
      reasonCategory: "rules_update",
    });

    expect(receipt).toMatchObject({
      userId: "user-1",
      previousRulesVersion: "v1",
      currentRulesVersion: "v2",
      occurredAt: "2026-09-28T10:00:00.000Z",
      xp: { before: 1, after: 2, delta: 1, gained: 1, removed: 0 },
      level: { before: 1, after: 2, changed: true, direction: "up" },
      eventChanges: { addedCount: 0, updatedCount: 1, removedCount: 0 },
      reasonCategory: "rules_update",
      hasUserVisibleChanges: true,
    });
    expect(receipt.progressions.changed[0]?.id).toBe("participation");
    expect(receipt.badges.unlocked).toEqual([{ id: "badge-sapphire", progressionId: "participation" }]);
    expect(receipt.badges.removed).toEqual([{ id: "badge-observer", progressionId: "participation" }]);
    expect(receipt.milestones.unlocked).toEqual([{ id: "milestone-a" }]);
  });

  it("reports an applicable new catalog mechanic even without XP or a badge", () => {
    const currentRules: GamificationRulesV1 = {
      version: "v2",
      rulesRevision: 2,
      mechanics: [{
        mechanicId: "mechanic-a",
        category: "XP_PROGRESSION",
        eventType: "action_declare_validation",
        progressionId: "participation",
        milestoneId: null,
        badgeId: null,
        sourceDomain: "actions",
        xpPolicy: { kind: "progression_paliers", rule: "common_current_scale" },
        awardPolicy: { kind: "none" },
        eligibility: { kind: "canonical_fact", factKey: "actions" },
        thresholds: [],
        introducedInRulesRevision: 2,
      }],
    };
    const base = plan({
      rulesRevisionBefore: 1,
      expected: {
        ...plan().expected,
        events: [],
        expectedMilestones: [],
        expectedBadges: [],
        applicableMechanicIds: ["mechanic-a"],
      },
      eventsToUpdate: [],
      eventsToRemove: [],
      xpExpected: 1,
      xpDelta: 0,
      badgesAdded: [],
      badgesRemoved: [],
      milestonesAdded: [],
      milestonesRemoved: [],
    });
    const receipt = buildGamificationReconciliationReceipt(base, { rules: currentRules });

    expect(receipt.catalogChanges).toEqual({
      newProgressionIds: ["participation"],
      newMilestoneIds: [],
      retiredMechanicIds: [],
    });
    expect(receipt.hasUserVisibleChanges).toBe(true);
  });

  it("marks XP removal and level down without inventing a positive delta", () => {
    const receipt = buildGamificationReconciliationReceipt(plan({
      xpBefore: 5,
      xpExpected: 2,
      xpDelta: -3,
      levelBefore: 3,
      levelAfter: 2,
      badgesAdded: [],
      badgesRemoved: ["badge-sapphire"],
      milestonesAdded: [],
      milestonesRemoved: ["milestone-a"],
    }));

    expect(receipt.xp).toMatchObject({ before: 5, after: 2, delta: -3, gained: 0, removed: 3 });
    expect(receipt.level.direction).toBe("down");
    expect(receipt.milestones.removed).toEqual([{ id: "milestone-a" }]);
  });

  it("does not request a user receipt for a zero-delta rebuild", () => {
    const empty = emptyPlan();
    const receipt = buildGamificationReconciliationReceipt(empty, { occurredAt: "2026-09-28T10:00:00.000Z" });
    expect(receipt.hasUserVisibleChanges).toBe(false);
  });

  it("persists only the owning user receipt and skips zero-delta inserts", async () => {
    const rows: Array<Record<string, unknown>> = [];
    const supabase = {
      from(table: string) {
        expect(table).toBe("app_notifications");
        return {
          insert(row: Record<string, unknown>) {
            rows.push(row);
            return Promise.resolve({ error: null });
          },
        };
      },
    } as never;
    const first = buildGamificationReconciliationReceipt(plan(), { occurredAt: "2026-09-28T10:00:00.000Z" });
    const second = buildGamificationReconciliationReceipt(plan({ userId: "user-2" }), { occurredAt: "2026-09-28T10:00:01.000Z" });

    await persistGamificationReconciliationReceipt(supabase, first);
    await persistGamificationReconciliationReceipt(supabase, second);
    await persistGamificationReconciliationReceipt(supabase, buildGamificationReconciliationReceipt(emptyPlan()));

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.user_id)).toEqual(["user-1", "user-2"]);
  });
});
