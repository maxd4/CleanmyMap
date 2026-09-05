import { describe, expect, it } from "vitest";
import type {
  ParisPressureSnapshot,
  ParisPressureZone,
} from "@/lib/geo/paris-pressure-contract";
import {
  applyRoutePredictionFinalRoutingBudgetAudit,
  applyRoutePredictionPlannerBudgetAudit,
  applyRoutePredictionPoolAudit,
  buildRoutePlannerCandidatePool,
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

  it("n'invente pas un corridor entre l'origine et des observations non sélectionnées", () => {
    const result = buildPredictedRouteCandidates({
      snapshot: withZones([zone("between", 48.8566, 2.3572)]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      observedCandidates: [{ latitude: 48.8566, longitude: 2.3622 }],
      travelBudgetMinutes: 60,
    });
    expect(result.candidates[0]?.evidence.planningCorridor).toEqual({
      source: "origin_only",
      pointCount: 1,
      isNetworkGeometry: false,
      note: expect.stringContaining("origine uniquement"),
    });
    expect(result.candidates[0]?.evidence.distanceToCorridorKm).toBeGreaterThan(0);
  });

  it("utilise uniquement le corridor ordonné fourni par le planner de base", () => {
    const result = buildPredictedRouteCandidates({
      snapshot: withZones([zone("baseline-stop", 48.8566, 2.3622)]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      corridor: {
        points: [
          { latitude: 48.8566, longitude: 2.3522 },
          { latitude: 48.8566, longitude: 2.3622 },
        ],
        source: "ordered_baseline",
      },
      travelBudgetMinutes: 60,
    });
    expect(result.candidates[0]?.evidence.planningCorridor).toEqual(
      expect.objectContaining({ source: "ordered_baseline", isNetworkGeometry: false }),
    );
  });

  it("met en concurrence vingt observés et une prédiction forte avant le planner", () => {
    const observed = Array.from({ length: 20 }, (_, index) => ({
      id: `observed:${index}`,
      score: 40,
      family: "observed" as const,
    })) as never[];
    const predicted = { id: "predicted:strong", score: 92, family: "predicted" as const } as never;
    const pool = buildRoutePlannerCandidatePool({
      observedCandidates: observed,
      predictedCandidates: [predicted],
      maxCandidates: 8,
    });
    expect(pool.candidates[0]?.id).toBe("predicted:strong");
    expect(pool.audit.passedToPlannerCandidateIds).toContain("predicted:strong");
    expect(pool.audit.excludedByPreselectionCandidateIds).toHaveLength(13);
  });

  it("départage un score égal en faveur de l'observé et reste déterministe", () => {
    const observed = { id: "observed:tie", score: 70, family: "observed" as const } as never;
    const predicted = { id: "predicted:tie", score: 70, family: "predicted" as const } as never;
    const first = buildRoutePlannerCandidatePool({ observedCandidates: [observed], predictedCandidates: [predicted], maxCandidates: 1 });
    const second = buildRoutePlannerCandidatePool({ observedCandidates: [observed], predictedCandidates: [predicted], maxCandidates: 1 });
    expect(first.candidates[0]?.id).toBe("observed:tie");
    expect(first).toEqual(second);
  });

  it("sépare l'exclusion par borne de la contrainte de budget du planner", () => {
    const summary = buildPredictedRouteCandidates({
      snapshot: withZones([zone("budget-zone", 48.8568, 2.3522)]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      travelBudgetMinutes: 1,
    }).summary;
    const pool = buildRoutePlannerCandidatePool({
      observedCandidates: [],
      predictedCandidates: [{ id: "predicted:budget-zone", score: 90, family: "predicted" } as never],
      maxCandidates: 1,
    });
    const withPool = applyRoutePredictionPoolAudit(summary, pool.audit);
    const withBudget = applyRoutePredictionPlannerBudgetAudit(withPool, {
      passedCandidateIds: pool.audit.passedToPlannerCandidateIds,
      evaluations: [{ candidateId: "predicted:budget-zone", feasible: false }],
    });
    expect(withBudget.excludedByPreselection).toBe(0);
    expect(withBudget.excludedByPlannerBudget).toBe(1);
  });

  it("audite séparément une prédiction retirée par la réconciliation réseau finale", () => {
    const summary = {
      ...buildPredictedRouteCandidates({
        snapshot: withZones([zone("final-budget", 48.8568, 2.3522)]),
        origin: { latitude: 48.8566, longitude: 2.3522 },
        travelBudgetMinutes: 60,
      }).summary,
      passedToPlanner: 1,
      excludedByPreselection: 0,
      excludedByPlannerBudget: 0,
      preselectionExcludedCandidateIds: [],
      finalRoutingBudgetExcludedCandidateIds: [],
      excludedByFinalRoutingBudget: 0,
    };
    const audited = applyRoutePredictionFinalRoutingBudgetAudit(summary, [
      "predicted:final-budget",
    ]);

    expect(audited.selected).toBe(0);
    expect(audited.excludedByPreselection).toBe(0);
    expect(audited.excludedByPlannerBudget).toBe(0);
    expect(audited.excludedByFinalRoutingBudget).toBe(1);
    expect(audited.finalRoutingBudgetExcludedCandidateIds).toEqual([
      "predicted:final-budget",
    ]);
  });

  it("ignore un candidat déjà exclu avant le routage final", () => {
    const summary = {
      ...buildPredictedRouteCandidates({
        snapshot: withZones([zone("preselection", 48.8568, 2.3522)]),
        origin: { latitude: 48.8566, longitude: 2.3522 },
        travelBudgetMinutes: 60,
      }).summary,
      preselectionExcludedCandidateIds: ["predicted:preselection"],
    };
    const audited = applyRoutePredictionFinalRoutingBudgetAudit(summary, [
      "predicted:preselection",
    ]);

    expect(audited.excludedByFinalRoutingBudget).toBe(0);
    expect(audited.finalRoutingBudgetExcludedCandidateIds).toEqual([]);
  });
});
