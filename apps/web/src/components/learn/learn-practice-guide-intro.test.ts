import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnPracticeGuideIntro } from "./learn-practice-guide-intro";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";

describe("LearnPracticeGuideIntro", () => {
  it("renders a visual first layer for the Tri, composte, comportements rubric", () => {
    const card = LEARN_OVERVIEW_CARDS.fr[2];

    const markup = renderToStaticMarkup(
      React.createElement(LearnPracticeGuideIntro, {
        locale: "fr",
        title: { fr: "Tri, composte, comportements", en: "Sorting, composting, behaviors" },
        question: {
          fr: "Comment trier juste, composter mieux et garder les bons comportements sans ralentir l'action ?",
          en: "How do we sort right, compost better and keep the right behaviors without slowing the action?",
        },
        clue: {
          fr: "Tri, compostage et attitude terrain: trois repères courts pour agir proprement.",
          en: "Sorting, composting and field behavior: three short cues to act cleanly.",
        },
        cta: {
          href: card.href,
          label: { fr: "Ouvrir le premier guide", en: "Open the first guide" },
        },
      }),
    );

    expect(markup).toContain("Lecture rapide");
    expect(markup).toContain("Tri, composte, comportements");
    expect(markup).toContain("Séquence");
    expect(markup).toContain("Repérer");
    expect(markup).toContain("Rester lisible");
    expect(markup).toContain("Clore proprement");
    expect(markup).toContain("Séquence utile");
    expect(markup).toContain("Avant");
    expect(markup).toContain("Pendant");
    expect(markup).toContain("Après");
    expect(markup).toContain("Ouvrir le premier guide");
  });
});
