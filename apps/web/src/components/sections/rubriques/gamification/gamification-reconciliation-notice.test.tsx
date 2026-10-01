import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PendingGamificationReconciliation } from "@/lib/gamification/gamification-reconciliation-notice";
import type { UserProgressionResponse } from "@/lib/gamification/progression-types";
import { GamificationReconciliationNotice } from "./gamification-reconciliation-notice";

export const progression = {
  summary: {
    progressions: [{ id: "moderation", label: "Modération" }],
    milestones: [{ id: "boucle_bouclee", label: "Boucle bouclée" }],
  },
  badgeCatalog: [{ id: "badge-saphir", label: "Saphir" }],
} as unknown as UserProgressionResponse;

export const reconciliation = {
  notificationId: "notification-1",
  createdAt: "2026-09-30T10:00:00.000Z",
  receipt: {
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
  },
} as PendingGamificationReconciliation;

describe("GamificationReconciliationNotice", () => {
  it("renders the French notice before acknowledgement with explicit summary and CTAs", () => {
    const markup = renderToStaticMarkup(
      <GamificationReconciliationNotice
        reconciliation={reconciliation}
        progression={progression}
        locale="fr"
        onAcknowledged={() => undefined}
      />,
    );

    expect(markup).toContain("Votre progression a été recalculée");
    expect(markup).toContain("Les règles de gamification ou les données prises en compte ont évolué.");
    expect(markup).toContain("100 → 115 XP");
    expect(markup).toContain("+15 XP");
    expect(markup).toContain("Niveau 4 → Niveau 5");
    expect(markup).toContain("Voir le détail");
    expect(markup).toContain("Voir mes nouvelles progressions");
    expect(markup).toContain('href="#progression-moderation"');
    expect(markup).toContain("Voir mes nouveaux jalons");
    expect(markup).toContain('href="#milestone-boucle_bouclee"');
    expect(markup).toContain("Compris");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
  });

  it("renders nothing after the pending receipt is absent", () => {
    const markup = renderToStaticMarkup(
      <GamificationReconciliationNotice
        reconciliation={null}
        progression={progression}
        locale="fr"
        onAcknowledged={() => undefined}
      />,
    );

    expect(markup).toBe("");
  });
});
