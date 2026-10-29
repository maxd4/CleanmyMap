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

function evidencePaths(evidence) {
  const lineReferences = [...evidence.matchAll(/(?:^| et )([^:;]+):\d+-\d+/g)]
    .map((match) => match[1].trim());
  if (lineReferences.length >= 2) return lineReferences;
  return [...evidence.matchAll(/[A-Za-z0-9_.\[\]-]+(?:\/[A-Za-z0-9_.\[\]-]+)+/g)]
    .map((match) => match[0].replace(/[.,;]+$/, ""));
}

function fixtureResults(root, metricsByScope = {}, executionByScope = {}) {
  return SCOPES.map((scope, index) => {
    const justifications = CANONICAL_JUSTIFICATIONS.justifications.filter((justification) => justification.scope === scope);
    const fingerprints = justifications.map((justification) => justification.fingerprint);
    const qualifiedNewFingerprints = fingerprints
      .filter((fingerprint) => !Object.hasOwn(CANONICAL_NATIVE_BASELINES[scope].fingerprints, fingerprint))
      .sort();
    const occurrences = justifications.map((justification, occurrenceIndex) => {
      const paths = evidencePaths(justification.evidence);
      assert.ok(paths.length >= 2, `fixture evidence must expose two source paths for ${justification.fingerprint}`);
      return {
        fingerprint: justification.fingerprint,
        occurrenceA: { path: paths[0], startLine: 10 + occurrenceIndex, endLine: 14 + occurrenceIndex },
        occurrenceB: { path: paths[1], startLine: 31 + occurrenceIndex, endLine: 35 + occurrenceIndex },
      };
    });
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
    writeFileSync(jsonPath, JSON.stringify({
      statistics: { total: { sources: reportMetrics.files, ...reportMetrics } },
      duplicates: occurrences.map((occurrence) => ({
        firstFile: { name: occurrence.occurrenceA.path, start: occurrence.occurrenceA.startLine, end: occurrence.occurrenceA.endLine },
        secondFile: { name: occurrence.occurrenceB.path, start: occurrence.occurrenceB.startLine, end: occurrence.occurrenceB.endLine },
      })),
      scope,
      index,
    }));
    writeFileSync(sarifPath, JSON.stringify({
      runs: [{ results: occurrences.map((occurrence) => ({
        partialFingerprints: { "jscpdCloneHash/v1": occurrence.fingerprint },
        locations: [
          { physicalLocation: { artifactLocation: { uri: occurrence.occurrenceA.path }, region: { startLine: occurrence.occurrenceA.startLine, endLine: occurrence.occurrenceA.endLine } } },
          { physicalLocation: { artifactLocation: { uri: occurrence.occurrenceB.path }, region: { startLine: occurrence.occurrenceB.startLine, endLine: occurrence.occurrenceB.endLine } } },
        ],
      })) }],
    }));
    return {
      scopeName: scope,
      metrics,
      fingerprints: new Set(fingerprints),
      occurrences,
      qualifiedNewFingerprints,
      execution: executionByScope[scope] ?? { status: "PASS", exitCode: 0, signal: null },
      comparison: { status: "PASS", failures: [] },
      reportArtifacts: { jsonPath, sarifPath },
    };
  });
}

function rewriteJsonReportAndRefreshHash(root, candidateSha, runId, scopeName, mutate, mutateSarif = null) {
  const proofPath = join(root, candidateSha, runId, "duplication-publication-proof.json");
  const proofDirectory = join(root, candidateSha, runId);
  const reportPath = join(proofDirectory, scopeName, "jscpd-report.json");
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  mutate(report);
  writeFileSync(reportPath, JSON.stringify(report));
  const proof = JSON.parse(readFileSync(proofPath, "utf8"));
  const proofScope = proof.scopes.find((scope) => scope.name === scopeName);
  proofScope.report.jsonSha256 = sha256(readFileSync(reportPath));
  if (mutateSarif) {
    const sarifPath = join(proofDirectory, scopeName, "jscpd-report.sarif");
    const sarif = JSON.parse(readFileSync(sarifPath, "utf8"));
    mutateSarif(sarif);
    writeFileSync(sarifPath, JSON.stringify(sarif));
    proofScope.report.sarifSha256 = sha256(readFileSync(sarifPath));
  }
  writeFileSync(proofPath, JSON.stringify(proof));
  return proofPath;
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

test("publication proof revalidates JSON/SARIF occurrence count after report hashes pass", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-occurrence-count-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    const results = fixtureResults(root);
    const { proofPath } = writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results,
      baseline: fixtureBaseline(),
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-occurrence-count",
    });
    rewriteJsonReportAndRefreshHash(root, candidateSha, "run-test-occurrence-count", "runtime", (report) => {
      report.duplicates = [];
    });
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /occurrence projection mismatch/,
    );
    assert.ok(proofPath);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication proof rejects invalid and incoherent occurrence locations", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-occurrence-location-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    const results = fixtureResults(root);
    writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results,
      baseline: fixtureBaseline(),
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-occurrence-location",
    });
    rewriteJsonReportAndRefreshHash(root, candidateSha, "run-test-occurrence-location", "runtime", (report) => {
      report.duplicates[0].firstFile.start = 0;
    });
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /invalid JSON source location/,
    );

    const secondRoot = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-occurrence-incoherent-"));
    try {
      writeDuplicationPublicationProof({
        repositoryRoot: REPOSITORY_ROOT,
        candidateSha,
        results: fixtureResults(secondRoot),
        baseline: fixtureBaseline(),
        justificationReport: fixtureJustifications(),
        toolVersion: { actual: DUPLICATION_TOOL_VERSION },
        candidateScope: "DYNAMIC_CANDIDATE",
        publicationRoot: secondRoot,
        runId: "run-test-occurrence-incoherent",
      });
      rewriteJsonReportAndRefreshHash(secondRoot, candidateSha, "run-test-occurrence-incoherent", "runtime", (report) => {
        report.duplicates[0].firstFile.name = "apps/web/src/incoherent.ts";
      });
      assert.throws(
        () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: secondRoot }),
        /first source location differs between JSON and SARIF/,
      );
    } finally {
      rmSync(secondRoot, { recursive: true, force: true });
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication proof rejects justification evidence that does not cover both current occurrences", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-occurrence-evidence-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results: fixtureResults(root),
      baseline: fixtureBaseline(),
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-occurrence-evidence",
    });
    rewriteJsonReportAndRefreshHash(root, candidateSha, "run-test-occurrence-evidence", "runtime", (report) => {
      report.duplicates[0].firstFile.name = "apps/web/src/not-reviewed-a.ts";
      report.duplicates[0].secondFile.name = "apps/web/src/not-reviewed-b.ts";
    }, (sarif) => {
      const locations = sarif.runs[0].results[0].locations;
      locations[0].physicalLocation.artifactLocation.uri = "apps/web/src/not-reviewed-a.ts";
      locations[1].physicalLocation.artifactLocation.uri = "apps/web/src/not-reviewed-b.ts";
    });
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /CURRENT occurrence pair/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication proof rejects a new fingerprint that is absent from the durable registry", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-unqualified-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results: fixtureResults(root),
      baseline: fixtureBaseline(),
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-unqualified",
    });
    const newFingerprint = "abcdef0123456789";
    rewriteJsonReportAndRefreshHash(root, candidateSha, "run-test-unqualified", "runtime", (report) => {
      report.statistics.total.clones += 1;
      report.duplicates.push({
        firstFile: { name: "apps/web/src/unqualified-a.ts", start: 1, end: 5 },
        secondFile: { name: "apps/web/src/unqualified-b.ts", start: 7, end: 11 },
      });
    }, (sarif) => {
      sarif.runs[0].results.push({
        partialFingerprints: { "jscpdCloneHash/v1": newFingerprint },
        locations: [
          { physicalLocation: { artifactLocation: { uri: "apps/web/src/unqualified-a.ts" }, region: { startLine: 1, endLine: 5 } } },
          { physicalLocation: { artifactLocation: { uri: "apps/web/src/unqualified-b.ts" }, region: { startLine: 7, endLine: 11 } } },
        ],
      });
    });
    const proofPath = join(root, candidateSha, "run-test-unqualified", "duplication-publication-proof.json");
    const proof = JSON.parse(readFileSync(proofPath, "utf8"));
    const runtimeScope = proof.scopes.find((scope) => scope.name === "runtime");
    runtimeScope.fingerprints.push(newFingerprint);
    runtimeScope.metrics.clones += 1;
    writeFileSync(proofPath, JSON.stringify(proof));
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /unqualified new fingerprints/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("publication proof records jscpd execution and rejects non-successful execution metadata", () => {
  const root = mkdtempSync(join(tmpdir(), "cleanmymap-duplication-publication-execution-"));
  try {
    const candidateSha = git(["rev-parse", "HEAD"]);
    const results = fixtureResults(root, {}, { runtime: { status: "FAIL", exitCode: 1, signal: null } });
    const { proofPath } = writeDuplicationPublicationProof({
      repositoryRoot: REPOSITORY_ROOT,
      candidateSha,
      results,
      baseline: fixtureBaseline(),
      justificationReport: fixtureJustifications(),
      toolVersion: { actual: DUPLICATION_TOOL_VERSION },
      candidateScope: "DYNAMIC_CANDIDATE",
      publicationRoot: root,
      runId: "run-test-execution",
    });
    const proof = JSON.parse(readFileSync(proofPath, "utf8"));
    assert.deepEqual(proof.scopes[0].execution, { status: "FAIL", exitCode: 1, signal: null });
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /execution status contradicts the scope ratchet status/,
    );

    proof.scopes[0].ratchetStatus = "FAIL";
    proof.scopes[0].failures = ["jscpd execution failed (exit 1)"];
    writeFileSync(proofPath, JSON.stringify(proof));
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /jscpd execution was not successful/,
    );

    proof.scopes[0].execution = null;
    writeFileSync(proofPath, JSON.stringify(proof));
    assert.throws(
      () => validateDuplicationPublicationProof({ repositoryRoot: REPOSITORY_ROOT, candidateSha, publicationRoot: root }),
      /execution metadata is incomplete/,
    );
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
