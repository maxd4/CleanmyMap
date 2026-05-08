import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnComprendreVisualIntro } from "./learn-comprendre-visual-intro";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";

describe("LearnComprendreVisualIntro", () => {
  it("renders a visual first layer for the Comprendre rubric", () => {
    const card = LEARN_OVERVIEW_CARDS.fr[0];

    const markup = renderToStaticMarkup(
      React.createElement(LearnComprendreVisualIntro, {
        locale: "fr",
        card,
        question: "Comprendre avant d'agir",
        clue: "Repères, ordres de grandeur et méthode se lisent ensemble avant de passer au geste.",
        action: {
          href: "/learn/sentrainer",
          label: "Passer au quiz",
        },
      }),
    );

    expect(markup).toContain("Aperçu visuel");
    expect(markup).toContain("Comprendre avant d");
    expect(markup).toContain("Contexte");
    expect(markup).toContain("Ordres de grandeur");
    expect(markup).toContain("Méthode");
    expect(markup).toContain("Passer au quiz");
  });
});
