import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../supabase/migrations/20260915000010_territory_context_access.sql",
  import.meta.url,
);

describe("territory context RLS migration", () => {
  it("uses authentication rather than the persisted profile territory for reads", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/create or replace function public\.can_view_territory_message\(p_msg_arrondissement integer\)/i);
    expect(sql).toMatch(/select \(select auth\.role\(\)\) in \('authenticated', 'service_role'\)/i);
    expect(sql).toMatch(/channel_type\s*=\s*'territory'[\s\S]+public\.can_view_territory_message\(arrondissement_id\)/i);
    expect(sql).not.toMatch(/current_profile_arrondissement\(\)/i);
    expect(sql).toMatch(/alter table public\.app_messages enable row level security/i);
  });

  it("keeps authenticated ownership and a non-empty territory context for writes", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toMatch(/channel_type\s*=\s*'territory'[\s\S]+sender_id\s*=\s*coalesce\(\(select auth\.jwt\(\)\)/i);
    expect(sql).toMatch(/arrondissement_id between 1 and 20/);
    expect(sql).toMatch(/nullif\(btrim\(zone_name\), ''\) is not null/);
  });
});
