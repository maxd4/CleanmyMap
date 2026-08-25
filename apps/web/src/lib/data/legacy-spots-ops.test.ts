import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ARCHIVE_TABLES,
  getArchiveTableNames,
} from "../../../scripts/export-supabase-archive.mjs";
import {
  BACKFILL_TARGETS,
  buildBackfillPlan,
} from "../../../scripts/backfill-derived-geometry.mjs";
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

    const { actionUpdates, signalementUpdates } = buildBackfillPlan({
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

    expect(actionUpdates).toHaveLength(1);
    expect(signalementUpdates).toHaveLength(1);
    expect(signalementUpdates[0]?.derived_geometry_kind).toBeTruthy();
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
});
