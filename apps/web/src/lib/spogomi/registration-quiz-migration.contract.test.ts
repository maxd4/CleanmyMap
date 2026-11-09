import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const quizMigration = readFileSync(new URL("../../../supabase/migrations/20261109000005_spogomi_registration_quiz.sql", import.meta.url), "utf8");
const gateMigration = readFileSync(new URL("../../../supabase/migrations/20261109000006_spogomi_registration_quiz_admission_gate.sql", import.meta.url), "utf8");
const fixMigration = readFileSync(new URL("../../../supabase/migrations/20261109143630_spogomi_registration_quiz_contract_fix.sql", import.meta.url), "utf8");

describe("SPOGOMI registration quiz migration contracts", () => {
  it("persists only a minimal account/event/division/version proof and revokes client RPC access", () => {
    expect(quizMigration).toContain("create table public.spogomi_registration_quiz_proofs");
    expect(quizMigration).toContain("event_id, division_id, clerk_id, quiz_version");
    expect(quizMigration).toContain("create or replace function public.spogomi_registration_quiz_definition");
    expect(quizMigration).toContain("create or replace function public.spogomi_submit_registration_quiz");
    expect(quizMigration).toMatch(/revoke all on function public\.spogomi_submit_registration_quiz[\s\S]+grant execute on function public\.spogomi_submit_registration_quiz[\s\S]+to service_role/i);
    expect(quizMigration).toContain("question - 'correctOptionId' - 'explanation'");
  });

  it("checks the current quiz version after replay and readiness, before inserting a new registration", () => {
    expect(gateMigration).toContain("spogomi_registration_quiz_required");
    expect(gateMigration).toContain("spogomi_registration_quiz_definition");
    expect(gateMigration).toContain("quiz_version = v_quiz_version");
    expect(gateMigration.indexOf("if found then")).toBeLessThan(gateMigration.indexOf("spogomi_registration_quiz_required"));
    expect(gateMigration.indexOf("spogomi_registration_quiz_required")).toBeLessThan(gateMigration.indexOf("insert into public.spogomi_team_join_requests"));
  });

  it("keeps team-join requests outside the new-registration quiz gate", () => {
    expect(gateMigration).toContain("elsif p_request_kind = 'team_join' and p_team_id is null");
    expect(gateMigration.match(/spogomi_registration_quiz_required/g)).toHaveLength(1);
    expect(gateMigration).toContain("if p_request_kind = 'registration' then");
  });

  it("repairs the post-00007 conflict target and rotates answer positions server-side", () => {
    expect(fixMigration).toContain("spogomi_registration_quiz_definition_legacy");
    expect(fixMigration).toContain("spogomi_submit_registration_quiz_legacy");
    expect(fixMigration).toContain("spogomi_registration_quiz_rotate_options");
    expect(fixMigration).toContain("get_byte(decode(v_seed, 'hex'), 0) % 2 = 0");
    expect(fixMigration).toContain("'choice_a'");
    expect(fixMigration).toContain("'choice_b'");
    expect(fixMigration).toContain("on conflict (event_id, division_id, clerk_id, quiz_version, registration_contract_revision)");
    expect(fixMigration).toContain("v_other_correct * 100 >= v_other_total * 80");
    expect(fixMigration).toContain("v_contract_revision bigint");
    expect(fixMigration).not.toContain("correctOptionId', 'official'");
    expect(fixMigration).toMatch(/revoke all on function public\.spogomi_submit_registration_quiz[\s\S]+grant execute on function public\.spogomi_submit_registration_quiz[\s\S]+to service_role/i);
  });
});
