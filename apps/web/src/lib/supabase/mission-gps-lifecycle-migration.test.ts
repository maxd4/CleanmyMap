import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261018000008_harden_gps_point_lifecycle.sql", import.meta.url),
  "utf8",
);

describe("GPS mission lifecycle migration [STATIC_CONTRACT]", () => {
  it("accepts direct GPS inserts only for an owned tracking mission", () => {
    expect(migration).toMatch(
      /create policy "volunteer_insert_gps"[\s\S]+?to authenticated[\s\S]+?m\.volunteer_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)[\s\S]+?m\.status\s*=\s*'tracking'/i,
    );
    expect(migration).toMatch(
      /coalesce\(\(select auth\.jwt\(\)\)\s*->>\s*'sub',\s*''\)\s*<>\s*''/i,
    );
  });

  it("makes completed and cancelled missions terminal for the mobile update surface", () => {
    expect(migration).toMatch(
      /create policy "volunteer_update_missions"[\s\S]+?using\s*\([\s\S]+?status\s+in\s*\('pending',\s*'tracking'\)/i,
    );
    expect(migration).not.toMatch(/status\s+in\s*\([^)]*completed[^)]*\)\s*\)\s*\n\s*with check/i);
  });

  it("serializes point insertion with finalization without moving metric ownership", () => {
    expect(migration).toMatch(/create or replace function public\.guard_gps_point_mission_tracking\(\)/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toMatch(
      /select m\.status, m\.volunteer_id[\s\S]+?into v_status, v_volunteer_id[\s\S]+?from public\.missions as m[\s\S]+?where m\.id = new\.mission_id[\s\S]+?for update/i,
    );
    expect(migration).toMatch(/create trigger guard_gps_point_mission_tracking[\s\S]+?before insert on public\.gps_points/i);
    expect(migration).toMatch(/revoke all on function public\.guard_gps_point_mission_tracking\(\) from public, anon/i);
    expect(migration).toMatch(/grant execute on function public\.guard_gps_point_mission_tracking\(\) to authenticated, service_role/i);
    expect(migration).not.toMatch(/distance_m|duration_s/);
  });
});
