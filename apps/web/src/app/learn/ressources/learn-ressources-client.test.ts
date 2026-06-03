import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnArtworkAccordion, LearnRessourcesOverview } from "./learn-ressources-client";

describe("LearnRessourcesOverview", () => {
  it("renders the three entry blocks before the calendar section", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnRessourcesOverview, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Kit terrain");
    expect(markup).toContain("Repères de tri");
    expect(markup).toContain("Événements utiles");
    expect(markup).toContain("Ouvrir l&#x27;assistant tri");
    expect(markup).toContain("Voir le calendrier");
    expect(markup).toContain("Aperçu immédiat");
  });

  it("renders the expandable artwork references with their titles", () => {
    const markup = renderToStaticMarkup(
      React.createElement(LearnArtworkAccordion, {
        locale: "fr",
      }),
    );

    expect(markup).toContain("Pictures of Garbage");
    expect(markup).toContain("The Great Indoors");
    expect(markup).toContain("Hong Kong Soup: 1826");
    expect(markup).toContain("Washed Ashore Project");
    expect(markup).toContain("Moffat Takadiwa");
  });
});
