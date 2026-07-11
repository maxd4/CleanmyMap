import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnPartnerInsightCard } from "./learn-partner-insight-card";

const SHARED_PROPS = {
  locale: "fr" as const,
  title: { fr: "Titre", en: "Title" },
  summary: { fr: "Résumé court", en: "Short summary" },
  keyPoints: [
    { fr: "Idée 1", en: "Idea 1" },
    { fr: "Idée 2", en: "Idea 2" },
  ],
  action: { fr: "Faire une action", en: "Take action" },
  sourceName: { fr: "Gestes Propres", en: "Gestes Propres" },
  sourceUrl: "https://www.gestespropres.com/article/73-pourquoi-les-automobilistes-sont-ils-susceptibles-de-plus-jeter",
  publishedAt: "2026-05-22",
};

describe("LearnPartnerInsightCard", () => {
  it("renders the featured variant without image", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnPartnerInsightCard, {
        ...SHARED_PROPS,
        variant: "featured",
      }),
    );

    expect(markup).toContain("Éclairage Gestes Propres");
    expect(markup).toContain("Résumé court");
    expect(markup).toContain("Idée 1");
    expect(markup).toContain("Faire une action");
    expect(markup).toContain("2026");
    expect(markup).toContain("rel=\"noopener noreferrer\"");
    expect(markup).not.toContain("<img");
  });

  it("renders the compact variant with a short action line", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnPartnerInsightCard, {
        ...SHARED_PROPS,
        variant: "compact",
      }),
    );

    expect(markup).toContain("Éclairage");
    expect(markup).toContain("Faire une action");
    expect(markup).toContain("Ouvrir la source");
    expect(markup).not.toContain("Idée 1");
    expect(markup).not.toContain("<img");
  });
});
