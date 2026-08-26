import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../supabase/migrations/20260826070000_clerk_missions_gps_rls.sql",
  import.meta.url,
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8");
}

describe("Clerk mission/GPS RLS migration", () => {
  it("uses the Clerk sub claim and fails closed without a sub", () => {
    const sql = readMigration();

    expect(sql).not.toMatch(/auth\.uid\s*\(\s*\)/i);
    expect(sql).toMatch(/coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)/i);
    expect(sql).toMatch(/coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)\s*<>\s*''/i);
    expect(sql).toMatch(/to authenticated/i);
    expect(sql).not.toMatch(/to anon/i);
  });

  it("allows a Clerk owner to read and update only their mission tracking fields", () => {
    const sql = readMigration();

    expect(sql).toMatch(
      /create policy "volunteer_read_missions"[\s\S]+?for select[\s\S]+?volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)/i,
    );
    expect(sql).toMatch(
      /create policy "volunteer_update_missions"[\s\S]+?for update[\s\S]+?volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)[\s\S]+?with check[\s\S]+?volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)/i,
    );
    expect(sql).toContain(
      "grant update (status, started_at, ended_at) on table public.missions to authenticated;",
    );
    expect(sql).not.toMatch(/grant update\s+on table public\.missions\s+to authenticated/i);
    expect(sql).not.toMatch(/grant update\s*\([^)]*(volunteer_id|created_by|distance_m|duration_s)/i);
  });

  it("requires the same Clerk-owned mission for GPS insert and read", () => {
    const sql = readMigration();

    for (const policyName of ["volunteer_insert_gps", "volunteer_read_gps"]) {
      const policy = new RegExp(
        `create policy "${policyName}"[\\s\\S]+?(?=create policy|revoke all privileges)`,
        "i",
      ).exec(sql)?.[0];

      expect(policy).toBeTruthy();
      expect(policy).toMatch(/exists\s*\([\s\S]+?from public\.missions as m/i);
      expect(policy).toMatch(/m\.id\s*=\s*gps_points\.mission_id/i);
      expect(policy).toMatch(/m\.volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)/i);
      expect(policy).not.toMatch(/mission_id\s*=\s*[^\n]+\s+and\s+[^\n]*sub/i);
    }
  });

  it("keeps service-role server operations available without widening mobile grants", () => {
    const sql = readMigration();

    expect(sql).toContain(
      "revoke all privileges on table public.missions, public.gps_points from public, anon, authenticated;",
    );
    expect(sql).toContain(
      "grant all privileges on table public.missions, public.gps_points to service_role;",
    );
    expect(sql).toContain(
      "grant select, insert on table public.gps_points to authenticated;",
    );
  });
});
