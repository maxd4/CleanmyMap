import { describe, expect, it } from "vitest";
import type { GamificationReconciliationReceipt } from "@/lib/gamification/gamification-reconciliation-receipt";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import type { UserProgressionResponse } from "@/lib/gamification/progression-types";
import { buildReconciliationNoticeCopy } from "./gamification-reconciliation-notice.model";

const summary = {
  progressions: [
    { id: "regularity", label: "Régularité" },
    { id: "moderation", label: "Modération" },
  ],
  milestones: [{ id: "boucle_bouclee", label: "Boucle bouclée" }],
} as GamificationSummary;

const progression = {
  summary,
  badgeCatalog: [
    { id: "badge-topaze", label: "Topaze" },
    { id: "badge-saphir", label: "Saphir" },
  ],
} as unknown as UserProgressionResponse;

function receipt(overrides: Partial<GamificationReconciliationReceipt> = {}): GamificationReconciliationReceipt {
  return {
    reconciliationId: "reconciliation-1",
    userId: "user-1",
    occurredAt: "2026-09-30T10:00:00.000Z",
    previousRulesVersion: "v1",
    currentRulesVersion: "v2",
    previousRulesRevision: 1,
    currentRulesRevision: 2,
    xp: { before: 100, after: 115, delta: 15, gained: 15, removed: 0 },
    level: { before: 4, after: 5, changed: true, direction: "up" },
    progressions: { added: [{ id: "moderation" }], removed: [], changed: [] },
    badges: { unlocked: [{ id: "badge-saphir" }], removed: [], upgraded: [], downgraded: [] },
    milestones: { unlocked: [{ id: "boucle_bouclee" }], removed: [] },
    eventChanges: { addedCount: 1, updatedCount: 0, removedCount: 0 },
    catalogChanges: { newProgressionIds: [], newMilestoneIds: [], retiredMechanicIds: [] },
    reasonCategory: "rules_update",
    hasUserVisibleChanges: true,
    ...overrides,
  };
}

describe("buildReconciliationNoticeCopy", () => {
  it("shows a positive XP delta, a level-up and all added categories", () => {
    const copy = buildReconciliationNoticeCopy(receipt(), progression, "fr");

    expect(copy.xpBeforeAfter).toBe("100 → 115 XP");
    expect(copy.xpDelta).toBe("+15 XP");
    expect(copy.level).toBe("Niveau 4 → Niveau 5");
    expect(copy.changes).toEqual([
      "Nouvelle progression : Modération",
      "+ 1 badge obtenu",
      "Nouveau jalon : Boucle bouclée",
    ]);
    expect(copy.hasProgressionChanges).toBe(true);
    expect(copy.hasNewMilestonesOrBadges).toBe(true);
  });

  it("shows a negative XP delta and an explicit level-down", () => {
    const copy = buildReconciliationNoticeCopy(receipt({
      xp: { before: 115, after: 107, delta: -8, gained: 0, removed: 8 },
      level: { before: 5, after: 4, changed: true, direction: "down" },
      progressions: { added: [], removed: [], changed: [] },
      badges: { unlocked: [], removed: [{ id: "badge-saphir" }], upgraded: [], downgraded: [] },
      milestones: { unlocked: [], removed: [{ id: "boucle_bouclee" }] },
    }), progression, "fr");

    expect(copy.xpDelta).toBe("−8 XP");
    expect(copy.level).toBe("Niveau 5 → Niveau 4");
    expect(copy.changes).toEqual(["− 1 ancien badge retiré", "Jalon retiré : Boucle bouclée"]);
  });

  it("keeps the level and does not invent +0 XP for a badge-only change", () => {
    const copy = buildReconciliationNoticeCopy(receipt({
      xp: { before: 115, after: 115, delta: 0, gained: 0, removed: 0 },
      level: { before: 5, after: 5, changed: false, direction: "same" },
      progressions: { added: [], removed: [], changed: [] },
      badges: { unlocked: [{ id: "badge-saphir" }], removed: [], upgraded: [], downgraded: [] },
      milestones: { unlocked: [], removed: [] },
    }), progression, "fr");

    expect(copy.xpDelta).toBeNull();
    expect(copy.level).toBe("Niveau 5 conservé");
    expect(copy.changes).toEqual(["+ 1 badge obtenu"]);
    expect(copy.changes.join(" ")).not.toContain("+0 XP");
  });

  it("names a progression tier change and keeps the progressions CTA active", () => {
    const copy = buildReconciliationNoticeCopy(receipt({
      xp: { before: 115, after: 115, delta: 0, gained: 0, removed: 0 },
      level: { before: 5, after: 5, changed: false, direction: "same" },
      progressions: {
        added: [],
        removed: [],
        changed: [{
          id: "regularity",
          before: { badgeIds: ["badge-topaze"], thresholds: [3], eventCount: 1 },
          after: { badgeIds: ["badge-saphir"], thresholds: [5], eventCount: 1 },
        }],
      },
      badges: { unlocked: [], removed: [], upgraded: [{ from: { id: "badge-topaze" }, to: { id: "badge-saphir" } }], downgraded: [] },
      milestones: { unlocked: [], removed: [] },
    }), progression, "fr");

    expect(copy.changes).toEqual(["Régularité : Topaze → Saphir", "1 badge a changé de palier"]);
    expect(copy.hasProgressionChanges).toBe(true);
  });
});
