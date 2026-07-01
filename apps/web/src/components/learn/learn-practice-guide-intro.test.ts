import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Recycle, Sprout, Users } from "lucide-react";

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
        entryLinks: [
          {
            href: "/sections/recycling",
            label: { fr: "Tri", en: "Sorting" },
            detail: {
              fr: "Ouvrir le guide court pour trier sans hésiter.",
              en: "Open the short guide to sort without hesitating.",
            },
            icon: Recycle,
          },
          {
            href: "/sections/compost",
            label: { fr: "Composte", en: "Composting" },
            detail: {
              fr: "Voir le guide compost pour choisir la bonne filière.",
              en: "See the compost guide and choose the right path.",
            },
            icon: Sprout,
          },
          {
            href: "#ressources-utiles",
            label: { fr: "Comportements utiles", en: "Useful behaviors" },
            detail: {
              fr: "Aller directement aux repères qui aident à agir juste.",
              en: "Jump straight to the cues that help you act right.",
            },
            icon: Users,
          },
        ],
        cta: {
          href: card.href,
          label: { fr: "Ouvrir le premier guide", en: "Open the first guide" },
        },
      }),
    );

    expect(markup).toContain("Lecture rapide");
    expect(markup).toContain("Tri, composte, comportements");
    expect(markup).toContain("Ouvrir le guide court pour trier sans hésiter.");
    expect(markup).toContain("Voir le guide compost pour choisir la bonne filière.");
    expect(markup).toContain("Aller directement aux repères qui aident à agir juste.");
    expect(markup).toContain("Accès direct");
    expect(markup).toContain("Ouvrir le guide");
    expect(markup).toContain("Voir les repères");
    expect(markup).toContain("aria-label=\"Tri - Ouvrir le guide\"");
    expect(markup).toContain("aria-label=\"Comportements utiles - Voir les repères\"");
    expect(markup).toContain("hidden rounded-[1.35rem]");
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
