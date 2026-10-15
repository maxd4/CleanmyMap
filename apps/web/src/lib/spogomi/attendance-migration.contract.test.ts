import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../../../supabase/migrations/20261015000022_spogomi_day_operations.sql", import.meta.url), "utf8");
const policyMigration = readFileSync(new URL("../../../supabase/migrations/20261015000023_spogomi_attendance_audit_service_policy.sql", import.meta.url), "utf8");

describe("SPOGOMI day operations migration STATIC_CONTRACT", () => {
  it("keeps check-in event-scoped and outside the observer/referee powers", () => {
    expect(migration).toContain("role in ('observer', 'referee', 'checkin')");
    expect(migration).toContain("access_role in ('observer', 'referee', 'checkin')");
    expect(migration).toContain("spogomi_attendance_audit");
    expect(migration).toMatch(/revoke all on table public\.spogomi_attendance_audit from public, anon, authenticated/i);
    expect(policyMigration).toContain("spogomi_attendance_audit_service_only");
    expect(policyMigration).toContain("to service_role");
  });

  it("records actor, reason and provenance transactionally", () => {
    expect(migration).toContain("spogomi_set_attendance_status");
    expect(migration).toContain("p_actor_clerk_id");
    expect(migration).toContain("p_reason");
    expect(migration).toContain("p_provenance");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("v_previous_status");
  });

  it("makes repeated status decisions idempotent and protects stale corrections", () => {
    expect(migration).toContain("v_previous_status <> p_next_status");
    expect(migration).toContain("p_expected_updated_at");
    expect(migration).toContain("SPOGOMI attendance is stale");
    expect(migration).toContain("grant execute on function public.spogomi_set_attendance_status");
  });
});
