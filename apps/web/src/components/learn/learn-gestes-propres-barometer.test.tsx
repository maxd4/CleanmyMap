import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnGestesPropresBarometer } from "./learn-gestes-propres-barometer";

describe("LearnGestesPropresBarometer", () => {
  it("renders the national barometer focus with the four featured KPIs", () => {
    const markup = renderToStaticMarkup(<LearnGestesPropresBarometer locale="fr" />);

    expect(markup).toContain("Baromètre national 2025");
    expect(markup).toContain("Ce que les Français pensent, déclarent et font réellement");
    expect(markup).toContain("Les Français et les déchets abandonnés");
    expect(markup).toContain("Déclarations contre pratiques");
    expect(markup).toContain("Ce que l’on déclare");
    expect(markup).toContain("Ce que l’on reconnaît");
    expect(markup).toContain("Résultats déclaratifs, sans profilage ni accusation.");
    expect(markup).toContain("Idées reçues à corriger");
    expect(markup).toContain("Une réponse courte, un bon geste, un seul détail ouvert à la fois");
    expect(markup).toContain("Méthodologie et source");
    expect(markup).toContain("enquête déclarative");
    expect(markup).toContain("Action collective");
    expect(markup).toContain("Le bon geste devient visible et collectif");
    expect(markup).toContain("35");
    expect(markup).toContain("54");
    expect(markup).toContain("61");
    expect(markup).toContain("58");
    expect(markup).toContain("98%");
    expect(markup).toContain("94%");
    expect(markup).toContain("Consulter le baromètre complet");
    expect(markup).toContain("/docs/pages_site/routes/05-apprendre/learn-bonnes-pratiques/gestespropres-Barometre_2025.pdf");
    expect(markup).toContain("94 %");
    expect(markup).not.toContain("98 %");
  });
});
