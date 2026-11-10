import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261109000007_spogomi_registration_lifecycle_and_event_changes.sql", import.meta.url), "utf8");

describe("SPOGOMI registration lifecycle migration STATIC_CONTRACT", () => {
  it("keeps one server-owned admission transition matrix and blocks terminal rewrites", () => {
    expect(migration).toContain("create or replace function public.spogomi_admission_transition_allowed");
    expect(migration).toContain("p_current_status = 'pending' and p_target_status in ('approved', 'rejected', 'cancelled')");
    expect(migration).toContain("create trigger spogomi_admission_transition_guard");
    expect(migration).toContain("spogomi_admission_transition_not_allowed");
  });

  it("versions substantive edition changes and invalidates only future quiz admissions", () => {
    expect(migration).toContain("registration_contract_revision bigint not null default 0");
    expect(migration).toContain("create table if not exists public.spogomi_event_change_history");
    expect(migration).toContain("spogomi_event_change_history");
    expect(migration).toContain("requires_confirmation");
    expect(migration).toContain("proof.registration_contract_revision = v_event.registration_contract_revision");
    expect(migration).toContain("array_agg(key_usage.column_name::text order by key_usage.ordinal_position)");
    expect(migration).toContain("app_notifications_spogomi_event_change_unique_idx");
    expect(migration).toContain("acknowledge_spogomi_event_change");
  });

  it("preserves imported roster ownership and reuses only a withdrawn direct registration", () => {
    expect(migration).toContain("participant.source_system = 'direct_registration'");
    expect(migration).toContain("from_status, to_status, actor_kind, actor_clerk_id");
    expect(migration).toContain("create or replace function public.withdraw_spogomi_participant");
    expect(migration).not.toContain("delete from public.spogomi_participants");
  });
});
