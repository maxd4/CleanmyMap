import { describe, expect, it } from "vitest";
import {
  buildActionsCsv,
  buildActionsCsvFilename,
  buildDateFloor,
  parsePositiveInteger,
  parseReportScopeKindParam,
  parseReportScopeValueParam,
  parseStatusParam,
  resolveReportQuery,
} from "./csv";

describe("report csv helpers", () => {
  it("parses status safely", () => {
    expect(parseStatusParam("approved")).toBe("approved");
    expect(parseStatusParam("rejected")).toBe("rejected");
    expect(parseStatusParam("all")).toBeNull();
    expect(parseStatusParam(null)).toBeNull();
  });

  it("parses positive integer in bounds", () => {
    expect(parsePositiveInteger("999", 1, 100, 10)).toBe(100);
    expect(parsePositiveInteger("-10", 1, 100, 10)).toBe(1);
    expect(parsePositiveInteger("abc", 1, 100, 10)).toBe(10);
  });

  it("resolves report query defaults", () => {
    const url = new URL("https://example.test/api/reports/actions.csv");
    expect(resolveReportQuery(url)).toEqual({
      status: null,
      limit: 250,
      days: 90,
      scopeKind: "global",
      scopeValue: null,
      association: null,
    });
  });

  it("parses scope kind and value safely", () => {
    expect(parseReportScopeKindParam("account")).toBe("account");
    expect(parseReportScopeKindParam("association")).toBe("association");
    expect(parseReportScopeKindParam("arrondissement")).toBe("arrondissement");
    expect(parseReportScopeKindParam("global")).toBe("global");
    expect(parseReportScopeKindParam("nope")).toBeNull();
    expect(parseReportScopeValueParam("  Alice  ")).toBe("Alice");
    expect(parseReportScopeValueParam("   ")).toBeNull();
  });

  it("builds csv and escapes cells", () => {
    const csv = buildActionsCsv([
      {
        id: "id-1",
        created_at: "2026-04-02T10:00:00Z",
        action_date: "2026-04-01",
        actor_name: 'Alice "Eco"',
        association_name: "Entreprise",
        location_label: "Rue, Paris",
        latitude: 48.8566,
        longitude: 2.3522,
        waste_kg: 12.5,
        cigarette_butts: 120,
        volunteers_count: 3,
        duration_minutes: 60,
        status: "pending",
        notes: "ligne 1\nligne 2",
        record_type: "action",
        source: "actions",
        observed_at: "2026-04-01",
        geometry_kind: "polygon",
        geometry_geojson: '{"type":"Polygon"}',
        geometry_confidence: 0.92,
        manual_drawing_kind: "polygon",
        manual_drawing_points: 3,
        manual_drawing_coordinates_json:
          "[[48.85,2.35],[48.851,2.351],[48.852,2.352]]",
        manual_drawing_geojson: '{"type":"Polygon"}',
      },
    ]);

    expect(csv).toContain('"Alice ""Eco"""');
    expect(csv).toContain("association_name");
    expect(csv).toContain("Entreprise");
    expect(csv).toContain('"Rue, Paris"');
    expect(csv).toContain('"ligne 1\nligne 2"');
    expect(csv).toContain("geometry_kind");
    expect(csv).toContain("geometry_confidence");
    expect(csv).toContain("manual_drawing_geojson");
    expect(csv).toContain('"{""type"":""Polygon""}"');
  });

  it("builds deterministic filename", () => {
    const filename = buildActionsCsvFilename(
      new Date("2026-04-02T15:10:00.000Z"),
    );
    expect(filename).toBe("export_actions_cmm_02-04-2026.csv");
  });

  it("builds date floor in YYYY-MM-DD", () => {
    const floor = buildDateFloor(7);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(floor)).toBe(true);
  });
});
