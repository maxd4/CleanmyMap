import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnBlockJourneySection } from "./learn-block-journey-section";

describe("LearnBlockJourneySection", () => {
  it("renders the block journey cards and highlights the current page", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnBlockJourneySection, {
        locale: "fr",
        currentPageId: "comprendre",
      }),
    );

    expect(markup).toContain("Parcours du bloc");
    expect(markup).toContain("Vulgarisation");
    expect(markup).toContain("S&#x27;entraîner");
    expect(markup).toContain("Tri, composte, comportements");
    expect(markup).toContain("Vous êtes ici");
    expect(markup).toContain("Continuer");
    expect(markup).toContain("aria-label=\"Vulgarisation - Rester ici\"");
    expect(markup).toContain("aria-label=\"S&#x27;entraîner - Continuer\"");
  });

  it("can render a compact support version without the card grid", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnBlockJourneySection, {
        locale: "fr",
        currentPageId: "bonnes-pratiques",
        compact: true,
      }),
    );

    expect(markup).toContain("Un repère de parcours, pas un centre");
    expect(markup).toContain("Rester ici");
    expect(markup).toContain("Continuer");
    expect(markup).not.toContain("Vous êtes ici");
    expect(markup).not.toContain("Ouvrir");
    expect(markup).toContain("aria-label=\"Tri, composte, comportements - Rester ici\"");
  });
});
