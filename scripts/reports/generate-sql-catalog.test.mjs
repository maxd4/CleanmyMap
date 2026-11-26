import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  extractSqlCatalogFromMigrations,
  checkCatalogFreshness,
  compareGitAndRemoteCatalogs,
  computeMigrationsDigest,
  buildGitSqlCatalog,
} from "./generate-sql-catalog.mjs";

test("tracks DDL provenance, drops followed by recreations, renames and overloads", () => {
  const migrations = [
    {
      name: "20260101000001_init.sql",
      version: "20260101000001",
      sql: `
        CREATE TABLE public.legacy_items (id uuid primary key);
        CREATE FUNCTION public.accept_action_buddy_proposal(p_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 1; $$;
        CREATE FUNCTION public.accept_action_buddy_proposal(p_id uuid, p_note text) RETURNS void LANGUAGE sql AS $$ SELECT 2; $$;
        CREATE POLICY "items_read" ON public.legacy_items FOR SELECT USING (true);
      `,
    },
    {
      name: "20260101000002_evolve.sql",
      version: "20260101000002",
      sql: `
        ALTER TABLE public.legacy_items RENAME TO current_items;
        DROP FUNCTION public.accept_action_buddy_proposal(uuid);
        CREATE FUNCTION public.accept_action_buddy_proposal(p_id uuid) RETURNS void LANGUAGE sql AS $$ SELECT 3; $$;
        DO $$ BEGIN EXECUTE 'SELECT 1 FROM current_items'; END $$;
      `,
    },
  ];
  const catalog = extractSqlCatalogFromMigrations(migrations);
  const renamed = catalog.relations.find((r) => r.identity === "public.current_items");
  assert.equal(renamed.active, true);
  assert.equal(renamed.definedIn, "20260101000001_init.sql");
  assert.deepEqual(renamed.renamedFrom, [{ from: "public.legacy_items", migration: "20260101000002_evolve.sql" }]);

  const oldRel = catalog.relations.find((r) => r.identity === "public.legacy_items");
  assert.equal(oldRel.active, false);
  assert.equal(oldRel.renamedTo, "public.current_items");

  const fn1 = catalog.functions.find((f) => f.identity === "public.accept_action_buddy_proposal(uuid)");
  const fn2 = catalog.functions.find((f) => f.identity === "public.accept_action_buddy_proposal(uuid, text)");
  assert.ok(fn1 && fn2, "overloaded signatures must be tracked separately");
  assert.equal(fn1.active, true);
  assert.deepEqual(fn1.droppedIn, ["20260101000002_evolve.sql"]);
  assert.deepEqual(fn1.recreatedIn, ["20260101000002_evolve.sql"]);
});

test("reads immutable Git tree by SHA, ignores dirty worktree, and checks consumer freshness", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "cmm-sql-catalog-"));
  const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  try {
    git("init");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");

    fs.mkdirSync(path.join(repo, "apps/web/supabase/migrations"), { recursive: true });
    fs.mkdirSync(path.join(repo, "apps/web/src/lib"), { recursive: true });
    fs.writeFileSync(path.join(repo, "apps/web/supabase/migrations/20260101000001_init.sql"), "CREATE TABLE public.t1 (id uuid);");
    fs.writeFileSync(path.join(repo, "apps/web/src/lib/client.ts"), 'supabase.from("t1").select("*");');
    git("add", ".");
    git("commit", "-m", "c1");
    const sha1 = git("rev-parse", "HEAD");

    fs.writeFileSync(path.join(repo, "apps/web/src/lib/client.ts"), 'supabase.from("t1").select("*"); supabase.rpc("fn1");');
    git("add", ".");
    git("commit", "-m", "c2");
    const sha2 = git("rev-parse", "HEAD");

    // Dirty worktree addition that must be ignored by --source git
    fs.writeFileSync(path.join(repo, "apps/web/supabase/migrations/20260101000002_dirty.sql"), "CREATE TABLE public.dirty_tbl (id uuid);");
    fs.writeFileSync(path.join(repo, "apps/web/src/lib/dirty.ts"), 'supabase.from("dirty_tbl");');

    const cat1 = buildGitSqlCatalog({ root: repo, ref: sha1, source: "git" });
    assert.equal(cat1.gitSha, sha1);
    assert.equal(cat1.provenance.verified, true);
    assert.equal(cat1.provenance.measuredSource, "git");
    assert.equal(cat1.objects.relations.some((r) => r.identity === "public.dirty_tbl"), false);
    assert.equal(cat1.consumers.rpc["public.fn1"], undefined);

    // Freshness against sha2 (HEAD) must fail for cat1 (stale SHA + consumersHash)
    const stale = checkCatalogFreshness(cat1, { root: repo, expectedSha: sha2 });
    assert.equal(stale.fresh, false);
    assert.ok(stale.errors.some((e) => e.includes("stale gitSha")));
    assert.ok(stale.errors.some((e) => e.includes("stale consumersHash")));

    // Catalog for HEAD (sha2) ignores dirty worktree and passes freshness against sha2
    const cat2 = buildGitSqlCatalog({ root: repo, ref: sha2, source: "git" });
    assert.equal(cat2.objects.relations.some((r) => r.identity === "public.dirty_tbl"), false);
    assert.deepEqual(cat2.consumers.rpc["public.fn1"], ["apps/web/src/lib/client.ts"]);
    assert.equal(checkCatalogFreshness(cat2, { root: repo, expectedSha: sha2 }).fresh, true);

    // Worktree mode must mark provenance.verified = false and fail freshness
    const wt = buildGitSqlCatalog({ root: repo, source: "worktree" });
    assert.equal(wt.provenance.verified, false);
    assert.equal(wt.provenance.measuredSource, "worktree");
    assert.equal(checkCatalogFreshness(wt, { root: repo, expectedSha: sha2 }).fresh, false);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("computes deterministic migration digest and compares git vs remote", () => {
  const d1 = computeMigrationsDigest([{ name: "a.sql", hash: "111" }]);
  const d2 = computeMigrationsDigest([{ name: "a.sql", hash: "222" }]);
  assert.notEqual(d1, d2);

  const cmp = compareGitAndRemoteCatalogs(
    { gitSha: "a".repeat(40), migrations: [{ version: "1" }], objects: { relations: [{ identity: "public.t", active: true, droppedIn: [] }], functions: [] } },
    { gitSha: "a".repeat(40), migrations: ["1", "2"], relations: [{ identity: "public.t" }], functions: [] },
  );
  assert.equal(cmp.migrations.aligned, false);
  assert.deepEqual(cmp.migrations.onlyInRemote, ["2"]);
});

test("includes recreated and renamed objects in compareGitAndRemoteCatalogs and rejects unknown report types", () => {
  const sha = "a".repeat(40);
  const migrations = [
    {
      name: "20261126000005_init.sql",
      version: "20261126000005",
      sql: `
        CREATE TABLE public.old_tbl (id uuid);
        CREATE FUNCTION public.list_external_action_sync_subscriptions() RETURNS void LANGUAGE sql AS $$ SELECT 1; $$;
      `,
    },
    {
      name: "20261126000006_recreate.sql",
      version: "20261126000006",
      sql: `
        ALTER TABLE public.old_tbl RENAME TO new_tbl;
        DROP FUNCTION public.list_external_action_sync_subscriptions();
        CREATE FUNCTION public.list_external_action_sync_subscriptions() RETURNS void LANGUAGE sql AS $$ SELECT 2; $$;
      `,
    },
  ];
  const extracted = extractSqlCatalogFromMigrations(migrations);
  const cmp = compareGitAndRemoteCatalogs(
    { gitSha: sha, migrations: migrations.map((m) => ({ version: m.version })), objects: extracted },
    {
      gitSha: sha,
      migrations: ["20261126000005", "20261126000006"],
      relations: [{ identity: "public.new_tbl" }],
      functions: [{ identity: "public.list_external_action_sync_subscriptions()" }],
    },
  );
  assert.equal(cmp.migrations.aligned, true);
  assert.deepEqual(cmp.relations.inRemoteNotGitAst, []);
  assert.deepEqual(cmp.functions.inRemoteNotGitAst, []);

  const unknownReport = checkCatalogFreshness(
    { schemaVersion: 1, report: "unknown-catalog-type", gitSha: sha, provenance: { verified: true, measuredSource: "git" } },
    { expectedSha: sha },
  );
  assert.equal(unknownReport.fresh, false);
  assert.ok(unknownReport.errors.some((e) => e.includes("unsupported catalog report type")));
});
