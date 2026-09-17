import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ACTION_POLLUTION_COLOR_STOPS,
  CLEAN_PLACE_COLOR,
  TRASH_SPOTTER_NEUTRAL_COLOR,
  resolveDynamicColor,
} from "../map-marker-categories";
import { MapGeometryLegend } from "./map-geometry-legend";

describe("MapGeometryLegend", () => {
  it("explains the final geometry interaction grammar and indicative opacity", () => {
    const markup = renderToStaticMarkup(<MapGeometryLegend />);

    expect(markup).toContain("Trait plein : parcours déclaré ou connu");
    expect(markup).toContain("Trait pointillé : parcours reconstruit");
    expect(markup).toMatch(/Surface remplie : zone d(?:'|&#x27;)action/);
    expect(markup).toContain("Point : localisation seule");
    expect(markup).toContain("Zone indicative : opacité réduite");
    expect(markup).toContain("bg-slate-700");
    expect(markup).toContain("border-dashed border-slate-700");
    expect(markup).toContain("border-slate-700 bg-slate-500/25");
    expect(markup).toContain("border-slate-700 bg-slate-500/60");
    expect(markup).not.toMatch(
      /<span[^>]*class="[^"]*(?:bg|border)-sky-[^"]*"[^>]*aria-hidden="true"/,
    );
  });

  it("explains projected action colors, the clean-place exception and Trash Spotter", () => {
    const markup = renderToStaticMarkup(<MapGeometryLegend />);

    expect(markup).toContain(
      "Les couleurs indiquent la pollution projetée à partir de la dernière action.",
    );
    expect(markup).toContain("Signalement neutre, non quantifié");
    expect(markup).toContain("Lieu explicitement propre · clean_place");

    for (const stop of ACTION_POLLUTION_COLOR_STOPS) {
      expect(markup).toContain(`background-color:${resolveDynamicColor(stop.threshold)}`);
    }
    expect(markup).toContain(`background-color:${CLEAN_PLACE_COLOR}`);
    expect(markup).toContain(`background-color:${TRASH_SPOTTER_NEUTRAL_COLOR}`);
  });

  it("exposes the detailed methodology link without duplicating score thresholds", () => {
    const markup = renderToStaticMarkup(<MapGeometryLegend />);

    expect(markup).toContain('href="/methodologie#methodologie-carte-actions"');
    expect(markup).toContain("Voir la méthodologie détaillée");
    expect(markup).not.toContain("30 + 30");
    expect(markup).not.toContain("28 + 152");
  });

  it("explains the department reference without changing geometry grammar", () => {
    const markup = renderToStaticMarkup(
      <MapGeometryLegend scoreScope="department" />,
    );

    expect(markup).toContain(
      "Les couleurs comparent le score réel de chaque action à la référence de son département.",
    );
    expect(markup).toContain("Trait plein : parcours déclaré ou connu");
    expect(markup).toContain("Trait pointillé : parcours reconstruit");
    expect(markup).not.toContain("pollution projetée depuis la dernière action");
  });

  it("describes observed mode without projection language", () => {
    const markup = renderToStaticMarkup(
      <MapGeometryLegend displayMode="observed" />,
    );

    expect(markup).toContain(
      "Les couleurs indiquent la pollution observée ou mesurée.",
    );
    expect(markup).not.toContain("pollution projetée depuis la dernière action");
  });
});
