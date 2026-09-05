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
    transportRows: [
      { latitude: 48.86, longitude: 2.36, trafic: 100 },
      // Hors du polygone mais à moins de 1,5 km : aucune approximation ne
      // doit être créée quand toutes les géométries présentes sont valides.
      { latitude: 48.871, longitude: 2.36, trafic: 100 },
    ],
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
  assert.equal(snapshot.snapshotId, "paris-iris-2024-pop-2021-r2-polygon");
  assert.equal(snapshot.coverage.geometryZoneCount, 2);
  assert.equal(snapshot.coverage.geometryComplete, false, "la complétude exige aussi le nombre IRIS attendu");
  assert.equal(snapshot.coverage.invalidGeometryZoneCount, 0);
});

function irisRow(id, centroid, geometry) {
  return {
    dep: "75",
    code_iris: id,
    nom_iris: id,
    insee_com: "75101",
    geo_point_2d: centroid,
    geo_shape: geometry === undefined ? null : { geometry },
  };
}

test("ne rattache pas une source éloignée et ne fabrique un fallback que pour une géométrie manquante", () => {
  const square = {
    type: "Polygon",
    coordinates: [[[2.35, 48.85], [2.36, 48.85], [2.36, 48.86], [2.35, 48.86], [2.35, 48.85]]],
  };
  const snapshot = buildSnapshot({
    iris: { results: [
      irisRow("751010101", { lat: 48.855, lon: 2.355 }, square),
      irisRow("751010102", { lat: 48.855, lon: 2.38 }, undefined),
    ] },
    populationRows: [],
    transportRows: [
      { latitude: 48.861, longitude: 2.355, trafic: 100 },
      { latitude: 48.855, longitude: 2.38, trafic: 100 },
      { latitude: 48.90, longitude: 2.38, trafic: 100 },
    ],
    refreshedAt: "2026-09-05T00:00:00.000Z",
  });
  const completeZone = snapshot.zones.find((zone) => zone.id === "751010101");
  const missingZone = snapshot.zones.find((zone) => zone.id === "751010102");
  assert.equal(completeZone?.signals.transport.stationCount, null);
  assert.equal(missingZone?.signals.transport.stationCount, 1);
  assert.equal(missingZone?.spatialJoin?.nearestCentroidFallbackMatches, 1);
  assert.equal(snapshot.coverage.missingGeometryZoneCount, 1);
  assert.equal(snapshot.coverage.geometryComplete, false);
});

test("invalide les géométries mal formées et rend la couverture non complète", () => {
  const snapshot = buildSnapshot({
    iris: { results: [irisRow("751010101", { lat: 48.855, lon: 2.355 }, {
      type: "Polygon",
      coordinates: [[[2.35, 48.85], [Number.NaN, 48.85], [2.36, 48.86]]],
    })] },
    populationRows: [],
    refreshedAt: "2026-09-05T00:00:00.000Z",
  });
  assert.equal(snapshot.zones[0]?.geometry, null);
  assert.equal(snapshot.zones[0]?.areaKm2, null);
  assert.equal(snapshot.coverage.geometryZoneCount, 0);
  assert.equal(snapshot.coverage.invalidGeometryZoneCount, 1);
  assert.equal(snapshot.coverage.geometryComplete, false);
  assert.equal(snapshot.coverage.complete, false);
});

test("est déterministe à entrées et horodatage identiques", () => {
  const input = {
    iris: { results: [irisRow("751010101", { lat: 48.855, lon: 2.355 }, {
      type: "MultiPolygon",
      coordinates: [[[[2.35, 48.85], [2.36, 48.85], [2.36, 48.86], [2.35, 48.86], [2.35, 48.85]]]],
    })] },
    populationRows: [{ iris: "751010101", population: 100 }],
    refreshedAt: "2026-09-05T00:00:00.000Z",
  };
  assert.deepEqual(buildSnapshot(input), buildSnapshot(input));
});
