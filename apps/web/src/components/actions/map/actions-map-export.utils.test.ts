import { describe, expect, it } from "vitest";
import { buildActionDataContract, toActionMapItem } from "@/lib/actions/data-contract";
import { buildActionsCsv } from "@/lib/reports/csv";
import { toActionsMapCsvRows } from "./actions-map-export.utils";

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
});
