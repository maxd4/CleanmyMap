import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";
import { buildCatalogGroups, GamificationCatalogPanel } from "./gamification-catalog-panel";

function summary(overrides: Partial<GamificationSummary> = {}): GamificationSummary {
  return {
    xpTotal: 0,
    currentLevel: 1,
    potentialLevel: 1,
    nextLevel: {} as GamificationSummary["nextLevel"],
    progressions: [],
    milestones: [],
    xpReconciliation: { progressionXp: 0, milestoneXp: 0, compatibilityXp: 0, total: 0, isBalanced: true },
    rulesMigration: { currentAppliedRulesRevision: 12, lastAcknowledgedRulesRevision: 12, latestRulesRevision: 12, hasUnacknowledgedChanges: false },
    ...overrides,
  };
}

function progression(id: "participation" | "organisation" | "exploration", state: "in_progress" | "not_started", isNewSinceLastRulesMigration: boolean) {
  return {
    id,
    label: id,
    description: id,
    currentValue: state === "in_progress" ? 1 : 0,
    metricLabel: "actions",
    grantsXp: true,
    xpContribution: 0,
    currentBadge: null,
    nextBadge: { id: `${id}-1`, label: "Premier" },
    progressPercent: state === "in_progress" ? 50 : 0,
    state,
    introducedInRulesRevision: 12,
    isNewSinceLastRulesMigration,
  } as const;
}

describe("buildCatalogGroups", () => {
  it("keeps the canonical state while isolating only new untouched mechanics", () => {
    const groups = buildCatalogGroups(summary({
      progressions: [
        progression("participation", "in_progress", true),
        progression("exploration", "not_started", true),
        progression("organisation", "not_started", false),
      ],
      milestones: [
        {
          id: "premiere_trace_utile",
          category: "XP_MILESTONE",
          label: "Trace",
          description: "Trace",
          grantsXp: true,
          xpAmountOrPolicy: { kind: "fixed_one_shot", amount: 1 },
          state: "completed",
          xpContribution: 1,
          achieved: true,
          achievedAt: "2026-10-01T00:00:00.000Z",
          introducedInRulesRevision: 12,
          isNewSinceLastRulesMigration: true,
        },
      ],
    }));

    expect(groups.progressions.newItems.map((item) => item.id)).toEqual(["exploration"]);
    expect(groups.progressions.inProgress.map((item) => item.id)).toEqual(["participation"]);
    expect(groups.progressions.toDiscover.map((item) => item.id)).toEqual(["organisation"]);
    expect(groups.milestones.newItems).toEqual([]);
    expect(groups.milestones.completed.map((item) => item.id)).toEqual(["premiere_trace_utile"]);
  });

  it("keeps a newly introduced completed milestone in Terminés with a separate New marker", () => {
    const summaryValue = summary({
      milestones: [{
        id: "parcours_documente",
        category: "BADGE_ONLY",
        label: "Parcours documenté",
        description: "Une preuve de parcours documentée.",
        grantsXp: false,
        xpAmountOrPolicy: { kind: "fixed_one_shot", amount: 0 },
        state: "completed",
        xpContribution: 0,
        achieved: true,
        achievedAt: "2026-10-01T00:00:00.000Z",
        introducedInRulesRevision: 13,
        isNewSinceLastRulesMigration: true,
      }],
    });

    const markup = renderToStaticMarkup(createElement(GamificationCatalogPanel, {
      summary: summaryValue,
      loading: false,
      error: null,
      locale: "fr",
    }));

    expect(markup).toContain(">New<");
    expect(markup).toContain("✓ Terminé");
    expect(markup).toContain("Parcours documenté");
    expect(markup).toContain("Reconnaissance");
    expect(markup).toContain('id="milestone-parcours_documente"');
    expect(markup).toContain("Terminés");
    expect(markup).not.toContain("Nouveau ·");
    expect(markup).not.toContain("À découvrir 1");
  });

  it("shows a new progression with activity in En cours and keeps the New marker", () => {
    const markup = renderToStaticMarkup(createElement(GamificationCatalogPanel, {
      summary: summary({
        progressions: [
          progression("participation", "in_progress", true),
          progression("exploration", "not_started", true),
        ],
      }),
      loading: false,
      error: null,
      locale: "fr",
    }));

    expect(markup).toContain("Nouvelles tâches");
    expect(markup).toContain("En cours");
    expect(markup).toContain('id="progression-participation"');
    expect(markup).toContain(">New<");
  });
});
