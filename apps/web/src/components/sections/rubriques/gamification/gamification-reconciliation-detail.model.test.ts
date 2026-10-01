import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import { buildReconciliationDetailCopy } from "./gamification-reconciliation-detail.model";
import { GamificationReconciliationDetail } from "./gamification-reconciliation-detail";
import { progression as noticeProgression, reconciliation as noticeReconciliation } from "./gamification-reconciliation-notice.test";

const progression = {
  ...noticeProgression,
  summary: {
    ...noticeProgression.summary,
    progressions: [{ id: "organisation", label: "Organisation", currentValue: 8, currentBadge: { id: "rubis", label: "Rubis" } }],
    milestones: [
      { id: "xp-milestone", label: "Parrainage utile", grantsXp: true, xpAmountOrPolicy: { kind: "fixed_one_shot", amount: 1 } },
      { id: "recognition-milestone", label: "Éclaireur", grantsXp: false, xpAmountOrPolicy: { kind: "fixed_one_shot", amount: 0 } },
    ],
  } as unknown as GamificationSummary,
  badgeCatalog: [{ id: "badge-topaze", label: "Topaze" }, { id: "badge-saphir", label: "Rubis" }],
} as unknown as typeof noticeProgression;

const detailReceipt = {
  ...noticeReconciliation.receipt,
  xp: { before: 53, after: 47, delta: -6, gained: 0, removed: 6 },
  level: { before: 5, after: 4, changed: true, direction: "down" as const },
  progressions: {
    added: [{ id: "organisation" }],
    removed: [{ id: "retired-progression" }],
    changed: [{ id: "organisation", before: { badgeIds: ["badge-topaze"], thresholds: [5], eventCount: 2 }, after: { badgeIds: ["badge-saphir"], thresholds: [10], eventCount: 3 } }],
  },
  badges: { unlocked: [{ id: "badge-saphir" }], removed: [{ id: "old-badge" }], upgraded: [{ from: { id: "badge-topaze" }, to: { id: "badge-saphir" } }], downgraded: [] },
  milestones: { unlocked: [{ id: "xp-milestone" }], removed: [{ id: "retired-milestone" }] },
  catalogChanges: { newProgressionIds: [], newMilestoneIds: ["recognition-milestone"], retiredMechanicIds: [] },
  reasonCategory: "data_correction" as const,
};

describe("buildReconciliationDetailCopy", () => {
  it("exposes user-facing before/after details, safe targets, and recognition rewards", () => {
    const copy = buildReconciliationDetailCopy(detailReceipt, progression, "fr");

    expect(copy.reasonDescription).toBe("Certaines données de votre compte ont été corrigées.");
    expect(copy.previousRulesVersion).toBe("Version 1");
    expect(copy.currentRulesVersion).toBe("Version 2");
    expect(copy.xpBefore).toBe("53 XP");
    expect(copy.xpAfter).toBe("47 XP");
    expect(copy.xpDelta).toBe("−6 XP");
    expect(copy.levelDownExplanation).toContain("critères requis");
    expect(copy.progressions.find((item) => item.kind === "changed")).toMatchObject({
      label: "Organisation",
      targetId: "progression-organisation",
      beforeBadge: "Topaze",
      afterBadge: "Rubis",
      afterValue: "8",
    });
    expect(copy.progressions.find((item) => item.kind === "removed")?.targetId).toBeNull();
    expect(copy.milestones.withXp[0]).toMatchObject({ label: "Parrainage utile", reward: "+1 XP", targetId: "milestone-xp-milestone" });
    expect(copy.milestones.recognition[0]).toMatchObject({ label: "Éclaireur", reward: "Jalon de reconnaissance — sans XP" });
    expect(copy.milestones.removed).toEqual(["Jalon retiré"]);
    expect(JSON.stringify(copy)).not.toContain("retired-progression");
    expect(JSON.stringify(copy)).not.toContain("old-badge");
  });

  it("keeps the dialog bilingual and exposes direct actions for current targets", () => {
    const copy = buildReconciliationDetailCopy(detailReceipt, progression, "en");
    const markup = renderToStaticMarkup(createElement(GamificationReconciliationDetail, {
      open: true,
      copy,
      locale: "en",
      onClose: () => undefined,
      onFocusTarget: () => undefined,
    }));

    expect(markup).toContain("Some account data was corrected.");
    expect(markup).toContain("Before");
    expect(markup).toContain("−6 XP");
    expect(markup).toContain("View this progression");
    expect(markup).toContain("View this milestone");
    expect(markup).toContain('role="dialog"');
  });
});
