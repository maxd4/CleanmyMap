import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261103000003_territorial_legend_rewards.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");

describe("territorial legend rewards migration", () => {
  it("persists only reconstructible holds and award proofs", () => {
    expect(migration).toContain("create table if not exists public.territorial_legend_hold_periods");
    expect(migration).toContain("create table if not exists public.territorial_legend_award_proofs");
    expect(migration).toContain("territorial_legend_one_open_period");
    expect(migration).toContain("territorial_legend_award_identity");
    expect(migration).toContain("hold_period_id bigint not null references public.territorial_legend_hold_periods(id)");
    expect(migration).toContain("validity_status in ('active', 'closed', 'invalidated')");
  });

  it("protects the snapshot RPC with service_role, a daily lock and no-fictitious-gap closure", () => {
    expect(migration).toContain("create or replace function public.reconcile_territorial_legend_snapshot");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended('territorial-legends:' || p_effective_on::text, 0))");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended('territorial-legends:global', 0))");
    expect(migration).toContain("ended_on = h.last_verified_on");
    expect(migration).toContain("revoke all on function public.reconcile_territorial_legend_snapshot(date, jsonb) from public, anon, authenticated");
    expect(migration).toContain("grant execute on function public.reconcile_territorial_legend_snapshot(date, jsonb) to service_role");
    expect(migration).toContain("auth.role() = 'service_role'");
    expect(migration).toContain("create or replace function public.invalidate_territorial_legend_history");
    expect(migration).toContain("validity_status = 'invalidated'");
    expect(migration).toContain("territorial-legends:correction");
    expect(migration).toContain("grant execute on function public.invalidate_territorial_legend_history(bigint[], text[], date) to service_role");
  });

  it("does not create an XP source or alter the existing XP reconciliation RPC", () => {
    expect(migration).not.toContain("points_ledger");
    expect(migration).not.toContain("xp_awarded integer not null default 1");
    expect(migration).not.toContain("apply_gamification_reconciliation");
  });
});
