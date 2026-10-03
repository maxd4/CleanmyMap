import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = fileURLToPath(
  new URL("../../../supabase/migrations/20261003000004_action_geometry_contributions.sql", import.meta.url),
);

describe("action geometry contribution migration contract", () => {
  const sql = readFileSync(migration, "utf8");

  it("keeps attributable observations append-only and idempotent", () => {
    expect(sql).toMatch(/create table if not exists public\.action_geometry_contributions/i);
    expect(sql).toMatch(/contributor_clerk_id text not null/i);
    expect(sql).toMatch(/source in \('gpx_import', 'gps_tracking'\)/i);
    expect(sql).toMatch(/validation_state text not null default 'accepted'/i);
    expect(sql).toMatch(/uq_action_geometry_contributions_identity/i);
    expect(sql).toMatch(/action_id, contributor_clerk_id, source, source_fingerprint/i);
    expect(sql).toMatch(/drop constraint if exists actions_derived_geometry_kind_check/i);
    expect(sql).toMatch(/derived_geometry_kind in \('point', 'polyline', 'polygon', 'multiline'\)/i);
    expect(sql).toMatch(/action_participants[\s\S]*participation_status = 'confirmed'/i);
    expect(sql).toMatch(/action_organizers/i);
  });

  it("projects independent traces as coverage without summing or concatenating them", () => {
    expect(sql).toMatch(/'MultiLineString'/i);
    expect(sql).toMatch(/individualDistancesKm/i);
    expect(sql).toMatch(/coverageDistanceKm.*null/i);
    expect(sql).toMatch(/coverageVersion.*observed-traces-v1/i);
    expect(sql).toMatch(/A park\/closed-zone polygon remains the primary geometry/i);
    expect(sql).toMatch(/source <> 'gps_tracking' or mission_id is not null/i);
  });

  it("records completed mobile missions through the canonical contribution path", () => {
    expect(sql).toMatch(/record_completed_mission_geometry_contribution/i);
    expect(sql).toMatch(/record_action_geometry_contribution\(/i);
    expect(sql).toMatch(/promote_completed_mission_geometry/i);
    expect(sql).toMatch(/point_count < 2/i);
    expect(sql).toMatch(/gps_tracking.*new\.id/i);
  });
});
