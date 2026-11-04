import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261104000010_pedestrian_risk_projection_pagination.sql",
);

describe("pedestrian risk projection pagination migration contract", () => {
  it("returns stable bounded pages with persisted identity and generation time", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("create or replace function public.get_active_pedestrian_risk_projection_page");
    expect(sql).toContain("generated_at timestamptz");
    expect(sql).toContain("network.id,");
    expect(sql).toContain("order by segment.edge_key, segment.projection_segment_id");
    expect(sql).toContain("limit p_limit + 1");
    expect(sql).toContain("offset p_offset");
    expect(sql).toContain("p_limit > 999");
  });

  it("keeps the read boundary service-role-only", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("revoke all on function public.get_active_pedestrian_risk_projection_page");
    expect(sql).toContain("grant execute on function public.get_active_pedestrian_risk_projection_page");
    expect(sql).not.toContain("to anon");
    expect(sql).not.toContain("to authenticated");
  });
});
