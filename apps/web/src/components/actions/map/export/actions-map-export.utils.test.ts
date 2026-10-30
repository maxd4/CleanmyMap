import { describe, expect, it } from "vitest";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
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
    expect(geojson.features[0]?.properties.geometry_label).toBe(
      "Repère géographique indicatif",
    );
    expect(geojson.features[0]?.properties.geometry_reality).toBe("contextual");
  });

  it("builds stable filenames for geojson and png exports", () => {
    const date = new Date("2026-06-02T10:00:00.000Z");

    expect(buildActionsMapGeoJsonFilename(date)).toContain("carte_actions_cmm_02-06-2026");
    expect(buildActionsMapGeoJsonFilename(date)).toContain(".geojson");
    expect(buildActionsMapPngFilename(date)).toContain(".png");
  });
});
