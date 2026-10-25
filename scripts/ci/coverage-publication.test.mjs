import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  COVERAGE_ENFORCEMENT_POLICY,
  COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT,
  COVERAGE_SCOPE_FINGERPRINT,
  MOBILE_COVERAGE_SCOPE_FINGERPRINT,
} from "../checks/coverage-policy.mjs";
import {
  getCoveragePublicationRequirements,
  runCoveragePublicationGate,
  validateCoveragePublicationProof,
} from "./coverage-publication.mjs";
import { gitExecutable } from "./git-executable.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");

function candidateSha() {
  return execFileSync(gitExecutable(), ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

function enforcedWebPolicy() {
  const policy = structuredClone(COVERAGE_ENFORCEMENT_POLICY);
  policy.scopes.web.domains.business.state = "ENFORCE";
  policy.scopes.web.domains.business.activation = { version: 1, sourceCommit: candidateSha() };
  return policy;
}

function writeWebProof(root, sha, { candidate = sha } = {}) {
  const scopeRoot = path.join(root, sha, "web");
  const reports = [
    "apps/web/coverage/coverage-summary.json",
    "apps/web/coverage/lcov.info",
    "apps/web/coverage/coverage-evidence.json",
  ];
  const summary = {};
  for (const report of reports) {
    const absolute = path.join(scopeRoot, report);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, report.endsWith("coverage-summary.json") ? JSON.stringify(summary) : report.endsWith(".json") ? "{}\n" : "TN:\n", "utf8");
  }
  fs.writeFileSync(
    path.join(scopeRoot, "apps/web/coverage/coverage-evidence.json"),
    JSON.stringify({
      gitHead: candidate,
      scope: "web",
      scopeFingerprint: COVERAGE_SCOPE_FINGERPRINT,
      configurationFingerprint: "configuration",
      summarySha256: "summary",
    }),
    "utf8",
  );
  const proofReports = reports.map((source) => ({
    source,
    path: source,
    sha256: createHash("sha256").update(fs.readFileSync(path.join(scopeRoot, source))).digest("hex"),
  }));
  fs.writeFileSync(path.join(scopeRoot, "coverage-publication-proof.json"), JSON.stringify({
    schemaVersion: 1,
    kind: "cleanmymap-coverage-publication-proof",
    candidateSha: candidate,
    candidateScope: "CI_CANDIDATE",
    scope: "web",
    scopeFingerprint: COVERAGE_SCOPE_FINGERPRINT,
    policyFingerprint: COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT,
    reports: proofReports,
  }), "utf8");
}

test("documentation-only candidates do not request a coverage suite", () => {
  const result = getCoveragePublicationRequirements({ changedFiles: ["documentation/development/testing-execution.md"] });
  assert.deepEqual(result.requirements, []);
  assert.equal(result.reason, "DOCUMENTATION_ONLY_OR_EMPTY");
});

test("OBSERVE candidates remain diagnostic and do not require a proof", () => {
  const result = runCoveragePublicationGate({
    repositoryRoot,
    candidateSha: candidateSha(),
    changedFiles: ["apps/web/src/lib/actions/action.ts"],
  });
  assert.equal(result.status, "OBSERVE");
});

test("an ENFORCE candidate requires an exact proof and accepts a conforming report", () => {
  const sha = candidateSha();
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-coverage-proof-"));
  const previousRoot = process.env.CMM_COVERAGE_PUBLICATION_ROOT;
  process.env.CMM_COVERAGE_PUBLICATION_ROOT = temporaryRoot;
  try {
    writeWebProof(temporaryRoot, sha);
    const result = runCoveragePublicationGate({
      repositoryRoot,
      candidateSha: sha,
      changedFiles: ["apps/web/src/lib/actions/action.ts"],
      policy: enforcedWebPolicy(),
      coverageCheck: () => ({ policyStatus: "PASS" }),
    });
    assert.equal(result.status, "PASS");
    assert.equal(validateCoveragePublicationProof({ repositoryRoot, candidateSha: sha, scope: "web" }).proof.candidateSha, sha);
  } finally {
    if (previousRoot === undefined) delete process.env.CMM_COVERAGE_PUBLICATION_ROOT;
    else process.env.CMM_COVERAGE_PUBLICATION_ROOT = previousRoot;
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("an absent or differently fingerprinted proof fails closed", () => {
  const policy = enforcedWebPolicy();
  const sha = candidateSha();
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-coverage-stale-proof-"));
  const previousRoot = process.env.CMM_COVERAGE_PUBLICATION_ROOT;
  process.env.CMM_COVERAGE_PUBLICATION_ROOT = temporaryRoot;
  try {
    writeWebProof(temporaryRoot, sha, { candidate: "f".repeat(40) });
    assert.throws(
      () => validateCoveragePublicationProof({ repositoryRoot, candidateSha: sha, scope: "web" }),
      /Coverage proof candidate mismatch|Web coverage evidence is not bound/,
    );
  } finally {
    if (previousRoot === undefined) delete process.env.CMM_COVERAGE_PUBLICATION_ROOT;
    else process.env.CMM_COVERAGE_PUBLICATION_ROOT = previousRoot;
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
  assert.throws(
    () => runCoveragePublicationGate({
      repositoryRoot,
      candidateSha: sha,
      changedFiles: ["apps/web/src/lib/actions/action.ts"],
      policy,
      coverageCheck: () => ({ policyStatus: "PASS" }),
    }),
    /Coverage proof is missing|Coverage proof policy fingerprint/,
  );
  assert.equal(MOBILE_COVERAGE_SCOPE_FINGERPRINT.length, 64);
});

test("a report changed after publication proof is rejected", () => {
  const sha = candidateSha();
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-coverage-falsified-proof-"));
  const previousRoot = process.env.CMM_COVERAGE_PUBLICATION_ROOT;
  process.env.CMM_COVERAGE_PUBLICATION_ROOT = temporaryRoot;
  try {
    writeWebProof(temporaryRoot, sha);
    fs.appendFileSync(path.join(temporaryRoot, sha, "web/apps/web/coverage/lcov.info"), "TN:changed\n", "utf8");
    assert.throws(
      () => validateCoveragePublicationProof({ repositoryRoot, candidateSha: sha, scope: "web" }),
      /missing, changed, or falsified/,
    );
  } finally {
    if (previousRoot === undefined) delete process.env.CMM_COVERAGE_PUBLICATION_ROOT;
    else process.env.CMM_COVERAGE_PUBLICATION_ROOT = previousRoot;
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
