import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { QuizSchoolKitPage } from "./quiz-school-kit-page";

describe("QuizSchoolKitPage", () => {
  it("renders the teacher kit content for school mode", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        SitePreferencesProvider,
        null,
        React.createElement(QuizSchoolKitPage),
      ),
    );

    expect(markup).toContain("Mode École");
    expect(markup).toContain("Kit d&#x27;atelier pour 4e et 3e");
    expect(markup).toContain("Lancement immédiat");
    expect(markup).toContain("Lancer la séance, garder la démo en secours");
    expect(markup).toContain("Un clic lance l&#x27;atelier collectif. La démo reste disponible pour tester le déroulé.");
    expect(markup).toContain("Repères de séance");
    expect(markup).toContain("Les aides à garder visibles");
    expect(markup).toContain("Fiche enseignant");
    expect(markup).toContain("Fiche élève");
    expect(markup).toContain("20 questions, 5 par sous-mode");
    expect(markup).toContain("Banque en réserve");
    expect(markup).toContain("Sous-modes disponibles si besoin");
    expect(markup).toContain("Ouvrir les 20 questions détaillées");
    expect(markup).toContain("focus-visible:ring-amber-300/70");
    expect(markup).toContain('href="/learn/sentrainer?mode=ecole&amp;track=debat-classe&amp;collective=1"');
    expect(markup).toContain('href="/learn/sentrainer?mode=demo"');
    expect(markup.indexOf("Lancement immédiat")).toBeLessThan(markup.indexOf("Fiche enseignant"));
    expect(markup.indexOf("Repères de séance")).toBeLessThan(markup.indexOf("Public visé"));
    expect(markup.indexOf("Fiche enseignant")).toBeLessThan(markup.indexOf("Public visé"));
    expect(markup.indexOf("Passage au quiz")).toBeLessThan(markup.indexOf("Banque en réserve"));
  });
});
