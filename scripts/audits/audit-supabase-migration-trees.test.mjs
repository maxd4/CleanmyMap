import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import {
  auditMigrationTree,
  findLegacySpotsRuntimeSurfaceViolations,
} from "./audit-supabase-migration-trees.mjs";

function createView(files) {
  const entries = new Map(Object.entries(files));
  const directories = new Set();
  for (const file of entries.keys()) {
    const parts = file.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  }

  return {
    exists: (relativePath) => entries.has(relativePath) || directories.has(relativePath),
    listFiles: (prefix) => [...entries.keys()].filter((file) => file.startsWith(`${prefix}/`)),
    readBinary: (relativePath) => Buffer.from(entries.get(relativePath), "utf8"),
  };
}

it("accepts the canonical migration tree when no root Supabase namespace exists", () => {
  const result = auditMigrationTree(
    createView({
      "apps/web/supabase/migrations/20260101000000_safe.sql": "-- canonical migration",
    }),
  );

  assert.equal(result.status, 0);
  assert.equal(result.canonicalCount, 1);
});

it("rejects a root Supabase migrations directory", () => {
  const result = auditMigrationTree(
    createView({
      "apps/web/supabase/migrations/20260101000000_safe.sql": "-- canonical migration",
      "supabase/migrations/20260102000000_forbidden.sql": "-- duplicate root tree",
    }),
  );

  assert.equal(result.status, 2);
  assert.match(result.error, /supabase\//);
});

it("rejects any other content under the root Supabase namespace", () => {
  const result = auditMigrationTree(
    createView({
      "apps/web/supabase/migrations/20260101000000_safe.sql": "-- canonical migration",
      "supabase/.temp/cli-latest": "generated CLI state",
    }),
  );

  assert.equal(result.status, 2);
  assert.match(result.error, /root Supabase namespace/);
});

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
