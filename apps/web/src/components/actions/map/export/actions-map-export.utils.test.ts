import { describe, expect, it } from "vitest";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import { resolveActionMapGeometryViewModel } from "../layers/actions-map-geometry.utils";
import { buildActionsCsv } from "@/lib/reports/csv";
import {
  buildActionsMapGeoJsonFilename,
  buildActionsMapGeoJsonString,
  buildActionsMapPngFilename,
  toActionsMapCsvRows,
} from "./actions-map-export.utils";

describe("actions map export utils", () => {
  it("maps filtered actions to the report csv schema", () => {
    const contract = buildActionDataContract({
      id: "action-export",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-15",
      locationLabel: "Boulevard test",
      latitude: 48.85,
      longitude: 2.34,
      wasteKg: 5.4,
      cigaretteButts: 42,
      volunteersCount: 6,
      durationMinutes: 75,
      notes: 'note "CSV"',
      manualDrawing: {
        kind: "polygon",
        coordinates: [
          [48.85, 2.34],
          [48.851, 2.341],
          [48.852, 2.342],
        ],
      },
    });

    const item = toActionMapItem(contract);
    const rows = toActionsMapCsvRows([item]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("action-export");
    expect(rows[0]?.manual_drawing_kind).toBe("polygon");
    expect(rows[0]?.manual_drawing_points).toBe(3);
    expect(rows[0]?.manual_drawing_geojson).toContain('"type":"Polygon"');

    const csv = buildActionsCsv(rows);
    expect(csv).toContain("action-export");
    expect(csv).toContain('note ""CSV""');
    expect(csv).toContain("manual_drawing_geojson");
  });

  it("builds a contextual geojson feature collection", () => {
    const contract = buildActionDataContract({
      id: "action-geojson",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-15",
      locationLabel: "Boulevard test",
      latitude: 48.85,
      longitude: 2.34,
      wasteKg: 5.4,
      cigaretteButts: 42,
      volunteersCount: 6,
      durationMinutes: 75,
      notes: "Export",
      manualDrawing: {
        kind: "polyline",
        coordinates: [
          [48.85, 2.34],
          [48.851, 2.341],
        ],
      },
    });

    const item = toActionMapItem(contract);
    const geojson = buildActionsMapGeoJsonString([item], {
      zoneQuery: "Paris 11",
      visibleCount: 1,
      loadedCount: 3,
      freshnessLabel: "Mis à jour",
      viewport: {
        center: [48.85, 2.34],
        zoom: 14,
        bounds: {
          south: 48.8,
          west: 2.3,
          north: 48.9,
          east: 2.4,
        },
      },
    });

    expect(geojson).toContain('"type": "FeatureCollection"');
    expect(geojson).toContain('"subject": "actions-map"');
    expect(geojson).toContain('"zoneQuery": "Paris 11"');
    expect(geojson).toContain('"type": "LineString"');
    expect(geojson).toContain('"id": "action-geojson"');
  });

  it("does not call a routed final geometry a manual drawing", () => {
    const contract = buildActionDataContract({
      id: "action-routed",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-15",
      locationLabel: "Boulevard test",
      latitude: 48.85,
      longitude: 2.34,
      wasteKg: 5.4,
      cigaretteButts: 42,
      volunteersCount: 6,
      durationMinutes: 75,
      notes: "Export",
      geometrySource: "routed",
      manualDrawing: {
        kind: "polyline",
        coordinates: [
          [48.85, 2.34],
          [48.851, 2.341],
        ],
      },
    });

    const item = toActionMapItem(contract);
    const geojson = JSON.parse(buildActionsMapGeoJsonString([item])) as {
      features: Array<{ properties: { has_manual_drawing: boolean } }>;
    };

    expect(geojson.features[0]?.properties.has_manual_drawing).toBe(false);
    expect(geojson.features[0]?.properties).toMatchObject({
      geometry_kind: "polyline",
      geometry_source: "routed",
      historical_geometry_kind: "polyline",
      historical_geometry_source: "routed",
    });
  });

  it("exports observed multi-traces with their provenance and label", () => {
    const contract = buildActionDataContract({
      id: "action-multitrace-export",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-15",
      locationLabel: "Parc test",
      latitude: 48.85,
      longitude: 2.34,
      geometrySource: "gpx_import",
      derivedGeometryKind: "multiline",
      derivedGeometryGeoJson: JSON.stringify({
        type: "MultiLineString",
        coordinates: [
          [[2.34, 48.85], [2.341, 48.851]],
          [[2.35, 48.86], [2.351, 48.861]],
        ],
      }),
      preparationData: {
        observedCoverage: {
          type: "MultiLineString",
          coordinates: [
            [[2.34, 48.85], [2.341, 48.851]],
            [[2.35, 48.86], [2.351, 48.861]],
          ],
          traceCount: 2,
          individualDistancesKm: [0.2, 0.3],
          sources: ["gpx_import"],
          coverageDistanceKm: null,
          coverageVersion: "observed-traces-v1",
        },
      },
    });

    const geojson = JSON.parse(
      buildActionsMapGeoJsonString([toActionMapItem(contract)]),
    ) as {
      features: Array<{
        geometry: { type: string; coordinates: unknown } | null;
        properties: Record<string, unknown>;
      }>;
    };

    expect(geojson.features[0]?.geometry?.type).toBe("MultiLineString");
    expect(geojson.features[0]?.geometry?.coordinates).toHaveLength(2);
    expect(geojson.features[0]?.properties.geometry_label).toBe(
      "Couverture observée multi-traces",
    );
    expect(geojson.features[0]?.properties.geometry_reality).toBe("observed");
    expect(geojson.features[0]?.properties).toMatchObject({
      geometry_kind: "multiline",
      geometry_source: "gpx_import",
      geometry_sources: ["gpx_import"],
      historical_geometry_kind: "multiline",
      historical_geometry_source: "gpx_import",
      observed_trace_count: 2,
    });
  });

  it("prioritizes preparation coverage over a historical polygon in both map and export", () => {
    const contract = buildActionDataContract({
      id: "action-coverage-over-polygon",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-15",
      locationLabel: "Parc historique",
      latitude: 48.85,
      longitude: 2.34,
      geometrySource: "reference",
      derivedGeometryKind: "polygon",
      derivedGeometryGeoJson: JSON.stringify({
        type: "Polygon",
        coordinates: [[[2.34, 48.85], [2.35, 48.85], [2.35, 48.86], [2.34, 48.85]]],
      }),
      manualDrawing: {
        kind: "polygon",
        coordinates: [[48.85, 2.34], [48.85, 2.35], [48.86, 2.35]],
      },
      preparationData: {
        observedCoverage: {
          type: "MultiLineString",
          coordinates: [
            [[2.34, 48.85], [2.341, 48.851]],
            [[2.35, 48.86], [2.351, 48.861]],
          ],
          traceCount: 2,
          individualDistancesKm: [0.2, 0.3],
          sources: ["gpx_import", "gps_tracking"],
          coverageDistanceKm: null,
          coverageVersion: "observed-traces-v1",
        },
      },
    });
    const item = toActionMapItem(contract);
    const mapGeometry = resolveActionMapGeometryViewModel(item);
    const geojson = JSON.parse(buildActionsMapGeoJsonString([item])) as {
      features: Array<{ geometry: { type: string; coordinates: unknown } | null; properties: Record<string, unknown> }>;
    };

    expect(mapGeometry.kind).toBe("multiline");
    expect(geojson.features[0]?.geometry).toEqual({
      type: "MultiLineString",
      coordinates: [
        [[2.34, 48.85], [2.341, 48.851]],
        [[2.35, 48.86], [2.351, 48.861]],
      ],
    });
    expect(geojson.features[0]?.properties).toMatchObject({
      geometry_kind: "multiline",
      geometry_source: null,
      geometry_sources: ["gpx_import", "gps_tracking"],
      geometry_reality: "observed",
      geometry_label: "Couverture observée multi-traces",
      observed_trace_count: 2,
      historical_geometry_kind: "polygon",
      historical_geometry_source: "reference",
    });
  });

  it.each([
    ["manual polyline", "manual" as const, "polyline" as const],
    ["planned network", "routed" as const, "polyline" as const],
  ])("prioritizes valid observed coverage over a %s", (_label, geometrySource, kind) => {
    const contract = buildActionDataContract({
      id: `action-${geometrySource}-coverage`,
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-15",
      locationLabel: "Parcours",
      latitude: 48.85,
      longitude: 2.34,
      geometrySource,
      derivedGeometryKind: kind,
      derivedGeometryGeoJson: JSON.stringify({ type: "LineString", coordinates: [[2.34, 48.85], [2.35, 48.86]] }),
      preparationData: {
        observedCoverage: {
          type: "MultiLineString",
          coordinates: [[[2.4, 48.9], [2.41, 48.91]], [[2.5, 48.92], [2.51, 48.93]]],
          traceCount: 2,
          individualDistancesKm: [1, 2],
          coverageDistanceKm: null,
          coverageVersion: "observed-traces-v1",
        },
      },
    });
    const geojson = JSON.parse(buildActionsMapGeoJsonString([toActionMapItem(contract)])) as {
      features: Array<{
        geometry: { type: string; coordinates: unknown } | null;
        properties: Record<string, unknown>;
      }>;
    };
    expect(geojson.features[0]?.geometry?.type).toBe("MultiLineString");
    expect(geojson.features[0]?.geometry?.coordinates).toEqual([
      [[2.4, 48.9], [2.41, 48.91]],
      [[2.5, 48.92], [2.51, 48.93]],
    ]);
    expect(geojson.features[0]?.properties).toMatchObject({
      geometry_kind: "multiline",
      geometry_source: null,
      historical_geometry_kind: kind,
      historical_geometry_source: geometrySource,
    });
  });

  it("resolves observed trace count from the primary GeoJSON when preparation metadata is absent", () => {
    const contract = buildActionDataContract({
      id: "action-primary-coverage",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-15",
      locationLabel: "Parc observé",
      latitude: 48.85,
      longitude: 2.34,
      geometrySource: "reference",
      derivedGeometryKind: "polygon",
      derivedGeometryGeoJson: JSON.stringify({
        type: "MultiLineString",
        coordinates: [
          [[2.34, 48.85], [2.341, 48.851]],
          [[2.35, 48.86], [2.351, 48.861]],
        ],
      }),
    });

    const geojson = JSON.parse(
      buildActionsMapGeoJsonString([toActionMapItem(contract)]),
    ) as { features: Array<{ properties: Record<string, unknown> }> };

    expect(geojson.features[0]?.properties).toMatchObject({
      geometry_kind: "multiline",
      geometry_source: null,
      geometry_sources: null,
      geometry_reality: "observed",
      observed_trace_count: 2,
      historical_geometry_kind: "multiline",
      historical_geometry_source: "reference",
    });
  });

  it("falls back when observed coverage is empty or malformed", () => {
    const contract = buildActionDataContract({
      id: "action-invalid-coverage",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-15",
      locationLabel: "Repère",
      latitude: 48.85,
      longitude: 2.34,
      geometrySource: "reference",
      derivedGeometryKind: "polygon",
      derivedGeometryGeoJson: JSON.stringify({
        type: "Polygon",
        coordinates: [[[2.34, 48.85], [2.35, 48.85], [2.34, 48.85]]],
      }),
      manualDrawing: {
        kind: "polygon",
        coordinates: [[48.85, 2.34], [48.85, 2.35], [48.86, 2.35]],
      },
      preparationData: {
        observedCoverage: {
          type: "MultiLineString",
          coordinates: [[[2.34, 95], [2.35, 95]]],
          traceCount: 1,
          individualDistancesKm: [1],
          coverageDistanceKm: null,
          coverageVersion: "observed-traces-v1",
        },
      },
    });
    const geojson = JSON.parse(buildActionsMapGeoJsonString([toActionMapItem(contract)])) as {
      features: Array<{ geometry: { type: string; coordinates: unknown } | null; properties: Record<string, unknown> }>;
    };
    expect(geojson.features[0]?.geometry?.type).toBe("Point");
    expect(geojson.features[0]?.properties).toMatchObject({
      geometry_kind: "point",
      geometry_source: "fallback_point",
      geometry_reality: "contextual",
      historical_geometry_kind: "polygon",
      historical_geometry_source: "reference",
    });
  });

  it("exports contextual reference geometry as a location point, never as coverage", () => {
    const contract = buildActionDataContract({
      id: "action-reference-export",
      type: "action",
      status: "approved",
      source: "actions",
      observedAt: "2026-04-15",
      locationLabel: "Jardin test",
      latitude: 48.85,
      longitude: 2.34,
      geometrySource: "reference",
      manualDrawing: {
        kind: "polygon",
        coordinates: [
          [48.85, 2.34],
          [48.851, 2.341],
          [48.852, 2.342],
        ],
      },
    });

    const geojson = JSON.parse(
      buildActionsMapGeoJsonString([toActionMapItem(contract)]),
    ) as {
      features: Array<{
        geometry: { type: string; coordinates: unknown } | null;
        properties: Record<string, unknown>;
      }>;
    };

    expect(geojson.features[0]?.geometry?.type).toBe("Point");
    expect(geojson.features[0]?.properties).toMatchObject({
      geometry_kind: "point",
      geometry_source: "fallback_point",
      geometry_label: "Repère géographique indicatif",
      geometry_reality: "contextual",
      historical_geometry_kind: "polygon",
      historical_geometry_source: "reference",
    });
  });

  it("builds stable filenames for geojson and png exports", () => {
    const date = new Date("2026-06-02T10:00:00.000Z");

    expect(buildActionsMapGeoJsonFilename(date)).toContain("carte_actions_cmm_02-06-2026");
    expect(buildActionsMapGeoJsonFilename(date)).toContain(".geojson");
    expect(buildActionsMapPngFilename(date)).toContain(".png");
  });
});
