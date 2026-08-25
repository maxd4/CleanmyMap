import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ACTION_POLLUTION_COLOR_STOPS,
  CLEAN_PLACE_COLOR,
} from "../map-marker-categories";
import { MapGeometryLegend } from "./map-geometry-legend";

describe("MapGeometryLegend", () => {
  it("explains the final geometry interaction grammar and indicative opacity", () => {
    const markup = renderToStaticMarkup(<MapGeometryLegend />);

    expect(markup).toContain("Trait plein : parcours déclaré/connu");
    expect(markup).toContain("Trait pointillé : parcours indicatif/reconstruit");
    expect(markup).toMatch(/Surface remplie : zone d(?:'|&#x27;)action/);
    expect(markup).toContain("Point : localisation seule");
    expect(markup).toContain("Zone indicative : opacité réduite");
  });

  it("explains projected action colors, the clean-place exception and Trash Spotter", () => {
    const markup = renderToStaticMarkup(<MapGeometryLegend />);

    expect(markup).toContain(
      "Actions : la couleur représente la pollution projetée depuis la dernière action.",
    );
    expect(markup).toContain("Trash Spotter : signalements actuellement observés et actionnables.");
    expect(markup).toContain("Vert · lieu explicitement propre");
    expect(markup).not.toContain("Vert · faible");

    for (const stop of ACTION_POLLUTION_COLOR_STOPS) {
      expect(markup).toContain(stop.label);
    }
    expect(markup).toContain(`background-color:${CLEAN_PLACE_COLOR}`);
  });

  it("exposes the detailed methodology link without duplicating score thresholds", () => {
    const markup = renderToStaticMarkup(<MapGeometryLegend />);

    expect(markup).toContain('href="/methodologie#methodologie-carte-actions"');
    expect(markup).toContain("Voir la méthodologie détaillée");
    expect(markup).not.toContain("30 + 30");
    expect(markup).not.toContain("28 + 152");
  });
});
