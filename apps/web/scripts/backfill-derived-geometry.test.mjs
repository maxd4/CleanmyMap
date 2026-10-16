import assert from "node:assert/strict";
import test from "node:test";

import { classifyGeometryRow, parseDrawingFromGeoJson } from "./backfill-derived-geometry.mjs";

function geojson(type, coordinates) {
  return JSON.stringify({ type, coordinates });
}

function row(overrides = {}) {
  return {
    id: "geometry-fixture",
    location_label: null,
    latitude: null,
    longitude: null,
    notes: null,
    preparation_data: null,
    derived_geometry_kind: null,
    derived_geometry_geojson: null,
    geometry_confidence: null,
    geometry_source: null,
    ...overrides,
  };
}

test("distinguishes observed GeoJSON LineString and Polygon types with strict comparisons", () => {
  const line = parseDrawingFromGeoJson(geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]));
  const polygon = parseDrawingFromGeoJson(geojson("Polygon", [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.8]]]));
  assert.equal(line?.kind, "polyline");
  assert.deepEqual(line?.coordinates, [[48.8, 2.3], [48.9, 2.4]]);
  assert.equal(polygon?.kind, "polygon");
  assert.equal(polygon?.coordinates.length, 3);
  assert.notDeepEqual(polygon?.coordinates[0], polygon?.coordinates.at(-1));
});

test("uses kindHint only when the observed GeoJSON type is absent", () => {
  const hintedLine = geojson(undefined, [[2.3, 48.8], [2.4, 48.9]]).replace("undefined", "null");
  const line = parseDrawingFromGeoJson(hintedLine, "polyline");
  const noHint = parseDrawingFromGeoJson(hintedLine);
  assert.equal(line?.kind, "polyline");
  assert.equal(noHint, null);

  const action = classifyGeometryRow(row({
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: hintedLine,
    geometry_source: "gpx_import",
  }));
  assert.equal(action.classification, "PRESERVE");
});

test("rejects malformed, invalid and unsupported geometries without proposing updates", () => {
  assert.equal(parseDrawingFromGeoJson("not-json"), null);
  assert.equal(parseDrawingFromGeoJson(geojson("Point", [2.3, 48.8])), null);
  assert.equal(parseDrawingFromGeoJson(geojson("LineString", [[2.3, 48.8], ["bad", 48.9]])), null);
  const invalid = classifyGeometryRow(row({
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: geojson("LineString", [[2.3, 48.8]]),
    geometry_source: "gpx_import",
  }));
  assert.equal(invalid.classification, "INVALID");
});
