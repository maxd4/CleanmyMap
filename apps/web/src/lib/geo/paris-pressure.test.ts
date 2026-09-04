import { describe, expect, it } from "vitest";
import { buildParisPressureSnapshot } from "./paris-pressure-normalization";

const sources = [
  {
    family: "resident_population" as const,
    publisher: "Insee",
    dataset: "Population en 2021 - IRIS",
    url: "https://www.insee.fr/fr/statistiques/8268806",
    license: "Licence ouverte Etalab",
    datasetVersion: "2021",
    observedAt: "2021-01-01",
    refreshedAt: "2026-09-04T00:00:00.000Z",
    geographicLevel: "iris" as const,
    status: "available" as const,
    notes: [],
  },
];

describe("Paris pressure normalization", () => {
  it("is deterministic, preserves unknowns, and normalizes population density", () => {
    const input = {
      snapshotId: "test",
      generatedAt: "2026-09-04T00:00:00.000Z",
      refreshedAt: "2026-09-04T00:00:00.000Z",
      sources,
      zones: [
        {
          id: "iris-b",
          label: "B",
          geographicLevel: "iris" as const,
          centroid: { latitude: 48.86, longitude: 2.35 },
          areaKm2: 0.1,
          residentPopulation: 1000,
          transportAnnualEntrants: null,
        },
        {
          id: "iris-a",
          label: "A",
          geographicLevel: "iris" as const,
          centroid: { latitude: 48.85, longitude: 2.34 },
          areaKm2: 0.2,
          residentPopulation: 1000,
          transportAnnualEntrants: 500,
        },
      ],
    };

    const first = buildParisPressureSnapshot(input);
    const second = buildParisPressureSnapshot(input);
    expect(first).toEqual(second);
    expect(first.zones.map((zone) => zone.id)).toEqual(["iris-a", "iris-b"]);
    expect(first.zones[0]?.signals.transport.normalized).toBe(0.5);
    expect(first.zones[0]?.humanPressure).toBeTypeOf("number");
    expect(first.zones[1]?.signals.transport.normalized).toBeNull();
  });

  it("does not turn arrondissement-level cleanliness into street-level precision", () => {
    const snapshot = buildParisPressureSnapshot({
      snapshotId: "test",
      generatedAt: "2026-09-04T00:00:00.000Z",
      refreshedAt: "2026-09-04T00:00:00.000Z",
      sources,
      zones: [
        {
          id: "iris-a",
          label: "A",
          geographicLevel: "iris",
          centroid: { latitude: 48.85, longitude: 2.34 },
          cleanlinessPrior: 0.7,
          cleanlinessResolution: "arrondissement",
          cleanlinessRawObservations: 12,
        },
      ],
    });
    expect(snapshot.zones[0]?.signals.cleanlinessPrior).toEqual({
      normalized: 0.7,
      rawObservations: 12,
      resolution: "arrondissement",
      measuredAt: null,
    });
  });
});
