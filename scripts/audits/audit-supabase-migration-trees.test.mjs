import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  auditMigrationTree,
  findPublishedMigrationRewriteViolations,
  findLegacySpotsRuntimeSurfaceViolations,
} from "./audit-supabase-migration-trees.mjs";

const auditScript = fileURLToPath(new URL("./audit-supabase-migration-trees.mjs", import.meta.url));
const publishedMigration = "20260101000000_published.sql";

function git(root, args, options = {}) {
  return execFileSync("git", args, { cwd: root, ...options });
}

function writeMigration(root, name, content) {
  const target = path.join(root, "apps", "web", "supabase", "migrations", name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function createMigrationRepository(t, entries = { [publishedMigration]: "published v1\n" }) {
  const root = mkdtempSync(path.join(os.tmpdir(), "cleanmymap-migration-audit-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Codex migration audit"]);
  git(root, ["config", "user.email", "codex-migration-audit.invalid"]);
  for (const [name, content] of Object.entries(entries)) writeMigration(root, name, content);
  git(root, ["add", "--", "."]);
  git(root, ["commit", "-qm", "published migrations"]);
  return root;
}

function currentRef(root) {
  return git(root, ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

function runAudit(root, args = []) {
  const result = spawnSync(process.execPath, [auditScript, ...args], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

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

it("allows a traceable historical restoration but rejects an unreviewed rewrite", () => {
  const baselineMigrations = new Map([
    ["20261013000006_spogomi_ticket_decision_consistency.sql", { content: "published bad definition" }],
  ]);
  const candidateMigrations = new Map([
    ["20261013000006_spogomi_ticket_decision_consistency.sql", { content: "published pre-rewrite definition" }],
  ]);

  assert.deepEqual(
    findPublishedMigrationRewriteViolations({
      baselineMigrations,
      candidateMigrations,
      historicalContentsByPath: new Map([
        ["20261013000006_spogomi_ticket_decision_consistency.sql", ["published bad definition", "published pre-rewrite definition"]],
      ]),
    }),
    [],
  );

  assert.match(
    findPublishedMigrationRewriteViolations({
      baselineMigrations,
      candidateMigrations: new Map([
        ["20261013000006_spogomi_ticket_decision_consistency.sql", { content: "unreviewed rewrite" }],
      ]),
      historicalContentsByPath: new Map([
        ["20261013000006_spogomi_ticket_decision_consistency.sql", ["published bad definition"]],
      ]),
    })[0],
    /published migration content changed/,
  );
});

it("allows only an explicitly hashed bounded migration repair", () => {
  const name = "20260101000000_published.sql";
  const content = "bounded repair\n";
  const hash = createHash("sha256").update(content, "utf8").digest("hex");

  assert.deepEqual(
    findPublishedMigrationRewriteViolations({
      baselineMigrations: new Map([[name, { content: "published v1\n" }]]),
      candidateMigrations: new Map([[name, { content }]]),
      approvedRewriteHashes: new Map([[name, new Set([hash])]]),
    }),
    [],
  );
});

it("normalizes Buffer and UTF-8 string contents before comparing migrations", () => {
  const name = "20260101000000_published.sql";
  assert.deepEqual(
    findPublishedMigrationRewriteViolations({
      baselineMigrations: new Map([[name, { content: Buffer.from("published\n", "utf8") }]]),
      candidateMigrations: new Map([[name, { content: "published\n" }]]),
    }),
    [],
  );
});

it("accepts an unchanged staged index and ignores an unrelated dirty worktree", (t) => {
  const root = createMigrationRepository(t);
  const unchanged = runAudit(root, ["--staged"]);
  assert.equal(unchanged.status, 0, unchanged.stderr);

  writeMigration(root, "20260101000001_additive.sql", "-- additive migration\n");
  git(root, ["add", "--", "apps/web/supabase/migrations/20260101000001_additive.sql"]);
  writeMigration(root, publishedMigration, "unrelated unstaged rewrite\n");

  const staged = runAudit(root, ["--staged"]);
  assert.equal(staged.status, 0, staged.stderr);
  assert.match(staged.stdout, /published migration history/);
});

it("accepts a staged restoration of an exact historically published version", (t) => {
  const root = createMigrationRepository(t);
  writeMigration(root, publishedMigration, "published v2\n");
  git(root, ["add", "--", "."]);
  git(root, ["commit", "-qm", "published second version"]);

  writeMigration(root, publishedMigration, "published v1\n");
  git(root, ["add", "--", `apps/web/supabase/migrations/${publishedMigration}`]);

  const result = runAudit(root, ["--staged"]);
  assert.equal(result.status, 0, result.stderr);
});

it("rejects a staged rewrite with content absent from published history", (t) => {
  const root = createMigrationRepository(t);
  writeMigration(root, publishedMigration, "unreviewed novel rewrite\n");
  git(root, ["add", "--", `apps/web/supabase/migrations/${publishedMigration}`]);

  const result = runAudit(root, ["--staged"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /published migration content changed/);
});

it("rejects deletion of a published migration from the staged index", (t) => {
  const root = createMigrationRepository(t, {
    [publishedMigration]: "published v1\n",
    "20260101000001_survivor.sql": "-- survivor\n",
  });
  const target = path.join(root, "apps", "web", "supabase", "migrations", publishedMigration);
  rmSync(target);
  git(root, ["add", "-u", "--", `apps/web/supabase/migrations/${publishedMigration}`]);

  const result = runAudit(root, ["--staged"]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /published migration deletion is not allowed/);
});

it("preserves immutable-history checks when comparing two Git refs", (t) => {
  const root = createMigrationRepository(t);
  const baseRef = currentRef(root);

  writeMigration(root, "20260101000001_additive.sql", "-- additive migration\n");
  git(root, ["add", "--", "."]);
  git(root, ["commit", "-qm", "candidate additive migration"]);
  const additiveRef = currentRef(root);
  const additiveResult = runAudit(root, [`--ref=${additiveRef}`, `--base-ref=${baseRef}`]);
  assert.equal(additiveResult.status, 0, additiveResult.stderr);

  writeMigration(root, publishedMigration, "unreviewed ref rewrite\n");
  git(root, ["add", "--", "."]);
  git(root, ["commit", "-qm", "candidate rewrite"]);
  const rewriteRef = currentRef(root);
  const rewriteResult = runAudit(root, [`--ref=${rewriteRef}`, `--base-ref=${baseRef}`]);
  assert.equal(rewriteResult.status, 2);
  assert.match(rewriteResult.stderr, /published migration content changed/);
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

it("keeps malformed grants rejected without scanning superlinearly", () => {
  const adversarialSql = normalizeSql(`grant ${"update ".repeat(20_000)} public.spots to anon;`);
  const startedAt = performance.now();
  const violations = findLegacySpotsRuntimeSurfaceViolations("fixture.sql", adversarialSql);
  const elapsedMs = performance.now() - startedAt;

  assert.deepEqual(violations, []);
  assert.ok(elapsedMs < 1_000, `bounded grant analysis took ${elapsedMs.toFixed(1)}ms`);
});
