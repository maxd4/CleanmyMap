import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { QuizSchoolKitPage } from "./quiz-school-kit-page";
import { getQuizSchoolLaunchHref } from "./school/quiz-school-level-launcher";

describe("QuizSchoolKitPage", () => {
  it("builds shareable level and format URLs without answers", () => {
    expect(getQuizSchoolLaunchHref("6e", "quiz-30")).toBe(
      "/learn/sentrainer?mode=ecole&level=6e&format=quiz-30",
    );
    expect(getQuizSchoolLaunchHref("3e", "atelier-60")).toBe(
      "/learn/sentrainer?mode=ecole&level=3e&format=atelier-60",
    );
    expect(getQuizSchoolLaunchHref("3e", "atelier-60")).not.toContain("answer");
  });

  it("renders the teacher kit content for school mode", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        SitePreferencesProvider,
        null,
        React.createElement(QuizSchoolKitPage),
      ),
    );

    expect(markup).toContain("Mode École");
    expect(markup).toContain("Séance publique de la 6e à la 3e");
    expect(markup).toContain("Lancement immédiat");
    expect(markup).toContain("Choisir le niveau, puis le format");
    expect(markup).toContain("Choisissez un quiz de 30 minutes ou un atelier de 60 minutes.");
    expect(markup).toContain("Formats : quiz 30 min · atelier 60 min");
    expect(markup).toContain("Repères de séance");
    expect(markup).toContain("Les aides à garder visibles");
    expect(markup).toContain("Fiche enseignant");
    expect(markup).toContain("Fiche élève");
    expect(markup).toContain("Aucun compte, nom d’élève ou donnée personnelle.");
    expect(markup).toContain("20 questions, 5 par sous-mode");
    expect(markup).toContain("Banque en réserve");
    expect(markup).toContain("Sous-modes disponibles si besoin");
    expect(markup).toContain("Ouvrir les 20 questions détaillées");
    expect(markup).toContain("focus-visible:ring-amber-300/70");
    expect(markup).toContain('href="#choisir-niveau"');
    expect(markup).toContain("Formats : quiz 30 min · atelier 60 min");
    expect(markup).not.toContain("Élèves de 4e et 3e.");
    expect(markup).toContain('href="/learn/sentrainer?mode=demo"');
    expect(markup.indexOf("Lancement immédiat")).toBeLessThan(markup.indexOf("Fiche enseignant"));
    expect(markup.indexOf("Repères de séance")).toBeLessThan(markup.indexOf("Public visé"));
    expect(markup.indexOf("Fiche enseignant")).toBeLessThan(markup.indexOf("Public visé"));
    expect(markup.indexOf("Passage au quiz")).toBeLessThan(markup.indexOf("Banque en réserve"));
  });
});
