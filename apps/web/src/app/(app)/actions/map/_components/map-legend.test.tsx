import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ACTION_POLLUTION_COLOR_STOPS,
  CLEAN_PLACE_COLOR,
  INFRASTRUCTURE_ALERT_THRESHOLD,
  TRASH_SPOTTER_NEUTRAL_COLOR,
  resolveDynamicColor,
} from "@/components/actions/map-marker-categories";
import { MapLegend } from "./map-legend";

describe("MapLegend", () => {
  it("keeps the color and infrastructure summary visible", () => {
    const markup = renderToStaticMarkup(React.createElement(MapLegend));
    const expectedGradient = `linear-gradient(90deg, ${ACTION_POLLUTION_COLOR_STOPS.map((stop) => resolveDynamicColor(stop.threshold)).join(", ")})`;

    expect(markup).toContain("Bleu → noir");
    expect(markup).toContain("Pollution projetée");
    expect(markup).toContain("Lieu propre");
    expect(markup).toContain("Trash Spotter");
    expect(markup).toContain("Infrastructure");
    expect(markup).toContain("clean_place");
    expect(markup).toContain(`background-image:${expectedGradient}`);
  });

  it("renders every canonical pollution threshold as a compact comparable row", () => {
    const markup = renderToStaticMarkup(React.createElement(MapLegend));

    expect(markup).toContain("Pollution projetée");
    expect(markup).toContain(`&lt; ${ACTION_POLLUTION_COLOR_STOPS[1].threshold}`);
    expect(markup).toContain(`${ACTION_POLLUTION_COLOR_STOPS[1].threshold}–${ACTION_POLLUTION_COLOR_STOPS[2].threshold - 1}`);
    expect(markup).toContain(`${ACTION_POLLUTION_COLOR_STOPS[2].threshold}–${ACTION_POLLUTION_COLOR_STOPS[3].threshold - 1}`);
    expect(markup).toContain(`${ACTION_POLLUTION_COLOR_STOPS[3].threshold}–${ACTION_POLLUTION_COLOR_STOPS[4].threshold - 1}`);
    expect(markup).toContain(`≥ ${ACTION_POLLUTION_COLOR_STOPS[4].threshold}`);
    expect(markup).toContain("Premier seuil");
    expect(markup).toContain("Moyenne");
    expect(markup).toContain("Forte");
    expect(markup).toContain("Critique");
    expect(markup).toContain("Extrême");
    expect(markup).toContain(`≥ ${INFRASTRUCTURE_ALERT_THRESHOLD}`);

    for (const stop of ACTION_POLLUTION_COLOR_STOPS) {
      expect(markup).toContain(`background-color:${resolveDynamicColor(stop.threshold)}`);
      expect(markup).toContain(resolveDynamicColor(stop.threshold));
    }
  });

  it("uses the canonical colors for non-pollution states and no local palette", () => {
    const markup = renderToStaticMarkup(React.createElement(MapLegend));

    expect(markup).toContain(`background-color:${CLEAN_PLACE_COLOR}`);
    expect(markup).toContain(`background-color:${TRASH_SPOTTER_NEUTRAL_COLOR}`);
    expect(markup).not.toContain("bg-sky-500");
    expect(markup).not.toContain("bg-orange-500");
    expect(markup).not.toContain("bg-red-500");
    expect(markup).not.toContain("bg-violet-500");
    expect(markup).not.toContain("bg-slate-950");
    expect(markup).not.toContain("bg-emerald-500");
    expect(markup).not.toContain("bg-slate-400");
  });

  it("keeps the disclosure contract and avoids nested legend cards", () => {
    const markup = renderToStaticMarkup(React.createElement(MapLegend));

    expect(markup).toContain("<details");
    expect(markup).toContain('data-disclosure-tone="sky"');
    expect(markup).toContain('class="cmm-disclosure__summary"');
    expect(markup).toContain("Détails de la légende");
    expect(markup).toContain("Autres états");
    expect(markup).toContain("Infrastructures");
    expect(markup).toContain("Bac");
    expect(markup).toContain("Cendrier");
    expect(markup).toContain("Combiné");
    expect(markup).toContain("Signalement neutre, non quantifié");
    expect(markup).not.toContain("shadow-[0_10px_24px_-20px");
    expect(markup).not.toContain("rounded-2xl border border-sky-100");
  });

  it("explains the department reference without changing the canonical stops", () => {
    const markup = renderToStaticMarkup(
      React.createElement(MapLegend, { scoreScope: "department" }),
    );

    expect(markup).toContain("Comparaison départementale");
    expect(markup).toContain(
      "100 % correspond à l&#x27;intensité de collecte de référence la plus élevée du département, normalisée par bénévole.",
    );
    expect(markup).toContain(
      "Score relatif : ne comparez directement que les actions d&#x27;un même département.",
    );
    expect(markup).toContain("Détails de la légende");
    expect(markup).toContain("Lieu propre");
    expect(markup).toContain("Trash Spotter");

    for (const stop of ACTION_POLLUTION_COLOR_STOPS) {
      expect(markup).toContain(`background-color:${resolveDynamicColor(stop.threshold)}`);
    }
  });
});
