import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260908000001_incremental_public_impact_state.sql",
    import.meta.url,
  ),
  "utf8",
);
const futureActionMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20260908010000_future_action_public_visibility.sql",
    import.meta.url,
  ),
  "utf8",
);
const wasteCoverageMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000010_public_impact_waste_source_count_parity.sql",
    import.meta.url,
  ),
  "utf8",
);
const wasteCoverageMassMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261101000014_public_impact_incremental_butt_mass_provenance.sql",
    import.meta.url,
  ),
  "utf8",
);
const wasteCoverageProof = readFileSync(
  new URL(
    "../../../../supabase/tests/public-impact-waste-coverage.pgtap.sql",
    import.meta.url,
  ),
  "utf8",
);
const temporalEligibilityMigration = readFileSync(
  new URL(
    "../../../../supabase/migrations/20261107000001_public_impact_temporal_eligibility.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("incremental public Impact state migration", () => {
  it("defines the per-action projection and decrementable aggregate counters", () => {
    expect(migration).toContain("public.public_impact_action_contributions");
    expect(migration).toContain("source_updated_at");
    expect(migration).toContain("eligible_non_temporal");
    expect(migration).toContain("public.public_impact_action_aggregate_state");
    expect(migration).toContain("public.public_impact_action_location_counts");
    expect(migration).toContain("public.public_impact_action_distribution_counts");
    expect(migration).toContain("public.public_impact_action_warning_counts");
    expect(migration).toContain("public.public_impact_action_butt_condition_counts");
    expect(migration).toContain("action_count = action_count - 1");
    expect(migration).toContain("action_date < p_floor_date");
    expect(migration).toContain("hashtextextended('cleanmymap.public-impact-action-state', 0)");
    expect(migration).toContain("trg_public_impact_action_contribution_sync");
    expect(migration).toContain("trg_public_impact_action_contribution_delete");
  });

  it("keeps normal advancement separate from the full-scan oracle", () => {
    expect(migration).toContain("public.advance_public_impact_action_state(date)");
    expect(migration).toContain("public.load_public_landing_action_summary_incremental()");
    expect(migration).toContain("public.rebuild_public_impact_action_state(date)");
    expect(migration).not.toContain("create or replace function public.load_public_landing_action_summary(");
  });

  it("protects the state and RPCs from public and authenticated roles", () => {
    expect(migration).toContain("alter table public.public_impact_action_contributions enable row level security;");
    expect(migration).toContain("revoke all on table public.public_impact_action_aggregate_state from public, anon, authenticated;");
    expect(migration).toContain("revoke all on function public.load_public_landing_action_summary_incremental() from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.rebuild_public_impact_action_state(date) to service_role;");
    expect(migration).toMatch(/security definer/gi);
    expect(migration).toContain("set search_path = pg_catalog, public");
  });

  it("keeps future map visibility separate from Impact eligibility", () => {
    expect(futureActionMigration).toContain("create or replace function public.actions_map_feed(");
    expect(futureActionMigration).toContain("a.status = 'pending'");
    expect(futureActionMigration).toContain("a.action_date > current_date");
    expect(futureActionMigration).toContain("a.action_date <= current_date");
    expect(futureActionMigration).toContain("revoke all on function public.actions_map_feed(");
    expect(futureActionMigration).toContain("grant execute on function public.actions_map_feed(");
    expect(futureActionMigration).toContain("set search_path = public, pg_catalog");
    expect(futureActionMigration).toContain("set search_path = pg_catalog, public");
  });

  it("derives waste coverage from canonical contributions without metadata re-filtering", () => {
    expect(wasteCoverageMigration).toContain(
      "from public.public_impact_action_contributions c",
    );
    expect(wasteCoverageMigration).toContain(
      "join public.actions a on a.id = c.action_id",
    );
    expect(wasteCoverageMigration).toContain("c.eligible_non_temporal");
    expect(wasteCoverageMigration).toContain("a.waste_kg is not null");
    expect(wasteCoverageMigration).toContain("a.waste_kg >= 0");
    expect(wasteCoverageMigration).not.toContain("a.notes");
    expect(wasteCoverageMigration).toContain(
      "grant execute on function public.load_public_landing_action_summary_incremental() to service_role;",
    );
  });

  it("restores the v6 mass contribution contract in the forward-only correction", () => {
    expect(wasteCoverageMassMigration).toContain("waste_source_count bigint");
    expect(wasteCoverageMassMigration).toContain(
      "'massContributions', b.mass_contributions",
    );
    expect(wasteCoverageMassMigration).toContain(
      "from public.public_impact_action_butt_condition_counts b",
    );
    expect(wasteCoverageMassMigration).toContain("a.waste_kg is not null");
    expect(wasteCoverageMassMigration).not.toContain("a.notes");
    expect(wasteCoverageMassMigration).toContain(
      "grant execute on function public.load_public_landing_action_summary_incremental() to service_role;",
    );
  });

  it("separates permanent eligibility from the current temporal window", () => {
    expect(temporalEligibilityMigration).toContain("eligible_temporal boolean not null default false");
    expect(temporalEligibilityMigration).toContain(
      "is_action_statistical_version_permanently_admissible",
    );
    expect(temporalEligibilityMigration).toContain(
      "v_contribution.eligible_non_temporal := v_eligible;",
    );
    expect(temporalEligibilityMigration).toContain(
      "v_contribution.eligible_temporal := false;",
    );
    expect(temporalEligibilityMigration).toContain(
      "p_contribution.action_date > current_date",
    );
    expect(temporalEligibilityMigration).toContain(
      "if p_sign = 1 and p_contribution.eligible_temporal then",
    );
    expect(temporalEligibilityMigration).toContain(
      "where eligible_temporal",
    );
    expect(temporalEligibilityMigration).toContain(
      "where eligible_non_temporal\n      and not eligible_temporal",
    );
    expect(temporalEligibilityMigration).toContain(
      "public_impact_adjust_contribution_historical",
    );
  });

  it("registers executable zero/NULL/metadata and reconstruction coverage cases", () => {
    expect(wasteCoverageProof).toContain("select plan(22);");
    expect(wasteCoverageProof).toContain("insert into public.actions");
    expect(wasteCoverageProof).toContain(
      "public.public_impact_action_contributions",
    );
    expect(wasteCoverageProof).toContain(
      "00000000-0000-0000-0000-000000000105",
    );
    expect(wasteCoverageProof).toContain(
      "public.public_impact_action_cigarette_butt_projections",
    );
    expect(wasteCoverageProof).toContain("public.rebuild_public_impact_action_state");
    expect(wasteCoverageProof).toContain("rollback;");
    expect(wasteCoverageProof).not.toContain(
      "public_impact_waste_coverage_fixture",
    );
    expect(wasteCoverageProof).toContain(
      "the incremental RPC counts eligible non-NULL sources, including technical metadata and zero",
    );
  });

  it("keeps the pgTAP plan equal to the executable assertion count", () => {
    const declaredPlan = Number(wasteCoverageProof.match(/^\s*select\s+plan\((\d+)\);/m)?.[1]);
    const executableAssertions = wasteCoverageProof.match(/^\s*select\s+(?:is|lives_ok)\s*\(/gm) ?? [];

    expect(Number.isInteger(declaredPlan)).toBe(true);
    expect(executableAssertions).toHaveLength(declaredPlan);
  });
});
