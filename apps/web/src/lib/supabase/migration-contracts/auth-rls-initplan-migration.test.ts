import { describe, expect, it } from "vitest";
import { readMigration } from "./read-migration";

const migration = readMigration(import.meta.url, "20260927000002_harden_auth_rls_initplans.sql");
const gamificationMigration = readMigration(import.meta.url, "20260920000000_harden_gamification_projection_writes.sql");
const impactMigration = readMigration(import.meta.url, "20260908000001_incremental_public_impact_state.sql");

const impactPolicies = [
  ["public_impact_action_contributions_service_only", "public_impact_action_contributions"],
  ["public_impact_action_aggregate_state_service_only", "public_impact_action_aggregate_state"],
  ["public_impact_action_location_counts_service_only", "public_impact_action_location_counts"],
  ["public_impact_action_distribution_counts_service_only", "public_impact_action_distribution_counts"],
  ["public_impact_action_warning_counts_service_only", "public_impact_action_warning_counts"],
  ["public_impact_action_butt_condition_counts_service_only", "public_impact_action_butt_condition_counts"],
] as const;

describe("auth RLS initPlan migration", () => {
  it("keeps the visited-places policy select-only, authenticated, and owner-scoped", () => {
    expect(gamificationMigration).toContain(
      "create policy gamification_user_visited_places_owner_select on public.user_visited_places for select to authenticated using ((select auth.jwt() ->> 'sub') = user_id);",
    );
    expect(migration).toContain(
      "alter policy gamification_user_visited_places_owner_select on public.user_visited_places to authenticated using (((select auth.jwt()) ->> 'sub') = user_id);",
    );
    expect(migration).not.toMatch(/auth\.jwt\(\)\s*->>/);
  });

  it("wraps auth.role in USING and WITH CHECK for all six Impact policies", () => {
    for (const [name, table] of impactPolicies) {
      expect(impactMigration).toContain(
        `create policy ${name} on public.${table} for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');`,
      );
      expect(migration).toContain(
        `alter policy ${name} on public.${table} using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');`,
      );
    }

    expect(migration.match(/alter policy/g)).toHaveLength(7);
    expect(migration).not.toMatch(/auth\.role\(\)\s*=\s*'service_role'/);
  });

  it("does not alter grants or replace policies", () => {
    expect(migration).not.toMatch(/\b(grant|revoke|create|drop)\s+(policy|table|index)/);
  });
});
