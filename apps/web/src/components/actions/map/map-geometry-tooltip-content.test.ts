import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GeometryTooltipContent } from "./map-geometry-tooltip-content";

describe("geometry tooltip action reading", () => {
  it("renders the public geometry capsules without technical confidence", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GeometryTooltipContent, {
        title: "Parcours d'action · Longueur ~ 1 km",
        geometryModeLabel: "Parcours connu",
        geometryPointsLabel: "2 points",
        geometryMetricLabel: "Longueur ~ 1 km",
        color: "hsl(35, 90%, 50%)",
      }),
    );

    expect(markup.match(/class="cmm-badge"/g)).toHaveLength(2);
    expect(markup.match(/data-badge-shape="pill"/g)).toHaveLength(2);
    expect(markup).toContain("2 points");
    expect(markup).toContain("Longueur ~ 1 km");
    expect(markup).not.toContain("Confiance élevée");
    expect(markup).toContain("hsl(35, 90%, 50%)");
    expect(markup).not.toContain("inline-flex items-center gap-1 rounded-full border");
    expect(markup).not.toContain("inline-flex items-center rounded-full border");
  });

  it("distinguishes observed pollution, last action and revisit priority", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GeometryTooltipContent, {
        title: "Parcours d'action · Longueur ~ 1 km",
        geometryModeLabel: "Parcours connu",
        geometryPointsLabel: "2 points",
        geometryMetricLabel: "Longueur ~ 1 km",
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
        title: "Parcours d'action · Longueur ~ 1 km",
        geometryModeLabel: "Parcours connu",
        geometryPointsLabel: "2 points",
        geometryMetricLabel: "Longueur ~ 1 km",
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

  it("shows the global score and its waste/butts components", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GeometryTooltipContent, {
        title: "Parcours d'action · Point",
        geometryModeLabel: "Point",
        geometryPointsLabel: "1 point",
        geometryMetricLabel: null,
        color: "#f97316",
        actionReading: {
          scoreScope: "global",
          historicalScore: 48,
          projectedScore: 52,
          globalScore: 48,
          globalWasteScore: 44,
          globalButtsScore: 52,
          elapsedDays: 12,
          isEstimate: true,
          projectionConfidenceLabel: "Confiance moyenne",
          displayMode: "projected_today",
          displaySource: "projected",
          displayedScore: 52,
          displayedScoreKind: "projected",
          displayedStateLabel: "Pollution projetée",
          displayedDate: "2026-04-08",
        },
      }),
    );

    expect(markup).toContain("Score global : 48 %");
    expect(markup).toContain("Déchets : 44 %");
    expect(markup).toContain("Mégots : 52 %");
    expect(markup).toContain("Projeté aujourd’hui");
  });

  it("shows a department-relative tooltip without projection or global fallback", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GeometryTooltipContent, {
        title: "Action · Parcours",
        geometryModeLabel: "Parcours connu",
        geometryPointsLabel: "2 points",
        geometryMetricLabel: "Longueur ~ 1 km",
        color: "#8b5cf6",
        actionReading: {
          scoreScope: "department",
          historicalScore: 62,
          projectedScore: 62,
          departmentScore: 62,
          departmentWasteScore: 58,
          departmentButtsScore: 66,
          departmentName: "Paris",
          departmentUnavailable: false,
          elapsedDays: 12,
          isEstimate: false,
          projectionConfidenceLabel: "Confiance moyenne",
        },
      }),
    );

    expect(markup).toContain("Score relatif : 62 %");
    expect(markup).toContain("Déchets : 58 %");
    expect(markup).toContain("Mégots : 66 %");
    expect(markup).toContain("Département : Paris");
    expect(markup).toContain("Comparaison au maximum départemental");
    expect(markup).not.toContain("Pollution projetée");
    expect(markup).not.toContain("Confiance moyenne");
  });

  it("keeps department unavailability explicit", () => {
    const markup = renderToStaticMarkup(
      React.createElement(GeometryTooltipContent, {
        title: "Action · Point",
        geometryModeLabel: "Point",
        geometryPointsLabel: "1 point",
        geometryMetricLabel: null,
        color: "#94a3b8",
        actionReading: {
          scoreScope: "department",
          historicalScore: 0,
          projectedScore: 0,
          departmentUnavailable: true,
          elapsedDays: 0,
          isEstimate: false,
          projectionConfidenceLabel: "Confiance indisponible",
        },
      }),
    );

    expect(markup).toContain("Comparaison départementale indisponible");
    expect(markup).toContain("Pas assez d&#x27;actions de référence dans ce département.");
  });
});
