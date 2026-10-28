import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  DUPLICATION_POLICY_FINGERPRINT,
  DUPLICATION_TOOL_VERSION,
} from "../checks/duplication-policy.mjs";
import {
  DUPLICATION_PUBLICATION_SCHEMA_VERSION,
  isDuplicationRelevantFile,
  runDuplicationPublicationGate,
  validateDuplicationPublicationProof,
  writeDuplicationPublicationProof,
} from "./duplication-publication.mjs";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../..");
const SCOPES = ["runtime", "tests", "fixtures/data"];
const SOURCE_FILES = [
  "scripts/checks/duplication-policy.mjs",
  "scripts/checks/check-duplication.mjs",
  "scripts/checks/duplication-metrics-baseline.json",
  "scripts/checks/duplication-runtime-baseline.json",
  "scripts/checks/duplication-tests-baseline.json",
  "scripts/checks/duplication-data-baseline.json",
  "scripts/checks/duplication-justifications.json",
];

function git(args) {
  return execFileSync("git", args, { cwd: REPOSITORY_ROOT, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fixtureResults(root) {
  return SCOPES.map((scope, index) => {
    const reportRoot = join(root, "reports", scope);
    mkdirSync(reportRoot, { recursive: true });
    const jsonPath = join(reportRoot, "jscpd-report.json");
    const sarifPath = join(reportRoot, "jscpd-report.sarif");
    writeFileSync(jsonPath, JSON.stringify({ scope, index }));
    writeFileSync(sarifPath, JSON.stringify({ runs: [{ results: [] }] }));
    return {
      scopeName: scope,
      metrics: { files: 1, lines: 100, tokens: 100, clones: 0, fingerprints: 0, duplicatedLines: 0, duplicatedTokens: 0, percentage: 0, percentageTokens: 0, newClones: 0 },
      fingerprints: new Set(),
      qualifiedNewFingerprints: [],
      comparison: { status: "PASS", failures: [] },
      reportArtifacts: { jsonPath, sarifPath },
    };
  });
}

function fixtureBaseline() {
  return {
    sourceCommit: git(["rev-parse", "HEAD"]),
    scopes: Object.fromEntries(SCOPES.map((scope) => [scope, { lines: 100, tokens: 100, duplicatedLines: 0, duplicatedTokens: 0, fingerprints: 0 }])),
  };
}

function fixtureJustifications() {
  return { stale: [], keepIntentional: 0, noActionNoise: 0 };
}

test("publication proof binds all scopes, reports, source files and candidate tree", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    const { proof, proofPath } = writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results: fixtureResults(root),
      baseline: fixtureBaseline(),
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-valid",
    });
    assert.equal(proof.schemaVersion, DUPLICATION_PUBLICATION_SCHEMA_VERSION);
    assert.equal(proof.policyFingerprint, DUPLICATION_POLICY_FINGERPRINT);
    assert.deepEqual(proof.scopes.map((scope) => scope.name).sort(), SCOPES.slice().sort());
    assert.equal(validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }).proofFile, proofPath);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication proof rejects a modified report and an incompatible policy fingerprint", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-invalid-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    const { proofPath } = writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results: fixtureResults(root),
      baseline: fixtureBaseline(),
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-invalid",
    });
    const proofDirectory = join(root, candidateSha, "run-test-invalid");
    writeFileSync(join(proofDirectory, "runtime", "jscpd-report.json"), "tampered\n");
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /stale or invalid.*hash mismatch/,
    );
    writeFileSync(join(proofDirectory, "runtime", "jscpd-report.json"), JSON.stringify({ scope: "runtime", index: 0 }));
    const proof = JSON.parse(readFileSync(proofPath, "utf8"));
    proof.policyFingerprint = "0".repeat(64);
    writeFileSync(proofPath, JSON.stringify(proof));
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /stale or invalid.*policy fingerprint/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication proof rejects a ratchet FAIL instead of promoting it to PASS", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-fail-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    const results = fixtureResults(root);
    results[0].comparison = { status: "FAIL", failures: ["new clone fingerprints"] };
    const { proof } = writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results,
      baseline: fixtureBaseline(),
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-fail",
    });
    assert.equal(proof.status, "FAIL");
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /Duplication ratchet status is FAIL/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the publication gate is required only for duplication-relevant candidates", () => {
  assert.equal(isDuplicationRelevantFile("documentation/development/testing-quality-structure.md"), false);
  assert.equal(isDuplicationRelevantFile("apps/web/src/lib/example.ts"), true);
  assert.equal(isDuplicationRelevantFile("scripts/checks/duplication-policy.mjs"), true);
  const result = runDuplicationPublicationGate({
    repositoryRoot: REPOSITORY_ROOT,
    candidateSha: git(["rev-parse", "HEAD"]),
    changedFiles: ["documentation/development/testing-quality-structure.md"],
  });
  assert.equal(result.status, "NOT_REQUIRED");
});
