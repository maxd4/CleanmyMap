import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { buildTrashSpotterActionableCandidates } from "@/lib/actions/trash-spotter-actionable-candidates";
import type { UnifiedSourceHealth } from "@/lib/actions/unified-source";
import type { RouteGeometry } from "./route-contract";
import {
  planRoute,
  routeDistanceKm,
  type RoutePlannerCandidate,
  type RoutePlannerOrigin,
} from "./route-planner";
import {
  buildRouteRecommendationTrace,
  type RouteTraceCandidateSummary,
} from "./route-trace";

const origin: RoutePlannerOrigin = {
  latitude: 48.8566,
  longitude: 2.3522,
  source: "browser",
};

function candidate(
  id: string,
  latitude: number,
  longitude: number,
  score: number,
): RoutePlannerCandidate {
  const contract = buildActionDataContract({
    id,
    type: "spot",
    status: "approved",
    source: "trash_spotter_spots",
    sourceStatus: "validated",
    observedAt: "2026-08-25T10:00:00.000Z",
    locationLabel: id,
    latitude,
    longitude,
    wasteCategories: ["plastic"],
  });
  const actionable = buildTrashSpotterActionableCandidates([contract])[0];
  if (!actionable) throw new Error(`Expected candidate ${id}`);
  return { ...actionable, score, reason: `score ${score}` };
}

function fallbackGeometry(
  coordinates: [number, number][],
  durationMinutes: number,
): RouteGeometry {
  const distanceKm = coordinates.reduce(
    (total, point, index) =>
      index === 0
        ? total
        : total +
          routeDistanceKm(
            {
              latitude: coordinates[index - 1]![0],
              longitude: coordinates[index - 1]![1],
            },
            { latitude: point[0], longitude: point[1] },
          ),
    0,
  );
  return {
    coordinates,
    distanceKm: Number(distanceKm.toFixed(2)),
    durationMinutes,
    legs: [],
    provider: "none",
    profile: null,
    mode: "fallback",
    estimated: true,
  };
}

function candidateSummary(
  overrides: Partial<RouteTraceCandidateSummary> = {},
): RouteTraceCandidateSummary {
  return {
    loaded: 3,
    admissible: 2,
    excluded: 1,
    excludedByReason: { not_admissible: 1 },
    ...overrides,
  };
}

function traceInput(overrides: Partial<Parameters<typeof buildRouteRecommendationTrace>[0]> = {}) {
  const stops = [candidate("a", 48.86, 2.35, 80)];
  const plannerResult = planRoute({
    origin,
    candidates: stops,
    travelBudgetMinutes: 60,
    maxStops: 1,
    priorityVsTravel: 65,
  });
  return {
    engineVersion: "route-planner-v1",
    origin,
    travelBudgetMinutes: 60,
    maxStops: 1,
    priorityVsTravel: 65,
    candidateSummary: candidateSummary(),
    plannerResult,
    selectedStops: plannerResult.stops,
    routeGeometry: fallbackGeometry(
      [[origin.latitude, origin.longitude], [stops[0]!.latitude, stops[0]!.longitude]],
      5,
    ),
    consumedTravelMinutes: 5,
    budgetPrefixApplied: false,
    sourceHealth: {
      partial: false,
      failedSources: [],
      availableSources: ["spots"],
      warnings: [],
    } satisfies UnifiedSourceHealth,
    ...overrides,
  };
}

describe("route recommendation trace", () => {
  it("is deterministic for deterministic planner input", () => {
    const first = buildRouteRecommendationTrace(traceInput());
    const second = buildRouteRecommendationTrace(traceInput());

    expect(first).toEqual(second);
  });

  it("explains every selected stop with the planner's normalized components", () => {
    const trace = buildRouteRecommendationTrace(traceInput());

    expect(trace.selectedStops).toHaveLength(1);
    expect(trace.selectedStops[0]).toEqual(expect.objectContaining({
      step: 1,
      id: "a",
      criteriaUsed: ["priority_score", "incremental_travel_cost"],
      normalizedScoreComponents: {
        priority: 0.8,
        travel: expect.any(Number),
      },
      combinedScore: expect.any(Number),
      reason: expect.stringContaining("Étape 1"),
    }));
    expect(trace.selectedStops[0]?.reason).toContain("score combiné=");
  });

  it("keeps exclusion counts and reasons explicit", () => {
    const trace = buildRouteRecommendationTrace(traceInput({
      candidateSummary: candidateSummary({
        loaded: 5,
        admissible: 3,
        excluded: 4,
        excludedByReason: {
          not_admissible: 1,
          unsafe_no_pickup: 1,
          travel_budget: 2,
        },
      }),
    }));

    expect(trace.candidates).toEqual(expect.objectContaining({
      loaded: 5,
      admissible: 3,
      excluded: 4,
      excludedByReason: {
        not_admissible: 1,
        unsafe_no_pickup: 1,
        travel_budget: 2,
      },
    }));
  });

  it("reports planner budget exclusions without turning them into measurements", () => {
    const far = candidate("far", 49.2, 2.35, 100);
    const plannerResult = planRoute({
      origin,
      candidates: [far],
      travelBudgetMinutes: 1,
      maxStops: 1,
      priorityVsTravel: 65,
    });
    const trace = buildRouteRecommendationTrace(traceInput({
      travelBudgetMinutes: 1,
      plannerResult,
      selectedStops: plannerResult.stops,
      candidateSummary: candidateSummary({
        loaded: 1,
        admissible: 1,
        excluded: 1,
        excludedByReason: { travel_budget: plannerResult.diagnostics.excludedByTravelBudget },
      }),
      consumedTravelMinutes: 0,
    }));

    expect(plannerResult.stops).toHaveLength(0);
    expect(trace.candidates.excludedByReason.travel_budget).toBe(1);
    expect(trace.duration.totalMinutes).toBe(0);
  });

  it("exposes an honest fallback and segment estimates", () => {
    const trace = buildRouteRecommendationTrace(traceInput({
      routeGeometry: fallbackGeometry(
        [[origin.latitude, origin.longitude], [48.86, 2.35]],
        5,
      ),
    }));

    expect(trace.routing.mode).toBe("fallback");
    expect(trace.fallbacks).toContain("fallback_route_geometry");
    expect(trace.duration.networkMinutes).toBeNull();
    expect(trace.duration.estimatedMinutes).toBe(5);
    expect(trace.duration.serviceMinutes).toBeNull();
    expect(trace.segments[0]).toEqual(expect.objectContaining({
      from: "origin",
      to: "a",
      measured: false,
      distanceKm: expect.any(Number),
      durationMinutes: expect.any(Number),
    }));
    expect(trace.distance.segmentsTotalKm).toBe(trace.distance.totalKm);
  });

  it("keeps missing network leg measurements as null", () => {
    const networkGeometry: RouteGeometry = {
      coordinates: [[origin.latitude, origin.longitude], [48.86, 2.35]],
      distanceKm: 1,
      durationMinutes: 8,
      legs: [],
      provider: "fossgis-osrm",
      profile: "foot",
      mode: "network",
      estimated: false,
    };
    const trace = buildRouteRecommendationTrace(traceInput({
      routeGeometry: networkGeometry,
      consumedTravelMinutes: 8,
    }));

    expect(trace.segments[0]).toMatchObject({
      distanceKm: null,
      durationMinutes: null,
      measured: false,
    });
    expect(trace.duration.estimatedMinutes).toBeNull();
    expect(trace.duration.networkMinutes).toBe(8);
  });

  it("keeps provider street steps grouped on the corresponding network segment", () => {
    const networkGeometry: RouteGeometry = {
      coordinates: [[origin.latitude, origin.longitude], [48.86, 2.35]],
      distanceKm: 1,
      durationMinutes: 8,
      legs: [{
        fromStopIndex: 0,
        toStopIndex: 1,
        distanceKm: 1,
        estimatedMinutes: 8,
        steps: [{
          name: "Rue de Test",
          distanceKm: 1,
          durationMinutes: 8,
          maneuver: "depart",
        }],
      }],
      provider: "fossgis-osrm",
      profile: "foot",
      mode: "network",
      estimated: false,
    };
    const trace = buildRouteRecommendationTrace(traceInput({
      routeGeometry: networkGeometry,
      consumedTravelMinutes: 8,
    }));

    expect(trace.segments[0]?.streetSteps).toEqual([{
      name: "Rue de Test",
      distanceKm: 1,
      durationMinutes: 8,
      maneuver: "depart",
    }]);
  });

  it("changes the parameter snapshot and selected explanation when weighting changes", () => {
    const near = candidate("near", 48.857, 2.3522, 20);
    const far = candidate("far", 48.875, 2.3522, 100);
    const travelFirstPlanner = planRoute({
      origin,
      candidates: [near, far],
      travelBudgetMinutes: 60,
      maxStops: 1,
      priorityVsTravel: 0,
    });
    const priorityFirstPlanner = planRoute({
      origin,
      candidates: [near, far],
      travelBudgetMinutes: 60,
      maxStops: 1,
      priorityVsTravel: 100,
    });
    const travelFirst = buildRouteRecommendationTrace(traceInput({
      priorityVsTravel: 0,
      plannerResult: travelFirstPlanner,
      selectedStops: travelFirstPlanner.stops,
    }));
    const priorityFirst = buildRouteRecommendationTrace(traceInput({
      priorityVsTravel: 100,
      plannerResult: priorityFirstPlanner,
      selectedStops: priorityFirstPlanner.stops,
    }));

    expect(travelFirst.parameters.priorityVsTravel).toBe(0);
    expect(priorityFirst.parameters.priorityVsTravel).toBe(100);
    expect(travelFirst.ordering.stopIds).not.toEqual(priorityFirst.ordering.stopIds);
    expect(travelFirst.selectedStops[0]?.id).not.toBe(priorityFirst.selectedStops[0]?.id);
  });
});
