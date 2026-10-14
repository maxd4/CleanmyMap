import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateReleaseGate } from "./release-gate.mjs";

const sha = "a".repeat(40);
const otherSha = "b".repeat(40);
const evidence = {
  version: 2,
  candidateSha: sha,
  candidateScope: "WORKTREE",
  mode: "FULL",
  verdict: "PASS",
  releaseReady: true,
  passed: ["full-check"],
  reused: [],
  failed: [],
  blocked: [],
  notRun: [],
  preexisting: [],
};

const requiredChecks = ["full-check"];
const provenance = {
  repository: "maxd4/CleanmyMap",
  branch: "main",
  originMainSha: sha,
  originVerified: true,
};
const deploymentEnabled = {
  sha,
  main: false,
  expectedTarget: "production",
  actualTarget: "production",
  projectName: "web",
  rootDirectory: "apps/web",
};

test("release gate requires exact SHA, clean worktree, and disabled main auto-deployment", () => {
  assert.equal(evaluateReleaseGate({
    evidence,
    current: sha,
    clean: true,
    deploymentEnabled,
    provenance,
    requiredChecks,
  }).ready, true);

  assert.equal(evaluateReleaseGate({
    evidence,
    current: otherSha,
    clean: true,
    deploymentEnabled: { ...deploymentEnabled, sha: otherSha },
    provenance,
    requiredChecks,
  }).ready, false);

  assert.equal(evaluateReleaseGate({
    evidence,
    current: sha,
    clean: true,
    deploymentEnabled: { ...deploymentEnabled, main: true },
    provenance,
    requiredChecks,
  }).ready, false);

  assert.equal(evaluateReleaseGate({
    evidence,
    current: sha,
    clean: true,
    deploymentEnabled: { ...deploymentEnabled, actualTarget: "preview" },
    provenance,
    requiredChecks,
  }).ready, false);
});

test("release gate rejects incomplete, failed, stale, and out-of-procedure candidates", () => {
  const cases = [
    { name: "missing required check", evidence: { ...evidence, passed: [] } },
    { name: "failed required check", evidence: { ...evidence, verdict: "FAIL", releaseReady: false, failed: ["full-check"] } },
    { name: "preexisting failure", evidence: { ...evidence, preexisting: ["full-check: PREEXISTING_PARALLEL_FAILURE"] } },
    { name: "stale evidence", evidence: { ...evidence, candidateSha: otherSha } },
  ];
  for (const entry of cases) {
    assert.equal(evaluateReleaseGate({
      evidence: entry.evidence,
      current: sha,
      clean: true,
      deploymentEnabled,
      provenance,
      requiredChecks,
    }).ready, false, entry.name);
  }

  assert.equal(evaluateReleaseGate({
    evidence,
    current: sha,
    clean: true,
    deploymentEnabled,
    provenance: { ...provenance, repository: "attacker/fork" },
    requiredChecks,
  }).ready, false);

  assert.equal(evaluateReleaseGate({
    evidence,
    current: sha,
    clean: true,
    deploymentEnabled,
    provenance: { ...provenance, originMainSha: otherSha },
    requiredChecks,
  }).ready, false);

  assert.equal(evaluateReleaseGate({
    evidence,
    current: sha,
    clean: true,
    deploymentEnabled,
    provenance: { ...provenance, originVerified: false },
    requiredChecks,
  }).ready, false);

  assert.equal(evaluateReleaseGate({
    evidence,
    current: sha,
    clean: true,
    deploymentEnabled: { ...deploymentEnabled, projectName: "wrong-project" },
    provenance,
    requiredChecks,
  }).ready, false);
});
