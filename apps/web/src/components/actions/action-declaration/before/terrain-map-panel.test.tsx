import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialFormState } from "../payload";
import { TerrainMapPanel } from "./terrain-map-panel";

describe("TerrainMapPanel", () => {
  it("keeps the empty map compact and links to the canonical address field", () => {
    const form = createInitialFormState("Organisateur");
    form.departureLocationLabel = "Place du rendez-vous";

    const markup = renderToStaticMarkup(
      React.createElement(TerrainMapPanel, {
        form,
        onEditDefinition: () => undefined,
      }),
    );

    expect(markup).toContain("Carte en attente de coordonnées fiables");
    expect(markup).toContain("Géocoder l’adresse dans Définir");
    expect(markup).toContain('aria-label="Carte du secteur d’intervention"');
    expect(markup).toContain("h-52");
    expect(markup).not.toContain("h-[360px]");
  });
});
