import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

import { findPathIntegrityViolations, validatePathIntegrity } from "./check-path-integrity.mjs";
import { findNamingReviewCandidates, validateNaming } from "./check-file-naming.mjs";

function fixtureBaseline(exceptions = [], pathIntegrityExceptions = []) {
  return { version: 1, exceptions, pathIntegrityExceptions };
}

test("detects case collisions and leaves valid cross-platform paths alone", () => {
  const result = validatePathIntegrity({
    trackedFiles: [
      "src/Feature.ts",
      "src/feature.ts",
      "apps/web/src/app/page.tsx",
      "apps/web/src/app/api/test/route.ts",
      "apps/mobile/app/_layout.tsx",
      "apps/mobile/App.tsx",
    ],
    baseline: fixtureBaseline(),
  });
  assert.deepEqual(result.newViolations.map(({ path: file, rule }) => ({ path: file, rule })), [
    { path: "src/feature.ts", rule: "case-collision" },
    { path: "src/Feature.ts", rule: "case-collision" },
  ]);
});

test("detects Unicode NFC collisions", () => {
  const result = findPathIntegrityViolations([
    "src/café.ts",
    "src/cafe\u0301.ts",
  ]);
  assert.deepEqual(result.map(({ path: file, rule }) => ({ path: file, rule })), [
    { path: "src/café.ts", rule: "unicode-normalization-collision" },
    { path: "src/cafe\u0301.ts", rule: "unicode-normalization-collision" },
  ]);
});

test("detects combined NFC and case collisions without duplicate findings", () => {
  const result = findPathIntegrityViolations([
    "src/Café.ts",
    "src/cafe\u0301.ts",
  ]);
  assert.deepEqual(result.map(({ path: file, rule }) => ({ path: file, rule })), [
    { path: "src/cafe\u0301.ts", rule: "case-unicode-normalization-collision" },
    { path: "src/Café.ts", rule: "case-unicode-normalization-collision" },
  ]);
});

test("detects Windows reserved names and forbidden suffixes", () => {
  const result = findPathIntegrityViolations([
    "src/CON.ts",
    "src/LPT1.log",
    "src/trailing-dot.",
    "src/trailing-space ",
    "src/dir\\child.ts",
  ]);
  assert.deepEqual(result.map(({ path: file, rule }) => ({ path: file, rule })), [
    { path: "src/CON.ts", rule: "windows-reserved-name" },
    { path: "src/dir\\child.ts", rule: "windows-backslash-separator" },
    { path: "src/LPT1.log", rule: "windows-reserved-name" },
    { path: "src/trailing-dot.", rule: "windows-forbidden-suffix" },
    { path: "src/trailing-space ", rule: "windows-forbidden-suffix" },
  ]);
});

test("detects superscript Windows device names in every path segment", () => {
  const result = findPathIntegrityViolations([
    "src/COM¹.ts",
    "src/COM².txt",
    "src/COM³",
    "src/LPT¹.ts",
    "src/LPT².txt",
    "src/LPT³",
    "src/COM10.ts",
    "src/LPT10.ts",
    "src/portable/com¹x.ts",
    "src/portable/com¹/file.ts",
  ]);
  assert.deepEqual(result.filter(({ rule }) => rule === "windows-reserved-name").map(({ path: file }) => file), [
    "src/COM¹.ts",
    "src/COM².txt",
    "src/COM³",
    "src/LPT¹.ts",
    "src/LPT².txt",
    "src/LPT³",
    "src/portable/com¹/file.ts",
  ]);
  assert.equal(result.some(({ path: file }) => file.endsWith("COM10.ts")), false);
  assert.equal(result.some(({ path: file }) => file.endsWith("LPT10.ts")), false);
  assert.equal(result.some(({ path: file }) => file.endsWith("com¹x.ts")), false);
});

test("historical path exceptions remain explicit and do not hide new violations", () => {
  const result = validatePathIntegrity({
    trackedFiles: ["src/CON.ts", "src/con.ts"],
    baseline: fixtureBaseline([], [
      { path: "src/CON.ts", rule: "windows-reserved-name", reason: "legacy fixture" },
      { path: "src/con.ts", rule: "windows-reserved-name", reason: "legacy fixture" },
      { path: "src/CON.ts", rule: "case-collision", reason: "legacy fixture" },
      { path: "src/con.ts", rule: "case-collision", reason: "legacy fixture" },
    ]),
  });
  assert.equal(result.newViolations.length, 0);
  assert.equal(result.accepted.length, 4);
});

test("generic, ambiguous and mixed names are review-only candidates", () => {
  const candidates = findNamingReviewCandidates([
    "apps/web/src/lib/actions/format.ts",
    "apps/web/src/lib/community/format.ts",
    "apps/web/src/lib/actions/utils.ts",
    "apps/web/src/lib/actions/legacy-name.ts",
    "apps/web/src/lib/actions/LegacyName.ts",
    "apps/web/src/app/page.tsx",
    "apps/mobile/app/_layout.tsx",
  ]);
  assert.ok(candidates.some(({ path: file, rule }) => file.endsWith("/utils.ts") && rule === "generic-basename"));
  assert.ok(candidates.some(({ path: file, rule }) => file.endsWith("/actions/format.ts") && rule === "ambiguous-domain-basename"));
  assert.ok(candidates.some(({ path: file, rule }) => file.endsWith("/LegacyName.ts") && rule === "mixed-directory-conventions"));
  assert.equal(candidates.some(({ path: file }) => file.endsWith("/app/page.tsx")), false);
  assert.equal(candidates.some(({ path: file }) => file.endsWith("/app/_layout.tsx")), false);
});

test("test fixtures are classified as support and historical Playwright specs stay baselinable", () => {
  const result = validateNaming({
    trackedFiles: [
      "apps/web/src/lib/validation/tests/action-base-payload.ts",
      "e2e/footer-responsive-public.spec.ts",
    ],
    baseline: fixtureBaseline([
      { path: "e2e/footer-responsive-public.spec.ts", rule: "test-suffix", reason: "legacy Playwright spec convention" },
    ]),
  });
  assert.deepEqual(result.newViolations, []);
  assert.equal(result.accepted.length, 1);
});

test("path-integrity dry-run has no write side effect", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-path-integrity-"));
  const script = path.resolve("scripts/checks/check-path-integrity.mjs");
  const baselinePath = path.join(root, "baseline.json");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "safe-name.ts"), "fixture\n");
  fs.writeFileSync(baselinePath, JSON.stringify(fixtureBaseline()));
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "--", "src/safe-name.ts", "baseline.json"], { cwd: root });
  execFileSync("git", ["-c", "user.name=Codex test", "-c", "user.email=codex-test", "commit", "-qm", "fixture"], { cwd: root });
  const before = fs.readdirSync(root).sort();
  const output = execFileSync(process.execPath, [script, "--root", root, "--baseline", baselinePath, "--dry-run"], { encoding: "utf8" });
  assert.match(output, /PATH_INTEGRITY_MODE: DRY_RUN/);
  assert.deepEqual(fs.readdirSync(root).sort(), before);
  fs.rmSync(root, { recursive: true, force: true });
});
