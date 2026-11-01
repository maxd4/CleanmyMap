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
const massProvenanceMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000008_public_impact_butt_mass_provenance.sql",
    import.meta.url,
  ),
  "utf8",
);
const massAggregationFixMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000013_public_impact_butt_mass_aggregation_fix.sql",
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

  it("carries canonical masses and versions through the existing projection", () => {
    expect(massProvenanceMigration).toContain("butts_mass_by_condition jsonb");
    expect(massProvenanceMigration).toContain("mass_contributions jsonb");
    expect(massProvenanceMigration).toContain("impact-terrain-public-2026.09-v6");
    expect(massProvenanceMigration).toContain("massKg");
    expect(massProvenanceMigration).toContain("conversionVersion");
    expect(massProvenanceMigration).toContain("public.public_impact_butt_condition_projections");
    expect(massProvenanceMigration).toContain("massContributions");
    expect(massProvenanceMigration).not.toMatch(/\/\s*2500/);
    expect(massProvenanceMigration).not.toMatch(/update\s+public\.actions/i);
  });

  it("introduces explicit_counts into the states VALUES scope", () => {
    expect(massProvenanceMigration).toContain(
      "from explicit_counts\n  cross join lateral (values",
    );
    expect(massProvenanceMigration).toContain("'propre'::text");
    expect(massProvenanceMigration).toContain("'humide'::text");
    expect(massProvenanceMigration).toContain("'mouille'::text");
    expect(massProvenanceMigration).toContain(
      ") as state(condition, cigarette_butts)",
    );
  });

  it("separates canonical counts from expanded mass provenance", () => {
    expect(massAggregationFixMigration).toContain("butt_counts as (");
    expect(massAggregationFixMigration).toContain("butt_mass_contributions as (");
    expect(massAggregationFixMigration).toContain("from butt_counts counts");
    expect(massAggregationFixMigration).toContain("left join butt_mass_contributions mass");
    expect(massAggregationFixMigration).toContain("jsonb_array_elements(b.mass_contributions)");
    expect(massAggregationFixMigration).toContain("grant execute on function public.load_public_landing_action_summary(date) to service_role");
  });
});
