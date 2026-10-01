import type { ParisPressureSnapshot } from "../paris-pressure-contract";

export const parisPressureSnapshot = {
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
    expectedZoneCount: 1,
    geometryZoneCount: 0,
    geometryComplete: false,
    missingGeometryZoneCount: 1,
    invalidGeometryZoneCount: 0,
    complete: false,
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
      geometry: null,
      areaKm2: 0.1,
      spatialJoin: { pointInPolygonMatches: 0, nearestCentroidFallbackMatches: 0 },
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
