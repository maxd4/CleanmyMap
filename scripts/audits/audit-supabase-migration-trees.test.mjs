import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { findLegacySpotsRuntimeSurfaceViolations } from "./audit-supabase-migration-trees.mjs";

function normalizeSql(sql) {
  return sql.replace(/\s+/g, " ");
}

it("accepts the PERF-01 SELECT-only spots policy alteration", () => {
  const migration = readFileSync(
    new URL(
      "../../apps/web/supabase/migrations/20260827120000_close_performance_advisor_rls_initplan_and_duplicate_indexes.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.deepEqual(
    findLegacySpotsRuntimeSurfaceViolations(
      "20260827120000_close_performance_advisor_rls_initplan_and_duplicate_indexes.sql",
      normalizeSql(migration),
    ),
    [],
  );
});

for (const [command, sql] of [
  ["INSERT", "create policy spots_write on public.spots for insert with check (true);"],
  ["UPDATE", "create policy spots_write on public.spots for update using (true);"],
  ["ALL", "create policy spots_write on public.spots for all using (true);"],
]) {
  it(`rejects CREATE POLICY FOR ${command} on public.spots`, () => {
    assert.equal(findLegacySpotsRuntimeSurfaceViolations("fixture.sql", normalizeSql(sql)).length, 1);
  });
}

it("still rejects reintroducing the legacy write function", () => {
  assert.equal(
    findLegacySpotsRuntimeSurfaceViolations(
      "fixture.sql",
      "create or replace function public.create_spot_with_progression(uuid) returns uuid;",
    ).length,
    1,
  );
});

it("rejects altering a legacy public.spots write policy", () => {
  assert.equal(
    findLegacySpotsRuntimeSurfaceViolations(
      "fixture.sql",
      "alter policy spots_insert_authenticated on public.spots using (true);",
    ).length,
    1,
  );
});

for (const sql of [
  "grant insert on table public.spots to anon;",
  "grant update (label) on table public.spots to authenticated;",
  "grant all privileges on public.spots to anon, authenticated;",
]) {
  it(`rejects a public.spots write grant to client roles: ${sql}`, () => {
    assert.equal(findLegacySpotsRuntimeSurfaceViolations("fixture.sql", normalizeSql(sql)).length, 1);
  });
}
