import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../supabase/migrations/20260826080000_clerk_compute_mission_distance.sql",
  import.meta.url,
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("Clerk-owned mission distance finalization", () => {
  it("exposes a strict owner-checked RPC without reopening derived column updates", () => {
    const sql = readMigration();

    expect(sql).toMatch(/create or replace function public\.compute_mission_distance\(p_mission_id uuid\)/i);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = pg_catalog/i);
    expect(sql).toMatch(/v_sub text := coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)/i);
    expect(sql).toMatch(/if v_role not in \('authenticated', 'service_role'\)/i);
    expect(sql).toMatch(/if v_sub = ''[\s\S]+?raise exception 'Clerk subject required\.'/i);
    expect(sql).toMatch(/volunteer_id = v_sub[\s\S]+?for update/i);
    expect(sql).toMatch(/from public\.gps_points[\s\S]+?where mission_id = p_mission_id/i);
    expect(sql).toMatch(/duration_s = case[\s\S]+?v_started_at is not null[\s\S]+?v_ended_at is not null/i);
    expect(sql).not.toMatch(/grant update\s*\([^)]*(distance_m|duration_s)/i);
  });

  it("keeps authenticated execution owner-bound and anon/public execution closed", () => {
    const sql = readMigration();

    expect(sql).toContain(
      "revoke all on function public.compute_mission_distance(uuid) from public, anon, authenticated;",
    );
    expect(sql).toContain(
      "grant execute on function public.compute_mission_distance(uuid) to authenticated, service_role;",
    );
    expect(sql).toMatch(/if v_role = 'service_role'[\s\S]+?where id = p_mission_id/i);
    expect(sql).toMatch(/if v_role = 'service_role'[\s\S]+?else[\s\S]+?if v_sub = ''/i);
  });

  it("preserves the service-role path for server operations", () => {
    const sql = readMigration();

    expect(sql).toMatch(/v_role text := coalesce\(\(select auth\.role\(\)\),\s*''\)/i);
    expect(sql).toMatch(/grant execute on function public\.compute_mission_distance\(uuid\) to authenticated, service_role;/i);
  });
});
