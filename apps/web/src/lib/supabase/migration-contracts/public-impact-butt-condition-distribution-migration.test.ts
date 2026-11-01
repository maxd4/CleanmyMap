import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000005_public_impact_butt_condition_distribution.sql",
    import.meta.url,
  ),
  "utf8",
);
const rebuildMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000006_public_impact_butt_condition_distribution_rebuild.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("public Impact butt condition distribution migration STATIC_CONTRACT", () => {
  it("uses the persisted canonical lot results and keeps legacy fallback bounded", () => {
    expect(migration).toContain("add column if not exists butts_propre_count");
    expect(migration).toContain("add column if not exists butts_humide_count");
    expect(migration).toContain("add column if not exists butts_mouille_count");
    expect(migration).toContain("cigaretteButtsLotResults");
    expect(migration).toContain("jsonb_array_elements(s.lot_results)");
    expect(migration).toContain("legacy_butts_condition");
    expect(migration).toContain("impact-terrain-public-2026.09-v5");
  });

  it("reuses one condition-delta owner for rebuild, replacement, removal and full aggregation", () => {
    expect(migration).toContain("public.public_impact_butt_condition_counts");
    expect(migration).toContain("create or replace function public.public_impact_adjust_contribution");
    expect(migration).toContain("create or replace function public.sync_public_impact_action_contribution");
    expect(migration).toContain("create or replace function public.load_public_landing_action_summary(");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("grant execute on function public.load_public_landing_action_summary(date) to service_role");
    expect(migration).not.toMatch(/update\s+public\.actions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.actions/i);
  });

  it("activates the version-aware rebuild path without rewriting source actions", () => {
    expect(rebuildMigration).toContain("public.advance_public_impact_action_state");
    expect(rebuildMigration).toContain("public.current_public_impact_projection_version()");
    expect(rebuildMigration).toContain("coalesce(floor_date, current_date - 365)");
    expect(rebuildMigration).not.toMatch(/update\s+public\.actions/i);
    expect(rebuildMigration).not.toMatch(/delete\s+from\s+public\.actions/i);
  });
});
