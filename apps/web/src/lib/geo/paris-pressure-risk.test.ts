import { describe, expect, it } from "vitest";
import type {
  ParisPressureProvenance,
  ParisPressureSnapshot,
  ParisPressureZone,
} from "./paris-pressure-contract";
import {
  estimateCigaretteButtRisk,
  estimateParisPressureRisk,
  estimateParisPressureRiskByZone,
  estimateWasteRisk,
} from "./paris-pressure-risk";

const sourceFamilies = [
  "geography",
  "resident_population",
  "transport",
  "tourism",
  "public_activity",
  "cleanliness",
] as const;

const sources: ParisPressureProvenance[] = sourceFamilies.map((family) => ({
  family,
  publisher: "Test publisher",
  dataset: `Test ${family}`,
  url: "https://example.test/source",
  license: "Licence de test",
  datasetVersion: "2026-test",
  observedAt: "2026-09-04",
  refreshedAt: "2026-09-04T00:00:00.000Z",
  geographicLevel: "iris",
  status: "available",
  notes: [],
}));

const snapshot = {
  schemaVersion: "paris-pressure-v1",
  snapshotId: "paris-iris-test",
  generatedAt: "2026-09-04T00:00:00.000Z",
  refreshedAt: "2026-09-04T00:00:00.000Z",
  geographicLevel: "iris",
  coverage: {
    country: "FR",
    department: "75",
    commune: "75056",
    zoneCount: 1,
    complete: true,
    notes: [],
  },
  sources,
  zones: [],
} satisfies ParisPressureSnapshot;

function buildZone(overrides: {
  resident?: number | null;
  transport?: number | null;
  stationCount?: number | null;
  tourism?: number | null;
  places?: number | null;
  terraces?: number | null;
  markets?: number | null;
  otherPlaces?: number | null;
  cleanliness?: number | null;
  cleanlinessResolution?: "iris" | "arrondissement" | null;
} = {}): ParisPressureZone {
  return {
    id: "751010101",
    label: "Zone de test",
    geographicLevel: "iris",
    arrondissementCode: "75101",
    centroid: { latitude: 48.8566, longitude: 2.3522 },
    areaKm2: 0.1,
    signals: {
      residentPopulation: {
        population: null,
        densityPerKm2: null,
        normalized: overrides.resident ?? null,
      },
      transport: {
        stationCount: overrides.stationCount ?? null,
        annualEntrants: null,
        normalized: overrides.transport ?? null,
      },
      tourism: {
        visitorAttendance: null,
        tourismPresenceProxy: null,
        normalized: overrides.tourism ?? null,
      },
      publicActivity: {
        authorisedTerraces: overrides.terraces ?? null,
        openAirMarkets: overrides.markets ?? null,
        otherPlaces: overrides.otherPlaces ?? null,
        normalized: overrides.places ?? null,
      },
      cleanlinessPrior: {
        normalized: overrides.cleanliness ?? null,
        rawObservations: null,
        resolution: overrides.cleanlinessResolution ?? null,
        measuredAt: null,
      },
    },
    humanPressure: null,
  };
}

function withZone(zone: ParisPressureZone): ParisPressureSnapshot {
  return { ...snapshot, zones: [zone], coverage: { ...snapshot.coverage, zoneCount: 1 } };
}

describe("Paris pressure risk model", () => {
  it.each([
    {
      name: "forte affluence et zone propre",
      zone: buildZone({ resident: 1, transport: 1, stationCount: 8, tourism: 1, places: 1, terraces: 80, markets: 4, cleanliness: 0.1, cleanlinessResolution: "arrondissement" }),
      context: {},
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.waste.cleanlinessCorrection.points).toBeLessThan(0);
        expect(result.wasteRisk).toBeLessThan(70);
      },
    },
    {
      name: "forte affluence et zone historiquement sale",
      zone: buildZone({ resident: 1, transport: 1, stationCount: 8, tourism: 1, places: 1, terraces: 80, markets: 4, cleanliness: 0.9, cleanlinessResolution: "arrondissement" }),
      context: {},
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.waste.cleanlinessCorrection.points).toBeGreaterThan(0);
        expect(result.wasteRisk).toBeGreaterThan(60);
      },
    },
    {
      name: "faible affluence mais zone sale",
      zone: buildZone({ resident: 0.1, transport: 0.1, tourism: 0.1, places: 0.1, cleanliness: 0.9, cleanlinessResolution: "iris" }),
      context: {},
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.wasteRisk).toBeLessThan(30);
        expect(result.wasteRisk).not.toBe(100);
      },
    },
    {
      name: "hotspot touristique",
      zone: buildZone({ tourism: 1, places: 0.2, cleanliness: 0.5 }),
      context: {},
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.waste.contributions.find((item) => item.key === "tourismPressure")?.points).toBe(16);
      },
    },
    {
      name: "grande station",
      zone: buildZone({ transport: 1, stationCount: 12, cleanliness: 0.5 }),
      context: {},
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.cigaretteButtRisk).toBeGreaterThan(result.wasteRisk);
      },
    },
    {
      name: "forte densité de terrasses",
      zone: buildZone({ terraces: 120, places: 0.8, cleanliness: 0.5 }),
      context: {},
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.cigaretteButts.contributions.find((item) => item.key === "terracePressure")?.normalized).toBeGreaterThan(0.9);
      },
    },
    {
      name: "hotspot mégots historique",
      zone: buildZone({ cleanliness: 0.5 }),
      context: { validatedCigaretteButts: 1000 },
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.cigaretteButtRisk).toBeGreaterThan(4);
        expect(result.provenanceGaps).toHaveLength(1);
      },
    },
    {
      name: "absence de données touristiques",
      zone: buildZone({ resident: 0.7, transport: 0.5, places: 0.4, cleanliness: 0.5 }),
      context: {},
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.confidence.waste.missingFactors).toContain("tourismPressure");
        expect(result.confidence.waste.dataCompleteness).toBeLessThan(1);
      },
    },
    {
      name: "absence de propreté",
      zone: buildZone({ resident: 0.7, transport: 0.5, tourism: 0.4, places: 0.4 }),
      context: {},
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.waste.cleanlinessCorrection).toMatchObject({ available: false, points: 0 });
      },
    },
    {
      name: "événement récent",
      zone: buildZone({ resident: 0.2, cleanliness: 0.5 }),
      context: { recentEvents: [{ distanceKm: 0, ageDays: 0, attendancePressure: 1 }] },
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.waste.contributions.find((item) => item.key === "eventPressure")?.normalized).toBe(1);
        expect(result.cigaretteButts.contributions.find((item) => item.key === "eventPressure")?.normalized).toBe(1);
      },
    },
    {
      name: "plusieurs facteurs superposés",
      zone: buildZone({ resident: 1, transport: 1, stationCount: 8, tourism: 1, places: 1, terraces: 80, markets: 4, cleanliness: 0.8, cleanlinessResolution: "arrondissement" }),
      context: { eventPressure: 0.8, validatedWasteReports: 12, validatedCigaretteButts: 300 },
      expected: (result: ReturnType<typeof estimateParisPressureRisk>) => {
        expect(result.wasteRisk).toBeGreaterThan(70);
        expect(result.cigaretteButtRisk).toBeGreaterThan(50);
        expect(result.wasteRisk).toBeLessThan(100);
        expect(result.cigaretteButtRisk).toBeLessThan(100);
      },
    },
  ])("couvre le cas $name", ({ zone, context, expected }) => {
    expected(estimateParisPressureRisk(zone, withZone(zone), context));
  });

  it("sépare les classements déchets et mégots", () => {
    const residential = buildZone({ resident: 1, transport: 0, tourism: 0, places: 0, cleanliness: 0.5 });
    const passage = buildZone({ resident: 0.1, transport: 1, stationCount: 12, tourism: 0, places: 0.2, terraces: 120, cleanliness: 0.5 });
    const residentialRisk = estimateParisPressureRisk(residential, withZone(residential));
    const passageRisk = estimateParisPressureRisk(passage, withZone(passage));

    expect(estimateWasteRisk(residential, withZone(residential))).toEqual(residentialRisk.waste);
    expect(estimateCigaretteButtRisk(passage, withZone(passage))).toEqual(passageRisk.cigaretteButts);
    expect(residentialRisk.wasteRisk).toBeGreaterThan(passageRisk.wasteRisk);
    expect(passageRisk.cigaretteButtRisk).toBeGreaterThan(residentialRisk.cigaretteButtRisk);
  });

  it("reste déterministe et entièrement traçable", () => {
    const zone = buildZone({ resident: 0.8, transport: 0.7, tourism: 0.6, places: 0.5, cleanliness: 0.2 });
    const first = estimateParisPressureRisk(zone, withZone(zone), { eventPressure: 0.4 });
    const second = estimateParisPressureRisk(zone, withZone(zone), { eventPressure: 0.4 });

    expect(first).toEqual(second);
    expect(first.snapshot).toMatchObject({ snapshotId: "paris-iris-test", schemaVersion: "paris-pressure-v1" });
    expect(first.provenance.map((source) => source.dataset)).toEqual([
      "Test resident_population",
      "Test transport",
      "Test tourism",
      "Test public_activity",
      "Test cleanliness",
    ]);
    for (const score of [first.waste, first.cigaretteButts]) {
      expect(score.baseRisk).toBeCloseTo(score.contributions.reduce((sum, item) => sum + item.points, 0), 3);
      expect(Math.max(...score.contributions.map((item) => item.points))).toBeLessThanOrEqual(25);
    }
  });

  it("applique réellement la correction de propreté sans annuler un hotspot local", () => {
    const clean = buildZone({ resident: 1, transport: 1, tourism: 1, places: 1, cleanliness: 0.1, cleanlinessResolution: "iris" });
    const dirty = buildZone({ resident: 1, transport: 1, tourism: 1, places: 1, cleanliness: 0.9, cleanlinessResolution: "iris" });
    const localHotspot = buildZone({ resident: 0.1, tourism: 0.1, places: 0.1, cleanliness: 0.1, cleanlinessResolution: "arrondissement" });
    const cleanRisk = estimateWasteRisk(clean, withZone(clean));
    const dirtyRisk = estimateWasteRisk(dirty, withZone(dirty));
    const hotspotRisk = estimateWasteRisk(localHotspot, withZone(localHotspot), { validatedWasteReports: 60 });

    expect(cleanRisk.finalRisk).toBeLessThan(dirtyRisk.finalRisk);
    expect(hotspotRisk.finalRisk).toBeGreaterThan(8);
  });

  it("classe les zones de manière stable avec un tie-break par identifiant", () => {
    const first = { ...buildZone({ resident: 0.5 }), id: "zone-a" };
    const second = { ...buildZone({ resident: 0.5 }), id: "zone-b" };
    const results = estimateParisPressureRiskByZone({ ...snapshot, zones: [second, first] });
    expect(results.map((result) => result.zoneId)).toEqual(["zone-a", "zone-b"]);
  });
});
