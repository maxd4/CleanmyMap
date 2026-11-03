import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  classifyPath,
  countPhysicalLines,
  createReport,
  measureEntries,
  selectCommitAtOrBefore,
} from "./repository-growth.mjs";

test("classifies the mutually exclusive repository categories", () => {
  assert.equal(classifyPath("apps/web/src/page.tsx"), "web_runtime");
  assert.equal(classifyPath("apps/web/src/page.test.tsx"), "web_tests");
  assert.equal(classifyPath("apps/mobile/__tests__/storage.test.ts"), "mobile_tests");
  assert.equal(classifyPath("e2e/actions.spec.ts"), "e2e_tests");
  assert.equal(classifyPath("scripts/reports/repository-growth.test.mjs"), "script_tests");
  assert.equal(classifyPath("documentation/development/TESTING.md"), "documentation");
  assert.equal(classifyPath("apps/web/supabase/migrations/001.sql"), "sql_migrations");
  assert.equal(classifyPath("package-lock.json"), "vendored_generated_lockfiles");
  assert.equal(classifyPath("apps/mobile/vendor/node-forge/index.js"), "vendored_generated_lockfiles");
  assert.equal(classifyPath("apps/web/src/example.generated.ts"), "vendored_generated_lockfiles");
  assert.equal(classifyPath("apps/web/public/map.webp"), "media_binaries");
  assert.equal(classifyPath(".github/workflows/ci.yml"), "shared_infrastructure");
  assert.equal(classifyPath("package.json"), "data_configuration");
});

test("keeps E2E, script tests, scripts and shared infrastructure in distinct buckets", () => {
  const paths = [
    "e2e/actions.spec.ts",
    "scripts/reports/repository-growth.test.mjs",
    "scripts/reports/repository-growth.mjs",
    ".github/workflows/ci.yml",
    "documentation/development/TESTING.md",
    "apps/mobile/vendor/node-forge/index.js",
  ];
  const categories = paths.map(classifyPath);
  assert.equal(new Set(categories).size, paths.length);
  assert.deepEqual(categories, ["e2e_tests", "script_tests", "scripts_ci", "shared_infrastructure", "documentation", "vendored_generated_lockfiles"]);
});

test("counts physical lines for LF, CRLF, lone CR, empty and unterminated content", () => {
  assert.equal(countPhysicalLines(Buffer.alloc(0)), 0);
  assert.equal(countPhysicalLines(""), 0);
  assert.equal(countPhysicalLines("a\n"), 1);
  assert.equal(countPhysicalLines("a\nb"), 2);
  assert.equal(countPhysicalLines("a\r\nb\r\n"), 2);
  assert.equal(countPhysicalLines("a\rb\r"), 2);
  assert.equal(countPhysicalLines("é\n"), 1);
});

test("measureEntries counts each tree entry once and preserves exact bytes", () => {
  const contents = new Map([
    ["apps/web/src/a.ts", Buffer.from("a\r\nb", "utf8")],
    ["apps/web/src/a.test.ts", Buffer.from("test\n", "utf8")],
    ["apps/web/public/image.bin", Buffer.from([0, 1, 2])],
    ["README.md", Buffer.from("readme", "utf8")],
  ]);
  const entries = [...contents].map(([file, content]) => ({ type: "blob", path: file, size: content.length }));
  const report = measureEntries(entries, (file) => contents.get(file));
  assert.equal(report.totals.files, entries.length);
  assert.equal(report.totals.bytes, [...contents.values()].reduce((sum, value) => sum + value.length, 0));
  assert.equal(report.categories.web_runtime.physicalLines, 2);
  assert.equal(report.categories.web_tests.physicalLines, 1);
  assert.equal(report.categories.media_binaries.physicalLines, null);
});

test("measureEntries has a single accounting owner for every tree entry", () => {
  const contents = new Map([
    ["apps/web/src/page.tsx", Buffer.from("web\n")],
    ["apps/web/src/page.test.tsx", Buffer.from("test\n")],
    ["apps/mobile/src/map.tsx", Buffer.from("mobile\n")],
    ["apps/mobile/src/map.test.tsx", Buffer.from("test\n")],
    ["e2e/map.spec.ts", Buffer.from("e2e\n")],
    ["scripts/checks/check.mjs", Buffer.from("script\n")],
    ["documentation/README.md", Buffer.from("docs\n")],
    ["package-lock.json", Buffer.from("{}\n")],
    [".github/workflows/ci.yml", Buffer.from("name: ci\n")],
  ]);
  const entries = [...contents].map(([file, content]) => ({ type: "blob", path: file, size: content.length }));
  const report = measureEntries(entries, (file) => contents.get(file));
  const categoryFileTotal = Object.values(report.categories).reduce((sum, category) => sum + category.files, 0);
  assert.equal(categoryFileTotal, entries.length);
  assert.equal(report.totals.files, entries.length);
  assert.equal(report.categories.e2e_tests.files, 1);
  assert.equal(report.categories.script_tests.files, 0);
  assert.equal(report.categories.scripts_ci.files, 1);
  assert.equal(report.categories.shared_infrastructure.files, 1);
});

test("selects the deterministic first-parent commit at or before a UTC boundary", () => {
  const commits = [
    { sha: "new", epochSeconds: 300 },
    { sha: "middle", epochSeconds: 200 },
    { sha: "old", epochSeconds: 100 },
  ];
  assert.equal(selectCommitAtOrBefore(commits, 250)?.sha, "middle");
  assert.equal(selectCommitAtOrBefore(commits, 50), null);
});

test("creates a reproducible two-ref report from real commits without mutating the repository", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-growth-") );
  const run = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    run(["init", "-q"]);
    run(["branch", "-M", "main"]);
    fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "README.md"), "one\n", "utf8");
    fs.writeFileSync(path.join(root, "apps", "web", "src", "page.tsx"), "export const page = 1;\n", "utf8");
    run(["add", "."]);
    run(["-c", "user.name=Codex", "-c", "user.email=codex-test", "commit", "-qm", "one"]);
    const first = run(["rev-parse", "HEAD"]);
    fs.writeFileSync(path.join(root, "README.md"), "one\ntwo\n", "utf8");
    run(["add", "."]);
    run(["-c", "user.name=Codex", "-c", "user.email=codex-test", "commit", "-qm", "two"]);
    const second = run(["rev-parse", "HEAD"]);
    const before = run(["status", "--porcelain"]);
    const report = createReport({ root, ref: second, compare: first, branch: "main", months: 2 });
    const after = run(["status", "--porcelain"]);
    assert.equal(report.current.ref.resolved, second);
    assert.equal(report.comparison.base.resolved, first);
    assert.equal(report.comparison.delta.files.absolute, 0);
    assert.equal(report.comparison.delta.bytes.absolute, 4);
    assert.ok(report.monthly.points.some((point) => point.status === "MISSING_HISTORY"));
    assert.equal(report.windows["30"].status, "INSUFFICIENT_HISTORY");
    assert.equal(report.windows["90"].status, "INSUFFICIENT_HISTORY");
    assert.equal(before, after);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
