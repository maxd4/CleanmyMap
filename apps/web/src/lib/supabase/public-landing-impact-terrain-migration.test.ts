import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260907000002_public_landing_impact_terrain_results.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("public landing Impact terrain aggregate migration", () => {
  it("extends the bounded RPC with qualified butt results", () => {
    expect(migration).toContain("butts_by_condition jsonb");
    expect(migration).toContain("megotsCondition");
    expect(migration).toContain("propre|humide|mouille");
    expect(migration).toContain("and cigarette_butts > 0");
    expect(migration).toContain("a.action_date >= p_floor_date");
    expect(migration).toContain("a.status = 'approved'");
    expect(migration).toContain("coalesce(a.moderation_visibility, 'visible') = 'visible'");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = pg_catalog, public");
  });

  it("keeps the public RPC server-only", () => {
    expect(migration).toContain(
      "revoke all on function public.load_public_landing_action_summary(date) from anon;",
    );
    expect(migration).toContain(
      "revoke all on function public.load_public_landing_action_summary(date) from authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.load_public_landing_action_summary(date) to service_role;",
    );
  });
});
