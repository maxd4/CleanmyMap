import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  LEARN_PRACTICE_THEME_ORDER,
  LearnPracticeThemeTabs,
} from "./learn-practice-theme-tabs";

describe("LearnPracticeThemeTabs", () => {
  it("renders accessible tabs and the three visual schemas", () => {
    const triMarkup = renderToStaticMarkup(
      React.createElement(LearnPracticeThemeTabs, {
        locale: "fr",
        activeTheme: "tri",
        onThemeChange: () => undefined,
      }),
    );
    const compostMarkup = renderToStaticMarkup(
      React.createElement(LearnPracticeThemeTabs, {
        locale: "fr",
        activeTheme: "compost",
        onThemeChange: () => undefined,
      }),
    );
    const reduireMarkup = renderToStaticMarkup(
      React.createElement(LearnPracticeThemeTabs, {
        locale: "fr",
        activeTheme: "reduire",
        onThemeChange: () => undefined,
      }),
    );

    expect(LEARN_PRACTICE_THEME_ORDER).toEqual(["tri", "compost", "reduire"]);
    expect(triMarkup).toContain("role=\"tablist\"");
    expect(triMarkup).toContain("role=\"tab\"");
    expect(triMarkup).toContain("aria-selected=\"true\"");
    expect(triMarkup).toContain("aria-selected=\"false\"");
    expect(triMarkup).toContain("role=\"tabpanel\"");
    expect(triMarkup).toContain("aria-controls=");
    expect(triMarkup).toContain("aria-labelledby=");
    expect(triMarkup).toContain("Bien trier");
    expect(triMarkup).toContain("Catégories utiles");
    expect(triMarkup).toContain("À éviter");
    expect(triMarkup).toContain("Éclairages Gestes Propres");
    expect(triMarkup).toContain("Que Faire de Mes Objets");

    expect(compostMarkup).toContain("Humide + sec = compost stable");
    expect(compostMarkup).toContain("Matières humides");
    expect(compostMarkup).toContain("Matières sèches");
    expect(compostMarkup).toContain("Humidité");
    expect(compostMarkup).toContain("Aération");
    expect(compostMarkup).toContain("Réduire à la source");
    expect(compostMarkup).not.toContain("Éclairages Gestes Propres");

    expect(reduireMarkup).toContain("Campagne à la une");
    expect(reduireMarkup).toContain("Ça va pas s’faire tout seul !");
    expect(reduireMarkup).toContain("Campagne Gestes Propres · 2025–2026");
    expect(reduireMarkup).toContain("Baromètre national 2025");
    expect(reduireMarkup).toContain("Déclarations contre pratiques");
    expect(reduireMarkup).toContain("Idées reçues à corriger");
    expect(reduireMarkup).toContain("Méthodologie et source");
    expect(reduireMarkup).toContain("Action collective");
    expect(reduireMarkup).toContain("Le bon geste devient visible et collectif");
    expect(reduireMarkup).toContain("Mégot");
    expect(reduireMarkup).toContain("Canette");
    expect(reduireMarkup).toContain("Bouteille");
    expect(reduireMarkup).toContain("Armoire / encombrant");
    expect(reduireMarkup).toContain("Signaler un dépôt");
    expect(reduireMarkup).toContain("Trouver la bonne filière");
    expect(reduireMarkup).toContain("Réduire à la source");
    expect(reduireMarkup).toContain("Consulter le baromètre complet");
    expect(reduireMarkup.indexOf("Campagne à la une")).toBeLessThan(
      reduireMarkup.indexOf("Baromètre national 2025"),
    );
    expect(reduireMarkup.indexOf("Baromètre national 2025")).toBeLessThan(
      reduireMarkup.indexOf("Guides essentiels"),
    );
    expect(reduireMarkup.indexOf("Campagne à la une")).toBeLessThan(
      reduireMarkup.indexOf("Guides essentiels"),
    );
  });
});
