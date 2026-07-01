import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnVisualCard } from "./learn-visual-card";
import type { LearnLinkCard } from "@/lib/learning/learn-rubric-data";

const card: LearnLinkCard = {
  href: "/learn/comprendre",
  title: "Vulgarisation",
  detail: "Lire le contexte, les ordres de grandeur et le lien vers la méthodologie.",
  visual: {
    tone: "violet",
    motif: "layers",
    badge: { fr: "Contexte", en: "Context" },
    chips: [
      { fr: "Ordres de grandeur", en: "Orders of magnitude" },
      { fr: "Méthodologie", en: "Methodology" },
    ],
    stats: [
      { value: "3", label: { fr: "couches", en: "layers" } },
      { value: "1", label: { fr: "porte d'entrée", en: "entry point" } },
    ],
  },
};

describe("LearnVisualCard", () => {
  it("renders visual metadata and the CTA label", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnVisualCard, {
        locale: "fr",
        card,
        index: 1,
      }),
    );

    expect(markup).toContain("Vulgarisation");
    expect(markup).toContain("Contexte");
    expect(markup).toContain("Ordres de grandeur");
    expect(markup).toContain("Accès direct");
    expect(markup).toContain("Explorer le contexte");
    expect(markup).toContain("aria-label=\"Vulgarisation - Explorer le contexte\"");
  });
});
