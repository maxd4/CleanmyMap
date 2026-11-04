import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261104000005_pedestrian_risk_projection.sql",
);

describe("pedestrian risk projection migration contract", () => {
  it("declares PostGIS, spatial indexes, versioned layers and atomic publication", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("create extension if not exists postgis with schema extensions");
    expect(sql).toContain("create table if not exists public.pedestrian_risk_projection_versions");
    expect(sql).toContain("create table if not exists public.pedestrian_segment_risk_projections");
    expect(sql).toContain("using gist (geom)");
    expect(sql).toContain("using gist (midpoint)");
    expect(sql).toContain("alter table public.pedestrian_risk_projection_versions enable row level security");
    expect(sql).toContain("revoke all on function public.publish_pedestrian_risk_projection(jsonb)");
    expect(sql).toContain("pg_advisory_xact_lock(hashtextextended(v_projection_key, 0))");
    expect(sql).toContain("update public.pedestrian_risk_projection_versions");
    expect(sql).toContain("set status = 'active'");
  });

  it("keeps unavailable segments null and forbids unsafe predicted rows", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("check ((risk_status = 'predicted') = (waste_risk is not null and cigarette_butt_risk is not null and mixed_risk is not null))");
    expect(sql).toContain("check (zone_id is not null or risk_status = 'unavailable')");
    expect(sql).toContain("grant execute on function public.get_active_pedestrian_risk_projection");
  });
});
