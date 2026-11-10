import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261110000006_spogomi_referee_qualification_hardening.sql"), "utf8");
const baseMigration = readFileSync(resolve(process.cwd(), "supabase/migrations/20261110000001_spogomi_referee_qualification.sql"), "utf8");

describe("SPOGOMI referee qualification migration contract", () => {
  it("keeps applications and proofs distinct from participant quiz proofs", () => {
    expect(baseMigration).toContain("create table public.spogomi_referee_applications");
    expect(baseMigration).toContain("create table public.spogomi_referee_quiz_proofs");
    expect(baseMigration).not.toContain("alter table public.spogomi_registration_quiz_proofs");
    expect(baseMigration).toContain("spogomi_referee_quiz_attempts");
    expect(baseMigration).toContain("spogomi_referee_practical_confirmations");
  });

  it("enforces 22 questions, critical unanimity and 90% non-critical threshold in the server function", () => {
    expect((migration.match(/jsonb_build_object\('id','q\d+'/g) ?? []).length).toBe(22);
    expect(migration).not.toContain("v_answer='official'");
    expect(migration).toContain("extensions.hmac");
    expect(migration).toContain("gen_random_bytes(32)");
    expect(migration).toContain("v_critical_correct=v_critical_total");
    expect(migration).toContain("v_other_correct*100 >= v_other_total*90");
    expect(migration).toContain("spogomi_referee_quiz_definition_internal");
    expect(migration).toContain("question - 'correctOptionId' - 'explanation'");
  });

  it("requires practical confirmation and organizer decision before new referee access", () => {
    expect(baseMigration).toContain("status='practical_pending'");
    expect(baseMigration).toContain("v_application.status <> 'practical_pending'");
    expect(baseMigration).toContain("application.status='habilitated'");
    expect(migration).toContain("spogomi_referee_qualification_required");
    expect(migration).toContain("create or replace function public.spogomi_set_operational_access");
    expect(migration).toContain("p_access_role not in ('timekeeper','weigher','data_entry','arbiter','certifier')");
    expect(migration).toContain("spogomi_competitor_referee_conflict");
    expect(migration).toContain("spogomi_referee_application_events");
    expect(migration).toContain("spogomi_referee_scope_current");
    expect(migration).toContain("partial_or_total");
    expect(migration).toContain("referee_application_refused");
    expect(migration).toContain("spogomi-role:%s:%s");
  });
});
