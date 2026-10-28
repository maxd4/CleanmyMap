import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  compareDuplicationMetrics,
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
const CANONICAL_METRICS_BASELINE = JSON.parse(readFileSync(join(REPOSITORY_ROOT, "scripts/checks/duplication-metrics-baseline.json"), "utf8"));
const CANONICAL_JUSTIFICATIONS = JSON.parse(readFileSync(join(REPOSITORY_ROOT, "scripts/checks/duplication-justifications.json"), "utf8"));
const CANONICAL_NATIVE_BASELINES = {
  runtime: JSON.parse(readFileSync(join(REPOSITORY_ROOT, "scripts/checks/duplication-runtime-baseline.json"), "utf8")),
  tests: JSON.parse(readFileSync(join(REPOSITORY_ROOT, "scripts/checks/duplication-tests-baseline.json"), "utf8")),
  "fixtures/data": JSON.parse(readFileSync(join(REPOSITORY_ROOT, "scripts/checks/duplication-data-baseline.json"), "utf8")),
};

function git(args) {
  return execFileSync("git", args, { cwd: REPOSITORY_ROOT, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fixtureResults(root, metricsByScope = {}) {
  return SCOPES.map((scope, index) => {
    const fingerprints = CANONICAL_JUSTIFICATIONS.justifications
      .filter((justification) => justification.scope === scope)
      .map((justification) => justification.fingerprint);
    const qualifiedNewFingerprints = fingerprints
      .filter((fingerprint) => !Object.hasOwn(CANONICAL_NATIVE_BASELINES[scope].fingerprints, fingerprint))
      .sort();
    const reportRoot = join(root, "reports", scope);
    mkdirSync(reportRoot, { recursive: true });
    const jsonPath = join(reportRoot, "jscpd-report.json");
    const sarifPath = join(reportRoot, "jscpd-report.sarif");
    const metrics = {
      files: 1,
      lines: 100,
      tokens: 100,
      clones: fingerprints.length,
      duplicatedLines: 0,
      duplicatedTokens: 0,
      percentage: 0,
      percentageTokens: 0,
      newClones: 0,
      ...metricsByScope[scope],
    };
    const reportMetrics = { ...metrics, newClones: metrics.newClones + qualifiedNewFingerprints.length };
    writeFileSync(jsonPath, JSON.stringify({ statistics: { total: { sources: reportMetrics.files, ...reportMetrics } }, duplicates: [], scope, index }));
    writeFileSync(sarifPath, JSON.stringify({
      runs: [{ results: fingerprints.map((fingerprint) => ({ partialFingerprints: { "jscpdCloneHash/v1": fingerprint } })) }],
    }));
    return {
      scopeName: scope,
      metrics,
      fingerprints: new Set(fingerprints),
      qualifiedNewFingerprints,
      comparison: { status: "PASS", failures: [] },
      reportArtifacts: { jsonPath, sarifPath },
    };
  });
}

function fixtureBaseline() {
  return {
    sourceCommit: CANONICAL_METRICS_BASELINE.sourceCommit,
    scopes: CANONICAL_METRICS_BASELINE.scopes,
  };
}

function fixtureJustifications() {
  return {
    stale: [],
    keepIntentional: CANONICAL_JUSTIFICATIONS.justifications.filter(({ classification }) => classification === "KEEP_INTENTIONAL").length,
    noActionNoise: CANONICAL_JUSTIFICATIONS.justifications.filter(({ classification }) => classification === "NO_ACTION_NOISE").length,
  };
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
    const baseline = fixtureBaseline();
    const results = fixtureResults(root, {
      runtime: {
        lines: baseline.scopes.runtime.lines,
        tokens: baseline.scopes.runtime.tokens,
        duplicatedLines: baseline.scopes.runtime.duplicatedLines + 81,
        duplicatedTokens: baseline.scopes.runtime.duplicatedTokens + 801,
        percentage: ((baseline.scopes.runtime.duplicatedLines + 81) / baseline.scopes.runtime.lines) * 100,
        percentageTokens: ((baseline.scopes.runtime.duplicatedTokens + 801) / baseline.scopes.runtime.tokens) * 100,
      },
    });
    results[0].comparison = compareDuplicationMetrics(results[0].metrics, baseline.scopes.runtime, "runtime");
    const { proof } = writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results,
      baseline,
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

test("publication proof rejects a FAIL manifest changed to PASS", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-forged-status-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    const baseline = fixtureBaseline();
    const results = fixtureResults(root, {
      runtime: {
        lines: baseline.scopes.runtime.lines,
        tokens: baseline.scopes.runtime.tokens,
        duplicatedLines: baseline.scopes.runtime.duplicatedLines + 81,
        duplicatedTokens: baseline.scopes.runtime.duplicatedTokens + 801,
        percentage: ((baseline.scopes.runtime.duplicatedLines + 81) / baseline.scopes.runtime.lines) * 100,
        percentageTokens: ((baseline.scopes.runtime.duplicatedTokens + 801) / baseline.scopes.runtime.tokens) * 100,
      },
    });
    results[0].comparison = compareDuplicationMetrics(results[0].metrics, baseline.scopes.runtime, "runtime");
    const { proofPath } = writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results,
      baseline,
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-forged-status",
    });
    const proof = JSON.parse(readFileSync(proofPath, "utf8"));
    proof.status = "PASS";
    writeFileSync(proofPath, JSON.stringify(proof));
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /global status is incoherent|ratchet status is FAIL/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication proof rejects a scope FAIL hidden behind a global PASS", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-forged-scope-"));
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
      runId: "run-test-forged-scope",
    });
    const proof = JSON.parse(readFileSync(proofPath, "utf8"));
    proof.scopes[0].ratchetStatus = "FAIL";
    proof.status = "PASS";
    writeFileSync(proofPath, JSON.stringify(proof));
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /ratchet status is incoherent|global status is incoherent/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication proof rejects stale justifications declared with global PASS", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-stale-justification-"));
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
      runId: "run-test-stale-justification",
    });
    const proof = JSON.parse(readFileSync(proofPath, "utf8"));
    proof.justificationStatus.stale = ["runtime:deadbeefdeadbeef"];
    proof.status = "PASS";
    writeFileSync(proofPath, JSON.stringify(proof));
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /justification status is incoherent|global status is incoherent/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication proof accepts coherent PASS and PASS_WITH_GRACE statuses", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-grace-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    const baseline = fixtureBaseline();
    const results = fixtureResults(root, {
      runtime: {
        lines: baseline.scopes.runtime.lines,
        tokens: baseline.scopes.runtime.tokens,
        duplicatedLines: baseline.scopes.runtime.duplicatedLines + 1,
        duplicatedTokens: baseline.scopes.runtime.duplicatedTokens + 1,
        percentage: ((baseline.scopes.runtime.duplicatedLines + 1) / baseline.scopes.runtime.lines) * 100,
        percentageTokens: ((baseline.scopes.runtime.duplicatedTokens + 1) / baseline.scopes.runtime.tokens) * 100,
      },
    });
    results[0].comparison = compareDuplicationMetrics(results[0].metrics, baseline.scopes.runtime, "runtime");
    const { proof, proofPath } = writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results,
      baseline,
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-grace",
    });
    assert.equal(proof.status, "PASS_WITH_GRACE");
    assert.equal(validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }).proofFile, proofPath);
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
