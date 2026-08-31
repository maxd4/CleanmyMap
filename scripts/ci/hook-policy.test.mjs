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
  assert.match(packageJson.scripts["checks:staged:quick"], /check_changed_quick\.ps1 -StagedOnly/);
  assert.match(guard, /npm run checks:staged:quick/);
  assert.match(guard, /npm run security:secrets -- --staged-only/);
  assert.match(guard, /git diff --cached --check/);
  assert.doesNotMatch(guard, /npm run checks:changed:quick/);
  assert.doesNotMatch(guard, /npm run security:secrets\s*\}/);
  assert.doesNotMatch(guard, /git diff --check\s*\}/);
  assert.doesNotMatch(guard, /pre_push_guard\.ps1|npm run build|vercel build|-IncludeBuild/);
});

test("pre-push keeps scoped gates and a separate full validation path", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const guard = await readRepoFile("scripts/ci/pre_push_guard.ps1");

  assert.match(packageJson.scripts["prepush:guard"], /pre_push_guard\.ps1/);
  for (const requiredStep of [
    "git diff --name-only --diff-filter=ACMRTUXB",
    "$($upstream[0])...HEAD",
    "git diff --check \"$($upstreamCommit[0])...HEAD\" --",
    "npm run security:secrets -- --ref=HEAD",
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
  assert.doesNotMatch(guard, /git diff --name-only --diff-filter=ACMRTUXB HEAD --/);
  assert.doesNotMatch(guard, /git diff --cached --name-only/);
  assert.doesNotMatch(guard, /git ls-files --others/);
  assert.doesNotMatch(guard, /npm run security:secrets\s*\}/);
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

test("governance keeps parallel dirty work separate from published commits", async () => {
  const rootAgents = await readRepoFile("AGENTS.md");
  const chatgpt = await readRepoFile("CHATGPT.md");
  const scriptsAgents = await readRepoFile("scripts/AGENTS.md");

  assert.match(rootAgents, /modifications locales non stagées hors périmètre ne bloquent ni le commit\s+ni le push/);
  assert.match(rootAgents, /git diff --cached --name-only/);
  assert.match(rootAgents, /git log --oneline origin\/main\.\.\.HEAD|git log --oneline origin\/main\.\.HEAD/);
  assert.match(rootAgents, /WORKTREE/);
  assert.match(rootAgents, /STAGED/);
  assert.match(rootAgents, /COMMITTED RANGE/);
  assert.match(rootAgents, /sandbox de publication éphémère/);
  assert.match(rootAgents, /ne pas exiger l'égalité\s+littérale `HEAD == origin\/main`/);
  assert.match(chatgpt, /ne doit pas recommander d'attendre un chantier parallèle indépendant/);
  assert.match(scriptsAgents, /pré-commit doit utiliser exclusivement la portée `STAGED`/);
  assert.match(scriptsAgents, /pré-push doit utiliser exclusivement la portée `COMMITTED/);
});
