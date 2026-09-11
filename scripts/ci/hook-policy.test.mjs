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
  assert.match(guard, /workspace-coordination\.mjs/);
  assert.match(guard, /check-staged/);
  assert.match(guard, /CMM_WORKSPACE_RUN_ID/);
  assert.match(guard, /npm run security:secrets -- --staged-only/);
  assert.match(guard, /git diff --cached --check/);
  assert.doesNotMatch(guard, /npm run checks:changed:quick/);
  assert.doesNotMatch(guard, /npm run security:secrets\s*\}/);
  assert.doesNotMatch(guard, /git diff --check\s*\}/);
  assert.doesNotMatch(guard, /pre_push_guard\.ps1|npm run build|vercel build|-IncludeBuild/);
});

test("pre-push derives gates from the Git protocol candidate and keeps manual fallback separate", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const guard = await readRepoFile("scripts/ci/pre_push_guard.ps1");

  assert.match(packageJson.scripts["prepush:guard"], /pre_push_guard\.ps1/);
  for (const requiredStep of [
    "Get-PrePushRecords",
    "mode = push-protocol",
    "PUSH_CANDIDATE",
    "git diff",
    "--candidate-ref=",
    "--candidate-range=",
    "run-static-candidate-check.mjs",
    "scripts/checks/check-env-contract.mjs",
    "scripts/checks/validation-policy.mjs",
    "scripts/checks/check-root-file-hygiene.mjs",
    "scripts/checks/check-documentation-governance.mjs",
    "scripts/checks/check-agent-governance.mjs",
    "scripts/checks/check-agent-skill-mirrors.mjs",
    "scripts/checks/check-stack-doc-drift.mjs",
    "scripts/checks/check-github-actions-security.mjs",
    "scripts/checks/check-9c-public-facades.mjs",
    "scripts/checks/check-doc-visuals.mjs",
    "scripts/audits/audit-supabase-migration-trees.mjs",
    "run-dynamic-candidate-check.mjs",
  ]) {
    assert.match(guard, new RegExp(requiredStep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(guard, /RemoteName/);
  assert.match(guard, /RemoteUrl/);
  assert.match(guard, /\[Console\]::In\.ReadToEnd/);
  assert.match(guard, /mode = manual-fallback/);
  assert.match(guard, /\.\.\.HEAD/);
  assert.doesNotMatch(guard, /git diff --name-only --diff-filter=ACMRTUXB HEAD --/);
  assert.doesNotMatch(guard, /git diff --cached --name-only/);
  assert.doesNotMatch(guard, /git ls-files --others/);
  assert.match(guard, /candidateRefs/);
  assert.match(guard, /CandidateRef = "HEAD"/);
  assert.doesNotMatch(guard, /npm run check:lockfile-policy\b/);
  assert.doesNotMatch(guard, /npm run audit:vercel:ci\b/);
  assert.doesNotMatch(guard, /npm run quality:top-heavy\b/);
  assert.match(guard, /STATIC_CANDIDATE/);
  assert.match(guard, /exact Git tree named by --ref/);
  assert.match(guard, /DYNAMIC_CANDIDATE/);
  assert.match(guard, /--dependency-mode=\$DependencyMode/);
  assert.match(guard, /-DependencyMode "reuse"/);
  assert.match(guard, /-DependencyMode "isolated"/);
  assert.match(guard, /--dependency-mode=isolated/);
  assert.doesNotMatch(guard, /(?<!run-dynamic-candidate-check\.mjs[^\r\n]*)npm run (?:test:scripts|lint|typecheck|build)/);
  assert.doesNotMatch(guard, /npm run check:doc-governance \}/);
  assert.doesNotMatch(guard, /npm run test:regression-gates/);
  assert.match(guard, /Write-SkippedGuardStep/);
});

test("pre-push leaves the complete release validation available separately", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const guard = await readRepoFile("scripts/ci/pre_push_guard.ps1");

  assert.match(packageJson.scripts["checks:full"], /run_checks2\.ps1 -Scope full/);
  assert.match(guard, /No changed files detected in manual fallback; validating the HEAD candidate tree only/);
  assert.doesNotMatch(guard, /Invoke-GuardStep "full validation"/);
  for (const requiredStep of [
    "--script=scripts/checks/check-root-file-hygiene.mjs",
    "--script=scripts/checks/check-gitnexus-hygiene.mjs",
    "--script=scripts/checks/check-9c-public-facades.mjs",
  ]) {
    assert.match(guard, new RegExp(requiredStep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("pre-commit and pre-push are blocking candidate guards", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const preCommitHook = await readRepoFile(".githooks/pre-commit");
  const prePushHook = await readRepoFile(".githooks/pre-push");
  const prePushGuard = await readRepoFile("scripts/ci/pre_push_guard.ps1");

  assert.match(preCommitHook, /npm run precommit:guard/);
  assert.match(packageJson.scripts["prepush:guard"], /pre_push_guard\.ps1/);
  assert.match(prePushHook, /exec npm run prepush:guard/);
  assert.match(prePushHook, /"\$@"/);
  assert.match(prePushHook, /GIT_OPTIONAL_LOCKS=0\s+exec npm run prepush:guard/);
  assert.match(prePushGuard, /PUSH_CANDIDATE/);
  assert.match(prePushGuard, /--candidate-ref=/);
  assert.match(prePushGuard, /\$env:GIT_OPTIONAL_LOCKS\s*=\s*"0"/);
  assert.notEqual(preCommitHook, prePushHook);
});

test("read-only workspace Git wrapper disables optional index locks", async () => {
  const coordinator = await readRepoFile("scripts/dev/workspace-coordination.mjs");

  assert.match(coordinator, /env:\s*\{\s*\.\.\.process\.env,\s*GIT_OPTIONAL_LOCKS:\s*"0"\s*\}/s);
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
  assert.match(rootAgents, /PUSH_CANDIDATE/);
  assert.match(rootAgents, /CleanMyMap-worktrees/);
  assert.match(rootAgents, /publication-acquire/);
  assert.match(rootAgents, /publication-integrate/);
  assert.match(rootAgents, /INTEGRATION_CONFLICT/);
  assert.match(rootAgents, /### LEGACY \/ COMPATIBILITY/);
  assert.doesNotMatch(rootAgents, /Pour coordonner plusieurs chantiers dans le checkout partagé/);
  assert.doesNotMatch(scriptsAgents, /HEAD == origin\/main/);
  assert.match(chatgpt, /ne doit pas recommander d'attendre un chantier parallèle indépendant/);
  assert.match(scriptsAgents, /pré-commit doit utiliser exclusivement la portée `STAGED`/);
  assert.match(scriptsAgents, /pré-push réel doit utiliser exclusivement la portée\s+`PUSH_CANDIDATE`/);
});
