import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LearnIfopDepotsSection } from "./learn-ifop-depots-section";

describe("LearnIfopDepotsSection", () => {
  it("renders the source-backed metrics, limits and PDF link", () => {
    const markup = renderToStaticMarkup(createElement(LearnIfopDepotsSection, { locale: "fr" }));

    expect(markup).toContain("La pratique du dépôt sauvage en milieu urbain et péri-urbain");
    expect(markup).toContain("25%");
    expect(markup).toContain("44%");
    expect(markup).toContain("Données déclaratives");
    expect(markup).toContain("ils ne remplacent pas une mesure terrain");
    expect(markup).toContain("/learn/bonnes-pratiques/gestesprorpe-ifop-depots.pdf");
  });
});
