import assert from "node:assert/strict";
import test from "node:test";
import { buildRolePreflightSql, extractRestoreRoleNames } from "./prepare-supabase-restore-roles.mjs";

test("extracts role references without exposing or executing private SQL", () => {
  const roles = extractRestoreRoleNames([
    'CREATE ROLE "managed_role";',
    "ALTER ROLE authenticator SET pgrst.db_schemas = 'public';",
    "GRANT USAGE ON SCHEMA public TO anon, authenticated;",
    "GRANT service_role TO authenticator;",
  ].join("\n"));
  assert.deepEqual(roles, ["anon", "authenticated", "authenticator", "managed_role", "service_role"]);
});

test("preflight creates only absent roles and leaves restore attributes to roles.sql", () => {
  const sql = buildRolePreflightSql(["anon", "managed_role"]);
  assert.match(sql, /IF NOT EXISTS \(SELECT 1 FROM pg_roles WHERE rolname = 'anon'\)/);
  assert.match(sql, /CREATE ROLE %I/);
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
  assert.doesNotMatch(sql, /LOGIN|SUPERUSER|PASSWORD|GRANT/);
});
