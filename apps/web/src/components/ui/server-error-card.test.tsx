import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ServerErrorCard } from "./server-error-card";

describe("ServerErrorCard", () => {
  it("composes the canonical error SystemState without losing support context", () => {
    const markup = renderToStaticMarkup(
      <ServerErrorCard
        title="Erreur de chargement"
        message="La page ne peut pas être affichée."
        details="Le support peut utiliser ce contexte."
        referenceCode="ERR-TEST"
        onRetry={() => undefined}
        supportHref="/contact?source=test"
        supportLabel="Ouvrir le support"
      />,
    );

    expect(markup).toContain('data-state-variant="error"');
    expect(markup).toContain("Erreur de chargement");
    expect(markup).toContain("La page ne peut pas être affichée.");
    expect(markup).toContain("Référence de suivi");
    expect(markup).toContain("ERR-TEST");
    expect(markup).toContain("Le support peut utiliser ce contexte.");
    expect(markup).toContain("Réessayer");
    expect(markup).toContain("Ouvrir le support");
    expect(markup).not.toContain("cmm-card");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('aria-live="polite"');
  });
});
