import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapLegend } from "./map-legend";

describe("MapLegend", () => {
  it("keeps the color and infrastructure summary visible", () => {
    const markup = renderToStaticMarkup(React.createElement(MapLegend));

    expect(markup).toContain("Actions : bleu → noir, pollution projetée");
    expect(markup).toContain("Vert : lieu propre");
    expect(markup).toContain("Trash Spotter : signalement neutre");
    expect(markup).toContain("Infra : bac, cendrier, combiné");
  });

  it("keeps detailed thresholds behind an accessible disclosure", () => {
    const markup = renderToStaticMarkup(React.createElement(MapLegend));

    expect(markup).toContain("<details");
    expect(markup).toContain("Détails des couleurs, de l&#x27;infrastructure et des seuils");
    expect(markup).toContain("projection &lt; 30");
    expect(markup).toContain("≥ 75");
  });
});
