import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnGestesPropresMythsSection } from "./learn-gestes-propres-myths-section";

describe("LearnGestesPropresMythsSection", () => {
  it("renders one open detail at a time with real CTA destinations", () => {
    const markup = renderToStaticMarkup(<LearnGestesPropresMythsSection locale="fr" />);

    expect(markup).toContain("Idées reçues à corriger");
    expect(markup).toContain("Une réponse courte, un bon geste, un seul détail ouvert à la fois");
    expect(markup).toContain("Les déchets alimentaires biodégradables vont-ils dans la nature ?");
    expect(markup).toContain("Un déchet abandonné sur une plage a-t-il des chances d’être ramassé ?");
    expect(markup).toContain("Les mégots ont-ils des chances d’être ramassés ?");
    expect(markup).toContain("Le chewing-gum est-il principalement composé de plastique ?");
    expect(markup).toContain("Réponse courte");
    expect(markup).toContain("Bon geste");
    expect(markup).toContain("Voir le compost");
    expect(markup).toContain("/sections/compost");
    expect(markup).toContain("aria-expanded=\"true\"");
    expect(markup).toContain("aria-expanded=\"false\"");
    expect(markup).toContain("54 %");
    expect(markup).toContain("31 %");
    expect(markup).toContain("Résultats déclaratifs, sans profilage ni accusation.");
  });
});
