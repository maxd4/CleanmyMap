import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./app-navigation-ribbon-tour.tsx", import.meta.url), "utf8");

describe("guided navigation ribbon tutorial contract", () => {
  it("keeps the tutorial short, manual and relaunchable", () => {
    expect(source).toContain('data-navigation-tutorial-trigger');
    expect(source).toContain('aria-haspopup="dialog"');
    expect(source).toContain("<CmmDialog");
    expect(source).not.toContain("setTimeout(openTutorial");
    expect(source).not.toContain("localStorage");
    expect(source.match(/target: "/g)).toHaveLength(12);
    expect(source).toContain('entryPoint?: "ribbon" | "homepage"');
    expect(source).toContain('data-navigation-tutorial-entry="homepage"');
  });

  it("keeps all product explanations explicit and offers every requested action", () => {
    for (const label of [
      "Accueil",
      "Rechercher",
      "Navigation produit",
      "Préférences",
      "Feedback",
      "Profil et espace personnel",
    ]) {
      expect(source).toContain(`title: "${label}"`);
    }

    expect(source).toContain("copy.previous");
    expect(source).toContain("copy.next");
    expect(source).toContain("copy.skip");
    expect(source).toContain("copy.finish");
    expect(source).toContain("data-navigation-ribbon-tour-spotlight");
    expect(source).toContain("window.addEventListener(\"resize\"");
    expect(source).toContain("window.addEventListener(\"scroll\"");
    expect(source).toContain("Découvrez le ruban en 1 minute.");
  });
});
