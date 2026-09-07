import { describe, expect, it, vi } from "vitest";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import {
  buildTrashSpotterActionableCandidates,
} from "@/lib/actions/trash-spotter-actionable-candidates";
import type { WasteCategorySlug } from "@/lib/waste";
import type { RouteGeometry } from "./route-contract";
import {
  fallbackRoutePrefixWithinBudget,
  planRoute,
  routeDistanceKm,
  travelMinutesForDistance,
  type RoutePlannerCandidate,
  type RoutePlannerInput,
  type RoutePlannerOrigin,
} from "./route-planner";
import { finalPlannerContribution } from "./route-additionality";

function origin(latitude = 0, longitude = 0): RoutePlannerOrigin {
  return { latitude, longitude, source: "browser" };
}

function candidate(
  id: string,
  latitude: number,
  longitude: number,
  score: number,
  wasteCategories: WasteCategorySlug[] = ["plastic"],
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
    wasteCategories,
  });
  const actionable = buildTrashSpotterActionableCandidates([contract])[0];
  if (!actionable) {
    throw new Error(`Expected actionable candidate: ${id}`);
  }
  return {
    ...actionable,
    score,
    reason: `Priorité ${id}`,
    family: "observed",
    evidence: {
      family: "observed",
      source: "trash_spotter_spots",
      proof: "validated",
      observedAt: actionable.observedAt,
    },
  };
}

function plannerInput(overrides: Partial<RoutePlannerInput> = {}): RoutePlannerInput {
  return {
    origin: origin(),
    candidates: [],
    travelBudgetMinutes: 60,
    maxStops: 6,
    priorityVsTravel: 50,
    ...overrides,
  };
}

function fallbackGeometry(
  coordinates: [number, number][],
  durationMinutes: number,
): RouteGeometry {
  return {
    isLoop: coordinates.length >= 2 && coordinates[0]?.every((value, index) => value === coordinates.at(-1)?.[index]),
    origin: coordinates[0] ?? null,
    returnLeg: coordinates.length >= 2
      ? {
          fromStopIndex: coordinates.length - 2,
          toStopIndex: coordinates.length - 1,
          distanceKm: 0,
          estimatedMinutes: 0,
        }
      : null,
    coordinates,
    distanceKm: 0,
    durationMinutes,
    legs: [],
    provider: "none",
    profile: null,
    mode: "fallback",
    estimated: true,
  };
}

describe("route planner V1", () => {
  it("arbitre deux pollutions proches avec une additionnalité bornée et confiante", () => {
    const municipal = candidate("municipal-frequent", 0.001, 0, 92);
    const complementary = candidate("complementary", 0.001, 0, 84);
    const first = {
      ...municipal,
      pollutionPriority: 92,
      volunteerAdditionality: 10,
      finalPlannerContribution: finalPlannerContribution({
        pollutionPriority: 92,
        volunteerAdditionality: 10,
        confidence: 1,
      }),
    };
    const second = {
      ...complementary,
      pollutionPriority: 84,
      volunteerAdditionality: 100,
      finalPlannerContribution: finalPlannerContribution({
        pollutionPriority: 84,
        volunteerAdditionality: 100,
        confidence: 1,
      }),
    };

    expect(second.finalPlannerContribution).toBeGreaterThan(first.finalPlannerContribution);
    expect(planRoute(plannerInput({ candidates: [first, second], maxStops: 1 })).stops[0]?.candidate.id).toBe("complementary");
    expect(second.finalPlannerContribution).toBeLessThanOrEqual(100);
  });

  it("neutre l'additionnalité inconnue sans la transformer en absence de nettoyage", () => {
    const spot = candidate("unknown-coverage", 0.001, 0, 72);
    const contribution = finalPlannerContribution({
      pollutionPriority: spot.score,
      volunteerAdditionality: null,
      confidence: null,
    });
    expect(contribution).toBe(72);
  });

  it("la sécurité exclut une zone dangereuse même avec une additionnalité maximale", () => {
    const dangerous = {
      ...candidate("dangerous", 0.001, 0, 99),
      pollutionPriority: 99,
      volunteerAdditionality: 100,
      finalPlannerContribution: 100,
      volunteerSafety: {
        status: "excluded" as const,
        suitability: 1,
        confidence: 1,
        exclusionReasons: ["active_roadway" as const],
      },
    };
    const result = planRoute(plannerInput({ candidates: [dangerous], maxStops: 1 }));
    expect(result.stops).toHaveLength(0);
    expect(result.diagnostics.excludedUnsafe).toBe(1);
  });

  it("accepte les prédictions sans les convertir en observations et départage l'observé à égalité", () => {
    const predicted = {
      family: "predicted" as const,
      id: "predicted:station",
      label: "Zone prédite · station",
      latitude: 0.001,
      longitude: 0,
      score: 78,
      reason: "Zone prédite, facteurs calculés.",
      evidence: { family: "predicted" as const } as never,
    } satisfies RoutePlannerCandidate;
    const observed = candidate("observed:equivalent", 0.001, 0, 78);
    const result = planRoute(plannerInput({ candidates: [predicted], maxStops: 1 }));
    const tie = planRoute(plannerInput({ candidates: [predicted, observed], maxStops: 1 }));

    expect(result.stops[0]?.candidate.family).toBe("predicted");
    expect(tie.stops[0]?.candidate.family).toBe("observed");
    expect(tie.audit.evaluations.map(({ candidateId }) => candidateId)).toEqual([
      "predicted:station",
      "observed:equivalent",
    ]);
  });

  it("accepte une zone prédite comme cible distincte sans la faire passer pour un spot observé", () => {
    const predicted = {
      family: "predicted" as const,
      id: "predicted:station",
      label: "Zone prédite · station",
      latitude: 0.001,
      longitude: 0,
      score: 78,
      reason: "Zone prédite, facteurs calculés.",
      evidence: { family: "predicted" as const } as never,
    } satisfies RoutePlannerCandidate;
    const result = planRoute(plannerInput({ candidates: [predicted], maxStops: 1 }));

    expect(result.stops[0]?.candidate.family).toBe("predicted");
    expect(result.diagnostics.excludedUnsafe).toBe(0);

    const observed = candidate("observed:equivalent", 0.001, 0, 78);
    const tie = planRoute(plannerInput({
      candidates: [predicted, observed],
      maxStops: 1,
    }));
    expect(tie.stops[0]?.candidate.family).toBe("observed");
  });

  it("can change the first stop when the origin changes", () => {
    const candidates = [
      candidate("near-origin-a", 0.01, 0, 50),
      candidate("near-origin-b", 0.1, 0, 50),
    ];

    const fromA = planRoute(
      plannerInput({ candidates, priorityVsTravel: 0, maxStops: 1 }),
    );
    const fromB = planRoute(
      plannerInput({
        origin: origin(0.1, 0),
        candidates,
        priorityVsTravel: 0,
        maxStops: 1,
      }),
    );

    expect(fromA.stops[0]?.candidate.id).toBe("near-origin-a");
    expect(fromB.stops[0]?.candidate.id).toBe("near-origin-b");
  });

  it("counts the origin-to-first-stop movement at 4.5 km/h", () => {
    const stop = candidate("first", 0.01, 0, 80);
    const result = planRoute(
      plannerInput({ candidates: [stop], maxStops: 1, travelBudgetMinutes: 40 }),
    );
    const planned = result.stops[0];

    expect(planned).toBeDefined();
    expect(planned?.incrementalDistanceKm).toBe(routeDistanceKm(origin(), stop));
    expect(planned?.incrementalDistanceKm).toBeGreaterThan(0);
    expect(planned?.incrementalTravelMinutes).toBe(
      travelMinutesForDistance(planned?.incrementalDistanceKm ?? 0),
    );
    expect(planned?.cumulativeTravelMinutes).toBe(planned?.incrementalTravelMinutes);
    expect(planned?.returnDistanceKm).toBe(routeDistanceKm(stop, origin()));
    expect(planned?.loopTravelMinutes).toBe(
      planned?.incrementalTravelMinutes + planned?.returnTravelMinutes,
    );
    expect(planned?.loopTravelMinutes).toBeLessThanOrEqual(40);
  });

  it("refuses a distant stop when the return would exceed the budget", () => {
    const result = planRoute(
      plannerInput({
        candidates: [candidate("distant", 0.1, 0, 100)],
        travelBudgetMinutes: 10,
      }),
    );

    expect(result.stops).toHaveLength(0);
    expect(result.audit.evaluations[0]).toMatchObject({
      feasible: false,
      returnTravelMinutes: expect.any(Number),
      loopTravelMinutes: expect.any(Number),
    });
  });

  it("reserves the return while adding multiple stops", () => {
    const result = planRoute(
      plannerInput({
        candidates: [
          candidate("one", 0.005, 0, 80),
          candidate("two", 0.01, 0, 70),
        ],
        travelBudgetMinutes: 20,
        maxStops: 2,
      }),
    );

    expect(result.stops.length).toBeGreaterThan(0);
    expect(result.stops.every((stop) => stop.loopTravelMinutes <= 20)).toBe(true);
    expect(result.stops.at(-1)?.returnTravelMinutes).toBeGreaterThan(0);
  });

  it("returns no stop when the first movement cannot fit a very short budget", () => {
    const result = planRoute(
      plannerInput({
        candidates: [candidate("far", 0.1, 0, 100)],
        travelBudgetMinutes: 1,
      }),
    );

    expect(result.stops).toHaveLength(0);
  });

  it("never exceeds the cumulative travel budget", () => {
    const result = planRoute(
      plannerInput({
        candidates: [
          candidate("one", 0.005, 0, 80),
          candidate("two", 0.01, 0, 70),
          candidate("three", 0.015, 0, 60),
        ],
        travelBudgetMinutes: 20,
      }),
    );

    expect(result.stops.every((stop) => stop.cumulativeTravelMinutes <= 20)).toBe(
      true,
    );
  });

  it("honors maxStops = 1", () => {
    const result = planRoute(
      plannerInput({
        candidates: [
          candidate("one", 0.001, 0, 90),
          candidate("two", 0.002, 0, 80),
        ],
        maxStops: 1,
      }),
    );

    expect(result.stops).toHaveLength(1);
  });

  it("makes priorityVsTravel observable between priority and movement cost", () => {
    const candidates = [
      candidate("near-low-priority", 0.001, 0, 10),
      candidate("far-high-priority", 0.02, 0, 100),
    ];

    const travelFirst = planRoute(
      plannerInput({ candidates, priorityVsTravel: 0, maxStops: 1 }),
    );
    const priorityFirst = planRoute(
      plannerInput({ candidates, priorityVsTravel: 100, maxStops: 1 }),
    );

    expect(travelFirst.stops[0]?.candidate.id).toBe("near-low-priority");
    expect(priorityFirst.stops[0]?.candidate.id).toBe("far-high-priority");
  });

  it("resolves equal scores and movements deterministically by id", () => {
    const first = candidate("a", 0.01, 0, 50);
    const second = candidate("b", 0.01, 0, 50);
    const input = plannerInput({
      candidates: [second, first],
      maxStops: 1,
    });

    const firstRun = planRoute(input);
    const secondRun = planRoute({ ...input, candidates: [first, second] });

    expect(firstRun.stops[0]?.candidate.id).toBe("a");
    expect(secondRun.stops[0]?.candidate.id).toBe("a");
  });

  it("defensively excludes unsafe volunteer candidates", () => {
    const unsafe = candidate("unsafe", 0.001, 0, 100, ["sharps"]);
    const result = planRoute(plannerInput({ candidates: [unsafe] }));

    expect(result.stops).toHaveLength(0);
    expect(result.diagnostics.excludedUnsafe).toBe(1);
  });
});

describe("route planner closed-loop fallback helper", () => {
  it("keeps the fallback prefix and includes the real origin in provider input", () => {
    const stops = [
      { id: "one", latitude: 0.01, longitude: 0 },
      { id: "two", latitude: 0.02, longitude: 0 },
    ];
    const createFallback = vi.fn((coordinates: [number, number][]) =>
      fallbackGeometry(coordinates, coordinates.length === 4 ? 20 : 8),
    );

    const result = fallbackRoutePrefixWithinBudget(
      origin(),
      stops,
      10,
      createFallback,
    );

    expect(result.map((stop) => stop.id)).toEqual(["one"]);
    expect(createFallback).toHaveBeenCalledWith([
      [0, 0],
      [0.01, 0],
      [0.02, 0],
      [0, 0],
    ]);
    expect(createFallback).toHaveBeenLastCalledWith([
      [0, 0],
      [0.01, 0],
      [0, 0],
    ]);
  });
});
