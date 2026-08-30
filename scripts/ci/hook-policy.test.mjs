import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

test("pre-commit uses the changed-surface guard and fast global controls", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const guard = await readRepoFile("scripts/ci/pre_commit_guard.ps1");

  assert.match(packageJson.scripts["precommit:guard"], /pre_commit_guard\.ps1/);
  assert.match(guard, /npm run checks:changed:quick/);
  assert.match(guard, /npm run security:secrets/);
  assert.match(guard, /git diff --check/);
  assert.doesNotMatch(guard, /pre_push_guard\.ps1|npm run build|vercel build|-IncludeBuild/);
});

test("pre-push keeps scoped gates and a separate full validation path", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const guard = await readRepoFile("scripts/ci/pre_push_guard.ps1");

  assert.match(packageJson.scripts["prepush:guard"], /pre_push_guard\.ps1/);
  for (const requiredStep of [
    "git diff --name-only --diff-filter=ACMRTUXB HEAD --",
    "git diff --cached --name-only --diff-filter=ACMRTUXB --",
    "git ls-files --others --exclude-standard",
    "scripts/checks/validation-policy.mjs",
    "npm run checks:full",
    "npm run audit:supabase-migration-trees",
    "npm run test:scripts",
    "npm run check:doc-visuals",
    "npm run lint",
    "npm run typecheck",
    "npm run build",
    "npx vercel build --yes",
  ]) {
    assert.match(guard, new RegExp(requiredStep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(guard, /npm run test:regression-gates/);
  assert.match(guard, /Write-SkippedGuardStep/);
});

test("pre-push leaves the complete release validation available separately", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const guard = await readRepoFile("scripts/ci/pre_push_guard.ps1");

  assert.match(packageJson.scripts["checks:full"], /run_checks2\.ps1 -Scope full/);
  assert.match(guard, /No changed files detected; running the separate full validation/);
  for (const requiredStep of [
    "npm run check:root-files",
    "npm run check:gitnexus-hygiene",
    "npm run check:9c-public-facades",
  ]) {
    assert.match(guard, new RegExp(requiredStep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("tracked hooks dispatch to their distinct package guards", async () => {
  const preCommitHook = await readRepoFile(".githooks/pre-commit");
  const prePushHook = await readRepoFile(".githooks/pre-push");

  assert.match(preCommitHook, /npm run precommit:guard/);
  assert.match(prePushHook, /npm run prepush:guard/);
  assert.notEqual(preCommitHook, prePushHook);
});
