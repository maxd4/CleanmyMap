import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";
import { validateSqlText } from "./validate-sql-syntax.mjs";

const root = resolve(import.meta.dirname, "../..");

test("accepts representative PostgreSQL and PL/pgSQL source", async () => {
  const sql = await readFile(resolve(root, "apps/web/supabase/migrations/20261003000004_action_geometry_contributions.sql"), "utf8");
  const result = await validateSqlText(sql, "representative.sql");
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test("detects the seven missing parentheses from the historical projection contract", async () => {
  const path = resolve(root, "apps/web/supabase/tests/public-action-map-reconstruction-projection.pgtap.sql");
  const original = await readFile(path, "utf8");
  const broken = original.replaceAll("::jsonb))", "::jsonb)");
  const result = await validateSqlText(broken, "public-action-map-reconstruction-projection.pgtap.sql");
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 7);
  assert.match(result.errors[0].message, /syntax error/i);
});

test("rejects a data-modifying CTE nested in a pgTAP assertion", async () => {
  const sql = "select is((with changed as (update public.actions set title = 'x' returning *) select count(*) from changed), 1, 'changed');";
  const result = await validateSqlText(sql, "notifications-decision-boundary.pgtap.sql");
  assert.equal(result.ok, false);
  assert.match(result.errors[0].message, /data-modifying CTE/i);
});

test("accepts a top-level data-modifying CTE", async () => {
  const result = await validateSqlText("with changed as (update public.actions set title = 'x' returning *) select count(*) from changed;", "valid.sql");
  assert.equal(result.ok, true, JSON.stringify(result.errors));
});

test("does not inspect an unrelated non-SQL path", async () => {
  const result = await validateSqlText("select 1;", "unrelated.ts");
  assert.equal(result.ok, true);
});
