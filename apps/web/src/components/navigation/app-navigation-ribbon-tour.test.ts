import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./app-navigation-ribbon-tour.tsx", import.meta.url), "utf8");
const layoutCss = readFileSync(new URL("../../styles/layout.css", import.meta.url), "utf8");

describe("guided navigation ribbon tutorial contract", () => {
  it("keeps the tutorial short, manual and relaunchable", () => {
    expect(source).toContain('data-navigation-tutorial-trigger');
    expect(source).toContain('role="region"');
    expect(source).not.toContain("<CmmDialog");
    expect(source).not.toContain('aria-modal="true"');
    expect(source).not.toContain("setTimeout(openTutorial");
    expect(source).not.toContain("localStorage");
    expect(source.match(/target: "/g)).toHaveLength(12);
    expect(source).toContain('entryPoint: "homepage" | "onboarding"');
    expect(source).toContain('data-navigation-tutorial-entry="homepage"');
    expect(source).toContain('data-navigation-tutorial-entry="onboarding"');
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
    expect(source).toContain("data-navigation-ribbon-tour-blocker");
    expect(layoutCss).toContain("backdrop-filter: blur(12px)");
    expect(source).toContain("window.addEventListener(\"resize\"");
    expect(source).toContain("window.addEventListener(\"scroll\"");
    expect(source).toContain("Découvrez le ruban en 1 minute.");
    expect(source.match(/icon: (?:House|Search|LayoutGrid|Settings2|MessageSquare|UserRound)/g)).toHaveLength(12);
  });
});
