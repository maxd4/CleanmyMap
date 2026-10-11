import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveCiScopeSelection, serializeCiScopeOutputs } from "./detect-scope.mjs";

const HEAD = "1111111111111111111111111111111111111111";
const BASE = "2222222222222222222222222222222222222222";

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
