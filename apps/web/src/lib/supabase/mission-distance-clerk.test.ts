import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const completionMigrationPath = new URL(
  "../../../supabase/migrations/20260827100000_clerk_mission_completion_metrics_trigger.sql",
  import.meta.url,
);
const rlsMigrationPath = new URL(
  "../../../supabase/migrations/20260826070000_clerk_missions_gps_rls.sql",
  import.meta.url,
);

function readFile(path: URL): string {
  return readFileSync(path, "utf8");
}

describe("Clerk-owned mission distance finalization", () => {
  it("finalizes completed missions with an invoker trigger from visible GPS points", () => {
    const sql = readFile(completionMigrationPath);

    expect(sql).toMatch(
      /create or replace function public\.finalize_completed_mission_metrics\(\)\s*returns trigger/i,
    );
    expect(sql).toMatch(/language plpgsql[\s\S]+?security invoker/i);
    expect(sql).toMatch(/set search_path = pg_catalog/i);
    expect(sql).toMatch(/old\.status is distinct from 'completed'[\s\S]+?new\.status = 'completed'/i);
    expect(sql).toMatch(/from public\.gps_points[\s\S]+?where mission_id = new\.id/i);
    expect(sql).toMatch(/6371000[\s\S]+?asin\(sqrt\([\s\S]+?radians/i);
    expect(sql).toMatch(/new\.distance_m\s*:=\s*total_m::integer/i);
    expect(sql).toMatch(/new\.duration_s\s*:=\s*case[\s\S]+?new\.started_at[\s\S]+?new\.ended_at/i);
    expect(sql).toMatch(/return new;/i);
    expect(sql).toMatch(
      /create trigger finalize_completed_mission_metrics[\s\S]+?before update on public\.missions[\s\S]+?for each row[\s\S]+?execute function public\.finalize_completed_mission_metrics\(\);/i,
    );
    expect(sql).not.toMatch(/security definer/i);
  });

  it("removes the client-callable RPC surface", () => {
    const sql = readFile(completionMigrationPath);

    expect(sql).toMatch(/drop function if exists public\.compute_mission_distance\(uuid\);/i);
    expect(sql).not.toMatch(/grant execute[\s\S]*compute_mission_distance/i);
    expect(sql).not.toMatch(/create or replace function public\.compute_mission_distance/i);
    expect(sql).not.toMatch(/security definer/i);
  });

  it("allows the Clerk owner to complete a mission with server-calculated metrics", () => {
    const sql = readFile(rlsMigrationPath);

    expect(sql).toMatch(
      /create policy "volunteer_update_missions"[\s\S]+?for update\s+to authenticated[\s\S]+?volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)/i,
    );
    expect(readFile(completionMigrationPath)).toMatch(
      /new\.distance_m\s*:=\s*total_m::integer[\s\S]+?new\.duration_s\s*:=\s*case/i,
    );
  });

  it("rejects another user and anonymous callers", () => {
    const sql = readFile(rlsMigrationPath);

    expect(sql).toMatch(
      /volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)/i,
    );
    expect(sql).toMatch(/for update\s+to authenticated/i);
    expect(sql).not.toMatch(/to anon/i);
    expect(sql).toMatch(
      /revoke all privileges on table public\.missions, public\.gps_points from public, anon, authenticated;/i,
    );
  });

  it("denies direct client updates of the derived columns", () => {
    const sql = readFile(rlsMigrationPath);

    expect(sql).toContain(
      "grant update (status, started_at, ended_at) on table public.missions to authenticated;",
    );
    expect(sql).not.toMatch(/grant update\s*\([^)]*(distance_m|duration_s)/i);
  });
});
