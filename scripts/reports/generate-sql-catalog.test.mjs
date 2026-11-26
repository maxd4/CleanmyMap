import test from "node:test";
import assert from "node:assert/strict";
import {
  extractSqlCatalogFromMigrations,
  checkCatalogFreshness,
  compareGitAndRemoteCatalogs,
  computeMigrationsDigest,
} from "./generate-sql-catalog.mjs";

test("tracks DDL provenance, modifications, drops and dynamic SQL mentions", () => {
  const migrations = [
    {
      name: "20260101000001_init.sql",
      version: "20260101000001",
      sql: `
        CREATE TABLE public.actions (id uuid primary key);
        CREATE FUNCTION public.accept_action_buddy_proposal(p_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 1; $$;
        CREATE POLICY "actions_read" ON public.actions FOR SELECT USING (true);
      `,
    },
    {
      name: "20260101000002_alter.sql",
      version: "20260101000002",
      sql: `
        ALTER TABLE public.actions ADD COLUMN title text;
        CREATE OR REPLACE FUNCTION public.accept_action_buddy_proposal(p_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 2; $$;
        DO $$ BEGIN EXECUTE 'SELECT 1 FROM actions'; END $$;
      `,
    },
  ];
  const catalog = extractSqlCatalogFromMigrations(migrations);
  const actions = catalog.relations.find((r) => r.identity === "public.actions");
  assert.equal(actions.definedIn, "20260101000001_init.sql");
  assert.deepEqual(actions.modifiedIn, ["20260101000002_alter.sql"]);
  const fn = catalog.functions.find((f) => f.identity === "public.accept_action_buddy_proposal");
  assert.equal(fn.definedIn, "20260101000001_init.sql");
  assert.deepEqual(fn.modifiedIn, ["20260101000002_alter.sql"]);
  assert.equal(catalog.policies[0].identity, "public.actions.actions_read");
});

test("rejects stale or unverified catalog in freshness check", () => {
  const sha = "a".repeat(40);
  const stale = checkCatalogFreshness(
    { schemaVersion: 1, report: "sql-catalog-remote-observed", gitSha: "b".repeat(40), provenance: { verified: true } },
    { expectedSha: sha },
  );
  assert.equal(stale.fresh, false);
  assert.ok(stale.errors.some((e) => e.includes("stale gitSha")));

  const unverified = checkCatalogFreshness(
    { schemaVersion: 1, report: "sql-catalog-remote-observed", gitSha: sha, provenance: { verified: false } },
    { expectedSha: sha },
  );
  assert.equal(unverified.fresh, false);
  assert.ok(unverified.errors.some((e) => e.includes("not verified")));
});

test("computes deterministic migration digest and compares git vs remote", () => {
  const d1 = computeMigrationsDigest([{ name: "a.sql", hash: "111" }]);
  const d2 = computeMigrationsDigest([{ name: "a.sql", hash: "222" }]);
  assert.notEqual(d1, d2);

  const cmp = compareGitAndRemoteCatalogs(
    { gitSha: "a".repeat(40), migrations: [{ version: "1" }], objects: { relations: [{ identity: "public.t", droppedIn: [] }], functions: [] } },
    { gitSha: "a".repeat(40), migrations: ["1", "2"], relations: [{ identity: "public.t" }], functions: [] },
  );
  assert.equal(cmp.migrations.aligned, false);
  assert.deepEqual(cmp.migrations.onlyInRemote, ["2"]);
});
