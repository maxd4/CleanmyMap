import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { createModeValidationPlan } from "./validation-modes.mjs";

const require = createRequire(import.meta.url);
const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const eslintCli = join(dirname(require.resolve("eslint/package.json")), "bin", "eslint.js");

function runFixture(ruleSeverity) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "cleanmymap-eslint-ratchet-"));
  const configPath = join(fixtureRoot, "eslint.config.mjs");
  const sourcePath = join(fixtureRoot, "fixture.js");

  writeFileSync(
    configPath,
    `export default [{ rules: { "no-warning-comments": ["${ruleSeverity}", { terms: ["TODO"] }] } }];\n`,
    "utf8",
  );
  writeFileSync(sourcePath, "// TODO: exercise the lint contract\nconst value = 1;\n", "utf8");

  try {
    return spawnSync(
      process.execPath,
      [
        eslintCli,
        "--no-config-lookup",
        "--config",
        configPath,
        "--max-warnings=0",
        sourcePath,
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test("warning ESLint non nul avec --max-warnings=0", () => {
  const result = runFixture("warn");

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /warning/);
});

test("erreur ESLint reste non nulle avec le même seuil", () => {
  const result = runFixture("error");

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /error/);
});

test("FAST ciblé et FULL utilisent le contrat lint canonique", () => {
  const packageJson = JSON.parse(readFileSync(join(repositoryRoot, "apps/web/package.json"), "utf8"));
  assert.equal(packageJson.scripts.lint, "eslint src --max-warnings=0");

  const fast = createModeValidationPlan({
    mode: "FAST",
    changedFiles: ["apps/web/src/lib/chat/polls.ts"],
  });
  assert.deepEqual(
    fast.checks.find((check) => check.id === "lint-targeted").command.args,
    ["eslint", "--max-warnings=0", "--config", "apps/web/eslint.config.mjs", "apps/web/src/lib/chat/polls.ts"],
  );

  const full = createModeValidationPlan({
    mode: "FULL",
    changedFiles: ["apps/web/src/app/example/page.tsx"],
  });
  assert.deepEqual(full.checks.find((check) => check.id === "lint").command, {
    executable: "npm",
    args: ["run", "lint"],
  });
});
