import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261012000010_harden_spogomi_certification_invariants.sql", import.meta.url), "utf8");

describe("SPOGOMI certification invariants migration STATIC_CONTRACT", () => {
  it("owns one complete-regulation predicate for both RPC and trigger paths", () => {
    expect(migration).toContain("create or replace function public.spogomi_regulation_is_complete");
    expect(migration).toContain("regulation_status = 'complete'");
    expect(migration).toContain("regulation_source_reference");
    expect(migration).toContain("coefficient_status <> 'confirmed'");
    expect(migration).toContain("tiebreakers");
    expect(migration).toContain("requiresAllCategories");
    expect(migration).toContain("regulation_penalties");
  });

  it("serializes certification against regulation changes and fails closed", () => {
    expect(migration).toContain("from public.spogomi_events");
    expect(migration).toContain("for update");
    expect(migration).toContain("spogomi_events_regulation_change_guard");
    expect(migration).toContain("spogomi_category_rules_current_result_guard");
    expect(migration).toContain("spogomi_result_items_current_result_guard");
    expect(migration).toContain("status in ('submitted', 'provisional', 'certified')");
    expect(migration).toContain("errcode = 'serialization_failure'");
  });

  it("keeps the privileged RPC boundary and avoids public execution", () => {
    expect(migration).toContain("revoke all on function public.spogomi_review_team_submission");
    expect(migration).toContain("grant execute on function public.spogomi_review_team_submission");
    expect(migration).toContain("grant execute on function public.spogomi_regulation_is_complete");
  });
});
