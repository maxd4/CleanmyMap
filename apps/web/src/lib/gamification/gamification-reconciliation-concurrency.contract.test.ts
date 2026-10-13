import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261013000013_gamification_reconciliation_atomicity.sql", import.meta.url),
  "utf8",
);
const reconciliation = readFileSync(new URL("./gamification-reconciliation.ts", import.meta.url), "utf8");

describe("gamification reconciliation concurrency contract", () => {
  it("coordinates same-user commits in PostgreSQL and rejects stale snapshots", () => {
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended(p_user_id, 0))");
    expect(migration).toContain("ledger_revision_changed");
    expect(migration).toContain("profile_revision_changed");
    expect(migration).toContain("returns jsonb");
    expect(migration).toContain("grant execute on function public.apply_gamification_reconciliation");
    expect(migration).toContain("grant execute on function public.refresh_gamification_profile");
  });

  it("keeps the canonical ledger, profile and user receipt in the transaction", () => {
    expect(migration).toContain("insert into public.progression_events");
    expect(migration).toContain("insert into public.progression_profiles");
    expect(migration).toContain("insert into public.app_notifications");
    expect(migration).toContain("on conflict do nothing");
    expect(reconciliation).toContain('supabase.rpc("apply_gamification_reconciliation"');
    expect(reconciliation).toContain("GamificationReconciliationConflictError");
    expect(reconciliation).toContain("attempt < 3");
  });

  it("does not introduce an in-memory same-user lock", () => {
    expect(reconciliation).not.toMatch(/Map<.*userId|lock.*Map|mutex/i);
  });
});
