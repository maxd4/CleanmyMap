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
  assert.match(guard, /check-complexity-policy\.mjs --staged/);
  assert.match(guard, /git write-tree/);
  assert.match(guard, /check-top-heavy-files\.mjs --enforce/);
  assert.match(guard, /--ref=\$StagedTree/);
  assert.doesNotMatch(guard, /workspace-coordination|CMM_WORKSPACE_RUN_ID|check-staged/);
  assert.match(guard, /npm run security:secrets -- --staged-only/);
  assert.match(guard, /git diff --cached --check/);
  assert.doesNotMatch(guard, /npm run checks:changed:quick/);
  assert.doesNotMatch(guard, /npm run security:secrets\s*\}/);
  assert.doesNotMatch(guard, /git diff --check\s*\}/);
  assert.doesNotMatch(guard, /pre_push_guard\.ps1|npm run build|vercel build|-IncludeBuild/);
});

function extractJob(workflow, jobId) {
  const marker = `  ${jobId}:\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `missing job ${jobId}`);
  const bodyStart = start + marker.length;
  const remainder = workflow.slice(bodyStart);
  const nextJob = remainder.search(/\n  [a-z0-9-]+:\n/);
  return nextJob === -1 ? remainder : remainder.slice(0, nextJob);
}

test("CI exposes independent Web gates with direct scope dependencies", async () => {
  const workflow = await readRepoFile(".github/workflows/ci.yml");
  const jobs = {
    "web-static": "web_code_relevant",
    "web-tests": "web_code_relevant",
    "web-vercel-audit": "build_relevant",
    "web-build": "build_relevant",
    "mobile-validation": "mobile_code_relevant",
  };
  for (const [jobId, scopeOutput] of Object.entries(jobs)) {
    const job = extractJob(workflow, jobId);
    assert.match(job, /^    needs: scope$/m, jobId);
    assert.match(job, new RegExp(`if: needs\\.scope\\.outputs\\.${scopeOutput} == 'true'`), jobId);
    assert.match(job, /node-version-file: \$\{\{ env\.NODE_VERSION_FILE \}\}/, jobId);
    assert.match(job, /check-node-version-contract\.mjs/, jobId);
    assert.match(job, /run: npm ci/, jobId);
    assert.doesNotMatch(job, /if: always\(\)/, jobId);
  }
  const qualityJob = extractJob(workflow, "web-quality");
  assert.match(qualityJob, /if: github\.event_name == 'workflow_dispatch' && inputs\.validation_mode == 'FULL'/);
  const staticJob = extractJob(workflow, "web-static");
  for (const command of ["npm run check:semgrep", "npm run check:lockfile-policy", "npm run typecheck", "npm run check:utf8-fr", "npm run lint"]) {
    assert.match(staticJob, new RegExp(command.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), command);
  }
  for (const command of ["npm run quality:top-heavy", "npm run quality:dead-code", "npm run quality:complexity", "npm run quality:duplication", "npm run quality:cycles"]) {
    assert.match(qualityJob, new RegExp(command.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), command);
  }
  assert.doesNotMatch(staticJob, /npm run quality:top-heavy/);
  assert.match(qualityJob, /github\.event_name == 'workflow_dispatch' && inputs\.validation_mode == 'FULL'/);
  assert.match(qualityJob, /quality:top-heavy/);
  assert.match(qualityJob, /quality:complexity/);
  assert.match(qualityJob, /npm run audit:gitnexus/);
  const gitNexusInitialization = qualityJob.indexOf("gitnexus analyze --index-only");
  const gitNexusAudit = qualityJob.indexOf("npm run audit:gitnexus");
  assert.ok(gitNexusInitialization >= 0, "web-quality initializes the GitNexus candidate index");
  assert.ok(gitNexusInitialization < gitNexusAudit, "GitNexus initialization precedes the audit");
  const testsJob = extractJob(workflow, "web-tests");
  assert.match(testsJob, /npm run test:security/);
  assert.match(testsJob, /npm run test:regression-gates/);
  assert.match(testsJob, /validation-policy\.mjs --assert-full-suite/);
  assert.match(testsJob, /github\.event_name == 'workflow_dispatch' && inputs\.validation_mode == 'FULL'/);
  assert.match(testsJob, /actions\/upload-artifact@/);
  assert.match(testsJob, /apps\/web\/coverage/);
  assert.doesNotMatch(testsJob, /quality:coverage/);
  const coverageJob = extractJob(workflow, "web-coverage");
  assert.match(coverageJob, /npm run quality:coverage/);
  assert.match(coverageJob, /actions\/download-artifact@/);
  assert.match(coverageJob, /--from-existing-summary/);
  assert.doesNotMatch(coverageJob, /npm run test\s/);
  assert.match(extractJob(workflow, "web-vercel-audit"), /npm run audit:vercel:ci/);
  assert.match(extractJob(workflow, "web-build"), /npm run build/);
  const mobileJob = extractJob(workflow, "mobile-validation");
  for (const command of ["npm run mobile:security", "npm run mobile:typecheck", "npm run mobile:test", "npm run quality:mobile-coverage", "npm run mobile:lint"]) {
    assert.match(mobileJob, new RegExp(command.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), command);
  }
  assert.doesNotMatch(mobileJob, /npm run security:secrets/);
  assert.match(mobileJob, /npm run check:semgrep/);
  assert.match(mobileJob, /web_code_relevant != 'true'/);
  assert.match(workflow, /build_relevant: \$\{\{ steps\.detect-scope\.outputs\.build_relevant \}\}/);
  assert.match(workflow, /validation-policy\.mjs --scope changed --json/);
  assert.equal((workflow.match(/continue-on-error:\s*true/g) ?? []).length, 2);
  const qualityJobForGrace = extractJob(workflow, "web-quality");
  for (const stepName of ["Duplication ratchet", "GitNexus cycle ratchet"]) {
    const step = qualityJobForGrace.match(new RegExp(`- name: ${stepName}[\\s\\S]*?(?=\\n      - name:|\\n\\n  [a-z0-9-]+:)`))?.[0] ?? "";
    assert.match(step, /continue-on-error:\s*true/);
  }
  assert.match(
    workflow,
    /- name: Web coverage ratchet from existing evidence[\s\S]*?run: npm run quality:coverage -- --from-existing-summary/,
  );
  const coverageStep = extractJob(workflow, "web-coverage").match(/- name: Web coverage ratchet from existing evidence[\s\S]*$/)?.[0] ?? "";
  assert.doesNotMatch(coverageStep, /continue-on-error:\s*true/);
  const summaryStep = qualityJobForGrace.match(/- name: Publish web-quality summary[\s\S]*?(?=\n      - name:|\n\n  [a-z0-9-]+:)/)?.[0] ?? "";
  assert.doesNotMatch(summaryStep, /continue-on-error:\s*true/);
  assert.doesNotMatch(workflow, /web-validation:/);
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
  assert.match(guard, /\[switch\]\$Full/);
  assert.match(guard, /Quick PUSH_CANDIDATE checks/);
  assert.match(guard, /Pre-push quick guardrail passed/);
  assert.match(guard, /Invoke-CriticalStaticCandidateChecks/);
  assert.match(guard, /if \(-not \$Full\)/);
  for (const criticalCheck of [
    "scripts/checks/check-env-contract.mjs",
    "scripts/checks/check-root-file-hygiene.mjs",
    "scripts/checks/check-canonical-workspaces.mjs",
    "scripts/checks/check-github-actions-security.mjs",
    "scripts/checks/check-lockfile-policy.mjs",
  ]) {
    assert.match(guard, new RegExp(criticalCheck.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
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

  assert.match(packageJson.scripts["checks:full"], /run_validation_mode\.mjs --mode FULL/);
  assert.match(guard, /Full PUSH_CANDIDATE checks \(-Full\)/);
  assert.match(guard, /-Full/);
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

test("pre-commit is independent from the retired coordinator", async () => {
  const sessionBootstrap = await readRepoFile("scripts/dev/session_bootstrap.mjs");
  const packageJson = JSON.parse(await readRepoFile("package.json"));

  assert.doesNotMatch(sessionBootstrap, /workspace-coordination|createWorkspaceCoordinator/);
  assert.equal(Object.keys(packageJson.scripts).some((name) => name.startsWith("workspace:")), false);
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
  assert.match(rootAgents, /MAIN-ONLY \/ SINGLE-WRITER/);
  assert.match(rootAgents, /un seul writer mutable peut agir à la fois ; les analyses read-only peuvent être parallèles/);
  assert.match(rootAgents, /main publié = référence versionnée/);
  assert.match(rootAgents, /candidate locale explicitement fournie ou produite pour le lot courant/);
  assert.match(rootAgents, /tout changement local préexistant doit être préservé/);
  assert.doesNotMatch(rootAgents, /l['’]état local est prioritaire sur l['’]état github/i);
  assert.match(rootAgents, /Hors mode de développement rapide\s*:\s*[\s\S]*validation → commit isolé → push main → vérification de convergence/);
  assert.match(rootAgents, /Mode de développement rapide explicitement activé\s*:\s*[\s\S]*commit local selon son protocole, sans push tant que le mode reste actif/);
  assert.doesNotMatch(rootAgents, /workspace:start/);
  assert.doesNotMatch(scriptsAgents, /workspace:start/);
  assert.match(rootAgents, /### LEGACY \/ COMPATIBILITY/);
  assert.match(chatgpt, /MAIN-ONLY \/ SINGLE-WRITER/);
  assert.match(chatgpt, /ne doit jamais déclencher deux Codex d'écriture simultanément/);
  assert.match(chatgpt, /Hors mode de développement rapide\s*:\s*[\s\S]*validation → commit isolé → push main → vérification de convergence/);
  assert.match(chatgpt, /Mode de développement rapide explicitement activé\s*:\s*[\s\S]*commit local selon son protocole, sans push tant que le mode reste actif/);
  assert.doesNotMatch(chatgpt, /push origin\/main sur demande explicite|demander commit et push le lot|committer et pousser sur main lorsque l'utilisateur l'a demandé/i);
  assert.doesNotMatch(chatgpt, /workspace:start/);
  assert.doesNotMatch(chatgpt, /publication-candidate/);
  assert.match(scriptsAgents, /Hors mode de développement rapide\s*:\s*[\s\S]*validation → commit isolé → push main → vérification de convergence/);
  assert.match(scriptsAgents, /Mode de développement rapide explicitement activé\s*:\s*[\s\S]*commit local selon son protocole, sans push tant que le mode reste actif/);
  assert.doesNotMatch(scriptsAgents, /HEAD == origin\/main/);
  assert.match(scriptsAgents, /pré-commit doit utiliser exclusivement la portée `STAGED`/);
  assert.match(scriptsAgents, /pré-push réel doit utiliser exclusivement la portée\s+`PUSH_CANDIDATE`/);
});
