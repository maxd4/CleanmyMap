import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapLegend } from "./map-legend";

describe("MapLegend", () => {
  it("keeps the color and infrastructure summary visible", () => {
    const markup = renderToStaticMarkup(React.createElement(MapLegend));

    expect(markup).toContain("Bleu → noir");
    expect(markup).toContain("Pollution projetée");
    expect(markup).toContain("Lieu propre");
    expect(markup).toContain("Trash Spotter");
    expect(markup).toContain("Infrastructure");
    expect(markup).toContain("clean_place");
  });

  it("keeps detailed thresholds behind an accessible disclosure", () => {
    const markup = renderToStaticMarkup(React.createElement(MapLegend));

    expect(markup).toContain("<details");
    expect(markup).toContain('data-disclosure-tone="sky"');
    expect(markup).toContain('class="cmm-disclosure__summary"');
    expect(markup).toContain("Détails de la légende");
    expect(markup).toContain("projection &lt; 30");
    expect(markup).toContain("≥ 75");
  });
});
