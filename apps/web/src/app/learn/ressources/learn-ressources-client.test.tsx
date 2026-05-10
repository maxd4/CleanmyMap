import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnRessourcesOverview } from "./learn-ressources-client";

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
    expect(markup).toContain("Ouvrir l'assistant tri");
    expect(markup).toContain("Voir le calendrier");
    expect(markup).toContain("Aperçu immédiat");
  });
});
