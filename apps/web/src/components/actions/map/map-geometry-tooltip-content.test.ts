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
          observedScore: 42,
          lastAction: "2026-04-08T00:00:00.000Z",
          revisitPriority: 47.2,
        },
      }),
    );

    expect(markup).toContain("Pollution constatée : 42/100");
    expect(markup).toContain("Dernière action : 08/04/2026");
    expect(markup).toContain("Priorité de revisite : 47/100");
    expect(markup).not.toContain("pollution actuelle");
  });
});
