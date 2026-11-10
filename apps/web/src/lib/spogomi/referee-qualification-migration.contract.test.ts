import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261110000001_spogomi_referee_qualification.sql"), "utf8");

describe("SPOGOMI referee qualification migration contract", () => {
  it("keeps applications and proofs distinct from participant quiz proofs", () => {
    expect(migration).toContain("create table public.spogomi_referee_applications");
    expect(migration).toContain("create table public.spogomi_referee_quiz_proofs");
    expect(migration).not.toContain("alter table public.spogomi_registration_quiz_proofs");
    expect(migration).toContain("spogomi_referee_quiz_attempts");
    expect(migration).toContain("spogomi_referee_practical_confirmations");
  });

  it("enforces 20 questions, critical unanimity and 90% non-critical threshold in the server function", () => {
    expect((migration.match(/jsonb_build_object\('id'/g) ?? []).length).toBeGreaterThanOrEqual(20);
    expect(migration).toContain("v_critical_correct=v_critical_total");
    expect(migration).toContain("v_other_correct*100 >= v_other_total*90");
    expect(migration).toContain("spogomi_referee_quiz_definition_internal");
    expect(migration).toContain("question - 'correctOptionId' - 'explanation'");
  });

  it("requires practical confirmation and organizer decision before new referee access", () => {
    expect(migration).toContain("status='practical_pending'");
    expect(migration).toContain("v_application.status <> 'practical_pending'");
    expect(migration).toContain("application.status='habilitated'");
    expect(migration).toContain("spogomi_referee_qualification_required");
    expect(migration).toContain("create or replace function public.spogomi_set_operational_access");
    expect(migration).toContain("p_access_role not in ('timekeeper','weigher','data_entry','arbiter','certifier')");
    expect(migration).toContain("spogomi_competitor_referee_conflict");
    expect(migration).toContain("spogomi_referee_application_events");
  });
});
