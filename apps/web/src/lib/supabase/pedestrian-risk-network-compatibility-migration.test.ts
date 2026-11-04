import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261104000008_pedestrian_risk_network_compatibility.sql",
);

describe("pedestrian risk/network compatibility migration contract", () => {
  it("binds the active projection to the matching active graph identity", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("create or replace function public.get_active_pedestrian_risk_projection");
    expect(sql).toContain("left join public.pedestrian_network_versions as network");
    expect(sql).toContain("network.importer_version = version.network_importer_version");
    expect(sql).toContain("network.source_sha256 = version.network_source_sha256");
    expect(sql).toContain("network.source_retrieved_at = version.network_source_retrieved_at");
    expect(sql).toContain("network.id,");
  });

  it("preserves the service-role-only read boundary", () => {
    const sql = readFileSync(migrationPath, "utf8");
    expect(sql).toContain("revoke all on function public.get_active_pedestrian_risk_projection");
    expect(sql).toContain("grant execute on function public.get_active_pedestrian_risk_projection");
    expect(sql).not.toContain("grant execute on function public.get_active_pedestrian_risk_projection" + "\n  to anon");
  });
});
