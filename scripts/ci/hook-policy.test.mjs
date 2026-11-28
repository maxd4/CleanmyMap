import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readRepoFile(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

function sectionMatching(document, headingPattern, label) {
  const match = headingPattern.exec(document);
  assert.ok(match, `missing governance section: ${label}`);
  const section = document.slice(match.index + match[0].length);
  return section.split(/^## /m, 1)[0];
}

function currentSection(document, heading) {
  return sectionMatching(document, new RegExp(`^## ${heading}\\s*$`, "m"), heading);
}

test("pre-commit uses the changed-surface guard without DEVELOPMENT quality ratchets", async () => {
  const packageJson = JSON.parse(await readRepoFile("package.json"));
  const guard = await readRepoFile("scripts/ci/pre_commit_guard.ps1");

  assert.match(packageJson.scripts["precommit:guard"], /pre_commit_guard\.ps1/);
  assert.match(packageJson.scripts["checks:staged:quick"], /check_changed_quick\.ps1 -StagedOnly/);
  assert.match(guard, /check_changed_quick\.ps1 -StagedOnly/);
  for (const qualityGuard of ["check-complexity-policy", "check-top-heavy-files", "quality:complexity", "quality:top-heavy"]) {
    assert.doesNotMatch(guard, new RegExp(qualityGuard.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")));
  }
  assert.doesNotMatch(guard, /workspace-coordination|CMM_WORKSPACE_RUN_ID|check-staged/);
  assert.match(guard, /node scripts\/checks\/secret-audit\.mjs --staged-only/);
  assert.match(guard, /git diff --cached --check/);
  assert.doesNotMatch(guard, /Remove-Item Env:GIT_INDEX_FILE/);
  assert.match(guard, /\$GitIndexFile = \$env:GIT_INDEX_FILE/);
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
  assert.match(testsJob, /web_coverage_relevant/);
  assert.match(testsJob, /npm run test:coverage/);
  assert.match(testsJob, /actions\/upload-artifact@/);
  assert.match(testsJob, /apps\/web\/coverage/);
  assert.doesNotMatch(testsJob, /quality:coverage/);
  const coverageJob = extractJob(workflow, "web-coverage");
  assert.match(coverageJob, /npm run quality:coverage/);
  assert.match(coverageJob, /actions\/download-artifact@/);
  assert.match(coverageJob, /name: web-coverage-evidence-\$\{\{ env\.CANDIDATE_SHA \}\}[\s\S]*path: \./);
  assert.match(coverageJob, /Verify Web coverage artifact layout/);
  assert.match(coverageJob, /artifacts\/coverage-publication\/\$\{CANDIDATE_SHA\}\/web/);
  assert.match(coverageJob, /--from-existing-summary/);
  assert.doesNotMatch(coverageJob, /npm run test\s/);
  assert.match(extractJob(workflow, "web-vercel-audit"), /npm run audit:vercel:ci/);
  assert.match(extractJob(workflow, "web-build"), /npm run build/);
  const pythonJob = extractJob(workflow, "python-validation");
  assert.match(pythonJob, /if: needs\.scope\.outputs\.python_coverage_relevant == 'true'/);
  assert.match(pythonJob, /actions\/setup-python@/);
  assert.match(pythonJob, /requirements-dev\.txt/);
  assert.match(pythonJob, /scripts\/ci\/run_checks\.ps1 -Scope full/);
  assert.match(pythonJob, /npm run test:coverage:python/);
  const nodeCoverageJob = extractJob(workflow, "node-coverage");
  assert.match(nodeCoverageJob, /if: needs\.scope\.outputs\.node_coverage_relevant == 'true'/);
  assert.match(nodeCoverageJob, /npm run test:coverage:node/);
  const mobileJob = extractJob(workflow, "mobile-validation");
  assert.match(mobileJob, /^    needs: scope$/m);
  assert.match(mobileJob, /if: needs\.scope\.outputs\.mobile_code_relevant == 'true'/);
  for (const command of ["npm run mobile:security", "npm run mobile:typecheck", "npm run mobile:coverage", "node scripts/checks/check-coverage.mjs --scope=mobile --from-existing-summary", "npm run mobile:lint"]) {
    assert.match(mobileJob, new RegExp(command.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), command);
  }
  assert.match(mobileJob, /name: mobile-coverage-evidence-\$\{\{ env\.CANDIDATE_SHA \}\}[\s\S]*artifacts\/coverage-publication/);
  assert.doesNotMatch(mobileJob, /npm run mobile:test/);
  assert.doesNotMatch(mobileJob, /npm run quality:mobile-coverage/);
  assert.doesNotMatch(mobileJob, /npm run security:secrets/);
  assert.match(mobileJob, /npm run check:semgrep/);
  assert.match(mobileJob, /web_code_relevant != 'true'/);
  assert.doesNotMatch(mobileJob, /Mobile Vitest tests \(FULL only\)/);
  assert.doesNotMatch(mobileJob, /Mobile Vitest coverage comparison \(FULL only\)/);
  assert.match(workflow, /build_relevant: \$\{\{ steps\.detect-scope\.outputs\.build_relevant \}\}/);
  assert.match(workflow, /web_coverage_relevant: \$\{\{ steps\.detect-scope\.outputs\.web_coverage_relevant \}\}/);
  const scopeJob = extractJob(workflow, "scope");
  assert.match(scopeJob, /VALIDATION_MODE: \$\{\{ inputs\.validation_mode \}\}/);
  assert.match(scopeJob, /run: node scripts\/ci\/detect-scope\.mjs/);
  const scopeScript = await readRepoFile("scripts/ci/detect-scope.mjs");
  assert.match(scopeScript, /event === "workflow_dispatch"/);
  assert.match(scopeScript, /event !== "push" && event !== "pull_request"/);
  assert.match(scopeScript, /workflow_dispatch FULL is independent of the diff/);
  assert.match(scopeScript, /has no base SHA/);
  assert.match(scopeScript, /scripts\/checks\/validation-policy\.mjs/);
  assert.match(scopeScript, /"--scope", "changed", "--json"/);
  assert.doesNotMatch(scopeScript, /git rev-list/);
  assert.match(workflow, /web_coverage_relevant == 'true'[\s\S]*needs\.web-tests\.result == 'success'/);
  assert.doesNotMatch(extractJob(workflow, "web-coverage"), /needs\.scope\.outputs\.web_code_relevant/);
  const toleratedSteps = workflow
    .split(/\r?\n(?=      - name: )/)
    .filter((step) => /continue-on-error:\s*true/.test(step));
  const toleratedStepNames = toleratedSteps
    .map((step) => step.match(/^      - name: ([^\r\n]+)/m)?.[1])
    .filter(Boolean)
    .sort();
  assert.deepEqual(toleratedStepNames, [
    "Download all FULL coverage evidence",
    "Duplication ratchet",
    "GitNexus cycle ratchet (skipped by policy)",
  ].sort());
  assert.equal((workflow.match(/continue-on-error:\s*true/g) ?? []).length, toleratedSteps.length);
  const fullCoverageDownload = toleratedSteps.find((step) => step.includes("Download all FULL coverage evidence")) ?? "";
  assert.match(fullCoverageDownload, /uses: actions\/download-artifact@/);
  assert.match(fullCoverageDownload, /pattern: '\*-coverage-evidence-\$\{\{ env\.CANDIDATE_SHA \}\}'/);
  const fullCoverageGate = workflow.match(/  full-coverage-gate:[\s\S]*$/)?.[0] ?? "";
  assert.match(fullCoverageGate, /Validate four-domain FULL coverage gate[\s\S]*node scripts\/ci\/full-coverage-gate\.mjs/);
  const qualityJobForGrace = extractJob(workflow, "web-quality");
  for (const stepName of ["Duplication ratchet", "GitNexus cycle ratchet"]) {
    const step = qualityJobForGrace.match(new RegExp(`- name: ${stepName}[\\s\\S]*?(?=\\n      - name:|\\n\\n  [a-z0-9-]+:)`))?.[0] ?? "";
    assert.match(step, /continue-on-error:\s*true/);
  }
  assert.match(workflow, /- name: Web coverage comparison from existing evidence[\s\S]*?npm run quality:coverage/);
  const coverageStep = extractJob(workflow, "web-coverage").match(/- name: Web coverage comparison from existing evidence[\s\S]*$/)?.[0] ?? "";
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
    "scripts/ci/duplication-publication.mjs",
    "Invoke-DuplicationPublicationGuard",
    "DUPLICATION_PUBLICATION_ROOT",
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
  const quickChecks = guard.match(/if \(-not \$Full\) \{[\s\S]*?\n    \}\n\n    Write-Host ""\n    Write-Host "Full PUSH_CANDIDATE checks \(-Full\)"/)?.[0] ?? "";
  assert.notEqual(quickChecks, "", "quick PUSH_CANDIDATE block must remain discoverable");
  assert.doesNotMatch(quickChecks, /Invoke-DuplicationPublicationGuard/);
  const fullChecks = guard.match(/Write-Host "Full PUSH_CANDIDATE checks \(-Full\)"[\s\S]*?\n    if \(\$SkipVercel\)/)?.[0] ?? "";
  assert.notEqual(fullChecks, "", "full PUSH_CANDIDATE block must remain discoverable");
  assert.match(fullChecks, /Invoke-DynamicDuplicationCommand/);
  assert.match(fullChecks, /Invoke-DuplicationPublicationGuard/);
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
  assert.match(guard, /--script=\$script/);
  for (const requiredStep of [
    "scripts/checks/check-root-file-hygiene.mjs",
    "scripts/checks/check-gitnexus-hygiene.mjs",
    "scripts/checks/check-9c-public-facades.mjs",
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

test("agent identity cannot bypass mandatory candidate guards", async () => {
  const scriptsAgents = await readRepoFile("scripts/AGENTS.md");
  const preCommitGuard = await readRepoFile("scripts/ci/pre_commit_guard.ps1");
  const prePushGuard = await readRepoFile("scripts/ci/pre_push_guard.ps1");
  const candidateGovernance = `${scriptsAgents}\n${preCommitGuard}\n${prePushGuard}`;

  assert.doesNotMatch(candidateGovernance, /CHATGPT_AUTHORIZED_SKIP/);
  assert.doesNotMatch(candidateGovernance, /Dérogation explicite\s+—\s+push effectué par ChatGPT/i);
  assert.match(preCommitGuard, /check_changed_quick\.ps1 -StagedOnly/);
  assert.match(prePushGuard, /PUSH_CANDIDATE/);
  assert.match(prePushGuard, /--candidate-ref=/);
});

test("pre-commit is independent from the retired coordinator", async () => {
  const sessionBootstrap = await readRepoFile("scripts/dev/session_bootstrap.mjs");
  const packageJson = JSON.parse(await readRepoFile("package.json"));

  assert.doesNotMatch(sessionBootstrap, /workspace-coordination|createWorkspaceCoordinator/);
  assert.equal(Object.keys(packageJson.scripts).some((name) => name.startsWith("workspace:")), false);
});

test("root AGENTS owns delivery rules and scoped guidance does not contradict it", async () => {
  const rootAgents = await readRepoFile("AGENTS.md");
  const chatgpt = await readRepoFile("CHATGPT.md");
  const scriptsAgents = await readRepoFile("scripts/AGENTS.md");
  const testingGuide = await readRepoFile("documentation/development/TESTING.md");
  for (let index = 1; index <= 12; index += 1) {
    const rule = `### R${String(index).padStart(2, "0")} —`;
    assert.equal(rootAgents.split(rule).length - 1, 1, `${rule} must have one owner`);
  }
  assert.match(scriptsAgents, /AGENTS\.md` \(R01–R12\)/i);
  assert.match(chatgpt, /AGENTS\.md` est l'autorité unique/i);
  assert.match(testingGuide, /`PUBLISHED` exige un push conforme/);
  assert.doesNotMatch(scriptsAgents, /sans filtrage d['’]attribution/);
  assert.doesNotMatch(testingGuide, /tous les chemins tracked staged\/unstaged et untracked du snapshot initial/);
  assert.match(rootAgents, /ruleset actif l'accorde explicitement/i);
  assert.match(rootAgents, /hooks, contrôles obligatoires.*protections de sécurité/i);
  assert.match(rootAgents, /COMMIT_READY.*PUSH_READY.*PUBLISHED.*INTEGRATION_VALIDATED.*RELEASE_READY.*COMPLETED/s);
  assert.match(scriptsAgents, /WORKTREE_LIVE.*STAGED.*COMMITTED_SNAPSHOT.*PUSH_CANDIDATE/);
});
