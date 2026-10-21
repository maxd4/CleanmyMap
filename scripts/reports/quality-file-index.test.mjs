import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildQualityFileIndex,
  buildQualityFileIndexMarkdown,
  generateQualityFileIndex,
  readOfflineQualityRun,
} from "./quality-file-index.mjs";
import { createAuditPaths, createQualityProjectionPaths, listFlatQualityProjectionArtifacts } from "../audits/quality-audit-storage.mjs";

const sha = "c".repeat(40);
const runId = "projection-run";
const fileA = "apps/web/src/a.ts";
const fileB = "apps/web/src/b.ts";

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-quality-index-"));
}

function reports() {
  return {
    "top-heavy": {
      status: "PASS",
      rows: [{ file: fileA, kind: "runtime", lines: 510, bytes: 41_000, generated: false }],
      baseline: { allowed: [], review: [{ path: fileA, maxLines: 500, maxBytes: 40_000, status: "IMPROVED" }] },
      evaluation: { blockingFindings: [], reviewRatchetViolations: [] },
    },
    complexity: {
      status: "FAIL",
      metrics: [
        { metric: "complexity", path: fileA, value: 22, line: 5, endLine: 5 },
        { metric: "functionLength", path: fileA, value: 31, line: 10, endLine: 40 },
        { metric: "complexity", path: fileB, value: 4, line: 3, endLine: 3 },
      ],
      result: {
        failures: [{ metric: "complexity", path: fileA, value: 22, line: 5 }],
        reviews: [{ metric: "functionLength", path: fileA, value: 31, line: 10, endLine: 40 }],
        improvements: [],
        stale: [],
      },
    },
    "dead-code": {
      status: "FAIL",
      currentFindings: [{ file: fileA, type: "export", name: "unusedExport" }],
      baseline: { findings: [] },
      justifications: { justifications: [] },
      comparison: {
        currentCount: 1,
        newFindings: [{ file: fileA, type: "export", name: "unusedExport" }],
        historicalActionableFindings: [],
        keepJustifiedFindings: [],
        resolvedFindings: [],
        staleKeepJustifications: [],
      },
    },
    duplication: {
      status: "FAIL",
      results: [{
        scopeName: "runtime",
        metrics: { clones: 1, duplicatedLines: 4, duplicatedTokens: 20, newClones: 1 },
        fingerprints: ["fp-shared"],
        occurrences: [{
          fingerprint: "fp-shared",
          occurrenceA: { path: fileA, startLine: 12, endLine: 15 },
          occurrenceB: { path: fileB, startLine: 22, endLine: 25 },
        }],
      }],
      justificationReport: { classifications: {}, classificationCounts: {} },
    },
    cycles: {
      status: "FAIL",
      cycleObjects: [{ files: [fileA, fileB], edges: [[fileA, fileB], [fileB, fileA]] }],
      comparison: { added: [], stale: [] },
    },
  };
}

function manifests() {
  return Object.fromEntries(["dead-code", "duplication", "top-heavy", "complexity", "cycles"].map((audit) => [audit, {
    schemaVersion: 1,
    audit,
    runId,
    auditedHead: sha,
    originMain: sha,
    baselineStable: true,
    worktreeClean: true,
    readProvenance: audit === "top-heavy" ? "COMMITTED_SNAPSHOT" : "WORKTREE_LIVE",
    reproducible: true,
    resultClass: "REPRODUCIBLE",
    status: reports()[audit].status,
    attentionRequired: reports()[audit].status === "FAIL",
    generatedAt: "2026-10-21T20:00:00.000Z",
  }]));
}

function aggregateManifest() {
  return {
    schemaVersion: 1,
    audit: "all",
    runId,
    auditedHead: sha,
    originMain: sha,
    baselineStable: true,
    worktreeClean: true,
    readProvenance: "MIXED",
    reproducible: true,
    resultClass: "REPRODUCIBLE",
    status: "FAIL",
    attentionRequired: true,
    generatedAt: "2026-10-21T20:00:00.000Z",
  };
}

function buildRun() {
  const auditReports = reports();
  return {
    auditedSha: sha,
    runId,
    reports: auditReports,
    manifests: manifests(),
    aggregateManifest: aggregateManifest(),
    aggregateReport: { audits: Object.keys(auditReports).map((audit) => ({ audit })) },
    provenance: "MIXED",
  };
}

function writeRun(root) {
  const run = buildRun();
  const shaRoot = path.join(root, "artifacts", "quality-audits", sha);
  fs.mkdirSync(shaRoot, { recursive: true });
  for (const audit of [...Object.keys(run.reports), "all"]) {
    const paths = createAuditPaths({ root, auditedHead: sha, audit, runId });
    const manifest = audit === "all" ? run.aggregateManifest : run.manifests[audit];
    const report = audit === "all" ? run.aggregateReport : run.reports[audit];
    fs.writeFileSync(paths.manifest, `${JSON.stringify(manifest)}\n`);
    fs.writeFileSync(paths.report, `${JSON.stringify(report)}\n`);
    fs.writeFileSync(paths.summary, `# ${audit}\n`);
  }
  return run;
}

test("construit un index exhaustif sans confondre complexity et functionLength", () => {
  const index = buildQualityFileIndex({ run: buildRun(), mode: "OFFLINE" });
  const indexedA = index.files.find((file) => file.path === fileA);
  const indexedB = index.files.find((file) => file.path === fileB);

  assert.equal(index.source.provenance, "MIXED");
  assert.equal(index.correlation.state, "PRESENT");
  assert.equal(indexedA.findings.complexity.state, "PRESENT");
  assert.equal(indexedA.findings.functionLength.state, "PRESENT");
  assert.equal(indexedB.findings.functionLength.state, "NOT_MEASURED");
  assert.equal(index.audits.topHeavy.initialVerdict.evaluation.counts.reviewRatchetViolations, 0);
  assert.equal(index.audits.topHeavy.derivedReevaluation.counts.reviewRatchetViolations, 1);
  assert.equal(index.audits.duplication.fingerprints.length, 1);
  assert.deepEqual(index.audits.duplication.fingerprints[0].occurrences[0], {
    occurrenceA: { path: fileA, startLine: 12, endLine: 15 },
    occurrenceB: { path: fileB, startLine: 22, endLine: 25 },
  });
  assert.equal(index.audits.cycles.cycles.length, 1);
  assert.equal(index.candidateGroups.length, 2);
  assert.match(buildQualityFileIndexMarkdown(index), /verdict initial et réévaluation dérivée/);
});

test("le mode offline lit un run exact, crée le bundle sans réécrire les originaux et refuse les collisions", async () => {
  const root = tempRoot();
  try {
    writeRun(root);
    const shaRoot = path.join(root, "artifacts", "quality-audits", sha);
    const originalNames = fs.readdirSync(shaRoot).sort();
    const before = new Map(originalNames.map((name) => [name, crypto.createHash("sha256").update(fs.readFileSync(path.join(shaRoot, name))).digest("hex")]));
    const generated = await generateQualityFileIndex({ root, auditedSha: sha, runId, mode: "OFFLINE", generatedAt: "2026-10-21T20:01:00.000Z", includeBundle: true });

    assert.equal(generated.index.mode, "OFFLINE");
    assert.equal(generated.run.provenance, "MIXED");
    assert.equal(generated.bundle.entries.length, 20);
    assert.deepEqual(listFlatQualityProjectionArtifacts({ root, auditedSha: sha }).map((entry) => entry.kind).sort(), ["bundle", "index", "summary"]);
    for (const [name, digest] of before) {
      assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(shaRoot, name))).digest("hex"), digest);
    }
    await assert.rejects(() => generateQualityFileIndex({ root, auditedSha: sha, runId }), /refus d'écrasement/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("offline refuse un run incomplet ou un rapport cycles en erreur est conservé NOT_MEASURED", () => {
  const root = tempRoot();
  try {
    assert.throws(() => readOfflineQualityRun({ root, auditedSha: sha, runId }), /Rapport quality illisible/);
    const run = buildRun();
    run.reports.cycles = { error: { code: "CYCLES_FAILED", message: "fixture" } };
    const index = buildQualityFileIndex({ run, mode: "OFFLINE" });
    assert.equal(index.audits.cycles.state, "NOT_MEASURED");
    assert.equal(index.correlation.state, "NOT_MEASURED");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
