import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBackfillPlan,
  classifyGeometryRow,
  parseDrawingFromGeoJson,
} from "./backfill-derived-geometry.mjs";
import { buildEllipsePolygon } from "../src/lib/actions/geometry/geometry-core.ts";

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

test("gives an explicit GeoJSON type priority over a contradictory hint", () => {
  const line = parseDrawingFromGeoJson(
    geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]),
    "polygon",
  );
  const polygon = parseDrawingFromGeoJson(
    geojson("Polygon", [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.8]]]),
    "polyline",
  );

  assert.equal(line?.kind, "polyline");
  assert.equal(polygon?.kind, "polygon");
});

test("uses kindHint only when the observed GeoJSON type is absent", () => {
  const hintedLine = geojson(undefined, [[2.3, 48.8], [2.4, 48.9]]).replace("undefined", "null");
  const line = parseDrawingFromGeoJson(hintedLine, "polyline");
  const noHint = parseDrawingFromGeoJson(hintedLine);
  assert.equal(line?.kind, "polyline");
  assert.equal(noHint, null);
  assert.equal(parseDrawingFromGeoJson(hintedLine, "point"), null);
  assert.equal(parseDrawingFromGeoJson(hintedLine, "multiline"), null);

  const action = classifyGeometryRow(row({
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: hintedLine,
    geometry_source: "gpx_import",
  }));
  assert.equal(action.classification, "PRESERVE");
});

test("rejects an unsupported explicit GeoJSON type even with a valid hint", () => {
  assert.equal(parseDrawingFromGeoJson(geojson("MultiLineString", [[2.3, 48.8]]), "polyline"), null);
});

test("classifies contradictory persisted geometry metadata as INVALID without an update", () => {
  const invalid = classifyGeometryRow(row({
    derived_geometry_kind: "polygon",
    derived_geometry_geojson: geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]),
    geometry_source: "gpx_import",
  }));
  const invalidPoint = classifyGeometryRow(row({
    latitude: 48.8,
    longitude: 2.3,
    derived_geometry_kind: "point",
    derived_geometry_geojson: geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]),
    geometry_source: "manual",
  }));

  assert.equal(invalid.classification, "INVALID");
  assert.equal(invalid.update, null);
  assert.equal(invalidPoint.classification, "INVALID");
  assert.equal(invalidPoint.update, null);
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

test("normalizes historical numeric strings but rejects null coordinates", () => {
  const historical = parseDrawingFromGeoJson(
    geojson("LineString", [["2.3", "48.8"], ["2.4", "48.9"]]),
  );

  assert.deepEqual(historical?.coordinates, [[48.8, 2.3], [48.9, 2.4]]);
  assert.equal(parseDrawingFromGeoJson(geojson("LineString", [[null, 48.8], [2.4, 48.9]])), null);
  assert.equal(parseDrawingFromGeoJson(geojson("LineString", [["", 48.8], [2.4, 48.9]])), null);
});

test("keeps polygon output stable whether the GeoJSON ring repeats its first point", () => {
  const open = parseDrawingFromGeoJson(
    geojson("Polygon", [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9]]]),
  );
  const closed = parseDrawingFromGeoJson(
    geojson("Polygon", [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9], [2.3, 48.8]]]),
  );

  assert.deepEqual(closed, open);
});

test("matches internal latitude/longitude route coordinates after explicit numeric normalization", () => {
  const routeGeometry = {
    mode: "network",
    provider: "osrm",
    estimated: false,
    coordinates: [["48.8", "2.3"], ["48.9", "2.4"]],
  };
  const result = classifyGeometryRow(row({
    derived_geometry_geojson: geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]),
    preparation_data: JSON.stringify({
      operationalRoute: { routes: [{ geometry: routeGeometry }] },
    }),
  }));

  assert.equal(result.classification, "SAFE_UPDATE");
  assert.equal(result.correction, "restore_network_route_provenance");
});

test("does not create a fallback point from null or out-of-range coordinates", () => {
  const nullPoint = classifyGeometryRow(row({ latitude: null, longitude: null }), "signalement");
  const invalidPoint = classifyGeometryRow(row({ latitude: 91, longitude: 2.3 }), "signalement");

  assert.equal(nullPoint.classification, "AMBIGUOUS");
  assert.equal(invalidPoint.classification, "AMBIGUOUS");
});

test("restores historical drawings from notes with a minimal deterministic payload", () => {
  const drawing = geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]);
  const result = classifyGeometryRow(row({
    notes: `old note\n[cmm-meta]{"departureLocationLabel":"Paris"}\n[DRAWING_GEOJSON]${JSON.stringify({ kind: "polyline", coordinates: [[48.8, 2.3], [48.9, 2.4]] })}`,
  }));

  assert.equal(result.classification, "SAFE_UPDATE");
  assert.equal(result.correction, "restore_manual_drawing_provenance");
  assert.deepEqual(result.update, {
    geometry_source: "manual",
    geometry_confidence: 1,
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: drawing,
  });
});

test("classifies point provenance and preserves every supported drawing source", () => {
  const sources = [
    ["gpx_import", "polyline"],
    ["gps_tracking", "polyline"],
    ["routed", "polyline"],
    ["estimated_route", "polyline"],
    ["estimated_area", "polygon"],
    ["manual", "polyline"],
    ["reference", "polygon"],
  ];
  for (const [source, kind] of sources) {
    const coordinates = kind === "polygon"
      ? [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9]]]
      : [[2.3, 48.8], [2.4, 48.9]];
    const result = classifyGeometryRow(row({
      derived_geometry_kind: kind,
      derived_geometry_geojson: geojson(kind === "polygon" ? "Polygon" : "LineString", coordinates),
      geometry_source: source,
    }));
    assert.equal(result.classification, "PRESERVE", source);
  }

  const point = classifyGeometryRow(row({
    latitude: "48.8",
    longitude: "2.3",
    derived_geometry_kind: "point",
    geometry_source: "fallback_point",
  }));
  assert.equal(point.classification, "PRESERVE");
  assert.equal(classifyGeometryRow(row({ geometry_source: "invented_source" })).classification, "AMBIGUOUS");
});

test("rejects source and geometry-kind inconsistencies without changing the row", () => {
  const inconsistent = classifyGeometryRow(row({
    derived_geometry_kind: "polygon",
    derived_geometry_geojson: geojson("Polygon", [[[2.3, 48.8], [2.4, 48.8], [2.4, 48.9]]]),
    geometry_source: "routed",
  }));
  const unknown = classifyGeometryRow(row({
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]),
    geometry_source: "legacy_import",
  }));
  assert.equal(inconsistent.classification, "INVALID");
  assert.equal(inconsistent.update, null);
  assert.equal(unknown.classification, "AMBIGUOUS");
  assert.equal(unknown.update, null);
});

test("recognizes matching routes and leaves different routes ambiguous", () => {
  const route = { mode: "fallback", provider: "none", estimated: false, coordinates: [[48.8, 2.3], [48.9, 2.4]] };
  const matching = classifyGeometryRow(row({
    derived_geometry_geojson: geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]),
    preparation_data: { actualRoute: { routes: [{ geometry: route }] } },
  }));
  const different = classifyGeometryRow(row({
    derived_geometry_geojson: geojson("LineString", [[2.3, 48.8], [2.5, 49]]),
    preparation_data: { actualRoute: { routes: [{ geometry: route }] } },
  }));
  assert.equal(matching.classification, "SAFE_UPDATE");
  assert.equal(matching.correction, "restore_geodesic_fallback_provenance");
  assert.equal(matching.update.geometry_source, "estimated_route");
  assert.equal(different.classification, "AMBIGUOUS");
});

test("recognizes a demonstrated legacy ellipse but never infers one from a near miss", () => {
  const ellipse = buildEllipsePolygon({ latitude: 48.8, longitude: 2.3 }, 85, 55);
  const demonstrated = classifyGeometryRow(row({
    latitude: 48.8,
    longitude: 2.3,
    location_label: "Rue de Rivoli, Paris",
    derived_geometry_geojson: geojson("Polygon", [ellipse.coordinates.map(([lat, lng]) => [lng, lat])]),
  }));
  const nearMiss = classifyGeometryRow(row({
    latitude: 48.8,
    longitude: 2.3,
    location_label: "Rue de Rivoli, Paris",
    derived_geometry_geojson: geojson("Polygon", [ellipse.coordinates.map(([lat, lng]) => [lng + 0.0001, lat])]),
  }));
  assert.equal(demonstrated.classification, "SAFE_UPDATE");
  assert.equal(demonstrated.correction, "classify_legacy_ellipse_85x55m_as_estimated_area");
  assert.deepEqual(demonstrated.update, { geometry_source: "estimated_area", geometry_confidence: 0.52 });
  assert.equal(nearMiss.classification, "AMBIGUOUS");
  assert.equal(nearMiss.update, null);
});

test("keeps compliant drawings unchanged and classification idempotent", () => {
  const compliant = row({
    derived_geometry_kind: "polyline",
    derived_geometry_geojson: geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]),
    geometry_source: "manual",
  });
  const first = classifyGeometryRow(compliant);
  const second = classifyGeometryRow(compliant);
  assert.deepEqual(second, first);
  assert.equal(first.classification, "PRESERVE");
  assert.equal(first.update, null);
});

test("isolates malformed geometry while retaining valid plan decisions", () => {
  const plan = buildBackfillPlan({
    actions: [
      row({ id: "invalid", derived_geometry_geojson: "{broken" }),
      row({
        id: "route",
        derived_geometry_geojson: geojson("LineString", [[2.3, 48.8], [2.4, 48.9]]),
        preparation_data: { operationalRoute: { routes: [{ geometry: { mode: "network", provider: "osrm", estimated: false, coordinates: [[48.8, 2.3], [48.9, 2.4]] } }] } },
      }),
    ],
    signalements: [{ ...row({ id: "point" }), latitude: 48.8, longitude: 2.3 }],
  });
  assert.equal(plan.decisions.find((decision) => decision.id === "invalid").classification, "INVALID");
  assert.equal(plan.decisions.find((decision) => decision.id === "route").classification, "SAFE_UPDATE");
  assert.deepEqual(plan.signalementUpdates, [{
    id: "point",
    derived_geometry_kind: "point",
    derived_geometry_geojson: null,
    geometry_confidence: 0.24,
    geometry_source: "fallback_point",
  }]);
  assert.equal(plan.report.totalInspected, 3);
});
