import test from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot } from "./refresh-paris-pressure-snapshot.mjs";

test("buildSnapshot rattache les points au polygone IRIS et soustrait les trous", () => {
  const snapshot = buildSnapshot({
    iris: {
      results: [
        {
          dep: "75",
          code_iris: "751010101",
          nom_iris: "A",
          insee_com: "75101",
          geo_point_2d: { lat: 48.855, lon: 2.36 },
          geo_shape: { geometry: {
            type: "Polygon",
            coordinates: [[[2.35, 48.85], [2.37, 48.85], [2.37, 48.87], [2.35, 48.87], [2.35, 48.85]]],
          } },
        },
        {
          dep: "75",
          code_iris: "751010102",
          nom_iris: "B",
          insee_com: "75101",
          geo_point_2d: { lat: 48.8566, lon: 2.3522 },
          geo_shape: { geometry: {
            type: "Polygon",
            coordinates: [[[2.34, 48.84], [2.35, 48.84], [2.35, 48.85], [2.34, 48.85], [2.34, 48.84]]],
          } },
        },
      ],
    },
    populationRows: [
      { iris: "751010101", population: 100 },
      { iris: "751010102", population: 100 },
    ],
    transportRows: [{ latitude: 48.86, longitude: 2.36, trafic: 100 }],
    refreshedAt: "2026-09-05T00:00:00.000Z",
  });

  const zoneA = snapshot.zones.find((zone) => zone.id === "751010101");
  const zoneB = snapshot.zones.find((zone) => zone.id === "751010102");
  assert.equal(zoneA?.signals.transport.stationCount, 1);
  assert.equal(zoneB?.signals.transport.stationCount, null);
  assert.equal(zoneA?.spatialJoin?.pointInPolygonMatches, 1);
  assert.equal(zoneA?.spatialJoin?.nearestCentroidFallbackMatches, 0);
  assert.ok((zoneA?.areaKm2 ?? 0) > 0);
  assert.ok(zoneA?.geometry);
  assert.match(snapshot.coverage.notes.join(" "), /polygone IRIS/);
});
