import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readMigration(name: string): string {
  return readFileSync(new URL(`../../../../supabase/migrations/${name}`, import.meta.url), "utf8")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function readSqlProof(name: string): string {
  return readFileSync(new URL(`../../../../supabase/tests/${name}`, import.meta.url), "utf8")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

describe("ML4 progression and impact migration contracts", () => {
  it("serializes quiz progress and persists only threshold transitions", () => {
    const migration = readMigration("20261028000000_quiz_progression_atomicity.sql");
    expect(migration).toContain("create or replace function public.record_quiz_progression(");
    expect(migration).toContain("pg_advisory_xact_lock(hashtextextended(p_user_id, 0))");
    expect(migration).toContain("for update");
    expect(migration).toContain("on conflict (user_id, event_type, source_table, source_id, status_phase) do nothing");
    expect(migration).toContain("grant execute on function public.record_quiz_progression(text, text, text[], jsonb) to service_role");
    expect(migration).not.toMatch(/grant execute on function public\.record_quiz_progression[\s\S]*to (public|anon|authenticated)/i);
  });

  it("keeps unavailable Codex physical impact nullable", () => {
    const migration = readMigration("20261028000001_codex_usage_na_contract.sql");
    expect(migration).toContain("alter column estimated_kg_co2e_proxy drop not null");
    expect(migration).toContain("alter column estimated_kg_co2e_proxy drop default");
  });

  it("keeps the pgTAP fixtures aligned with the published RPC transitions", () => {
    const proof = readSqlProof("quiz-progression-rpc-boundary.pgtap.sql");
    const plan = proof.match(/select plan\((\d+)\)/)?.[1];
    const assertionCount = [...proof.matchAll(/select (?:ok|is|throws_ok|lives_ok)\(/g)].length;

    expect(plan).toBe("39");
    expect(assertionCount).toBe(39);
    expect(proof).toContain("the balanced milestone is not inserted while the minimum remains nine");
    expect(proof).toContain("the second balanced transition observes nine");
    expect(proof).toContain("the balanced milestone is persisted once under its full identity");
    expect(proof).toContain("replaying the balanced candidate does not create a second event");
    expect(proof).toMatch(/quiz-rpc-rollback.*threshold\":1.*source_id\":null/);
    expect(proof).not.toMatch(/quiz-rpc-balanced.*quiz-b.*\[\]\:\:jsonb/);
  });
});
