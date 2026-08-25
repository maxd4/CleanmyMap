import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapGeometryLegend } from "./map-geometry-legend";

describe("MapGeometryLegend", () => {
  it("explains the final geometry interaction grammar and indicative opacity", () => {
    const markup = renderToStaticMarkup(<MapGeometryLegend />);

    expect(markup).toContain("Trait plein : parcours déclaré/connu");
    expect(markup).toContain("Trait pointillé : parcours indicatif/reconstruit");
    expect(markup).toContain("Surface remplie : zone d'action");
    expect(markup).toContain("Point : localisation seule");
    expect(markup).toContain("Zone indicative : opacité réduite");
  });
});
