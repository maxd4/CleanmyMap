import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ACTION_POLLUTION_COLOR_THRESHOLDS,
  INFRASTRUCTURE_ALERT_THRESHOLD,
} from "@/components/actions/map-marker-categories";
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

  it("renders every canonical pollution threshold as a compact comparable row", () => {
    const markup = renderToStaticMarkup(React.createElement(MapLegend));

    expect(markup).toContain("Pollution projetée");
    expect(markup).toContain(`&lt; ${ACTION_POLLUTION_COLOR_THRESHOLDS.ORANGE}`);
    expect(markup).toContain(`${ACTION_POLLUTION_COLOR_THRESHOLDS.ORANGE}–${ACTION_POLLUTION_COLOR_THRESHOLDS.RED - 1}`);
    expect(markup).toContain(`${ACTION_POLLUTION_COLOR_THRESHOLDS.RED}–${ACTION_POLLUTION_COLOR_THRESHOLDS.VIOLET - 1}`);
    expect(markup).toContain(`${ACTION_POLLUTION_COLOR_THRESHOLDS.VIOLET}–${ACTION_POLLUTION_COLOR_THRESHOLDS.BLACK - 1}`);
    expect(markup).toContain(`≥ ${ACTION_POLLUTION_COLOR_THRESHOLDS.BLACK}`);
    expect(markup).toContain("Faible");
    expect(markup).toContain("Moyenne");
    expect(markup).toContain("Forte");
    expect(markup).toContain("Critique");
    expect(markup).toContain("Extrême");
    expect(markup).toContain(`≥ ${INFRASTRUCTURE_ALERT_THRESHOLD}`);
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
});
