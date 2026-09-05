import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountEvolutionCta } from "./account-evolution-cta";
import { AccountEvolutionStatusLink } from "./account-evolution-status-link";

describe("account evolution discovery CTAs", () => {
  it("uses the canonical destination and shows the granted level", () => {
    const markup = renderToStaticMarkup(<AccountEvolutionCta currentRole="benevole" />);

    expect(markup).toContain('href="/compte/evolution"');
    expect(markup).toContain("Niveau actuel : Bénévole");
    expect(markup).not.toContain("IMU");
  });

  it("renders the pending label for compact surfaces", () => {
    const markup = renderToStaticMarkup(
      <AccountEvolutionStatusLink
        pendingInitially={true}
        label="Évolution du compte"
        pendingLabel="Évolution du compte · En attente"
      />,
    );

    expect(markup).toContain("Évolution du compte · En attente");
    expect(markup).toContain('href="/compte/evolution"');
  });
});
