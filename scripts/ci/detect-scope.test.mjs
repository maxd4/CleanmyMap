import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { test } from "node:test";

import { resolveCiScope, resolveCiScopeSelection, serializeCiScopeOutputs } from "./detect-scope.mjs";
import { gitExecutable } from "./git-executable.mjs";

const HEAD = "1111111111111111111111111111111111111111";
const BASE = "2222222222222222222222222222222222222222";
const REPOSITORY_ROOT = resolve(import.meta.dirname, "../..");

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

test("diff scope reads the exact Git range when changedFiles are not supplied", () => {
  const candidateSha = execFileSync(gitExecutable(), ["rev-parse", "HEAD"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  }).trim();
  const baseSha = execFileSync(gitExecutable(), ["rev-parse", "HEAD^"], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  }).trim();

  const result = resolveCiScope({
    repositoryRoot: REPOSITORY_ROOT,
    eventName: "push",
    eventBefore: baseSha,
    eventSha: candidateSha,
  });

  assert.equal(result.selection.baseSha, baseSha);
  assert.equal(result.selection.candidateSha, candidateSha);
  assert.equal(result.scope.docsOnly, false);
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
