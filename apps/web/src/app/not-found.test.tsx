import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("uses the empty SystemState contract with a safe home destination", () => {
    const markup = renderToStaticMarkup(<NotFound />);

    expect(markup).toContain('data-state-variant="empty"');
    expect(markup).toContain("Page introuvable");
    expect(markup).toContain("Cette adresse ne correspond à aucune page connue.");
    expect(markup).toContain("Retour à l&#x27;accueil");
    expect(markup).not.toContain("CleanMyMap Core Discovery");
    expect(markup).not.toContain("Coordonnées Introuvables");
    expect(markup).not.toContain("history.back");
  });
});
