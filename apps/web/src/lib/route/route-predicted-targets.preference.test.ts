import { describe, expect, it, vi } from "vitest";
import type { ParisPressureSnapshot, ParisPressureZone } from "@/lib/geo/paris-pressure-contract";
import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import { buildActionDataContract } from "@/lib/actions/data-contract";
import { buildTrashSpotterActionableCandidates } from "@/lib/actions/trash-spotter-actionable-candidates";
import {
  buildPredictedRouteCandidates,
  buildRoutePlannerCandidatePool,
} from "./route-predicted-targets";
import { planRoute } from "./route-planner";
import { partitionRouteCandidates } from "./route-group-partition";
import { routePartitionedGroups } from "./route-multi-route";

const routeProviderMock = vi.hoisted(() => vi.fn());

vi.mock("./fossgis-foot-routing", () => ({
  routePolylineThroughFossgisFoot: routeProviderMock,
}));

const snapshotBase: ParisPressureSnapshot = {
  schemaVersion: "paris-pressure-v1",
  snapshotId: "pickup-preference-test",
  generatedAt: "2026-09-04T00:00:00.000Z",
  refreshedAt: "2026-09-04T00:00:00.000Z",
  geographicLevel: "iris",
  coverage: { country: "FR", department: "75", commune: "75056", zoneCount: 0, complete: true, notes: [] },
  sources: [],
  zones: [],
};

function testZone(
  id: string,
  latitude: number,
  longitude: number,
  signals: ParisPressureZone["signals"],
): ParisPressureZone {
  return {
    id,
    label: id,
    geographicLevel: "iris",
    arrondissementCode: "75101",
    centroid: { latitude, longitude },
    areaKm2: 0.1,
    signals,
    humanPressure: null,
  };
}

function snapshotWithContrastingZones(): ParisPressureSnapshot {
  const neutral = { population: null, densityPerKm2: null, normalized: 0 };
  return {
    ...snapshotBase,
    zones: [
      testZone("waste-zone", 48.8568, 2.3522, {
        residentPopulation: { ...neutral, normalized: 1 },
        transport: { stationCount: 0, annualEntrants: null, normalized: 0 },
        tourism: { visitorAttendance: null, tourismPresenceProxy: null, normalized: 0 },
        publicActivity: { authorisedTerraces: 0, openAirMarkets: 0, otherPlaces: 0, normalized: 1 },
        cleanlinessPrior: { normalized: 0.5, rawObservations: null, resolution: "iris", measuredAt: null },
      }),
      testZone("butts-zone", 48.8568, 2.3622, {
        residentPopulation: neutral,
        transport: { stationCount: 3, annualEntrants: null, normalized: 1 },
        tourism: { visitorAttendance: null, tourismPresenceProxy: null, normalized: 1 },
        publicActivity: { authorisedTerraces: 40, openAirMarkets: 0, otherPlaces: 0, normalized: 0 },
        cleanlinessPrior: { normalized: 0.5, rawObservations: null, resolution: "iris", measuredAt: null },
      }),
    ],
    coverage: { ...snapshotBase.coverage, zoneCount: 2 },
  };
}

function snapshotWithRouteCompetition(): ParisPressureSnapshot {
  const snapshot = snapshotWithContrastingZones();
  const neutral = { population: null, densityPerKm2: null, normalized: 0.25 };
  return {
    ...snapshot,
    zones: [
      snapshot.zones[0]!,
      {
        ...snapshot.zones[1]!,
        centroid: { latitude: 48.8568, longitude: 2.3722 },
      },
      testZone("neutral-zone", 48.8668, 2.3522, {
        residentPopulation: neutral,
        transport: { stationCount: 1, annualEntrants: null, normalized: 0.25 },
        tourism: { visitorAttendance: null, tourismPresenceProxy: null, normalized: 0.25 },
        publicActivity: { authorisedTerraces: 5, openAirMarkets: 0, otherPlaces: 0, normalized: 0.25 },
        cleanlinessPrior: { normalized: 0.5, rawObservations: null, resolution: "iris", measuredAt: null },
      }),
    ],
    coverage: { ...snapshot.coverage, zoneCount: 3 },
  };
}

function observedCandidate() {
  const contract = buildActionDataContract({
    id: "observed:unchanged",
    type: "spot",
    status: "approved",
    source: "trash_spotter_spots",
    sourceStatus: "validated",
    observedAt: "2026-09-08T10:00:00.000Z",
    locationLabel: "observed:unchanged",
    latitude: 48.8568,
    longitude: 2.3522,
    wasteCategories: ["plastic"],
  });
  const candidate = buildTrashSpotterActionableCandidates([contract])[0];
  if (!candidate) throw new Error("Expected an observed route candidate");
  return {
    ...candidate,
    score: 74,
    reason: "Observed candidate",
    family: "observed" as const,
    evidence: {
      family: "observed" as const,
      source: "trash_spotter_spots" as const,
      proof: "validated" as const,
      observedAt: candidate.observedAt,
    },
  };
}

describe("pickup preference on predicted route zones", () => {
  it("changes the deterministic route choice without filtering the opposite type", () => {
    const origin = { latitude: 48.8566, longitude: 2.3522 };
    const common = {
      snapshot: snapshotWithContrastingZones(),
      origin,
      travelBudgetMinutes: 120,
      volunteerSafetyByZone: new Map([
        ["waste-zone", { status: "safe" as const, suitability: 1, confidence: 1 }],
        ["butts-zone", { status: "safe" as const, suitability: 1, confidence: 1 }],
      ]),
    };
    const waste = buildPredictedRouteCandidates({ ...common, effectiveRiskFocus: "waste" });
    const butts = buildPredictedRouteCandidates({ ...common, effectiveRiskFocus: "cigaretteButts" });

    expect(waste.candidates.map(({ id }) => id)).toEqual(["predicted:waste-zone", "predicted:butts-zone"]);
    expect(butts.candidates.map(({ id }) => id)).toEqual(["predicted:butts-zone", "predicted:waste-zone"]);
    expect(waste.candidates).toHaveLength(2);
    expect(butts.candidates).toHaveLength(2);

    const plannerOrigin = { ...origin, source: "browser" as const };
    const wastePlan = planRoute({ origin: plannerOrigin, candidates: waste.candidates, travelBudgetMinutes: 120, maxStops: 1, priorityVsTravel: 100 });
    const buttsPlan = planRoute({ origin: plannerOrigin, candidates: butts.candidates, travelBudgetMinutes: 120, maxStops: 1, priorityVsTravel: 100 });
    expect(wastePlan.stops[0]?.candidate.id).toBe("predicted:waste-zone");
    expect(buttsPlan.stops[0]?.candidate.id).toBe("predicted:butts-zone");
    expect(buttsPlan.stops[0]?.loopTravelMinutes).toBeGreaterThan(wastePlan.stops[0]?.loopTravelMinutes ?? 0);
  });

  it("propagates the focus through pool, planner, partition and multi-route without changing safety", async () => {
    routeProviderMock.mockImplementation(async (coordinates: [number, number][]) =>
      createFallbackRouteGeometry(coordinates),
    );
    const origin = { latitude: 48.8566, longitude: 2.3522 };
    const safety = new Map([
      ["waste-zone", { status: "safe" as const, suitability: 1, confidence: 1 }],
      ["butts-zone", { status: "safe" as const, suitability: 1, confidence: 1 }],
      ["neutral-zone", { status: "safe" as const, suitability: 1, confidence: 1 }],
    ]);
    const common = {
      snapshot: snapshotWithRouteCompetition(),
      origin,
      travelBudgetMinutes: 120,
      volunteerSafetyByZone: safety,
    };
    const wasteBuild = buildPredictedRouteCandidates({ ...common, effectiveRiskFocus: "waste" });
    const buttsBuild = buildPredictedRouteCandidates({ ...common, effectiveRiskFocus: "cigaretteButts" });
    const wastePool = buildRoutePlannerCandidatePool({
      observedCandidates: [],
      predictedCandidates: wasteBuild.candidates,
      maxCandidates: 8,
      effectiveRiskFocus: "waste",
    });
    const buttsPool = buildRoutePlannerCandidatePool({
      observedCandidates: [],
      predictedCandidates: buttsBuild.candidates,
      maxCandidates: 8,
      effectiveRiskFocus: "cigaretteButts",
    });
    const plannerOrigin = { ...origin, source: "browser" as const };
    const wastePlan = planRoute({
      origin: plannerOrigin,
      candidates: wastePool.candidates,
      travelBudgetMinutes: 120,
      maxStops: 1,
      priorityVsTravel: 100,
      effectiveRiskFocus: "waste",
    });
    const buttsPlan = planRoute({
      origin: plannerOrigin,
      candidates: buttsPool.candidates,
      travelBudgetMinutes: 120,
      maxStops: 1,
      priorityVsTravel: 100,
      effectiveRiskFocus: "cigaretteButts",
    });
    const wastePartition = partitionRouteCandidates({
      origin: plannerOrigin,
      candidates: wastePool.candidates,
      volunteers: 2,
      groupCount: 2,
      travelBudgetMinutes: 120,
      maxStops: 1,
      priorityVsTravel: 100,
      effectiveRiskFocus: "waste",
    });
    const buttsPartition = partitionRouteCandidates({
      origin: plannerOrigin,
      candidates: buttsPool.candidates,
      volunteers: 2,
      groupCount: 2,
      travelBudgetMinutes: 120,
      maxStops: 1,
      priorityVsTravel: 100,
      effectiveRiskFocus: "cigaretteButts",
    });
    const wasteRoute = await routePartitionedGroups({
      origin: plannerOrigin,
      candidates: wastePool.candidates,
      partition: wastePartition,
      travelBudgetMinutes: 120,
      effectiveRiskFocus: "waste",
    });
    const buttsRoute = await routePartitionedGroups({
      origin: plannerOrigin,
      candidates: buttsPool.candidates,
      partition: buttsPartition,
      travelBudgetMinutes: 120,
      effectiveRiskFocus: "cigaretteButts",
    });

    expect(wasteBuild.summary.riskFocus).toBe("waste");
    expect(buttsBuild.summary.riskFocus).toBe("cigaretteButts");
    expect(wastePool.audit.effectiveRiskFocus).toBe("waste");
    expect(buttsPool.audit.effectiveRiskFocus).toBe("cigaretteButts");
    expect(wastePlan.audit.effectiveRiskFocus).toBe("waste");
    expect(buttsPlan.audit.effectiveRiskFocus).toBe("cigaretteButts");
    expect(wastePartition.audit.effectiveRiskFocus).toBe("waste");
    expect(buttsPartition.audit.effectiveRiskFocus).toBe("cigaretteButts");
    expect(wasteRoute.effectiveRiskFocus).toBe("waste");
    expect(buttsRoute.effectiveRiskFocus).toBe("cigaretteButts");
    expect(wastePlan.stops[0]?.candidate.id).not.toBe(buttsPlan.stops[0]?.candidate.id);
    expect(wasteRoute.groupRoutes.flatMap(({ candidateIds }) => candidateIds)).not.toEqual(
      buttsRoute.groupRoutes.flatMap(({ candidateIds }) => candidateIds),
    );
    expect(wasteRoute.metrics.totalDistanceKm).not.toBe(buttsRoute.metrics.totalDistanceKm);
    expect(wasteRoute.metrics.totalDurationMinutes).not.toBe(buttsRoute.metrics.totalDurationMinutes);

    const observed = observedCandidate();
    const observedWaste = planRoute({
      origin: plannerOrigin,
      candidates: [observed],
      travelBudgetMinutes: 120,
      maxStops: 1,
      priorityVsTravel: 100,
      effectiveRiskFocus: "waste",
    });
    const observedButts = planRoute({
      origin: plannerOrigin,
      candidates: [observed],
      travelBudgetMinutes: 120,
      maxStops: 1,
      priorityVsTravel: 100,
      effectiveRiskFocus: "cigaretteButts",
    });
    expect(observedWaste.stops.map(({ candidate }) => candidate.id)).toEqual(
      observedButts.stops.map(({ candidate }) => candidate.id),
    );
    expect(observedWaste.audit.evaluations).toEqual(observedButts.audit.evaluations);

    const unsafe = buildPredictedRouteCandidates({
      ...common,
      effectiveRiskFocus: "waste",
      volunteerSafetyByZone: new Map([
        ["waste-zone", { status: "excluded" as const, suitability: 0, confidence: 1 }],
        ["butts-zone", { status: "safe" as const, suitability: 1, confidence: 1 }],
        ["neutral-zone", { status: "safe" as const, suitability: 1, confidence: 1 }],
      ]),
    });
    const unsafePool = buildRoutePlannerCandidatePool({
      observedCandidates: [],
      predictedCandidates: unsafe.candidates,
      maxCandidates: 8,
      effectiveRiskFocus: "waste",
    });
    expect(unsafePool.candidates.map(({ id }) => id)).not.toContain("predicted:waste-zone");

    const deterministic = await routePartitionedGroups({
      origin: plannerOrigin,
      candidates: wastePool.candidates,
      partition: partitionRouteCandidates({
        origin: plannerOrigin,
        candidates: [...wastePool.candidates].reverse(),
        volunteers: 2,
        groupCount: 2,
        travelBudgetMinutes: 120,
        maxStops: 1,
        priorityVsTravel: 100,
        effectiveRiskFocus: "waste",
      }),
      travelBudgetMinutes: 120,
      effectiveRiskFocus: "waste",
    });
    expect(deterministic.groupRoutes.map(({ candidateIds }) => candidateIds)).toEqual(
      wasteRoute.groupRoutes.map(({ candidateIds }) => candidateIds),
    );
  });
});
