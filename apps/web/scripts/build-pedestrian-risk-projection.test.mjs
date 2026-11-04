import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDocument,
  publishProjection,
  serializeProjectionDocument,
} from "./build-pedestrian-risk-projection.mjs";

function pressureSnapshot() {
  const zone = (id, west, east) => ({
    id,
    label: id,
    geographicLevel: "iris",
    arrondissementCode: "75105",
    centroid: { latitude: 48.855, longitude: (west + east) / 2 },
    areaKm2: 0.1,
    geometry: { type: "Polygon", coordinates: [[[west, 48.85], [east, 48.85], [east, 48.86], [west, 48.86], [west, 48.85]]] },
    signals: {
      residentPopulation: { population: 100, densityPerKm2: 1000, normalized: 0.5 },
      transport: { stationCount: 1, annualEntrants: 10, normalized: 0.2 },
      tourism: { visitorAttendance: null, tourismPresenceProxy: 0.1, normalized: 0.1 },
      publicActivity: { authorisedTerraces: 1, openAirMarkets: 0, otherPlaces: 0, normalized: 0.1 },
      cleanlinessPrior: { normalized: 0.2, rawObservations: 1, resolution: "iris", measuredAt: null },
    },
    humanPressure: 0.3,
  });
  return {
    schemaVersion: "paris-pressure-v1",
    snapshotId: "pressure-test",
    generatedAt: "2026-11-04T00:00:00.000Z",
    refreshedAt: "2026-11-04T00:00:00.000Z",
    geographicLevel: "iris",
    coverage: { country: "FR", department: "75", commune: "75056", zoneCount: 2, complete: true, notes: [] },
    sources: [],
    zones: [zone("751050101", 2.34, 2.35), zone("751050102", 2.35, 2.36)],
  };
}

function networkSource() {
  return {
    schemaVersion: 1,
    networkKey: "paris-pantheon-jardin-des-plantes",
    importerVersion: "pedestrian-network-v2",
    retrievedAt: "2026-11-04T00:00:00.000Z",
    endpoint: "https://api.openstreetmap.org/api/0.6/map",
    sha256: "b".repeat(64),
    tiles: [],
    bounds: { south: 48.85, west: 2.34, north: 48.86, east: 2.36 },
    ways: [{ id: "10", tags: { highway: "footway" }, nodes: [
      { id: "1", latitude: 48.855, longitude: 2.345 },
      { id: "2", latitude: 48.855, longitude: 2.355 },
    ] }],
  };
}

function serviceabilitySnapshot() {
  return {
    schemaVersion: "paris-municipal-cleaning-serviceability-v2",
    predictionModelVersion: "municipal-cleaning-serviceability-v2",
    snapshotId: "serviceability-test",
    generatedAt: "2026-11-04T00:00:00.000Z",
    refreshedAt: "2026-11-04T00:00:00.000Z",
    geographicLevel: "iris",
    coverage: { country: "FR", department: "75", commune: "75056", zoneCount: 0, complete: false, status: "partial", notes: [] },
    sources: [],
    zones: [],
  };
}

test("risk projection serialization is deterministic", () => {
  const args = [networkSource(), pressureSnapshot(), serviceabilitySnapshot(), "2026-11-04T12:00:00.000Z"];
  const left = serializeProjectionDocument(buildDocument(...args));
  const right = serializeProjectionDocument(buildDocument(...args));
  assert.deepEqual(left, right);
  assert.equal(left.segments.length, 4);
  assert.equal(left.segments[0].geometry.type, "LineString");
});

test("publication uses one atomic RPC and no table writes", async () => {
  const payload = serializeProjectionDocument(buildDocument(networkSource(), pressureSnapshot(), serviceabilitySnapshot(), "2026-11-04T12:00:00.000Z"));
  const calls = [];
  const id = await publishProjection({
    rpc(name, args) {
      calls.push({ name, args });
      return Promise.resolve({ data: "projection-version-id", error: null });
    },
  }, payload);
  assert.equal(id, "projection-version-id");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "publish_pedestrian_risk_projection");
  assert.equal(calls[0].args.p_projection.segments.length, 4);
});
