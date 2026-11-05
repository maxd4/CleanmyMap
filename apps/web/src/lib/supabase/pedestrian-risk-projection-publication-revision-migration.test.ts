import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261105000015_pedestrian_risk_projection_publication_revision.sql",
);

describe("pedestrian risk projection publication revision migration contract", () => {
  it("renews a transport identity for every version-row replacement", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("add column if not exists publication_revision bigint");
    expect(sql).toContain("nextval('public.pedestrian_risk_projection_publication_revision_seq')");
    expect(sql).toContain("before insert or update on public.pedestrian_risk_projection_versions");
    expect(sql).toContain("new.publication_revision := nextval");
    expect(sql).toContain("version.publication_revision");
  });

  it("keeps the paged reader service-role-only and rejects unsafe bounds", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("drop function if exists public.get_active_pedestrian_risk_projection_page");
    expect(sql).toContain("revoke all on function public.get_active_pedestrian_risk_projection_page");
    expect(sql).toContain("grant execute on function public.get_active_pedestrian_risk_projection_page");
    expect(sql).not.toContain("grant execute on function public.get_active_pedestrian_risk_projection_page(\n  double precision, double precision, double precision, double precision, integer, integer\n) to anon");
    expect(sql).toContain("p_limit > 999 or p_offset < 0");
  });
});
