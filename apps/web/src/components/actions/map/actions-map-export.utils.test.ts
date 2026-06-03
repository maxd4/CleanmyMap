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

  it("builds stable filenames for geojson and png exports", () => {
    const date = new Date("2026-06-02T10:00:00.000Z");

    expect(buildActionsMapGeoJsonFilename(date)).toContain("carte_actions_cmm_02-06-2026");
    expect(buildActionsMapGeoJsonFilename(date)).toContain(".geojson");
    expect(buildActionsMapPngFilename(date)).toContain(".png");
  });
});
