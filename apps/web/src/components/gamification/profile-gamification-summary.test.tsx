import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileGamificationSummary } from "./profile-gamification-summary";

const summary = {
  xpTotal: 42,
  currentLevel: 7,
  potentialLevel: 8,
  nextLevel: {} as never,
  progressions: [{ state: "in_progress" }],
  milestones: [],
  xpReconciliation: { progressionXp: 42, milestoneXp: 0, compatibilityXp: 0, total: 42, isBalanced: true },
} as never;

describe("ProfileGamificationSummary", () => {
  it("renders the supplied progression values and canonical CTA", () => {
    const markup = renderToStaticMarkup(
      <ProfileGamificationSummary
        summary={summary}
      />,
    );

    expect(markup).toContain("Résumé de progression");
    expect(markup).toContain("Niveau actuel");
    expect(markup).toContain(">7<");
    expect(markup).toContain("XP totale");
    expect(markup).toContain(">42<");
    expect(markup).toContain("Niveau potentiel");
    expect(markup).toContain('href="/profil/impact"');
    expect(markup).toContain("Voir ma carte d’impact");
    expect(markup).toContain('href="/sections/gamification"');
    expect(markup).toContain("Voir toute ma progression");
  });

  it("does not invent a level when identity is unavailable", () => {
    const markup = renderToStaticMarkup(
      <ProfileGamificationSummary
        summary={null}
      />,
    );

    expect(markup).toContain(">—<");
    expect(markup).not.toContain(">1<");
  });
});
