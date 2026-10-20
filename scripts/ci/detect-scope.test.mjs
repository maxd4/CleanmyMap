import fs from "node:fs";
import os from "node:os";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { resolveCiScope, resolveCiScopeSelection, serializeCiScopeOutputs } from "./detect-scope.mjs";
import { gitExecutable } from "./git-executable.mjs";

const HEAD = "1111111111111111111111111111111111111111";
const BASE = "2222222222222222222222222222222222222222";
const REPOSITORY_ROOT = resolve(import.meta.dirname, "../..");

function runGit(repositoryRoot, args) {
  return execFileSync(gitExecutable(), args, {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim();
}

function commitFixture(repositoryRoot, message) {
  runGit(repositoryRoot, ["add", "."]);
  runGit(repositoryRoot, ["commit", "--quiet", "--message", message]);
  return runGit(repositoryRoot, ["rev-parse", "HEAD"]);
}

function createScopeGitFixture() {
  const repositoryRoot = fs.mkdtempSync(join(os.tmpdir(), "cleanmymap-detect-scope-"));
  try {
    fs.mkdirSync(join(repositoryRoot, "scripts", "checks"), { recursive: true });
    fs.mkdirSync(join(repositoryRoot, "scripts", "ci"), { recursive: true });
    fs.copyFileSync(
      join(REPOSITORY_ROOT, "scripts", "checks", "validation-policy.mjs"),
      join(repositoryRoot, "scripts", "checks", "validation-policy.mjs"),
    );
    fs.copyFileSync(
      join(REPOSITORY_ROOT, "scripts", "ci", "validation-process.mjs"),
      join(repositoryRoot, "scripts", "ci", "validation-process.mjs"),
    );

    runGit(repositoryRoot, ["init", "--quiet"]);
    runGit(repositoryRoot, ["config", "user.email", "codex-tests"]);
    runGit(repositoryRoot, ["config", "user.name", "Codex Tests"]);

    const readmePath = join(repositoryRoot, "README.md");
    fs.writeFileSync(readmePath, "Initial fixture\n", "utf8");
    const initialSha = commitFixture(repositoryRoot, "fixture initial");

    fs.writeFileSync(readmePath, "Documentation-only fixture\n", "utf8");
    const documentationSha = commitFixture(repositoryRoot, "fixture documentation");

    const sourcePath = join(repositoryRoot, "apps", "web", "src", "fixture.ts");
    fs.mkdirSync(join(repositoryRoot, "apps", "web", "src"), { recursive: true });
    fs.writeFileSync(sourcePath, "export const fixture = true;\n", "utf8");
    const codeSha = commitFixture(repositoryRoot, "fixture code");

    return { repositoryRoot, initialSha, documentationSha, codeSha };
  } catch (error) {
    fs.rmSync(repositoryRoot, { recursive: true, force: true });
    throw error;
  }
}

function resolveGitRangeScope(repositoryRoot, baseSha, candidateSha) {
  const changedFiles = runGit(repositoryRoot, ["diff", "--name-only", baseSha, candidateSha])
    .split(/\r?\n/)
    .filter(Boolean);
  const fromGitRange = resolveCiScope({
    repositoryRoot,
    eventName: "push",
    eventBefore: baseSha,
    eventSha: candidateSha,
  });
  const fromExplicitFiles = resolveCiScope({
    repositoryRoot,
    eventName: "push",
    eventBefore: baseSha,
    eventSha: candidateSha,
    changedFiles,
  });
  assert.deepEqual(fromGitRange.scope, fromExplicitFiles.scope);
  return { changedFiles, result: fromGitRange };
}

test("workflow_dispatch FULL does not require event.before and keeps the candidate SHA", () => {
  const selection = resolveCiScopeSelection({
    eventName: "workflow_dispatch",
    validationMode: "FULL",
    eventSha: HEAD,
    eventBefore: "",
  });
  assert.equal(selection.kind, "full");
  assert.equal(selection.candidateSha, HEAD);
  assert.equal(selection.baseSha, null);
});

test("workflow_dispatch DEVELOPMENT without event.before stays explicitly empty", () => {
  const selection = resolveCiScopeSelection({
    eventName: "workflow_dispatch",
    validationMode: "DEVELOPMENT",
    eventSha: HEAD,
  });
  assert.equal(selection.kind, "empty");
  assert.equal(selection.candidateSha, HEAD);
  assert.equal(selection.baseSha, null);
});

test("push with valid SHAs selects a diff scope", () => {
  const selection = resolveCiScopeSelection({
    eventName: "push",
    eventBefore: BASE,
    eventSha: HEAD,
  });
  assert.deepEqual(selection, {
    kind: "diff",
    candidateSha: HEAD,
    baseSha: BASE,
    reason: "push diff scope",
  });
});

test("pull_request uses distinct base and head SHAs", () => {
  const selection = resolveCiScopeSelection({
    eventName: "pull_request",
    prBaseSha: BASE,
    prHeadSha: HEAD,
    eventSha: "3333333333333333333333333333333333333333",
  });
  assert.equal(selection.kind, "diff");
  assert.equal(selection.baseSha, BASE);
  assert.equal(selection.candidateSha, HEAD);
});

test("an absent base SHA never becomes a fabricated git reference", () => {
  for (const eventName of ["push", "pull_request"]) {
    const selection = resolveCiScopeSelection({
      eventName,
      eventSha: HEAD,
      prHeadSha: HEAD,
      eventBefore: "",
      prBaseSha: "",
    });
    assert.equal(selection.kind, "empty");
    assert.equal(selection.baseSha, null);
  }
});

test("FULL selection is independent of the changed-file list", () => {
  const first = resolveCiScopeSelection({ eventName: "workflow_dispatch", validationMode: "FULL", eventSha: HEAD });
  const second = resolveCiScopeSelection({ eventName: "workflow_dispatch", validationMode: "FULL", eventSha: HEAD, eventBefore: BASE });
  assert.deepEqual(first, second);
});

test("DEVELOPMENT never becomes FULL implicitly", () => {
  const selection = resolveCiScopeSelection({
    eventName: "workflow_dispatch",
    validationMode: "DEVELOPMENT",
    eventSha: HEAD,
    eventBefore: BASE,
  });
  assert.notEqual(selection.kind, "full");
});

test("invalid events, modes, and SHAs fail closed", () => {
  assert.throws(
    () => resolveCiScopeSelection({ eventName: "schedule", eventSha: HEAD }),
    /Unsupported GitHub event/,
  );
  assert.throws(
    () => resolveCiScopeSelection({ eventName: "workflow_dispatch", validationMode: "FAST", eventSha: HEAD }),
    /Unsupported workflow_dispatch validation mode/,
  );
  assert.throws(
    () => resolveCiScopeSelection({ eventName: "workflow_dispatch", validationMode: "FULL", eventSha: "not-a-sha" }),
    /Invalid workflow_dispatch candidate SHA/,
  );
  assert.throws(
    () => resolveCiScopeSelection({ eventName: "push", eventBefore: "not-a-sha", eventSha: HEAD }),
    /Invalid push base SHA/,
  );
});

test("diff scope derives source-sensitive flags without widening a documentation-only change", () => {
  const candidateSha = execFileSync(gitExecutable(), ["rev-parse", "HEAD"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  }).trim();
  const baseSha = execFileSync(gitExecutable(), ["rev-parse", "HEAD^"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  }).trim();

  const codeScope = resolveCiScope({
    repositoryRoot: REPOSITORY_ROOT,
    eventName: "push",
    eventBefore: baseSha,
    eventSha: candidateSha,
    changedFiles: [
      "apps/web/src/page.tsx",
      "apps/mobile/src/internal.ts",
      "scripts/checks/secret-audit.mjs",
      "package.json",
    ],
  });
  assert.equal(codeScope.selection.kind, "diff");
  assert.equal(codeScope.scope.docsOnly, false);
  assert.equal(codeScope.scope.webCodeRelevant, true);
  assert.equal(codeScope.scope.mobileCodeRelevant, true);
  assert.equal(codeScope.scope.dependencyGraphRelevant, true);

  const docsScope = resolveCiScope({
    repositoryRoot: REPOSITORY_ROOT,
    eventName: "push",
    eventBefore: baseSha,
    eventSha: candidateSha,
    changedFiles: ["documentation/README.md", "apps/mobile/README.md"],
  });
  assert.equal(docsScope.scope.docsOnly, true);
  assert.equal(docsScope.scope.webCodeRelevant, false);
  assert.equal(docsScope.scope.mobileCodeRelevant, false);
});

test("diff scope reads deterministic Git ranges without depending on the checkout HEAD", () => {
  const fixture = createScopeGitFixture();
  try {
    const documentation = resolveGitRangeScope(
      fixture.repositoryRoot,
      fixture.initialSha,
      fixture.documentationSha,
    );
    assert.deepEqual(documentation.changedFiles, ["README.md"]);
    assert.equal(documentation.result.selection.baseSha, fixture.initialSha);
    assert.equal(documentation.result.selection.candidateSha, fixture.documentationSha);
    assert.equal(documentation.result.scope.docsOnly, true);
    assert.equal(documentation.result.scope.webCodeRelevant, false);
    assert.equal(documentation.result.scope.mobileCodeRelevant, false);

    const code = resolveGitRangeScope(
      fixture.repositoryRoot,
      fixture.documentationSha,
      fixture.codeSha,
    );
    assert.deepEqual(code.changedFiles, ["apps/web/src/fixture.ts"]);
    assert.equal(code.result.selection.baseSha, fixture.documentationSha);
    assert.equal(code.result.selection.candidateSha, fixture.codeSha);
    assert.equal(code.result.scope.docsOnly, false);
    assert.equal(code.result.scope.webCodeRelevant, true);
    assert.equal(code.result.scope.mobileCodeRelevant, false);

    fs.appendFileSync(join(fixture.repositoryRoot, "README.md"), "Foreign dirty change\n", "utf8");
    fs.writeFileSync(join(fixture.repositoryRoot, "foreign-untracked.ts"), "export {};\n", "utf8");
    const codeWithForeignFiles = resolveGitRangeScope(
      fixture.repositoryRoot,
      fixture.documentationSha,
      fixture.codeSha,
    );
    assert.deepEqual(codeWithForeignFiles.result.scope, code.result.scope);
  } finally {
    fs.rmSync(fixture.repositoryRoot, { recursive: true, force: true });
  }
});

test("scope outputs preserve the workflow's snake_case contract", () => {
  const output = serializeCiScopeOutputs({
    docsOnly: false,
    webCodeRelevant: true,
    mobileCodeRelevant: true,
    buildRelevant: true,
    dependencyGraphRelevant: true,
    dependencyAuditRelevant: true,
    securityToolingRelevant: true,
  });
  assert.match(output, /docs_only=false/);
  assert.match(output, /web_code_relevant=true/);
  assert.match(output, /dependency_graph_relevant=true/);
  assert.doesNotMatch(output, /docsOnly|webCodeRelevant/);
});
