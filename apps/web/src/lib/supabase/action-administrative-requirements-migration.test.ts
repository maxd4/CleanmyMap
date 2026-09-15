import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../../../supabase/migrations/20260915000023_action_administrative_requirements_invoker.sql",
  import.meta.url,
);
const migration = readFileSync(migrationPath, "utf8").toLowerCase();

describe("administrative requirements atomic validation migration", () => {
  it("is a new append-only service operation", () => {
    expect(migration).toContain(
      "create or replace function public.validate_action_administrative_requirements(",
    );
    expect(migration).toContain("p_action_id uuid");
    expect(migration).toContain("p_validated_by_user_id text");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("set search_path = pg_catalog, public");
    expect(migration).toContain(
      "revoke all on function public.validate_action_administrative_requirements(uuid, text)",
    );
    expect(migration).toContain(
      "grant execute on function public.validate_action_administrative_requirements(uuid, text)",
    );
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("drop function");
    expect(migration).not.toContain("drop table");
  });

  it("serializes pending-to-validated CAS and audit in one transaction", () => {
    expect(migration).toContain("from public.actions");
    expect(migration).toContain("for update");
    expect(migration).toContain("if v_status = 'validated' then");
    expect(migration).toContain("if v_status is not null and v_status <> 'pending' then");
    expect(migration).toContain("action_phase = 'pre_action'");
    expect(migration).toContain("insert into public.admin_operations_audit (");
    expect(migration).toContain("'previousvalue', v_previous_requirements");
    expect(migration).toContain("'newvalue', v_next_requirements");
    expect(migration).toContain("'validatedbyuserid', btrim(p_validated_by_user_id)");
    expect(migration).not.toContain("on conflict");
    expect(migration).not.toContain("drop function");
  });

  it("does not grant browser execution", () => {
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).not.toContain("to public;");
    expect(migration).not.toContain("to anon;");
    expect(migration).not.toContain("to authenticated;");
  });
});
