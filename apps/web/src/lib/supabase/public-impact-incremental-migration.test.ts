import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260908000001_incremental_public_impact_state.sql",
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
});
