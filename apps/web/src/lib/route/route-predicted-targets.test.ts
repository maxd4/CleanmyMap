import { describe, expect, it } from "vitest";
import type {
  ParisPressureProvenance,
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
  it("ne transmet pas une prédiction sans preuve de sécurité au planner bénévole", () => {
    const built = buildPredictedRouteCandidates({
      snapshot: withZones([zone("unknown-safety", 48.8568, 2.3522)]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      travelBudgetMinutes: 60,
    });
    expect(built.candidates[0]?.volunteerSafety?.status).toBe("unknown");
    expect(built.candidates[0]?.volunteerAdditionality).toBeNull();
    const pool = buildRoutePlannerCandidatePool({
      observedCandidates: [],
      predictedCandidates: built.candidates,
      maxCandidates: 8,
    });
    expect(pool.candidates).toEqual([]);
  });

  it("conserve la trace d'additionnalité lorsque la sécurité est explicitement sûre", () => {
    const built = buildPredictedRouteCandidates({
      snapshot: withZones([zone("safe-zone", 48.8568, 2.3522)]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      travelBudgetMinutes: 60,
      volunteerSafetyByZone: new Map([
        ["safe-zone", { status: "safe", suitability: 1, confidence: 1 }],
      ]),
    });
    const safeCandidate = built.candidates[0];
    expect(safeCandidate).toBeDefined();
    if (!safeCandidate) throw new Error("La prédiction sûre attendue est absente.");
    expect(safeCandidate.volunteerSafety?.status).toBe("safe");
    expect(typeof safeCandidate.pollutionPriority).toBe("number");
    expect(typeof safeCandidate.finalPlannerContribution).toBe("number");
    expect(typeof safeCandidate.evidence.pollutionPriority).toBe("number");
    expect(typeof safeCandidate.evidence.finalPlannerContribution).toBe("number");
    expect(typeof safeCandidate.evidence.volunteerAdditionality).toBe("number");
  });

  it("keeps the family predicted and preserves zone geometry/evidence", () => {
    const snapshot = withZones([zone("near", 48.8568, 2.3522)]);
    const result = buildPredictedRouteCandidates({
      snapshot,
      origin: { latitude: 48.8566, longitude: 2.3522 },
      observedCandidates: [],
      travelBudgetMinutes: 60,
    });

    const predictedCandidate = result.candidates[0];
    expect(predictedCandidate).toBeDefined();
    if (!predictedCandidate) throw new Error("La prédiction proche attendue est absente.");
    expect(predictedCandidate.family).toBe("predicted");
    expect(predictedCandidate.id).toBe("predicted:near");
    expect(predictedCandidate.evidence.family).toBe("predicted");
    expect(predictedCandidate.evidence.source).toBe("urban-pressure-model");
    expect(predictedCandidate.evidence.zoneId).toBe("near");
    expect(typeof predictedCandidate.evidence.radiusKm).toBe("number");
    expect(typeof predictedCandidate.evidence.distanceToCorridorKm).toBe("number");
    expect(Array.isArray(predictedCandidate.evidence.contributions.waste)).toBe(true);
    expect(Array.isArray(predictedCandidate.evidence.contributions.cigaretteButts)).toBe(true);
    expect(predictedCandidate.evidence.urbanMorphologyPrior.waste.status).toBe("unavailable");
    expect(predictedCandidate.evidence.urbanMorphologyPrior.cigaretteButts.status).toBe("unavailable");
    expect(predictedCandidate.label).toContain("Zone prédite");
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

  it("explique la branche mégots dominante lorsque le focus porte sur les deux risques", () => {
    const morphologySource: ParisPressureProvenance = {
      family: "geography",
      publisher: "Test geography",
      dataset: "Morphology dominant risk test",
      url: "https://example.test/morphology-dominant-risk",
      license: "Licence de test",
      datasetVersion: "2026-test",
      observedAt: "2026-09-08",
      refreshedAt: "2026-09-08T00:00:00.000Z",
      geographicLevel: "iris",
      status: "available",
      notes: [],
    };
    const input = {
      snapshot: withZones([{
        ...zone("butts-dominant", 48.8568, 2.3522, {
          residentPopulation: { population: null, densityPerKm2: null, normalized: 0 },
          transport: { stationCount: 0, annualEntrants: null, normalized: 0 },
          tourism: { visitorAttendance: null, tourismPresenceProxy: null, normalized: 0 },
          publicActivity: {
            authorisedTerraces: 200,
            openAirMarkets: 0,
            otherPlaces: 0,
            normalized: 0,
          },
        }),
        urbanMorphology: {
          source: morphologySource,
          confidence: 0.9,
          features: {
            lowTrafficLocalStreet: null,
            deadEnd: null,
            parkInterior: 1,
            residentialLowFlow: null,
            parkEntrance: null,
            parkEdge: null,
            parkAmenity: null,
            foodService: null,
            stationProximity: null,
            commerceProximity: null,
            schoolProximity: null,
            terraceProximity: null,
            touristProximity: null,
          },
        },
      }]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      travelBudgetMinutes: 60,
      riskFocus: "all",
    } as const;
    const result = buildPredictedRouteCandidates(input);
    const cigaretteFocused = buildPredictedRouteCandidates({
      ...input,
      riskFocus: "cigaretteButts",
    });

    const candidate = result.candidates[0]!;
    expect(candidate.evidence.cigaretteButtRisk).toBeGreaterThan(candidate.evidence.wasteRisk);
    expect(candidate.evidence.dominantRisk).toBe("cigaretteButts");
    expect(candidate.reason).toContain("Zone prédite mégots");
    expect(candidate.reason).toContain("Terrasses");
    expect(candidate.reason).toContain("prior morphologique compensé par signal de fréquentation robuste");
    expect(candidate.reason).toBe(cigaretteFocused.candidates[0]?.reason);
    expect(candidate.reason).not.toContain("contexte morphologique atténuant=3.5 pts");
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
    expect(withProvenance.candidates[0]?.evidence.modelVersion).toBe("paris-pressure-risk-v3-urban-morphology");
  });

  it("propage la trace du prior morphologique dans l'evidence route", () => {
    const morphologySource: ParisPressureProvenance = {
      family: "geography",
      publisher: "Test geography",
      dataset: "Morphology test",
      url: "https://example.test/morphology",
      license: "Licence de test",
      datasetVersion: "2026-test",
      observedAt: "2026-09-08",
      refreshedAt: "2026-09-08T00:00:00.000Z",
      geographicLevel: "iris",
      status: "available",
      notes: [],
    };
    const morphologyZone: ParisPressureZone = {
      ...zone("morphology-zone", 48.8568, 2.3522),
      urbanMorphology: {
        source: morphologySource,
        confidence: 0.9,
        features: {
          lowTrafficLocalStreet: null,
          deadEnd: null,
          parkInterior: 1,
          residentialLowFlow: null,
          parkEntrance: null,
          parkEdge: null,
          parkAmenity: null,
          foodService: null,
          stationProximity: null,
          commerceProximity: null,
          schoolProximity: null,
          terraceProximity: null,
          touristProximity: null,
        },
      },
    };
    const result = buildPredictedRouteCandidates({
      snapshot: withZones([morphologyZone]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      travelBudgetMinutes: 60,
      recentEvents: [{
        latitude: 48.8568,
        longitude: 2.3522,
        ageDays: 0,
        attendancePressure: 1,
      }],
    });

    expect(result.candidates[0]?.evidence.urbanMorphologyPrior.waste).toMatchObject({
      status: "applied",
      source: morphologySource,
      appliedMalusPoints: 0,
    });
    expect(result.candidates[0]?.reason).toContain("prior morphologique compensé");
  });

  it("n'invente pas un corridor entre l'origine et des observations non sélectionnées", () => {
    const result = buildPredictedRouteCandidates({
      snapshot: withZones([zone("between", 48.8566, 2.3572)]),
      origin: { latitude: 48.8566, longitude: 2.3522 },
      observedCandidates: [{ latitude: 48.8566, longitude: 2.3622 }],
      travelBudgetMinutes: 60,
    });
    const corridor = result.candidates[0]?.evidence.planningCorridor;
    expect(corridor).toMatchObject({
      source: "origin_only",
      pointCount: 1,
      isNetworkGeometry: false,
    });
    expect(corridor?.note).toContain("origine uniquement");
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
