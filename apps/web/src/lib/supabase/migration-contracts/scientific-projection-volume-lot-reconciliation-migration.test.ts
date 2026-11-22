import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_IMPACT_PROJECTION_VERSION } from "@/lib/impact/scientific-projection-versions";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000012_scientific_projection_volume_lot_reconciliation.sql",
    import.meta.url,
  ),
  "utf8",
);
const volumeProxyV3Migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261122000010_scientific_projection_volume_proxy_v3.sql",
    import.meta.url,
  ),
  "utf8",
);
const massProxyV3Migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261122000011_scientific_projection_butt_mass_v3.sql",
    import.meta.url,
  ),
  "utf8",
);
const restoreProjectionV8Migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261122000012_restore_scientific_projection_v8.sql",
    import.meta.url,
  ),
  "utf8",
);
const restoreProjectionV9Migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261122000013_restore_scientific_projection_v9.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("scientific projection volume-lot reconciliation migration STATIC_CONTRACT", () => {
  it("keeps the canonical TypeScript projection as the SQL input", () => {
    expect(migration).toContain("public_impact_action_cigarette_butt_projections");
    expect(migration).toContain("projected_lot_results jsonb");
    expect(migration).toContain("upsert_public_impact_action_cigarette_butt_projections");
    expect(migration).toContain("'impact-terrain-public-2026.09-v7'");
    expect(migration).not.toMatch(/(?:volume_l|volume)[\s\S]{0,160}(?:600|700)|(?:600|700)[\s\S]{0,160}(?:volume_l|volume)/i);
  });

  it("restores the supported projection after the unsupported mass proxy migration", () => {
    expect(massProxyV3Migration).toContain("'impact-terrain-public-2026.09-v9'");
    expect(restoreProjectionV8Migration).toContain("'impact-terrain-public-2026.09-v8'");
    expect(restoreProjectionV8Migration).toContain("alter column methodology_version set default");
    expect(restoreProjectionV8Migration).not.toMatch(/update\s+public\.actions/i);
    expect(restoreProjectionV8Migration).not.toMatch(/delete\s+from\s+public\.actions/i);
    expect(restoreProjectionV8Migration).not.toMatch(/update\s+public\.public_impact_action_aggregate_state/i);
  });

  it("publishes the volume projection without mutating sources or cached state", () => {
    expect(volumeProxyV3Migration).toContain("'impact-terrain-public-2026.09-v8'");
    expect(volumeProxyV3Migration).toContain("alter column methodology_version set default");
    expect(volumeProxyV3Migration).not.toMatch(/update\s+public\.actions/i);
    expect(volumeProxyV3Migration).not.toMatch(/delete\s+from\s+public\.actions/i);
    expect(volumeProxyV3Migration).not.toMatch(/update\s+public\.public_impact_action_aggregate_state/i);
  });

  it("restores v9 as the current identity without rewriting historical rows", () => {
    expect(PUBLIC_IMPACT_PROJECTION_VERSION).toBe("impact-terrain-public-2026.09-v9");
    expect(restoreProjectionV9Migration).toContain(`'${PUBLIC_IMPACT_PROJECTION_VERSION}'`);
    expect(restoreProjectionV9Migration).toContain("alter column methodology_version set default");
    expect(restoreProjectionV9Migration).toMatch(/set search_path = pg_catalog, public/i);
    expect(restoreProjectionV9Migration).toMatch(/grant execute[\s\S]+to service_role/i);
    expect(restoreProjectionV9Migration).not.toMatch(/update\s+public\.actions/i);
    expect(restoreProjectionV9Migration).not.toMatch(/delete\s+from\s+public\.actions/i);
    expect(restoreProjectionV9Migration).not.toMatch(/update\s+public\.public_impact_action_aggregate_state/i);
  });

  it("does not rewrite observations and preserves the compatible state RPC signatures", () => {
    expect(migration).not.toMatch(/update\s+public\.actions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.actions/i);
    expect(migration).toContain("rebuild_public_impact_action_state(date, text)");
    expect(migration).toContain("advance_public_impact_action_state(date, text)");
    expect(migration).toContain("p_projection_rows jsonb");
    expect(migration).toContain("assert_public_impact_current_butt_projections");
    expect(migration).toContain("source_updated_at = a.updated_at");
  });

  it("keeps the service boundary and retry contract explicit", () => {
    expect(migration).toMatch(/security definer/i);
    expect(migration).toMatch(/set search_path = pg_catalog, public/i);
    expect(migration).toContain("alter table public.public_impact_action_cigarette_butt_projections enable row level security;");
    expect(migration).toMatch(/grant execute on function public\.rebuild_public_impact_action_state\(date, text, jsonb\)\s+to service_role;/i);
    expect(migration).toMatch(/grant execute on function public\.advance_public_impact_action_state\(date, text, jsonb\)\s+to service_role;/i);
  });
});
