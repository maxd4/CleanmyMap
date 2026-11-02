import test from "node:test";
import assert from "node:assert/strict";
import { buildPilotSnapshot, splitLineByPilotIris } from "./refresh-paris-heatmap-pilot.mjs";

const square = (left, bottom, right, top) => ({
  type: "Polygon",
  coordinates: [[[left, bottom], [right, bottom], [right, top], [left, top], [left, bottom]]],
});

function zone(id, geometry, arrondissementCode = "75105") {
  return { id, arrondissementCode, geometry };
}

test("découpe une ligne à la frontière IRIS et conserve toute la longueur zonale", () => {
  const zones = [
    zone("a", square(2.34, 48.84, 2.35, 48.86)),
    zone("b", square(2.35, 48.84, 2.36, 48.86)),
  ];
  const parts = splitLineByPilotIris([48.85, 2.345], [48.85, 2.355], zones);
  assert.equal(parts.length, 2);
  assert.deepEqual(parts.map((part) => part.zoneId), ["a", "b"]);
  assert.deepEqual(parts.map((part) => part.start[1]), [2.345, 2.35]);
  assert.deepEqual(parts.map((part) => part.end[1]), [2.35, 2.355]);
  assert.ok(Math.abs(parts.reduce((sum, part) => sum + (part.end[1] - part.start[1]), 0) - 0.01) < 1e-12);
});

test("ne conserve pas une portion hors du périmètre et ne fabrique pas de géométrie", () => {
  const zones = [zone("a", square(2.34, 48.84, 2.35, 48.86))];
  const parts = splitLineByPilotIris([48.85, 2.345], [48.85, 2.355], zones);
  assert.equal(parts.length, 1);
  assert.deepEqual(parts[0], {
    start: [48.85, 2.345],
    end: [48.85, 2.35],
    zoneId: "a",
  });
});

test("prépare uniquement les 5e/6e, conserve la provenance OSM et versionne les identifiants", () => {
  const snapshot = buildPilotSnapshot({
    pilot: {
      schemaVersion: 1,
      snapshotId: "old",
      retrievedAt: "2026-11-02T00:00:00.000Z",
      license: "ODbL-1.0",
      source: { provider: "OSM", endpoint: "offline", selection: "bbox" },
      tiles: [[1]],
      ways: [
        { id: "osm-way", highway: "footway", name: "Test", footAccess: "type", sourceUrl: "osm", geometry: [[48.85, 2.345], [48.85, 2.355]], referenceZoneIds: ["legacy"] },
      ],
      pois: [{ id: "in", lat: 48.85, lon: 2.345, name: "Inside", kind: "bar" }, { id: "out", lat: 48.85, lon: 2.365, name: "Outside", kind: "bar" }],
    },
    pressure: {
      snapshotId: "pressure-test",
      generatedAt: "2026-09-05T00:00:00.000Z",
      refreshedAt: "2026-09-05T00:00:00.000Z",
      sources: [{ family: "transport", status: "partial", publisher: "RATP", dataset: "test", url: "offline", license: "test", datasetVersion: "2021", observedAt: "2021", refreshedAt: "2026-09-05T00:00:00.000Z", geographicLevel: "iris", notes: [] }],
      zones: [
        { ...zone("751050001", square(2.34, 48.84, 2.35, 48.86)), label: "5e" },
        { ...zone("751060001", square(2.35, 48.84, 2.36, 48.86), "75106"), label: "6e" },
        { ...zone("751070001", square(2.36, 48.84, 2.37, 48.86), "75107"), label: "7e" },
        { ...zone("751050002", { type: "Polygon", coordinates: [] }), label: "invalid" },
      ],
    },
  });
  assert.equal(snapshot.ways.length, 1);
  assert.deepEqual(snapshot.ways.map((way) => way.sourceWayId), ["osm-way"]);
  assert.ok(snapshot.ways.every((way) => way.id.includes("iris-clipped-v1")));
  assert.equal(snapshot.ways[0].referenceZoneIds[0], "751050001");
  assert.equal(snapshot.ways[0].referenceZoneIds.at(-1), "751060001");
  assert.equal(snapshot.ways[0].referenceZoneIds.filter((id) => id === "751050001").length > 0, true);
  assert.equal(snapshot.ways[0].referenceZoneIds.filter((id) => id === "751060001").length > 0, true);
  assert.deepEqual(snapshot.zoneReferences.map((reference) => reference.id), ["751050001", "751060001"]);
  assert.deepEqual(snapshot.pois.map((poi) => poi.id), ["in"]);
  assert.equal(snapshot.pilotBoundary.coverage.includes("partielle"), true);
  assert.equal(snapshot.pressureSnapshotId, "pressure-test");
  assert.equal(snapshot.pressureGeneratedAt, "2026-09-05T00:00:00.000Z");
  assert.equal(snapshot.pressureSources[0].publisher, "RATP");
  assert.equal(snapshot.pressureSources[0].status, "partial");
});
