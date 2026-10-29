import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20261030000004_idempotent_school_action_recognition_reconciliation.sql",
), "utf8");

describe("school recognition reconciliation migration contract", () => {
  it("keeps the guarded RPC idempotent through an explicit conflict update", () => {
    expect(migration).toMatch(/create or replace function public\.reconcile_school_action_collective_recognitions/i);
    expect(migration).toMatch(/security definer/i);
    expect(migration).toMatch(/set search_path\s*=\s*public,\s*pg_catalog/i);
    expect(migration).toMatch(/auth\.role\(\)\s*<>\s*'service_role'/i);
    expect(migration).toMatch(/from public\.actions[\s\S]*for update/i);
    expect(migration).toMatch(/v_action\.updated_at is distinct from p_expected_action_updated_at/i);
    expect(migration).toMatch(/school_first_mission[\s\S]*school_documented_sorting[\s\S]*school_field_debrief/i);
    expect(migration).toMatch(/on conflict\s*\(action_id,\s*recognition_id\)\s*do update set/i);
    expect(migration).toMatch(/status\s*=\s*EXCLUDED\.status/i);
    expect(migration).toMatch(/proof_snapshot\s*=\s*EXCLUDED\.proof_snapshot/i);
    expect(migration).toMatch(/invalidated_reason\s*=\s*EXCLUDED\.invalidated_reason/i);
    expect(migration).toMatch(/evaluated_at\s*=\s*EXCLUDED\.evaluated_at/i);
    expect(migration).toMatch(/evaluated_by_clerk_id\s*=\s*EXCLUDED\.evaluated_by_clerk_id/i);
    expect(migration).toMatch(/grant execute on function[\s\S]*to service_role/i);
    expect(migration).not.toMatch(/grant execute on function[\s\S]*to (anon|authenticated)/i);

    const conflictIndex = migration.toLowerCase().indexOf("on conflict (action_id, recognition_id)");
    const returnIndex = migration.toLowerCase().indexOf("return query select 'reconciled'");
    expect(conflictIndex).toBeGreaterThan(-1);
    expect(conflictIndex).toBeLessThan(returnIndex);
  });
});
