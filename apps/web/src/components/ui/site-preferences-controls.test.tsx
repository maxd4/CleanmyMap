import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SitePreferencesProvider } from "./site-preferences-provider";
import { SitePreferencesControls } from "./site-preferences-controls";

describe("SitePreferencesControls", () => {
  it("links to the canonical display-mode explanation without adding a mode action", () => {
    const markup = renderToStaticMarkup(
      <SitePreferencesProvider>
        <SitePreferencesControls />
      </SitePreferencesProvider>,
    );

    expect(markup).toContain('href="/methodologie#modes-affichage"');
    expect(markup).toContain('aria-label="Comprendre les modes d&#x27;affichage"');
    expect(markup).toContain("Exhaustif");
    expect(markup).toContain("Minimaliste");
    expect(markup).toContain("Sobre");
    expect(markup).not.toContain("Le mode sobre utilise une police système locale");
  });

  it("supports a compact dropdown variant without changing the full layout contract", () => {
    const markup = renderToStaticMarkup(
      <SitePreferencesProvider>
        <SitePreferencesControls variant="compact" />
      </SitePreferencesProvider>,
    );

    expect(markup).toContain("min-h-10");
    expect(markup).toContain("gap-2 px-2.5 py-2");
    expect(markup).toContain("Comprendre les modes d&#x27;affichage");
  });
});
