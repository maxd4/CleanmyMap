import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GeometryTooltipContent } from "./map-geometry-tooltip-content";

describe("geometry tooltip action reading", () => {
  it("renders the three static geometry capsules through CmmBadge", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GeometryTooltipContent, {
        title: "Action · Longueur ~ 1 km",
        geometryModeLabel: "Parcours connu",
        geometryPointsLabel: "2 points",
        geometryMetricLabel: "Longueur ~ 1 km",
        geometryConfidenceLabel: "Confiance élevée",
        color: "hsl(35, 90%, 50%)",
      }),
    );

    expect(markup.match(/class="cmm-badge"/g)).toHaveLength(3);
    expect(markup.match(/data-badge-shape="pill"/g)).toHaveLength(3);
    expect(markup).toContain("2 points");
    expect(markup).toContain("Longueur ~ 1 km");
    expect(markup).toContain("Confiance élevée");
    expect(markup).toContain("hsl(35, 90%, 50%)");
    expect(markup).not.toContain("inline-flex items-center gap-1 rounded-full border");
    expect(markup).not.toContain("inline-flex items-center rounded-full border");
  });

  it("distinguishes observed pollution, last action and revisit priority", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GeometryTooltipContent, {
        title: "Action · Longueur ~ 1 km",
        geometryModeLabel: "Parcours connu",
        geometryPointsLabel: "2 points",
        geometryMetricLabel: "Longueur ~ 1 km",
        geometryConfidenceLabel: null,
        color: "hsl(35, 90%, 50%)",
        actionReading: {
          historicalScore: 42,
          projectedScore: 47,
          elapsedDays: 47,
          isEstimate: true,
          projectionConfidenceLabel: "Confiance faible",
        },
      }),
    );

    expect(markup).toContain("Pollution constatée avant l&#x27;action : 42 %");
    expect(markup).toContain("Pollution projetée : 47 %");
    expect(markup).toContain("Temps depuis la dernière action : 47 j");
    expect(markup).toContain("Confiance faible");
    expect(markup).toContain("pas une mesure en temps réel");
    expect(markup).not.toContain("Priorité de revisite");
    expect(markup).not.toContain("pollution actuelle");
  });

  it("uses observed provenance without presenting the model baseline as an observation", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GeometryTooltipContent, {
        title: "Action · Longueur ~ 1 km",
        geometryModeLabel: "Parcours connu",
        geometryPointsLabel: "2 points",
        geometryMetricLabel: "Longueur ~ 1 km",
        geometryConfidenceLabel: null,
        color: "hsl(35, 90%, 50%)",
        actionReading: {
          historicalScore: 80,
          projectedScore: 62,
          elapsedDays: 47,
          isEstimate: true,
          projectionConfidenceLabel: "Confiance faible",
          displayMode: "observed",
          displaySource: "observed",
          displayedScore: 12,
          displayedScoreKind: "measured",
          displayedStateLabel: "Pollution observée",
          displayedDate: "2026-06-01",
        },
      }),
    );

    expect(markup).toContain("Observé le 01/06/2026");
    expect(markup).toContain("Pollution observée : 12 %");
    expect(markup).not.toContain("Pollution projetée : 62 %");
    expect(markup).not.toContain("pas une mesure en temps réel");
  });
});
