import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261012000006_spogomi_team_result_forms.sql", import.meta.url), "utf8");

describe("SPOGOMI team result migration STATIC_CONTRACT", () => {
  it("keeps measurement dimensions distinct and preserves empty versus zero", () => {
    expect(migration).toContain("alter column quantity drop not null");
    expect(migration).toContain("mass_grams numeric");
    expect(migration).toContain("object_count numeric");
    expect(migration).toContain("measurement_method text");
    expect(migration).toContain("arbitration_comment text");
    expect(migration).toContain("mass_grams is null");
    expect(migration).toContain("object_count is null");
  });

  it("provides non-guessable revocable team access without public table grants", () => {
    expect(migration).toContain("spogomi_team_access_grants");
    expect(migration).toContain("spogomi_team_access_sessions");
    expect(migration).toContain("token_hash text not null unique");
    expect(migration).toContain("session_hash text not null unique");
    expect(migration).toMatch(/revoke all on table public\.spogomi_team_access_grants from public, anon, authenticated/i);
    expect(migration).toMatch(/revoke all on table public\.spogomi_team_access_sessions from public, anon, authenticated/i);
  });

  it("keeps referee authorization scoped to the event", () => {
    expect(migration).toContain("spogomi_event_reviewers");
    expect(migration).toContain("role = 'referee'");
    expect(migration).toContain("assigned_by_clerk_id");
    expect(migration).toContain("spogomi_event_reviewers_service_only");
  });

  it("serializes repeated submissions and concurrent certification by team", () => {
    expect(migration).toContain("spogomi_save_team_submission");
    expect(migration).toContain("spogomi_review_team_submission");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended(p_team_id::text, 0))");
    expect(migration).toContain("team_id, idempotency_key");
    expect(migration).toContain("serialization_failure");
    expect(migration).toContain("spogomi_result_audit_events");
  });

  it("blocks certification without a complete measured category set", () => {
    expect(migration).toContain("new.status in ('submitted', 'certified')");
    expect(migration).toContain("ri.quantity is not null");
    expect(migration).toContain("measurement_method");
    expect(migration).toContain("v_regulation_status <> 'complete'");
  });
});
