import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260913000002_public_impact_kpi_parity.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("public Impact SQL/TS parity migration", () => {
  it("centralizes the SQL max formula and applies it to both projections", () => {
    expect(migration).toContain("public.estimate_public_action_waste_kg(");
    expect(migration).toContain("when 'humide' then 0.7::numeric");
    expect(migration).toContain("when 'mouille' then 0.4::numeric");
    expect(
      migration.match(/public\.estimate_public_action_waste_kg\(/g),
    ).toHaveLength(5);
    expect(migration).toContain(
      "coalesce(a.action_phase, 'post_action_complete') <> 'pre_action'",
    );
    expect(migration).toContain(
      "coalesce(s.action_phase, 'post_action_complete') <> 'pre_action'",
    );
  });

  it("does not reintroduce the old direct cigarette_butts / 2500 expressions", () => {
    expect(migration).not.toContain(
      "greatest(coalesce(a.cigarette_butts, 0), 0)::numeric / 2500::numeric",
    );
    expect(migration).not.toContain(
      "greatest(coalesce(p_action.cigarette_butts, 0), 0)::numeric / 2500::numeric",
    );
  });
});
