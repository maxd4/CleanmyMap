import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const proof = await readFile(new URL("../../.github/workflows/supabase-backup-restore-proof.yml", import.meta.url), "utf8");
const backup = await readFile(new URL("../../.github/workflows/supabase-backup.yml", import.meta.url), "utf8");
const executor = await readFile(new URL("./run-supabase-restore-check.sh", import.meta.url), "utf8");

test("both workflows consume the single restore-check executor", () => {
  assert.equal((proof.match(/bash scripts\/ci\/run-supabase-restore-check\.sh/g) ?? []).length, 1);
  assert.equal((backup.match(/bash scripts\/ci\/run-supabase-restore-check\.sh/g) ?? []).length, 1);
  assert.doesNotMatch(proof, /run_stage\s+|docker exec .*cmm-restore-checks|node scripts\/ci\/verify-supabase-backup-relation-coherence/);
  assert.doesNotMatch(backup, /run_restore_stage\s+|docker exec .*cmm-restore-checks|node scripts\/ci\/verify-supabase-backup-relation-coherence/);
});

test("shared executor preserves fail-closed PostgreSQL and privacy contracts", () => {
  for (const required of [
    "ON_ERROR_STOP=1",
    "VERBOSITY=verbose",
    "session_replication_role = replica",
    "cmm-restore-extension-preflight.sql",
    "prepare-supabase-restore-roles.mjs",
    "RESTORE_ADMIN_PRIVILEGES: PASS",
    "RESTORE_ADMIN_PRIVILEGES: FAIL",
    "cmm_backup_missing_extension_fixture",
    "cmm_backup_coherence_fixture",
    "restore_business_relations",
    "n.nspname in ('public', 'private')",
    "pg_constraint",
    "pronamespace = 'private'::regnamespace",
    "pg_policy",
    "fn_ns.nspname = 'private'",
    "relrowsecurity",
    "role_table_grants",
    "gist_geometry_ops_2d",
    "gin_trgm_ops",
    "grep -qx 't|t|t|t|t|t|t|t|t|t|t|t|t'",
  ]) assert.match(executor, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(executor, /cat .*restore-(roles|schema|data)\.log/);
});
