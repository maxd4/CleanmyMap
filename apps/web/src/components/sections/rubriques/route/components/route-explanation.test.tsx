import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RouteResponse } from "../route-types";
import { RouteExplanation } from "./route-explanation";

function dataFor(mode: "network" | "fallback"): RouteResponse {
  return {
    origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
    travelDistanceKm: 1.2,
    travelMinutes: 16,
    stops: [{
      id: "spot-1",
      label: "Place de test",
      latitude: 48.86,
      longitude: 2.35,
    }],
    trace: {
      engineVersion: "route-planner-v1",
      parameters: { travelBudgetMinutes: 60, maxStops: 6, priorityVsTravel: 65 },
      origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
      candidates: { loaded: 1, admissible: 1, excluded: 0, excludedByReason: {} },
      selectedStops: mode === "network" ? [{
        step: 1,
        id: "spot-1",
        criteriaUsed: ["priority_score", "incremental_travel_cost"],
        normalizedScoreComponents: { priority: 0.8, travel: 0.9 },
        combinedScore: 0.835,
        incrementalDistanceKm: 1.2,
        incrementalTravelMinutes: 16,
        cumulativeTravelMinutes: 16,
        budgetBeforeMinutes: 60,
        budgetAfterMinutes: 44,
        reason: "Étape 1: sélection dans le budget.",
      }] : [],
      ordering: {
        stopIds: mode === "network" ? ["spot-1"] : [],
        criteria: ["combined_score_desc", "priority_desc", "incremental_travel_asc", "id_lexicographic"],
      },
      budget: { requestedMinutes: 60, consumedMinutes: 16, remainingMinutes: 44 },
      distance: { totalKm: 1.2, segmentsTotalKm: 1.2 },
      duration: { networkMinutes: mode === "network" ? 16 : null, estimatedMinutes: mode === "fallback" ? 16 : null, serviceMinutes: null, totalMinutes: 16 },
      routing: {
        provider: mode === "network" ? "fossgis-osrm" : "none",
        profile: mode === "network" ? "foot" : null,
        mode,
        estimated: mode === "fallback",
        parameters: { walkingSpeedKmPerHour: 4.5, coordinateCount: 2, budgetPrefixApplied: false },
        opaqueProviderDecisions: [],
        degradations: [],
      },
      segments: mode === "network" ? [{
        from: "origin",
        to: "spot-1",
        distanceKm: 1.2,
        durationMinutes: 16,
        measured: true,
        streetSteps: [{ name: "Rue de Test", distanceKm: 1.2, durationMinutes: 16, maneuver: "depart" }],
      }] : [{
        from: "origin",
        to: "spot-1",
        distanceKm: 1.2,
        durationMinutes: 16,
        measured: false,
        streetSteps: [],
      }],
      warnings: [],
      approximations: mode === "fallback" ? ["distance estimée"] : [],
      fallbacks: mode === "fallback" ? ["fallback_route_geometry"] : [],
    },
  } as unknown as RouteResponse;
}

describe("RouteExplanation", () => {
  it("exposes trace-backed selection and network street details", () => {
    const markup = renderToStaticMarkup(<RouteExplanation data={dataFor("network")} fr />);

    expect(markup).toContain("Comprendre cet itinéraire");
    expect(markup).toContain("Étape 1: sélection dans le budget.");
    expect(markup).toContain("Rue de Test");
    expect(markup).toContain("Mesure réseau");
    expect(markup).toContain("<summary");
  });

  it("does not invent street details for fallback geometry", () => {
    const markup = renderToStaticMarkup(<RouteExplanation data={dataFor("fallback")} fr />);

    expect(markup).toContain("aucune liste fictive de rues");
    expect(markup).not.toContain("Rue de Test");
    expect(markup).toContain("estimé");
  });
});
