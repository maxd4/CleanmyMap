import { describe, expect, it } from "vitest";
import { buildRouteRecommendationTrace } from "./route-trace";
import type { RoutePlannerResult, PlannedRouteStop } from "./route-planner";

const origin = { latitude: 48.85, longitude: 2.35, source: "browser" as const };
const sourceHealth = {
  partial: false,
  failedSources: [],
  availableSources: ["spots"],
  warnings: [],
};

function plannerResult(ids: string[]): RoutePlannerResult {
  return {
    stops: [],
    diagnostics: { excludedUnsafe: 0, excludedByTravelBudget: 1 },
    audit: {
      evaluations: [],
      selections: ids.map((candidateId, index) => ({
        candidateId,
        step: index + 1,
        incrementalDistanceKm: 1,
        incrementalTravelMinutes: 5,
        cumulativeTravelMinutes: (index + 1) * 5,
        normalizedPriority: 0.8 - index / 10,
        normalizedTravel: 0.9,
        combinedScore: 0.85 - index / 10,
        feasible: true,
        budgetBeforeMinutes: 60 - index * 5,
        budgetAfterMinutes: 55 - index * 5,
        selectionReason: "Sélectionné par le planner.",
      })),
      orderingCriteria: [
        "combined_score_desc",
        "priority_desc",
        "incremental_travel_asc",
        "id_lexicographic",
      ],
    },
  };
}

function stop(id: string): PlannedRouteStop {
  return {
    candidate: {
      id,
      label: id,
      latitude: 48.86,
      longitude: 2.36,
      score: 80,
      reason: "Signal priorisé",
      family: "observed",
      safety: { isEligible: true, specializationReason: null },
    },
    incrementalDistanceKm: 1,
    incrementalTravelMinutes: 5,
    cumulativeTravelMinutes: 5,
  };
}

function geometry(mode: "network" | "fallback" = "fallback") {
  return {
    coordinates: [[48.85, 2.35] as [number, number]],
    distanceKm: 1,
    durationMinutes: 5,
    legs: mode === "network"
      ? [{
          fromStopIndex: 0,
          toStopIndex: 1,
          distanceKm: 1,
          estimatedMinutes: 5,
          steps: [{
            name: "Rue de test",
            distanceKm: 1,
            durationMinutes: 5,
            maneuver: "depart",
          }],
        }]
      : [],
    provider: mode === "network" ? "fossgis-osrm" : "none",
    profile: mode === "network" ? "foot" : null,
    mode,
    estimated: mode === "fallback",
  };
}

describe("route recommendation trace", () => {
  it("is deterministic and reports only the final selected stops", () => {
    const selectedStops = [stop("final-1")];
    const input = {
      engineVersion: "route-planner-v1",
      planningMode: { type: "free" as const },
      origin,
      travelBudgetMinutes: 60,
      maxStops: 1,
      priorityVsTravel: 65,
      candidateSummary: {
        loaded: 2,
        admissible: 2,
        excluded: 1,
        excludedByReason: { travel_budget: 1 },
      },
      plannerResult: plannerResult(["final-1"]),
      selectedStops,
      routeGeometry: geometry(),
      consumedTravelMinutes: 5,
      budgetPrefixApplied: true,
      sourceHealth,
    };

    const first = buildRouteRecommendationTrace(input);
    const second = buildRouteRecommendationTrace(input);

    expect(first).toEqual(second);
    expect(first.selectedStops.map(({ id }) => id)).toEqual(["final-1"]);
    expect(first.ordering.stopIds).toEqual(["final-1"]);
    expect(first.fallbacks).toEqual(["fallback_route_geometry", "budget_compatible_prefix"]);
    expect(first.finalRoutingReconciliation).toEqual({
      stopsBefore: 1,
      stopsAfter: 1,
      excludedCandidateIds: [],
      providerCalls: 0,
      firstProviderMode: "fallback",
      finalGeometryMode: "fallback",
      degraded: false,
      warning: null,
    });
  });

  it("keeps real provider street steps and does not invent them for fallback", () => {
    const selectedStops = [stop("final-1")];
    const base = {
      engineVersion: "route-planner-v1",
      origin,
      travelBudgetMinutes: 60,
      maxStops: 1,
      priorityVsTravel: 65,
      candidateSummary: { loaded: 1, admissible: 1, excluded: 0, excludedByReason: {} },
      plannerResult: plannerResult(["final-1"]),
      selectedStops,
      consumedTravelMinutes: 5,
      budgetPrefixApplied: false,
      sourceHealth,
    };

    expect(buildRouteRecommendationTrace({ ...base, routeGeometry: geometry("network") }).segments[0]?.streetSteps).toHaveLength(1);
    expect(buildRouteRecommendationTrace({ ...base, routeGeometry: geometry("fallback") }).segments[0]?.streetSteps).toEqual([]);
  });

  it("accepts an empty final route with an empty trace", () => {
    const trace = buildRouteRecommendationTrace({
      engineVersion: "route-planner-v1",
      origin,
      travelBudgetMinutes: 30,
      maxStops: 3,
      priorityVsTravel: 50,
      candidateSummary: { loaded: 0, admissible: 0, excluded: 0, excludedByReason: {} },
      plannerResult: plannerResult([]),
      selectedStops: [],
      routeGeometry: geometry(),
      consumedTravelMinutes: 0,
      budgetPrefixApplied: false,
      sourceHealth,
    });

    expect(trace.selectedStops).toEqual([]);
    expect(trace.segments).toEqual([]);
    expect(trace.budget.remainingMinutes).toBe(30);
  });
});
