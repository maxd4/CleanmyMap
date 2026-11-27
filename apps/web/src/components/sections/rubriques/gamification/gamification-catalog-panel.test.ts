import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { GamificationSummary, GamificationSummaryMilestone, GamificationSummaryProgression } from "@/lib/gamification/progression/gamification-summary";
import { getAcquiredTiers, selectCatalogItems, GamificationCatalogPanel, type CatalogView } from "./gamification-catalog-panel";

function progression(overrides: Partial<GamificationSummaryProgression> = {}): GamificationSummaryProgression {
  return { id: "participation", awardCategory: "XP_PROGRESSION", label: "Participation", description: "Actions validées", currentValue: 2, metricLabel: "actions", grantsXp: true, xpContribution: 1, currentBadge: { id: "tier-1", label: "Premier" }, nextBadge: { id: "tier-2", label: "Suivant" }, currentTier: { id: "tier-1", label: "Premier", threshold: 1, achieved: true }, nextTier: { id: "tier-2", label: "Suivant", threshold: 5, achieved: false }, previousTiers: [], progressPercent: 25, state: "in_progress", introducedInRulesRevision: 17, isNewSinceLastRulesMigration: true, ...overrides };
}

function milestone(overrides: Partial<GamificationSummaryMilestone> = {}): GamificationSummaryMilestone {
  return { id: "parcours_documente", awardCategory: "BADGE_ONLY", category: "BADGE_ONLY", label: "Parcours documenté", description: "Preuve documentée", grantsXp: false, xpAmountOrPolicy: { kind: "none", reason: "Recognition" }, state: "completed", xpContribution: 0, achieved: true, achievedAt: "2026-10-01T00:00:00.000Z", introducedInRulesRevision: 17, isNewSinceLastRulesMigration: false, ...overrides };
}

function summary(overrides: Partial<GamificationSummary> = {}): GamificationSummary {
  return { xpTotal: 1, currentLevel: 1, potentialLevel: 1, nextLevel: {} as GamificationSummary["nextLevel"], progressions: [progression(), progression({ id: "exploration", label: "Exploration", currentValue: 0, currentTier: undefined, currentBadge: null, progressPercent: 0, xpContribution: 0, state: "not_started" })], milestones: [milestone(), milestone({ id: "boucle_bouclee", label: "Boucle bouclée", awardCategory: "XP_MILESTONE", category: "XP_MILESTONE", grantsXp: true, xpAmountOrPolicy: { kind: "fixed_one_shot", amount: 1 }, state: "in_progress", achieved: false, achievedAt: null, progressCurrent: 1, progressTarget: 2, progressPercent: 50 })], xpReconciliation: { progressionXp: 1, milestoneXp: 0, compatibilityXp: 0, total: 1, isBalanced: true }, rulesMigration: { currentAppliedRulesRevision: 17, lastAcknowledgedRulesRevision: 17, latestRulesRevision: 17, hasUnacknowledgedChanges: false }, ...overrides };
}

function render(view: CatalogView, value = summary()) {
  return renderToStaticMarkup(createElement(GamificationCatalogPanel, { summary: value, loading: false, error: null, locale: "fr", view }));
}

describe("Gamification catalog views", () => {
  it("keeps earned tiers visible even when their infinite progression is still active", () => {
    const value = summary();
    expect(selectCatalogItems(value, "acquired").progressions.map((item) => item.id)).toEqual(["participation"]);
    expect(selectCatalogItems(value, "active").progressions.map((item) => item.id)).toEqual(["participation"]);
    expect(selectCatalogItems(value, "discover").progressions.map((item) => item.id)).toEqual(["exploration"]);
    expect(selectCatalogItems(value, "acquired").milestones.map((item) => item.id)).toEqual(["parcours_documente"]);
    expect(selectCatalogItems(value, "active").milestones.map((item) => item.id)).toEqual(["boucle_bouclee"]);
  });

  it("only displays earned tiers and deduplicates the current tier", () => {
    const item = progression();
    expect(getAcquiredTiers(progression({ previousTiers: [item.currentTier!, item.nextTier!] })).map((tier) => tier.id)).toEqual(["tier-1"]);
    const markup = render("acquired");
    expect(markup).toContain("Premier");
    expect(markup).not.toContain("Suivant");
    expect(markup).not.toContain("Exploration");
    expect(markup).toContain("Reconnaissance · sans XP");
    expect(markup).not.toContain("+0 XP");
    expect(markup).toContain('id="milestone-parcours_documente"');
  });

  it("displays only canonical progress, acquired tier, conditions and future rewards in active tasks", () => {
    const markup = render("active");
    expect(markup).toContain('id="progression-participation"');
    expect(markup).toContain("Palier acquis : Premier");
    expect(markup).toContain("Prochain palier : Suivant");
    expect(markup).toContain('aria-valuenow="25"');
    expect(markup).toContain('aria-valuenow="50"');
    expect(markup).toContain("Nouveau");
    expect(markup).toContain("+1 XP");
    expect(markup).not.toContain("Parcours documenté");
    expect(markup).not.toContain("Exploration");
  });

  it("does not manufacture a numeric milestone progress when absent", () => {
    const markup = render("discover", summary({ progressions: [], milestones: [milestone({ state: "not_started", achieved: false, achievedAt: null })] }));
    expect(markup).toContain("À débloquer");
    expect(markup).not.toContain('role="progressbar"');
  });

  it("renders the album from applicable summary, with acquired and next tiers only", () => {
    const markup = render("badges");
    expect(markup).toContain("Premier");
    expect(markup).toContain("Suivant");
    expect(markup).toContain("Jalons avec XP");
    expect(markup).toContain("Jalons de reconnaissance");
  });

  it("keeps the feedback criteria and canonical action link available in details", () => {
    const markup = render("active", summary({ progressions: [progression({ id: "product_feedback" })] }));
    expect(markup).toContain("compte max");
    expect(markup).toContain("l’envoi seul ne donnent pas d’XP");
    expect(markup).toContain('href="/sections/feedback#bug"');
  });

  it("does not produce a fake empty catalog during errors", () => {
    const markup = renderToStaticMarkup(createElement(GamificationCatalogPanel, { summary: undefined, loading: false, error: new Error("offline"), locale: "fr", view: "acquired" }));
    expect(markup).toContain("Progressions indisponibles");
    expect(markup).not.toContain("Aucune réalisation");
  });
});
