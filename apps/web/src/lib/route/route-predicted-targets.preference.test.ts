import { describe, expect, it } from "vitest";
import type { ParisPressureSnapshot, ParisPressureZone } from "@/lib/geo/paris-pressure-contract";
import { buildPredictedRouteCandidates } from "./route-predicted-targets";
import { planRoute } from "./route-planner";

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
    const waste = buildPredictedRouteCandidates({ ...common, riskFocus: "waste" });
    const butts = buildPredictedRouteCandidates({ ...common, riskFocus: "cigaretteButts" });

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
});
