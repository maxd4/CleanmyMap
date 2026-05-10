import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnPracticeGuideIntro } from "./learn-practice-guide-intro";
import { LEARN_OVERVIEW_CARDS } from "@/lib/learning/learn-rubric-data";

describe("LearnPracticeGuideIntro", () => {
  it("renders a visual first layer for the Bonnes pratiques rubric", () => {
    const card = LEARN_OVERVIEW_CARDS.fr[2];

    const markup = renderToStaticMarkup(
      React.createElement(LearnPracticeGuideIntro, {
        locale: "fr",
        title: { fr: "Bonnes pratiques", en: "Best practices" },
        question: {
          fr: "Comment garder le bon réflexe sans alourdir l'action ?",
          en: "How do we keep the right reflex without slowing the action?",
        },
        clue: {
          fr: "Avant / pendant / après : une lecture rapide pour agir juste.",
          en: "Before / during / after: a quick read to act well.",
        },
        cta: {
          href: card.href,
          label: { fr: "Ouvrir le premier guide", en: "Open the first guide" },
        },
      }),
    );

    expect(markup).toContain("Lecture rapide");
    expect(markup).toContain("Bonnes pratiques");
    expect(markup).toContain("Séquence");
    expect(markup).toContain("Préparer");
    expect(markup).toContain("Rester lisible");
    expect(markup).toContain("Clore proprement");
    expect(markup).toContain("Séquence utile");
    expect(markup).toContain("Avant");
    expect(markup).toContain("Pendant");
    expect(markup).toContain("Après");
    expect(markup).toContain("Ouvrir le premier guide");
  });
});
