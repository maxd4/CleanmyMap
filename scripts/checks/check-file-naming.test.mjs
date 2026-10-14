import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";

import { classifyFile, findNamingViolations, runNamingCheck, validateNaming } from "./check-file-naming.mjs";

function fixtureBaseline(exceptions = []) { return { version: 1, exceptions }; }

function writeFile(root, relativePath, content = "fixture\n") {
  const target = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

test("classifies the requested fixture categories and reserved names", () => {
  assert.equal(classifyFile("app/page.tsx"), "Next reserved");
  assert.equal(classifyFile("app/route.ts"), "Next reserved");
  assert.equal(classifyFile("src/my-feature.ts"), "TS/TSX");
  assert.equal(classifyFile("src/my-feature.test.ts"), "tests");
  assert.equal(classifyFile("src/ActionStepLocation.tsx"), "TS/TSX");
  assert.equal(classifyFile("maintenance/python_module.py"), "Python");
  assert.equal(classifyFile("apps/web/supabase/migrations/20261014000000_add_table.sql"), "migrations SQL");
  assert.equal(classifyFile("generated/vendor/BadName.tsx"), "generated/vendor");
});

test("the baseline accepts the legacy fixture while new violations fail", () => {
  const baseline = fixtureBaseline([{ path: "src/ActionStepLocation.tsx", rule: "ts-tsx-kebab-case", observedStyle: "PascalCase", reason: "legacy fixture" }]);
  const trackedFiles = [
    "app/page.tsx", "app/route.ts", "src/my-feature.ts", "src/my-feature.test.ts",
    "src/ActionStepLocation.tsx", "maintenance/python_module.py",
    "apps/web/supabase/migrations/20261014000000_add_table.sql", "generated/vendor/BadName.tsx",
    "config/package.json", "documentation/Naming Notes.md",
  ];
  const accepted = validateNaming({ trackedFiles, baseline });
  assert.deepEqual(accepted.newViolations, []);
  assert.deepEqual(accepted.staleExceptions, []);
  assert.equal(accepted.accepted.length, 1);
  const newViolation = validateNaming({ trackedFiles: [...trackedFiles, "src/NewFeature.ts"], baseline });
  assert.deepEqual(newViolation.newViolations.map(({ path: file }) => file), ["src/NewFeature.ts"]);
});

test("a removed exception cannot allow the same violation to reappear", () => {
  const result = validateNaming({ trackedFiles: ["src/ActionStepLocation.tsx"], baseline: fixtureBaseline() });
  assert.deepEqual(result.newViolations.map(({ path: file }) => file), ["src/ActionStepLocation.tsx"]);
});

test("baseline paths keep Git path separators and case significant", () => {
  const result = validateNaming({
    trackedFiles: ["src/actionStepLocation.tsx"],
    baseline: fixtureBaseline([{ path: "src/ActionStepLocation.tsx", rule: "ts-tsx-kebab-case", observedStyle: "PascalCase", reason: "legacy fixture" }]),
  });
  assert.deepEqual(result.newViolations.map(({ path: file }) => file), ["src/actionStepLocation.tsx"]);
});

test("the scanner reads only Git-tracked files", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-file-naming-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeFile(root, "src/my-feature.ts");
  writeFile(root, "src/NewFeature.ts");
  const baselinePath = path.join(root, "baseline.json");
  fs.writeFileSync(baselinePath, JSON.stringify(fixtureBaseline()));
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["add", "--", "src/my-feature.ts", "baseline.json"], { cwd: root });
  execFileSync("git", ["-c", "user.name=Codex test", "-c", "user.email=codex-test", "commit", "-qm", "fixture"], { cwd: root });
  const result = runNamingCheck({ root, baselinePath });
  assert.deepEqual(result.newViolations, []);
  assert.equal(result.trackedFiles.includes("src/NewFeature.ts"), false);
});

test("legacy test helpers remain baselined while new test suffixes are enforced", () => {
  const result = findNamingViolations(["tests/my-feature.test.ts", "tests/my-feature.test.helpers.ts", "tests/my-feature.spec.ts"]);
  assert.deepEqual(result.map(({ path: file }) => file), ["tests/my-feature.spec.ts", "tests/my-feature.test.helpers.ts"]);
});
