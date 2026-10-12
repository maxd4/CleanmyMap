import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const invariantsMigration = readFileSync(new URL("../../../supabase/migrations/20261012000010_harden_spogomi_certification_invariants.sql", import.meta.url), "utf8");
const itemIsolationMigration = readFileSync(new URL("../../../supabase/migrations/20261012000013_isolate_spogomi_result_item_mutations.sql", import.meta.url), "utf8");

describe("SPOGOMI certification invariants migration STATIC_CONTRACT", () => {
  it("owns one complete-regulation predicate for both RPC and trigger paths", () => {
    expect(invariantsMigration).toContain("create or replace function public.spogomi_regulation_is_complete");
    expect(invariantsMigration).toContain("regulation_status = 'complete'");
    expect(invariantsMigration).toContain("regulation_source_reference");
    expect(invariantsMigration).toContain("coefficient_status <> 'confirmed'");
    expect(invariantsMigration).toContain("tiebreakers");
    expect(invariantsMigration).toContain("requiresAllCategories");
    expect(invariantsMigration).toContain("regulation_penalties");
  });

  it("serializes certification against regulation changes and fails closed", () => {
    expect(invariantsMigration).toContain("from public.spogomi_events");
    expect(invariantsMigration).toContain("for update");
    expect(invariantsMigration).toContain("spogomi_events_regulation_change_guard");
    expect(invariantsMigration).toContain("spogomi_category_rules_current_result_guard");
    expect(invariantsMigration).toContain("spogomi_result_items_current_result_guard");
    expect(invariantsMigration).toContain("status in ('submitted', 'provisional', 'certified')");
    expect(invariantsMigration).toContain("errcode = 'serialization_failure'");
  });

  it("keeps regulation locking event-wide but isolates result-item mutation to a draft owner", () => {
    expect(itemIsolationMigration).toContain("tg_table_name = 'spogomi_result_items'");
    expect(itemIsolationMigration).toContain("old.submission_id is distinct from new.submission_id");
    expect(itemIsolationMigration).toContain("where rs.id = v_submission_id");
    expect(itemIsolationMigration).toContain("and rs.event_id = v_event_id");
    expect(itemIsolationMigration).toContain("for update");
    expect(itemIsolationMigration).toContain("v_submission_status <> 'draft'");
    expect(itemIsolationMigration).toContain("status in ('submitted', 'provisional', 'certified')");
    expect(itemIsolationMigration).toContain("Current SPOGOMI results lock regulation changes");
  });

  it("keeps the privileged RPC boundary and avoids public execution", () => {
    expect(invariantsMigration).toContain("revoke all on function public.spogomi_review_team_submission");
    expect(invariantsMigration).toContain("grant execute on function public.spogomi_review_team_submission");
    expect(invariantsMigration).toContain("grant execute on function public.spogomi_regulation_is_complete");
  });
});
