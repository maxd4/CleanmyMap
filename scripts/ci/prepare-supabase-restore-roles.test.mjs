import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRestoreAdminPrivilegeProbeSql,
  buildRolePreflightSql,
  extractRestoreRoleGrants,
  extractRestoreRoleNames,
} from "./prepare-supabase-restore-roles.mjs";

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

test("extracts membership grants separately for the privilege probe", () => {
  const grants = extractRestoreRoleGrants([
    "GRANT service_role TO authenticator;",
    "GRANT anon TO authenticated WITH ADMIN OPTION;",
    "GRANT USAGE ON SCHEMA public TO anon, authenticated;",
  ].join("\n"));
  assert.deepEqual(grants, [
    { grantedRole: "service_role", member: "authenticator" },
    { grantedRole: "anon", member: "authenticated" },
  ]);
});

test("privilege probe tests create, alter and membership rights in a rollback", () => {
  const sql = buildRestoreAdminPrivilegeProbeSql(
    ["anon", "service_role"],
    [{ grantedRole: "service_role", member: "authenticator" }],
  );
  assert.match(sql, /BEGIN;[\s\S]*CREATE ROLE "cmm_restore_privilege_probe" NOLOGIN;/);
  assert.match(sql, /ALTER ROLE "anon" RESET statement_timeout;/);
  assert.match(sql, /GRANT "service_role" TO "authenticator";/);
  assert.match(sql, /DROP ROLE "cmm_restore_privilege_probe";[\s\S]*ROLLBACK;/);
});
