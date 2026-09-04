import { describe, expect, it } from "vitest";
import {
  applyParisPressureToCandidates,
  findNearestParisPressureZone,
} from "./paris-pressure-lookup";
import type { ParisPressureSnapshot } from "./paris-pressure-contract";

const snapshot = {
  schemaVersion: "paris-pressure-v1",
  snapshotId: "test",
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
  sources: [],
  zones: [
    {
      id: "751010101",
      label: "Centre",
      geographicLevel: "iris",
      arrondissementCode: "75101",
      centroid: { latitude: 48.8566, longitude: 2.3522 },
      areaKm2: 0.1,
      signals: {
        residentPopulation: { population: 1000, densityPerKm2: 10000, normalized: 1 },
        transport: { stationCount: 1, annualEntrants: 100, normalized: 0.5 },
        tourism: { visitorAttendance: null, tourismPresenceProxy: 1, normalized: 0.4 },
        publicActivity: { authorisedTerraces: 3, openAirMarkets: 1, otherPlaces: 0, normalized: 0.2 },
        cleanlinessPrior: { normalized: null, rawObservations: null, resolution: null, measuredAt: null },
      },
      humanPressure: 0.8,
    },
  ],
} satisfies ParisPressureSnapshot;

describe("Paris pressure lookup", () => {
  it("is spatially bounded and deterministic", () => {
    expect(findNearestParisPressureZone({ latitude: 48.8566, longitude: 2.3522 }, snapshot)).toMatchObject({
      zoneId: "751010101",
      humanPressure: 0.8,
    });
    expect(findNearestParisPressureZone({ latitude: 45, longitude: 2 }, snapshot)).toBeNull();
  });

  it("applies a bounded structural boost without changing source data", () => {
    const candidates = applyParisPressureToCandidates(
      [{ id: "spot-1", latitude: 48.8566, longitude: 2.3522, score: 50, reason: "base" }],
      snapshot,
    );
    expect(candidates[0]?.score).toBeCloseTo(56.4);
    expect(candidates[0]?.reason).toContain("Pression humaine structurelle");
  });
});
