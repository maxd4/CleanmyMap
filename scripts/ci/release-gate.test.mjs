import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateReleaseGate } from "./release-gate.mjs";

const sha = "a".repeat(40);
const otherSha = "b".repeat(40);
const evidence = {
  version: 2,
  candidateSha: sha,
  completionSha: sha,
  candidateFingerprint: "candidate-fingerprint",
  completionFingerprint: "candidate-fingerprint",
  checkoutStable: true,
  attestationStatus: "ATTESTED_CANDIDATE",
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

const deployBaseSha = "c".repeat(40);
const deployTreeSha = "d".repeat(40);
const deployChangedFiles = ["apps/web/src/app/page.tsx"];
const deployRequiredChecks = ["deploy-candidate", "build"];
const deployPublicationReference = {
  version: 1,
  sha: deployBaseSha,
  proofSha: deployBaseSha,
  provider: "vercel",
  projectName: "web",
  rootDirectory: "apps/web",
  target: "production",
  projectId: "prj_test",
  deploymentId: "dpl_test",
  productionAlias: "cleanmymap.fr",
  verified: true,
  verificationMethod: "vercel-inspection",
  vercelInspection: {
    verified: true,
    projectId: "prj_test",
    projectName: "web",
    rootDirectory: "apps/web",
    repository: "maxd4/CleanmyMap",
    deploymentId: "dpl_test",
    deploymentProjectId: "prj_test",
    target: "production",
    readyState: "READY",
    gitSha: deployBaseSha,
    productionAlias: "cleanmymap.fr",
    alias: "cleanmymap.fr",
    aliasDeploymentId: "dpl_test",
    aliasProjectId: "prj_test",
    aliasDeletedAt: null,
  },
};
const deployEvidence = {
  version: 1,
  mode: "DEPLOY",
  profile: "deploy",
  candidateSha: sha,
  completionSha: sha,
  candidateFingerprint: "deploy-fingerprint",
  completionFingerprint: "deploy-fingerprint",
  candidateTreeSha: deployTreeSha,
  completionTreeSha: deployTreeSha,
  candidateScope: "WORKTREE",
  checkoutStable: true,
  attestationStatus: "ATTESTED_CANDIDATE",
  baseRef: deployBaseSha,
  baseSha: deployBaseSha,
  publicationReference: deployPublicationReference,
  dependencyGraphChanged: false,
  changedFiles: deployChangedFiles,
  scopeEstablished: true,
  scopeComplete: true,
  plannedChecks: deployRequiredChecks,
  verdict: "PASS",
  releaseReady: true,
  passed: deployRequiredChecks,
  reused: [],
  failed: [],
  blocked: [],
  notRun: [],
  preexisting: [],
};
const deployScope = {
  valid: true,
  candidateTreeSha: deployTreeSha,
  baseSha: deployBaseSha,
  publicationReference: deployPublicationReference,
  changedFiles: deployChangedFiles,
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

test("pending publication accepts only a candidate descending from the exact remote base", () => {
  const candidateSha = "e".repeat(40);
  const pendingEvidence = { ...deployEvidence, candidateSha, completionSha: candidateSha };
  const pendingDeployment = { ...deploymentEnabled, sha: candidateSha };
  const pendingProvenance = {
    ...provenance,
    originMainSha: sha,
    candidateDescendsFromOriginBase: true,
  };

  assert.equal(evaluateReleaseGate({
    evidence: pendingEvidence,
    current: candidateSha,
    clean: true,
    deploymentEnabled: pendingDeployment,
    provenance: pendingProvenance,
    profile: "deploy",
    requiredChecks: deployRequiredChecks,
    deployScope,
    pendingPublishBaseSha: sha,
  }).ready, true);

  assert.equal(evaluateReleaseGate({
    evidence: pendingEvidence,
    current: candidateSha,
    clean: true,
    deploymentEnabled: pendingDeployment,
    provenance: { ...pendingProvenance, originMainSha: otherSha },
    profile: "deploy",
    requiredChecks: deployRequiredChecks,
    deployScope,
    pendingPublishBaseSha: sha,
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

test("release gate reports every missing proof without treating malformed evidence as green", () => {
  const result = evaluateReleaseGate({
    evidence: {
      ...evidence,
      candidateSha: "not-a-sha",
      passed: null,
      reused: null,
      failed: ["unexpected"],
      blocked: ["blocked-check"],
      notRun: ["not-run-check"],
      preexisting: ["preexisting-check"],
    },
    current: "not-a-sha",
    clean: false,
    deploymentEnabled: { ...deploymentEnabled, sha: "not-a-sha" },
    provenance: { ...provenance, originMainSha: otherSha },
    requiredChecks,
  });

  assert.equal(result.ready, false);
  assert.deepEqual(result.missingChecks, requiredChecks);
  assert.deepEqual(result.reasons, [
    "worktree is not clean",
    "FULL evidence does not match the requested SHA",
    "FULL evidence is not green",
    "FULL evidence is missing required checks: full-check",
    "candidate provenance must match maxd4/CleanmyMap main at the candidate SHA",
  ]);
});

test("release gate accepts checks supplied through reused evidence and rejects an invalid current SHA", () => {
  const reused = evaluateReleaseGate({
    evidence: { ...evidence, passed: [], reused: ["full-check"] },
    current: sha,
    clean: true,
    deploymentEnabled,
    provenance,
    requiredChecks,
  });
  assert.equal(reused.ready, true);

  const invalid = evaluateReleaseGate({
    evidence,
    current: "invalid",
    clean: true,
    deploymentEnabled,
    provenance,
    requiredChecks,
  });
  assert.equal(invalid.ready, false);
  assert.match(invalid.reasons.join("\n"), /FULL evidence does not match/);
});

test("release gate rejects a FULL proof whose checkout changed before completion", () => {
  const result = evaluateReleaseGate({
    evidence: {
      ...evidence,
      completionSha: otherSha,
      completionFingerprint: "different-fingerprint",
      checkoutStable: false,
      attestationStatus: "NOT_ATTESTED_CHECKOUT_CHANGED",
    },
    current: sha,
    clean: true,
    deploymentEnabled,
    provenance,
    requiredChecks,
  });

  assert.equal(result.ready, false);
  assert.match(result.reasons.join("\n"), /FULL evidence does not match|FULL evidence is not green/);
});

test("release gate accepts a distinct DEPLOY attestation for the exact Web candidate", () => {
  const result = evaluateReleaseGate({
    evidence: deployEvidence,
    current: sha,
    clean: true,
    deploymentEnabled,
    provenance,
    profile: "deploy",
    requiredChecks: deployRequiredChecks,
    deployScope,
  });
  assert.equal(result.ready, true);
});

test("DEPLOY rejects stale SHA, missing proof, failed build, target errors and empty diff", () => {
  const cases = [
    { name: "stale SHA", evidence: { ...deployEvidence, candidateSha: otherSha }, current: sha },
    { name: "missing proof", evidence: null, current: sha },
    { name: "build failed", evidence: { ...deployEvidence, verdict: "FAIL", releaseReady: false, failed: ["build"] } },
    { name: "empty diff", evidence: { ...deployEvidence, changedFiles: [], scopeEstablished: false, plannedChecks: deployRequiredChecks }, deployScope: { valid: false, baseSha: deployBaseSha, changedFiles: [] } },
    { name: "incomplete scope attestation", evidence: { ...deployEvidence, scopeComplete: false } },
    { name: "missing Production reference", evidence: { ...deployEvidence, publicationReference: null } },
    { name: "wrong target", evidence: deployEvidence, deploymentEnabled: { ...deploymentEnabled, actualTarget: "preview" } },
  ];
  for (const entry of cases) {
    assert.equal(evaluateReleaseGate({
      evidence: entry.evidence,
      current: entry.current ?? sha,
      clean: true,
      deploymentEnabled: entry.deploymentEnabled ?? deploymentEnabled,
      provenance,
      profile: "deploy",
      requiredChecks: deployRequiredChecks,
      deployScope: entry.deployScope ?? deployScope,
    }).ready, false, entry.name);
  }
});

test("DEPLOY rejects an absent required control even when the attestation says PASS", () => {
  const result = evaluateReleaseGate({
    evidence: { ...deployEvidence, plannedChecks: ["deploy-candidate"] },
    current: sha,
    clean: true,
    deploymentEnabled,
    provenance,
    profile: "deploy",
    requiredChecks: deployRequiredChecks,
    deployScope,
  });
  assert.equal(result.ready, false);
  assert.match(result.reasons.join("\n"), /missing required checks|not green/);
});

test("DEPLOY never becomes release-ready from a local verified flag without Vercel inspection", () => {
  const result = evaluateReleaseGate({
    evidence: {
      ...deployEvidence,
      publicationReference: { ...deployPublicationReference, vercelInspection: null },
    },
    current: sha,
    clean: true,
    deploymentEnabled,
    provenance,
    profile: "deploy",
    requiredChecks: deployRequiredChecks,
    deployScope,
  });
  assert.equal(result.ready, false);
});

test("DEPLOY never becomes release-ready when alias or deployment project provenance is incomplete", () => {
  for (const field of ["deploymentProjectId", "alias", "aliasDeploymentId", "aliasProjectId", "aliasDeletedAt"]) {
    const inspection = { ...deployPublicationReference.vercelInspection };
    if (field === "aliasDeletedAt") inspection[field] = "2026-11-08T00:00:00.000Z";
    else if (field === "alias") inspection[field] = "moved.example";
    else inspection[field] = "tampered";
    const result = evaluateReleaseGate({
      evidence: {
        ...deployEvidence,
        publicationReference: { ...deployPublicationReference, vercelInspection: inspection },
      },
      current: sha,
      clean: true,
      deploymentEnabled,
      provenance,
      profile: "deploy",
      requiredChecks: deployRequiredChecks,
      deployScope,
    });
    assert.equal(result.ready, false, field);
  }
});
