import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileGamificationSummary } from "./profile-gamification-summary";

describe("ProfileGamificationSummary", () => {
  it("renders the supplied progression values and canonical CTA", () => {
    const markup = renderToStaticMarkup(
      <ProfileGamificationSummary
        currentLevel={7}
        actionsCreated={12}
        regularityLabel="Régulier"
        actionBalanceLabel="Équilibré"
      />,
    );

    expect(markup).toContain("Résumé de progression");
    expect(markup).toContain("Niveau actuel");
    expect(markup).toContain(">7<");
    expect(markup).toContain("Actions créées");
    expect(markup).toContain(">12<");
    expect(markup).toContain(">Régulier<");
    expect(markup).toContain(">Équilibré<");
    expect(markup).toContain('href="/sections/gamification"');
    expect(markup).toContain("Voir toute ma progression");
  });

  it("does not invent a level when identity is unavailable", () => {
    const markup = renderToStaticMarkup(
      <ProfileGamificationSummary
        currentLevel={null}
        actionsCreated={0}
        regularityLabel="Observateur"
        actionBalanceLabel="Observateur"
      />,
    );

    expect(markup).toContain(">—<");
    expect(markup).not.toContain(">1<");
  });
});
