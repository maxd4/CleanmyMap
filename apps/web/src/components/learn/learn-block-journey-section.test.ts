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
  });
});
