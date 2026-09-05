import { describe, expect, it } from "vitest";
import type {
  ParisPressureSnapshot,
  ParisPressureZone,
} from "@/lib/geo/paris-pressure-contract";
import {
  buildPredictedRouteCandidates,
  distanceToRouteCorridorKm,
} from "./route-predicted-targets";
import { planRoute } from "./route-planner";

const snapshotBase: ParisPressureSnapshot = {
  schemaVersion: "paris-pressure-v1",
  snapshotId: "route-prediction-test",
  generatedAt: "2026-09-04T00:00:00.000Z",
  refreshedAt: "2026-09-04T00:00:00.000Z",
  geographicLevel: "iris",
  coverage: {
    country: "FR",
    department: "75",
    commune: "75056",
    zoneCount: 0,
    complete: true,
    notes: [],
  },
  sources: [],
  zones: [],
};

function zone(
  id: string,
  latitude: number,
  longitude: number,
  overrides: Partial<ParisPressureZone["signals"]> = {},
): ParisPressureZone {
  return {
    id,
    label: id,
    geographicLevel: "iris",
    arrondissementCode: "75101",
    centroid: { latitude, longitude },
    areaKm2: 0.1,
    signals: {
      residentPopulation: { population: null, densityPerKm2: null, normalized: 0.8 },
      transport: { stationCount: 6, annualEntrants: null, normalized: 0.8 },
      tourism: { visitorAttendance: null, tourismPresenceProxy: null, normalized: 0.8 },
      publicActivity: { authorisedTerraces: 80, openAirMarkets: 4, otherPlaces: 20, normalized: 0.8 },
      cleanlinessPrior: { normalized: 0.5, rawObservations: null, resolution: "iris", measuredAt: null },
      ...overrides,
    },
    humanPressure: null,
  };
}

function withZones(zones: ParisPressureZone[]): ParisPressureSnapshot {
  return {
    ...snapshotBase,
    zones,
    coverage: { ...snapshotBase.coverage, zoneCount: zones.length },
  };
}

describe("predicted route targets", () => {
  it("keeps the family predicted and preserves zone geometry/evidence", () => {
    const snapshot = withZones([zone("near", 48.8568, 2.3522)]);
    const result = buildPredictedRouteCandidates({
      snapshot,
      origin: { latitude: 48.8566, longitude: 2.3522 },
      observedCandidates: [],
      travelBudgetMinutes: 60,
    });

    expect(result.candidates[0]).toEqual(expect.objectContaining({
      family: "predicted",
      id: "predicted:near",
      evidence: expect.objectContaining({
        family: "predicted",
        source: "urban-pressure-model",
        zoneId: "near",
        radiusKm: expect.any(Number),
        distanceToCorridorKm: expect.any(Number),
        contributions: expect.objectContaining({ waste: expect.any(Array), cigaretteButts: expect.any(Array) }),
      }),
    }));
    expect(result.candidates[0]?.label).toContain("Zone prédite");
  });

  it("admet une zone forte proche, mais borne l'opportunité hors corridor", () => {
    const snapshot = withZones([
      zone("near", 48.8568, 2.3522),
      zone("far-weak", 48.9, 2.3522, {
        residentPopulation: { population: null, densityPerKm2: null, normalized: 0.1 },
        transport: { stationCount: 0, annualEntrants: null, normalized: 0.1 },
        tourism: { visitorAttendance: null, tourismPresenceProxy: null, normalized: 0.1 },
        publicActivity: { authorisedTerraces: 0, openAirMarkets: 0, otherPlaces: 0, normalized: 0.1 },
      }),
    ]);
    const result = buildPredictedRouteCandidates({
      snapshot,
      origin: { latitude: 48.8566, longitude: 2.3522 },
      observedCandidates: [],
      travelBudgetMinutes: 60,
    });

    expect(result.candidates.map((candidate) => candidate.id)).toEqual(["predicted:near"]);
    expect(result.summary.excludedByCorridor).toBe(1);
  });

  it("déduplique les cellules voisines sans double comptage", () => {
    const result = buildPredictedRouteCandidates({
      snapshot: withZones([
        zone("a", 48.8566, 2.3522),
        zone("b", 48.8567, 2.3522),
      ]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      observedCandidates: [],
      travelBudgetMinutes: 60,
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.summary.deduplicated).toBe(1);
  });

  it("change le risque ciblé sans créer un observé et reste déterministe", () => {
    const snapshot = withZones([zone("passage", 48.8568, 2.3522)]);
    const input = {
      snapshot,
      origin: { latitude: 48.8566, longitude: 2.3522 },
      observedCandidates: [],
      travelBudgetMinutes: 60,
    } as const;
    const all = buildPredictedRouteCandidates(input);
    const butts = buildPredictedRouteCandidates({ ...input, riskFocus: "cigaretteButts" });

    expect(all).toEqual(buildPredictedRouteCandidates(input));
    expect(butts.summary.riskFocus).toBe("cigaretteButts");
    expect(butts.candidates[0]?.evidence.riskFocus).toBe("cigaretteButts");
    expect(butts.candidates[0]?.family).toBe("predicted");
  });

  it("reste fonctionnel sans snapshot et permet au planner observé de continuer", () => {
    const unavailable = buildPredictedRouteCandidates({
      snapshot: null,
      origin: { latitude: 48.8566, longitude: 2.3522 },
      observedCandidates: [],
      travelBudgetMinutes: 60,
    });
    expect(unavailable.summary.status).toBe("unavailable");
    expect(unavailable.candidates).toEqual([]);
    expect(planRoute({
      origin: { latitude: 48.8566, longitude: 2.3522, source: "browser" },
      candidates: [],
      travelBudgetMinutes: 60,
      maxStops: 1,
      priorityVsTravel: 65,
    }).stops).toEqual([]);
  });

  it("calcule une distance de corridor bornée par les segments réels", () => {
    expect(distanceToRouteCorridorKm(
      { latitude: 48.8566, longitude: 2.3622 },
      [{ latitude: 48.8566, longitude: 2.3522 }, { latitude: 48.8566, longitude: 2.3722 }],
    )).toBeLessThan(1);
  });

  it("propage les gaps et la provenance contextuelle vers l'evidence route", () => {
    const input = {
      snapshot: withZones([zone("event-zone", 48.8568, 2.3522)]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      observedCandidates: [],
      travelBudgetMinutes: 60,
      recentEvents: [{
        latitude: 48.8568,
        longitude: 2.3522,
        ageDays: 0,
        attendancePressure: 1,
      }],
    };
    const withoutProvenance = buildPredictedRouteCandidates(input);
    expect(withoutProvenance.candidates[0]?.evidence.provenanceGaps).toEqual([
      { factor: "eventPressure", message: "Provenance contextuelle absente" },
    ]);

    const withProvenance = buildPredictedRouteCandidates({
      ...input,
      contextProvenance: {
        eventPressure: [{
          factor: "eventPressure",
          publisher: "Test route context",
          dataset: "Test route events",
          url: "https://example.test/route-events",
          license: "Licence de test",
          datasetVersion: "2026-test",
          observedAt: "2026-09-05",
          refreshedAt: "2026-09-05T00:00:00.000Z",
          status: "available",
          notes: [],
        }],
      },
    });
    expect(withProvenance.candidates[0]?.evidence.contextProvenance.map((source) => source.factor)).toEqual(["eventPressure"]);
    expect(withProvenance.candidates[0]?.evidence.provenanceGaps).toEqual([]);
    expect(withProvenance.candidates[0]?.evidence.modelVersion).toBe("paris-pressure-risk-v2");
  });
});
