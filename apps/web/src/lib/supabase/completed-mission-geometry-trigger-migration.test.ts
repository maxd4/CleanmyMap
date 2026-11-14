import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const previousMigration = new URL(
  "../../../supabase/migrations/20261003000004_action_geometry_contributions.sql",
  import.meta.url,
);
const fixMigration = new URL(
  "../../../supabase/migrations/20261115000011_fix_completed_mission_geometry_trigger.sql",
  import.meta.url,
);

describe("completed mission geometry trigger rebinding", () => {
  it("keeps the published historical function and fixes only the trigger binding", () => {
    const historicalSql = readFileSync(previousMigration, "utf8");
    const fixSql = readFileSync(fixMigration, "utf8");

    expect(historicalSql).toContain("return public.record_completed_mission_geometry_contribution();");
    expect(fixSql).toMatch(/drop trigger if exists promote_completed_mission_geometry on public\.missions/i);
    expect(fixSql).toMatch(
      /create trigger promote_completed_mission_geometry[\s\S]*?after update on public\.missions[\s\S]*?for each row[\s\S]*?when \(old\.status is distinct from 'completed' and new\.status = 'completed'\)[\s\S]*?execute function public\.record_completed_mission_geometry_contribution\(\);/i,
    );
    expect(fixSql).not.toMatch(/execute function public\.promote_completed_mission_geometry\(\)/i);
    expect(fixSql).not.toMatch(/create or replace function public\.promote_completed_mission_geometry/i);
  });

  it("retains server-owned metric and contribution invariants", () => {
    const historicalSql = readFileSync(previousMigration, "utf8");

    expect(historicalSql).toMatch(/returns trigger[\s\S]*?security definer[\s\S]*?set search_path = public, pg_catalog[\s\S]*?new\.distance_m/i);
    expect(historicalSql).toMatch(/new\.ended_at[\s\S]*?jsonb_build_object\([\s\S]*?distanceMeters/i);
    expect(historicalSql).toMatch(/on conflict \(action_id, contributor_clerk_id, source, source_fingerprint\)[\s\S]*?do update/i);
    expect(historicalSql).toMatch(/old\.status is not distinct from 'completed'[\s\S]*?new\.status is distinct from 'completed'[\s\S]*?new\.action_id is null/i);
  });
});
