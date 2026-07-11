import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnGestesPropresInsightsSection } from "./learn-gestes-propres-insights-section";

describe("LearnGestesPropresInsightsSection", () => {
  it("renders the tri theme with two concise entries", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnGestesPropresInsightsSection, {
        locale: "fr",
        scope: "theme",
        theme: "tri",
      }),
    );

    expect(markup).toContain("Éclairages Gestes Propres");
    expect(markup).toContain("Que Faire de Mes Objets");
    expect(markup).toContain("pollution des lingettes");
    expect(markup).not.toContain("Commerçants : un levier à activer");
  });

  it("renders the reduction theme with a closed secondary block", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnGestesPropresInsightsSection, {
        locale: "fr",
        scope: "theme",
        theme: "reduire",
      }),
    );

    expect(markup).toContain("Campagne à la une");
    expect(markup).toContain("Ça va pas s’faire tout seul !");
    expect(markup).toContain("Campagne Gestes Propres · 2025–2026");
    expect(markup).toContain("Mégot");
    expect(markup).toContain("Canette");
    expect(markup).toContain("Bouteille");
    expect(markup).toContain("Armoire / encombrant");
    expect(markup).toContain("Voir le signalement");
    expect(markup).toContain("Ouvrir la campagne");
  });

  it("renders the overview with compact access to all six entries", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnGestesPropresInsightsSection, {
        locale: "fr",
        scope: "overview",
      }),
    );

    expect(markup).toContain("Pour aller plus loin avec Gestes Propres");
    expect(markup).toContain("Voir les actualités Gestes Propres");
    expect(markup).toContain("Pourquoi les automobilistes sont-ils susceptibles de plus jeter ?");
    expect(markup).toContain("Découvrez « Que Faire de Mes Objets »");
    expect(markup).toContain("L’AMF et Gestes Propres s’associent");
  });
});
