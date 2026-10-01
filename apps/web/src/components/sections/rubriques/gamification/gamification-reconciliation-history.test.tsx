import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GamificationReconciliationHistoryEntry } from "@/lib/gamification/gamification-reconciliation-notice";
import { GamificationReconciliationHistory } from "./gamification-reconciliation-history";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const entry = {
  notificationId: "notification-1",
  createdAt: "2026-09-30T10:00:00.000Z",
  seenAt: null,
  acknowledgedAt: null,
  receipt: {
    reconciliationId: "reconciliation-1",
    userId: "user-1",
    occurredAt: "2026-09-30T10:00:00.000Z",
    currentRulesVersion: "v2",
    xp: { before: 48, after: 53, delta: 5 },
    level: { before: 6, after: 7 },
    progressions: { added: [{ id: "organisation" }], removed: [], changed: [] },
    badges: { unlocked: [{ id: "badge-rubis" }], removed: [], upgraded: [], downgraded: [] },
    milestones: { unlocked: [{ id: "milestone-1" }], removed: [] },
  },
} as unknown as GamificationReconciliationHistoryEntry;

describe("GamificationReconciliationHistory", () => {
  it("keeps the history secondary and exposes the required receipt summary", () => {
    const markup = renderToStaticMarkup(
      <GamificationReconciliationHistory
        history={[entry]}
        progression={undefined}
        loading={false}
        error={null}
        locale="fr"
      />,
    );

    expect(markup).toContain("Historique des mises à jour de progression");
    expect(markup).toContain("30 sept. 2026");
    expect(markup).toContain("Règles CURRENT");
    expect(markup).toContain("v2");
    expect(markup).toContain("+5 XP");
    expect(markup).toContain("6 → 7");
    expect(markup).toContain("Voir le détail");
    expect(markup).toContain('id="gamification-reconciliation-history"');
    expect(markup).not.toContain("user-1");
  });
});
