import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ARCHIVE_TABLES,
  getArchiveTableNames,
} from "../../../scripts/export-supabase-archive.mjs";
import {
  BACKFILL_TARGETS,
  buildBackfillPlan,
  classifyGeometryRow,
} from "../../../scripts/backfill-derived-geometry.mjs";
import { buildEllipsePolygon } from "../actions/geometry/geometry-core";
import {
  assertDestructiveTableAllowed,
  buildCleanupReport,
  CLEANUP_TARGETS,
  LEGACY_ARCHIVE_TABLE,
  parseArgs,
} from "../../../scripts/db-cleanup-suspect-runtime-records.mjs";

describe("legacy spots maintenance boundaries", () => {
  it("does not read removed geometry columns from the legacy spots schema", () => {
    const migration = readFileSync(
      new URL(
        "../../../supabase/migrations/20260825000000_migrate_legacy_spots_to_trash_spotter.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(migration).toContain(
      "  legacy.latitude,\n  legacy.longitude,\n  null,\n  null,\n  null,\n  null,\n  legacy.status,",
    );
    expect(migration).not.toMatch(
      /legacy\.(derived_geometry_kind|derived_geometry_geojson|geometry_confidence|geometry_source)/,
    );
  });

  it("archives canonical signalements, provenance and the legacy table without dropping other tables", () => {
    const names = getArchiveTableNames();

    expect(names).toEqual(expect.arrayContaining([
      "trash_spotter_spots",
      "legacy_spot_migrations",
      "spots",
      "actions",
      "community_events",
      "progression_events",
    ]));
    expect(names).toHaveLength(19);
    expect(ARCHIVE_TABLES.find((entry) => entry.table === "spots")).toMatchObject({
      role: "legacy_archive",
    });
    expect(ARCHIVE_TABLES.find((entry) => entry.table === "legacy_spot_migrations")).toMatchObject({
      role: "provenance",
    });
  });

  it("targets only actions and canonical signalements for geometry backfill", () => {
    expect(BACKFILL_TARGETS.map((target) => target.table)).toEqual([
      "actions",
      "trash_spotter_spots",
    ]);

    const { actionUpdates, signalementUpdates, report } = buildBackfillPlan({
      actions: [
        {
          id: "action-1",
          location_label: "Parc",
          latitude: 48.85,
          longitude: 2.35,
          notes: null,
          derived_geometry_kind: null,
          derived_geometry_geojson: null,
          geometry_confidence: null,
          geometry_source: null,
        },
      ],
      signalements: [
        {
          id: "signalement-1",
          label: "Rue de la Paix",
          latitude: 48.86,
          longitude: 2.36,
          notes: null,
          derived_geometry_kind: null,
          derived_geometry_geojson: null,
          geometry_confidence: null,
          geometry_source: null,
        },
      ],
      recomputeAll: false,
    });

    expect(actionUpdates).toHaveLength(0);
    expect(signalementUpdates).toHaveLength(1);
    expect(signalementUpdates[0]).toMatchObject({
      derived_geometry_kind: "point",
      geometry_source: "fallback_point",
    });
    expect(report).toMatchObject({
      totalInspected: 2,
      classifications: {
        SAFE_UPDATE: 1,
        AMBIGUOUS: 1,
      },
    });
    expect(report.samples.SAFE_UPDATE[0]).toMatchObject({
      table: "trash_spotter_spots",
      id: "signalement-1",
      correction: "restore_signalement_point",
    });
  });

  it("does not infer an action provenance from confidence alone", () => {
    const decision = classifyGeometryRow({
      id: "confidence-only",
      location_label: "Parc",
      latitude: 48.85,
      longitude: 2.35,
      derived_geometry_kind: "polyline",
      derived_geometry_geojson: JSON.stringify({
        type: "LineString",
        coordinates: [[2.35, 48.85], [2.36, 48.86]],
      }),
      geometry_confidence: 0.99,
      geometry_source: null,
    });

    expect(decision).toMatchObject({
      classification: "AMBIGUOUS",
      currentSource: "missing",
      correction: "none",
    });
  });

  it("preserves valid strong sources and classifies demonstrated legacy ellipses", () => {
    const line = JSON.stringify({
      type: "LineString",
      coordinates: [[2.35, 48.85], [2.36, 48.86]],
    });
    for (const source of ["gpx_import", "gps_tracking", "manual"] as const) {
      expect(classifyGeometryRow({
        id: source,
        location_label: "Parc",
        derived_geometry_kind: "polyline",
        derived_geometry_geojson: line,
        geometry_confidence: null,
        geometry_source: source,
      })).toMatchObject({ classification: "PRESERVE" });
    }

    const ellipse = buildEllipsePolygon(
      { latitude: 48.85, longitude: 2.35 },
      110,
      72,
    );
    const ellipseGeoJson = JSON.stringify({
      type: "Polygon",
      coordinates: [ellipse.coordinates.map(([lat, lng]) => [lng, lat])],
    });
    expect(classifyGeometryRow({
      id: "legacy-ellipse",
      location_label: "Paris",
      latitude: 48.85,
      longitude: 2.35,
      derived_geometry_kind: "polygon",
      derived_geometry_geojson: ellipseGeoJson,
      geometry_confidence: 0.44,
      geometry_source: null,
    })).toMatchObject({
      classification: "SAFE_UPDATE",
      correction: "classify_legacy_ellipse_110x72m_as_estimated_area",
    });
  });

  it("uses persisted route metadata to distinguish network and geodesic fallback", () => {
    const geometry = {
      coordinates: [[48.85, 2.35], [48.86, 2.36]],
      mode: "network",
      provider: "fossgis-osrm",
    };
    const base = {
      id: "legacy-route",
      location_label: "Parc",
      derived_geometry_kind: "polyline",
      derived_geometry_geojson: JSON.stringify({
        type: "LineString",
        coordinates: [[2.35, 48.85], [2.36, 48.86]],
      }),
      geometry_confidence: 0.78,
      geometry_source: null,
    };
    expect(classifyGeometryRow({
      ...base,
      preparation_data: JSON.stringify({
        operationalRoute: { routes: [{ geometry }] },
      }),
    })).toMatchObject({
      classification: "SAFE_UPDATE",
      correction: "restore_network_route_provenance",
    });

    expect(classifyGeometryRow({
      ...base,
      preparation_data: JSON.stringify({
        operationalRoute: {
          routes: [{ geometry: { ...geometry, mode: "fallback", provider: "none" } }],
        },
      }),
    })).toMatchObject({
      classification: "SAFE_UPDATE",
      correction: "restore_geodesic_fallback_provenance",
    });

    expect(classifyGeometryRow({
      ...base,
      preparation_data: JSON.stringify({
        routeGeometryMode: "network",
        routeGeometryProvider: "osrm",
        operationalRoute: {
          routes: [{ geometry: { ...geometry, estimated: true } }],
        },
      }),
    })).toMatchObject({
      classification: "SAFE_UPDATE",
      correction: "classify_synthetic_legacy_route_as_estimated_route",
    });
  });

  it("does not infer route provenance from mode/provider metadata alone", () => {
    const decision = classifyGeometryRow({
      id: "metadata-only-route",
      location_label: "Parc",
      derived_geometry_kind: "polyline",
      derived_geometry_geojson: JSON.stringify({
        type: "LineString",
        coordinates: [[2.35, 48.85], [2.36, 48.86]],
      }),
      geometry_confidence: 0.78,
      geometry_source: null,
      preparation_data: JSON.stringify({
        routeGeometryMode: "network",
        routeGeometryProvider: "osrm",
      }),
    });

    expect(decision).toMatchObject({
      classification: "AMBIGUOUS",
      correction: "none",
    });
  });

  it("keeps real polygons, restores a signalement point and is idempotent", () => {
    const polygon = {
      type: "Polygon",
      coordinates: [[[2.35, 48.85], [2.36, 48.85], [2.36, 48.86]]],
    };
    const realPolygon = {
      id: "real-polygon",
      location_label: "Parc de référence",
      derived_geometry_kind: "polygon",
      derived_geometry_geojson: JSON.stringify(polygon),
      geometry_confidence: 0.72,
      geometry_source: "reference",
    };
    expect(classifyGeometryRow(realPolygon)).toMatchObject({
      classification: "PRESERVE",
    });

    const signalement = {
      id: "spot-1",
      label: "Rue",
      spot_type: "spot",
      latitude: 48.85,
      longitude: 2.35,
      derived_geometry_kind: null,
      derived_geometry_geojson: null,
      geometry_confidence: null,
      geometry_source: null,
    };
    const first = classifyGeometryRow(signalement, "signalement");
    expect(first).toMatchObject({
      classification: "SAFE_UPDATE",
      correction: "restore_signalement_point",
    });
    expect(first.update).toBeTruthy();
    const second = classifyGeometryRow(
      { ...signalement, ...(first.update ?? {}) },
      "signalement",
    );
    expect(second).toMatchObject({ classification: "PRESERVE" });
  });

  it("audits canonical signalements and legacy rows with the same geographic rules", () => {
    const report = buildCleanupReport({
      actions: [],
      signalements: [
        {
          id: "canonical-invalid",
          created_at: "2026-08-25T10:00:00Z",
          status: "validated",
          label: "Lieu canonique",
          latitude: 91,
          longitude: 2,
          created_by_clerk_id: "user-1",
        },
      ],
      legacySpots: [
        {
          id: "legacy-invalid",
          created_at: "2026-08-25T10:00:00Z",
          status: "validated",
          label: "Lieu legacy",
          latitude: 91,
          longitude: 2,
          created_by_clerk_id: "user-1",
        },
      ],
      mode: "dry-run",
    });

    expect(report.mode).toBe("dry-run");
    expect(report.scanned).toEqual({
      actions: 0,
      trash_spotter_spots: 1,
      spots_legacy: 1,
    });
    expect(report.candidates).toEqual({
      actions: 0,
      trash_spotter_spots: 1,
      spots_legacy: 1,
    });
    expect(report.signalementCandidates[0]?.reasons).toContain(
      "invalid_latitude_range",
    );
    expect(report.legacyAuditCandidates[0]?.reasons).toContain(
      "invalid_latitude_range",
    );
  });

  it("makes legacy deletion impossible and keeps cleanup dry-run by default", () => {
    expect(CLEANUP_TARGETS).toEqual(["actions", "trash_spotter_spots"]);
    expect(LEGACY_ARCHIVE_TABLE).toBe("spots");
    expect(parseArgs(["node", "script"])).toEqual({ apply: false });
    expect(() => assertDestructiveTableAllowed("spots")).toThrow(
      "archive-only",
    );
    expect(() => assertDestructiveTableAllowed("trash_spotter_spots")).not.toThrow();
  });

  it("retires the legacy spots runtime surface without dropping the archive", () => {
    const migration = readFileSync(
      new URL(
        "../../../supabase/migrations/20260825151421_retire_legacy_spots_runtime_surface.sql",
        import.meta.url,
      ),
      "utf8",
    );

    expect(migration).toMatch(
      /drop function if exists public\.create_spot_with_progression\(/i,
    );
    expect(migration).toMatch(/drop policy if exists spots_insert_authenticated/i);
    expect(migration).toMatch(/drop policy if exists spots_update_owner/i);
    expect(migration).toMatch(/drop policy if exists spots_select_all/i);
    expect(migration).toMatch(
      /revoke all privileges on table public\.spots from anon, authenticated/i,
    );
    expect(migration).toMatch(
      /revoke insert, update, delete, truncate, references, trigger[\s\S]*from service_role/i,
    );
    expect(migration).toMatch(/grant select on table public\.spots to service_role/i);
    expect(migration).toMatch(/alter table public\.spots enable row level security/i);
    expect(migration).not.toMatch(/drop table public\.spots/i);
    expect(migration).not.toMatch(/cascade/i);
  });
});
