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
    expect(markup).toContain("Kit d'atelier pour 4e et 3e");
    expect(markup).toContain("Fiche enseignant");
    expect(markup).toContain("Fiche élève");
    expect(markup).toContain("20 questions, 5 par sous-mode");
  });
});
