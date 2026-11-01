import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../../supabase/migrations/20260926000001_action_participant_individual_impact.sql", import.meta.url),
  "utf8",
);
const lotsMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261031000007_action_participant_individual_butts_lots.sql", import.meta.url),
  "utf8",
);
const atomicPatchMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261101000007_action_participant_individual_impact_atomic_patch.sql", import.meta.url),
  "utf8",
);
const optimisticConcurrencyMigration = readFileSync(
  new URL("../../../../supabase/migrations/20261101000009_action_participant_individual_impact_optimistic_concurrency.sql", import.meta.url),
  "utf8",
);

describe("individual action impact migration", () => {
  it("is append-only and keeps action_participants as the canonical table", () => {
    expect(migration).toContain("alter table public.action_participants");
    expect(migration).not.toMatch(/drop\s+(column|table)/i);
    expect(migration).not.toContain("create table");
    expect(migration).toContain("individual_waste_kg");
    expect(migration).toContain("individual_cigarette_butts_count");
    expect(migration).toContain("individual_impact_measured_by");
    expect(migration).toContain("individual_impact_measured_at");
  });

  it("constrains nullable raw values without relaxing the existing RLS model", () => {
    expect(migration).toContain("individual_waste_condition in ('sec', 'humide', 'mouille')");
    expect(migration).toContain("individual_cigarette_butts_provenance in ('counted', 'measured', 'derived')");
    expect(migration).toContain("individual_cigarette_butts_count between 0 and 5000000");
    expect(migration).toContain("individual_waste_completeness_check");
    expect(migration).toContain("individual_butts_completeness_check");
    expect(migration).not.toMatch(/enable\s+row\s+level\s+security/i);
    expect(migration).not.toMatch(/create\s+policy/i);
  });

  it("adds canonical lots forward-only and keeps the action total outside the attribution", () => {
    expect(lotsMigration).toContain("add column if not exists individual_cigarette_butts_lots jsonb");
    expect(lotsMigration).toContain("action_participants_individual_butts_lots_shape_check");
    expect(lotsMigration).toContain("restore_action_backup_with_individual_butts_lots");
    expect(lotsMigration).toContain("grant execute on function public.restore_action_backup_with_individual_butts_lots");
    expect(lotsMigration).toContain("historical scalar columns stay as compatibility");
    expect(lotsMigration).not.toMatch(/drop\s+(column|table)/i);
    expect(lotsMigration).not.toMatch(/actions\.cigarette_butts\s*=/i);
    expect(lotsMigration).not.toMatch(/create\s+table/i);
  });

  it("guards the individual impact write with service-role atomic eligibility predicates", () => {
    expect(atomicPatchMigration).toContain("create or replace function public.persist_action_participant_individual_impact");
    expect(atomicPatchMigration).toContain("auth.role()), '') <> 'service_role'");
    expect(atomicPatchMigration).toContain("ap.participation_status = 'confirmed'");
    expect(atomicPatchMigration).toContain("a.status = 'approved'");
    expect(atomicPatchMigration).toContain("public.action_organizers");
    expect(atomicPatchMigration).toContain("grant execute on function public.persist_action_participant_individual_impact");
    expect(atomicPatchMigration).toContain("from public, anon, authenticated");
    expect(atomicPatchMigration).not.toMatch(/create\s+table/i);
  });

  it("upgrades the canonical RPC with a revision guard and deterministic dependency locks", () => {
    expect(optimisticConcurrencyMigration).toContain("drop function if exists public.persist_action_participant_individual_impact");
    expect(optimisticConcurrencyMigration).toContain("p_expected_participant_updated_at timestamptz");
    expect(optimisticConcurrencyMigration).toContain("from public.actions");
    expect(optimisticConcurrencyMigration).toContain("from public.action_participants");
    expect(optimisticConcurrencyMigration).toContain("from public.action_organizers as ao");
    expect(optimisticConcurrencyMigration).toContain("from public.profiles as p");
    expect(optimisticConcurrencyMigration).toContain("v_reviewer_active_role in ('admin', 'max')");
    expect(optimisticConcurrencyMigration).toContain("for update");
    expect(optimisticConcurrencyMigration).toContain("code', 'revision_conflict'");
    expect(optimisticConcurrencyMigration).toContain("'changed', false");
    expect(optimisticConcurrencyMigration).toContain("'changed', true");
    expect(optimisticConcurrencyMigration).toContain("v_participant.updated_at is distinct from p_expected_participant_updated_at");
    expect(optimisticConcurrencyMigration).toContain("grant execute on function public.persist_action_participant_individual_impact");
    expect(optimisticConcurrencyMigration).not.toMatch(/actions\.cigarette_butts\s*=/i);
    expect(optimisticConcurrencyMigration).not.toMatch(/create\s+table/i);
  });
});
