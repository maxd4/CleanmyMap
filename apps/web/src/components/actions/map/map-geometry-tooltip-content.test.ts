import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GeometryTooltipContent } from "./map-geometry-tooltip-content";

describe("geometry tooltip action reading", () => {
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
});
