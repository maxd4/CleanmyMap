import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnPracticeVisualIntro } from "./learn-practice-visual-intro";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";

describe("LearnPracticeVisualIntro", () => {
  it("renders a visual practice header and session cues", () => {
    const card = LEARN_OVERVIEW_CARDS.fr[1];

    const markup = renderToStaticMarkup(
      React.createElement(LearnPracticeVisualIntro, {
        locale: "fr",
        card,
        question: "S'entraîner pour ancrer vite",
        clue: "Des sessions courtes, des questions mélangées et un retour immédiat pour garder le rythme.",
        action: {
          href: "#quiz-architecture",
          label: "Voir le panneau de session",
        },
      }),
    );

    expect(markup).toContain("Parcours adaptatif");
    expect(markup).toContain("S&#x27;entraîner pour ancrer vite");
    expect(markup).toContain("Sessions courtes");
    expect(markup).toContain("Questions mélangées");
    expect(markup).toContain("Retour immédiat");
    expect(markup).toContain("Réactiver");
    expect(markup).toContain("Revoir");
    expect(markup).toContain("Voir le panneau de session");
  });
});
