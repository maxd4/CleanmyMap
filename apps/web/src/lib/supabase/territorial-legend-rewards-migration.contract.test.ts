import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261103000003_territorial_legend_rewards.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const contractMigration = readFileSync(
  new URL("../../../supabase/migrations/20261103000004_territorial_legend_rewards_contract.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const annualMigration = readFileSync(
  new URL("../../../supabase/migrations/20261104000001_territorial_legend_annual_campaigns.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const integrityMigration = readFileSync(
  new URL("../../../supabase/migrations/20261104000007_territorial_legend_annual_integrity.sql", import.meta.url),
  "utf8",
).replace(/\s+/g, " ");
const migrationSource = readFileSync(
  new URL("../../../supabase/migrations/20261103000003_territorial_legend_rewards.sql", import.meta.url),
  "utf8",
);
const pgtap = readFileSync(
  new URL("../../../supabase/tests/territorial-legend-rewards-contract.pgtap.sql", import.meta.url),
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
    const holdDefinition = migrationSource.match(/create table if not exists public\.territorial_legend_hold_periods \(([\s\S]*?)\n\);/)?.[1];
    expect(holdDefinition).toBeDefined();
    expect(holdDefinition?.match(/\bupdated_at\s+timestamptz\b/g)).toHaveLength(1);
    expect(migrationSource).toMatch(/create table if not exists public\.territorial_legend_award_proofs[\s\S]*?updated_at timestamptz not null default now\(\)/);
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

  it("keeps the published syntax repair bounded and moves the JSON contract forward", () => {
    expect(migration).toContain("BOUNDED PRE-APPLICATION REPAIR");
    expect(contractMigration).toContain("alter table if exists public.territorial_legend_award_proofs");
    expect(contractMigration).toContain("add column if not exists updated_at timestamptz not null default now()");
    expect(contractMigration).toContain("jsonb_typeof(coalesce(p_winners, '[]'::jsonb)) <> 'array'");
    expect(contractMigration).toContain("item ->> 'user_id'");
    expect(contractMigration).toContain("item ->> 'territory_code'");
    expect(contractMigration).toContain("user_id text");
    expect(contractMigration).toContain("source_fingerprint text");
    expect(contractMigration).not.toContain("item ->> 'userId'");
  });

  it("makes the annual campaign boundary explicit without rewriting old files", () => {
    expect(annualMigration).toContain("add column if not exists campaign_year integer");
    expect(annualMigration).toContain("territorial_legend_conquest_campaign_identity");
    expect(annualMigration).toContain("territorial_legend_season_end_campaign_identity");
    expect(annualMigration).toContain("make_date(v_campaign_year, 12, 31)");
    expect(annualMigration).toContain("array[7, 30, 90, 180]");
    expect(annualMigration).not.toContain("array[7, 30, 90, 180, 365, 730]");
    expect(annualMigration).toContain("item ->> 'campaign_year'");
    expect(annualMigration).toContain(":*:conquest:0");
    expect(annualMigration).toContain("h.campaign_year is distinct from v_campaign_year");
  });

  it("removes inherited award identities and waits for a verifiable civil-year closure", () => {
    expect(integrityMigration).toContain("drop index if exists public.territorial_legend_award_identity");
    expect(integrityMigration).toContain("where campaign_year is null");
    expect(integrityMigration).toContain("from pg_constraint");
    expect(integrityMigration).toContain("pg_get_constraintdef(oid) ilike '%award_kind%'");
    expect(integrityMigration).toContain("territorial_legend_award_proofs_annual_kind_check");
    expect(integrityMigration).toContain("h.last_verified_on = v_previous_campaign_end");
    expect(integrityMigration).toContain("if p_effective_on > v_previous_campaign_end then");
    expect(integrityMigration).toContain("validity_status = 'invalidated'");
    expect(integrityMigration).toContain("on conflict (proof_id) do update");
    expect(integrityMigration).not.toContain("if p_effective_on = make_date(v_campaign_year, 12, 31) then");
    expect(integrityMigration).toContain("grant execute on function public.reconcile_territorial_legend_snapshot(date, jsonb) to service_role");
  });

  it("keeps the PostgreSQL replay contract executable across role changes", () => {
    expect(pgtap).toContain("grant select, update on territorial_legend_contract_state to service_role;");
    expect(pgtap).toContain("reset role; set local role authenticated;");
    expect(pgtap).not.toMatch(/(?:^|;)\s*set_config\(/i);
    expect(pgtap).toContain("'42501', null, 'authenticated cannot invoke snapshot reconciliation'");
    expect(pgtap).toContain("'42501', null, 'authenticated cannot invoke history invalidation'");
    expect(pgtap).toContain("annual integrity migration is registered");
    expect(pgtap).toContain("season-end reward waits until after the civil year ends");
    expect(pgtap).toContain("replaying the closure remains idempotent");
  });
});
