import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AUDIT_MODES,
  attentionRequired,
  buildHumanDecisionsByFile,
  enrichTopHeavyEvaluation,
  createAuditPaths,
  executeAudit,
  formatQualityAuditCliResult,
  parseAuditMode,
  runQualityAudit,
  serialize,
} from "./run-quality-audit.mjs";
import { readOfflineQualityRun } from "../reports/quality-file-index.mjs";
import { acquireRetentionLock, beginActiveAudit, createQualityProjectionPaths, endActiveAudit, listFlatQualityProjectionArtifacts, releaseRetentionLock, retainQualityAuditArtifacts } from "./quality-audit-storage.mjs";

const sha = "a".repeat(40);
const stableSnapshot = {
  auditedHead: sha,
};

const removedAuditMetadata = ["reproducible", "baselineStable", "worktreeChanged", "worktreeClean", "initialWorktreeClean"];

function assertNoRemovedAuditMetadata(value) {
  for (const field of removedAuditMetadata) assert.equal(Object.hasOwn(value, field), false, `métadonnée supprimée présente: ${field}`);
}

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-quality-audit-"));
}

function emptyComparison() {
  return { newFindings: [], resolvedFindings: [], historicalActionableFindings: [], keepJustifiedFindings: [], staleKeepJustifications: [], currentCount: 0, baselineCount: 0, baselineFresh: true };
}

function fixtureResult(audit) {
  if (audit === "dead-code") return { currentFindings: [], baseline: { findings: [] }, justifications: { justifications: [] }, comparison: emptyComparison(), status: "PASS" };
  if (audit === "duplication") return { status: "PASS", results: [{ scopeName: "runtime", metrics: { clones: 0, duplicatedLines: 0, duplicatedTokens: 0, newClones: 0 }, comparison: { status: "PASS", failures: [] } }], justificationReport: { stale: [] } };
  if (audit === "top-heavy") return { status: "PASS", rows: [], proximityRows: [], radarProjection: { rows: [] }, evaluation: { blockingFindings: [], reviewWarnings: [], reviewImprovements: [], staleReviewBaselineEntries: [], staleBaselineEntries: [] } };
  if (audit === "complexity") return { status: "PASS", metrics: [], result: { failures: [], stale: [], improvements: [], reviews: [] } };
  if (audit === "maintainability") return { schemaVersion: 1, kind: "quality-maintainability", status: "PASS", blocking: false, measurementStatus: "MEASURED_NOT_RATCHETED", summary: { filesMeasured: 0, functionsMeasured: 0, cognitiveComplexityFunctions: 0, cognitiveComplexityAboveTarget: 0, localMaintainabilityFindings: 0, findingsByRule: {} }, rules: {}, metrics: [], findings: [], diagnostics: [] };
  if (audit === "type-safety") return { schemaVersion: 1, kind: "quality-type-safety", status: "PASS", blocking: false, measurementStatus: "MEASURED_NOT_RATCHETED", summary: { filesInScope: 0, filesMeasured: 0, filesWithTypedCoverage: 0, findings: 0, findingsByFamily: { TYPE_SAFETY: 0, ASYNC_SAFETY: 0 }, findingsByRule: {}, historicalFindings: 0, newCandidateFindings: 0, documentedExceptions: 0, elapsedMs: 0 }, coverage: [], findings: [], diagnostics: [] };
  if (audit === "hotspots") return { schemaVersion: 1, kind: "quality-hotspots", status: "PASS", blocking: false, measurementStatus: "MEASURED", methodology: { historyWindowDays: 180 }, summary: { filesMeasured: 0, highActivityFiles: 0, hotspotCandidates: 0, regressionRecurrence: "NOT_MEASURED" }, files: [], diagnostics: [] };
  if (audit === "testability") return { schemaVersion: 1, kind: "quality-testability", status: "PASS", blocking: false, measurementStatus: "NOT_MEASURED", summary: { domainsMeasured: 0, criticalDomainsWithoutSufficientEvidence: 0 }, files: [], domains: [], diagnostics: [] };
  if (audit === "coverage") return { schemaVersion: 1, kind: "quality-coverage-insights", status: "PASS", blocking: false, measurementStatus: "NOT_MEASURED", thresholds: { coverageWarningPct: 80, duplicationWarningPct: 3 }, summary: { scopes: 0, scopesMeasured: 0, warnings: 0, diagnosticCount: 0, topUncoveredBranchFiles: [], elapsedMs: 0 }, scopes: [], duplication: { state: "NOT_MEASURED", scopes: [], warnings: [], diagnostics: [] }, warnings: [], diagnostics: [] };
  return { gateStatus: "PASS", status: "PASS", cycles: [], cycleObjects: [], comparison: { added: [], stale: [] } };
}

function fixtureDocumentation(auditedHead = sha, runId = "documentation-run") {
  const document = {
    path: "README.md",
    domain: "root",
    lifecycle: { statuses: [], source: "NOT_STATED" },
    lines: 10,
    bytes: 120,
    headingCount: 1,
    maxHeadingDepth: 1,
    sections: [{ title: "Readme", depth: 1, startLine: 1, endLine: 10, lines: 10 }],
    largestSection: { title: "Readme", depth: 1, startLine: 1, endLine: 10, lines: 10 },
    internalLinks: { count: 0, items: [], invalid: [] },
    level: "NONE",
  };
  return {
    schemaVersion: 1,
    kind: "documentation-maintainability",
    status: "PASS",
    attentionRequired: false,
    auditedHead,
    runId,
    provenance: "COMMITTED_SNAPSHOT",
    thresholds: { surveillance: 601, reviewRequired: 1_001, architectureReview: 1_501 },
    documents: [document],
    ranking: [document],
    summary: { trackedDocuments: 1, surveillance: 0, reviewRequired: 0, architectureReview: 0, invalidReferences: 0 },
  };
}

function complexityEngineResult() {
  return {
    baseline: { entries: [] },
    metrics: [{ metric: "complexity", path: "apps/web/src/fixture.ts", value: 23 }],
    result: { failures: [{ key: "fixture-complexity" }], reviews: [], improvements: [], stale: [] },
    status: "FAIL",
  };
}

function cycleEngineResult() {
  return {
    baseline: { cycles: [] },
    report: { status: "clean", enumeration: "complete", cycles: [] },
    cycles: ["fixture-cycle"],
    cycleObjects: [],
    comparison: { added: [], stale: [] },
    gateStatus: "PASS",
  };
}

const qualityAudits = ["dead-code", "duplication", "top-heavy", "complexity", "cycles", "maintainability", "type-safety", "hotspots", "testability", "coverage"];

function writeFlatQualityRun(root, auditedHead, runId, generatedAt, audits = qualityAudits) {
  const shaRoot = path.join(root, "artifacts", "quality-audits", auditedHead);
  fs.mkdirSync(shaRoot, { recursive: true });
  for (const audit of audits) {
    const manifest = {
      schemaVersion: 1,
      audit,
      runId,
      auditedHead,
      originMain: auditedHead,
      baselineStable: true,
      worktreeClean: true,
      readProvenance: "COMMITTED_SNAPSHOT",
      worktreeChanged: false,
      reproducible: true,
      resultClass: "REPRODUCIBLE",
      status: "PASS",
      attentionRequired: false,
      generatedAt,
    };
    const prefix = `${audit}--${runId}`;
    fs.writeFileSync(path.join(shaRoot, `${prefix}--manifest.json`), `${JSON.stringify(manifest)}\n`);
    fs.writeFileSync(path.join(shaRoot, `${prefix}--report.json`), JSON.stringify(fixtureResult(audit)));
    fs.writeFileSync(path.join(shaRoot, `${prefix}--summary.md`), `# ${audit}\n`);
  }
}

function writeLegacyQualityRun(root, auditedHead, runId, generatedAt) {
  for (const audit of qualityAudits) {
    const target = path.join(root, "artifacts", "quality-audits", auditedHead, runId, audit);
    fs.mkdirSync(target, { recursive: true });
    const manifest = {
      schemaVersion: 1,
      audit,
      runId,
      auditedHead,
      originMain: auditedHead,
      baselineStable: true,
      worktreeClean: true,
      readProvenance: "COMMITTED_SNAPSHOT",
      worktreeChanged: false,
      reproducible: true,
      resultClass: "REPRODUCIBLE",
      status: "PASS",
      attentionRequired: false,
      generatedAt,
    };
    fs.writeFileSync(path.join(target, "manifest.json"), `${JSON.stringify(manifest)}\n`);
    fs.writeFileSync(path.join(target, "report.json"), JSON.stringify(fixtureResult(audit)));
    fs.writeFileSync(path.join(target, "summary.md"), `# ${audit}\n`);
  }
}

function snapshotShaFiles(root, auditedHead) {
  const shaRoot = path.join(root, "artifacts", "quality-audits", auditedHead);
  return new Map(fs.readdirSync(shaRoot).filter((name) => fs.statSync(path.join(shaRoot, name)).isFile()).map((name) => [name, fs.readFileSync(path.join(shaRoot, name)).toString("base64")]));
}

test("CLI parser accepts the five gates and auxiliary audit modes and rejects unknown input", () => {
  for (const mode of AUDIT_MODES) assert.equal(parseAuditMode([mode]), mode);
  assert.throws(() => parseAuditMode(["knip"]), /Mode d'audit inconnu/);
  assert.throws(() => parseAuditMode([]), /Usage:/);
});
test("artifact paths are deterministic and SHA-scoped", () => {
  const paths = createAuditPaths({ root: "C:/repo", auditedHead: sha, audit: "dead-code", runId: "run-path" });
  assert.equal(paths.auditRoot, path.join("C:/repo", "artifacts/quality-audits", sha));
  assert.match(paths.report, new RegExp(`${sha}.*dead-code--run-path--report\\.json`));
});
test("a single audit writes manifest, raw report and generated summary only below the artifact root", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("dead-code", { root, runId: "run-single", snapshot: () => stableSnapshot, engine: async () => fixtureResult("dead-code"), now: () => "2026-10-04T00:00:00.000Z" });
    const auditRoot = result.results[0].paths.auditRoot;
    assert.equal(result.status, "PASS");
    assert.deepEqual(fs.readdirSync(auditRoot).sort(), ["dead-code--run-single--manifest.json", "dead-code--run-single--report.json", "dead-code--run-single--summary.md"]);
    const manifest = JSON.parse(fs.readFileSync(path.join(auditRoot, "dead-code--run-single--manifest.json"), "utf8"));
    assert.deepEqual(manifest, {
      schemaVersion: 1,
      audit: "dead-code",
      runId: "run-single",
      auditedHead: sha,
      readProvenance: "WORKTREE_LIVE",
      resultClass: "MEASURED",
      status: "PASS",
      attentionRequired: false,
      generatedAt: "2026-10-04T00:00:00.000Z",
    });
    assertNoRemovedAuditMetadata(manifest);
    assertNoRemovedAuditMetadata(JSON.parse(fs.readFileSync(path.join(auditRoot, "dead-code--run-single--report.json"), "utf8")));
    assert.doesNotMatch(fs.readFileSync(path.join(auditRoot, "dead-code--run-single--summary.md"), "utf8"), /reproducible|baselineStable|worktreeChanged|worktreeClean|initialWorktreeClean/i);
    const files = fs.readdirSync(root, { recursive: true }).map((entry) => String(entry).replaceAll("\\", "/"));
    const artifactRoot = path.resolve(root, "artifacts", "quality-audits");
    const generatedRoot = path.resolve(root, "artifacts");
    assert.ok(files.every((file) => path.resolve(root, file) === generatedRoot || path.resolve(root, file).startsWith(artifactRoot)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all writes every gate and the aggregate as flat files for one run", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("all", { root, runId: "run-all", snapshot: () => stableSnapshot, engine: async (audit) => fixtureResult(audit) });
    const names = fs.readdirSync(path.join(root, "artifacts", "quality-audits", sha)).sort();
    assert.equal(names.length, 36);
    for (const audit of [...qualityAudits, "all"]) {
      assert.ok(names.includes(`${audit}--run-all--manifest.json`));
      assert.ok(names.includes(`${audit}--run-all--report.json`));
      assert.ok(names.includes(`${audit}--run-all--summary.md`));
    }
    assert.ok(names.includes("quality-index--run-all--index.json"));
    assert.ok(names.includes("quality-index--run-all--summary.md"));
    assert.ok(names.includes("quality-index--run-all--bundle.zip"));
    assert.deepEqual(result.projectionPaths, {
      index: path.join(root, "artifacts", "quality-audits", sha, "quality-index--run-all--index.json"),
      summary: path.join(root, "artifacts", "quality-audits", sha, "quality-index--run-all--summary.md"),
      bundle: path.join(root, "artifacts", "quality-audits", sha, "quality-index--run-all--bundle.zip"),
      shaRoot: path.join(root, "artifacts", "quality-audits", sha),
      runId: "run-all",
    });
    assert.equal(fs.statSync(result.projectionPaths.bundle).isFile(), true);
    assert.equal(result.allPaths.runRoot, result.allPaths.shaRoot);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all reduces FAIL, SKIPPED_BY_POLICY and PASS_WITH_GRACE in runner priority order", async () => {
  const scenarios = [
    {
      runId: "run-status-skipped",
      expected: "SKIPPED_BY_POLICY",
      engine: async (audit) => audit === "cycles" ? { ...fixtureResult("cycles"), status: "SKIPPED_BY_POLICY", gateStatus: "SKIPPED_BY_POLICY" } : fixtureResult(audit),
    },
    {
      runId: "run-status-grace",
      expected: "PASS_WITH_GRACE",
      engine: async (audit) => {
        if (audit !== "duplication") return fixtureResult(audit);
        return { ...fixtureResult(audit), results: [{ ...fixtureResult(audit).results[0], comparison: { status: "PASS_WITH_GRACE", failures: [] } }] };
      },
    },
    {
      runId: "run-status-grace-skipped",
      expected: "SKIPPED_BY_POLICY",
      engine: async (audit) => {
        if (audit === "cycles") return { ...fixtureResult("cycles"), status: "SKIPPED_BY_POLICY", gateStatus: "SKIPPED_BY_POLICY" };
        if (audit !== "duplication") return fixtureResult(audit);
        return { ...fixtureResult(audit), results: [{ ...fixtureResult(audit).results[0], comparison: { status: "PASS_WITH_GRACE", failures: [] } }] };
      },
    },
    {
      runId: "run-status-fail",
      expected: "FAIL",
      engine: async (audit) => audit === "cycles"
        ? { ...fixtureResult("cycles"), status: "SKIPPED_BY_POLICY", gateStatus: "SKIPPED_BY_POLICY" }
        : audit === "complexity"
          ? { ...fixtureResult("complexity"), status: "FAIL", result: { failures: [{ key: "fixture" }], reviews: [], improvements: [], stale: [] } }
          : fixtureResult(audit),
    },
  ];

  for (const scenario of scenarios) {
    const root = tempRoot();
    try {
      const result = await runQualityAudit("all", {
        root,
        runId: scenario.runId,
        snapshot: () => stableSnapshot,
        engine: scenario.engine,
      });
      const aggregateManifest = JSON.parse(fs.readFileSync(result.allPaths.manifest, "utf8"));
      const aggregateReport = JSON.parse(fs.readFileSync(result.allPaths.report, "utf8"));
      assert.equal(result.status, scenario.expected, scenario.runId);
      assert.equal(aggregateManifest.status, scenario.expected, scenario.runId);
      assert.equal(aggregateReport.status, scenario.expected, scenario.runId);
      assertNoRemovedAuditMetadata(aggregateManifest);
      assertNoRemovedAuditMetadata(aggregateReport);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("offline lit le run réel produit avec cycles SKIPPED_BY_POLICY", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("all", {
      root,
      runId: "run-offline-skipped",
      snapshot: () => stableSnapshot,
      engine: async (audit) => audit === "cycles"
        ? { ...fixtureResult("cycles"), status: "SKIPPED_BY_POLICY", gateStatus: "SKIPPED_BY_POLICY" }
        : fixtureResult(audit),
    });
    const offline = readOfflineQualityRun({ root, auditedSha: sha, runId: "run-offline-skipped" });
    assert.equal(result.status, "SKIPPED_BY_POLICY");
    assert.equal(offline.aggregateManifest.status, "SKIPPED_BY_POLICY");
    assert.equal(offline.manifests.cycles.status, "SKIPPED_BY_POLICY");
    assert.equal(offline.reports.cycles.status, "SKIPPED_BY_POLICY");
    assert.equal(offline.manifests.complexity.status, "PASS");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all intègre la dimension documentaire dans l'agrégat, l'index et le ZIP", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("all", {
      root,
      runId: "run-documentation",
      snapshot: () => stableSnapshot,
      engine: async (audit) => fixtureResult(audit),
      documentationRunner: () => fixtureDocumentation(sha, "run-documentation"),
    });
    const aggregate = JSON.parse(fs.readFileSync(result.allPaths.report, "utf8"));
    const index = JSON.parse(fs.readFileSync(result.projectionPaths.index, "utf8"));

    assert.equal(result.status, "PASS");
    assert.equal(result.results.length, 10);
    assert.equal(aggregate.documentation.kind, "documentation-maintainability");
    assert.equal(index.audits.documentation.state, "PRESENT");
    assert.equal(index.globalCounts.documentationFiles, 1);
    assert.equal(fs.statSync(result.projectionPaths.bundle).isFile(), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un échec documentaire reste NOT_MEASURED sans modifier le verdict des cinq moteurs", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("all", {
      root,
      runId: "run-documentation-failure",
      snapshot: () => stableSnapshot,
      engine: async (audit) => fixtureResult(audit),
      documentationRunner: () => { throw new Error("documentation fixture failure"); },
    });
    const index = JSON.parse(fs.readFileSync(result.projectionPaths.index, "utf8"));

    assert.equal(result.status, "PASS");
    assert.equal(result.results.length, 10);
    assert.equal(result.documentation.status, "NOT_MEASURED");
    assert.equal(result.documentation.reason, "MEASUREMENT_FAILED");
    assert.equal(result.documentation.error.message, "documentation fixture failure");
    assert.equal(result.projectionStatus, "PASS");
    assert.equal(index.audits.documentation.state, "NOT_MEASURED");
    assert.equal(index.audits.documentation.reason, "MEASUREMENT_FAILED");
    assert.equal(index.source.documentation.reason, "MEASUREMENT_FAILED");
    assert.match(fs.readFileSync(result.projectionPaths.summary, "utf8"), /documentation-maintainability/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all enrichit l'index avec la projection architecturale du même SHA/run", async () => {
  const root = tempRoot();
  try {
    const architecture = {
      state: "PRESENT",
      gitSha: sha,
      graphSummary: { imports: 2, unresolvedInternalImports: 0 },
      files: [{
        path: "apps/web/src/fixture.ts",
        domain: "fixture",
        metrics: { fanIn: { runtime: 0, typeOnly: 0, tests: 0 }, fanOut: { runtime: 1, typeOnly: 0, tests: 0 }, totalFanIn: 0, totalFanOut: 1 },
        findings: { crossDomainImports: { state: "NONE" }, layerCrossings: { state: "NONE" }, boundaryViolations: { state: "NONE" }, unresolvedInternal: { state: "NONE" } },
        relations: { dependencies: [], dependents: [], crossDomainImports: [], layerCrossings: [] },
      }],
      domains: [{ id: "architecture:fixture", domain: "fixture", responsibility: "fixture", files: ["apps/web/src/fixture.ts"], metrics: { runtimeFanIn: 0, runtimeFanOut: 1, typeOnlyFanIn: 0, typeOnlyFanOut: 0, testFanIn: 0, testFanOut: 0 } }],
      boundary: { state: "PRESENT", blocking: [], current: [], blockingStatus: "PASS" },
    };
    const result = await runQualityAudit("all", {
      root,
      runId: "run-architecture",
      snapshot: () => stableSnapshot,
      engine: async (audit) => fixtureResult(audit),
      architectureBuilder: () => architecture,
    });
    const index = JSON.parse(fs.readFileSync(result.projectionPaths.index, "utf8"));
    assert.equal(index.auditedHead, sha);
    assert.equal(index.runId, "run-architecture");
    assert.equal(index.architecture.state, "PRESENT");
    assert.equal(index.globalCounts.architectureFiles, 1);
    assert.equal(index.files.find((file) => file.path.endsWith("fixture.ts")).metrics.architecture.state, "PRESENT");
    assert.deepEqual(index.functionalDomains.items.find((domain) => domain.id === "architecture:fixture"), {
      id: "architecture:fixture",
      responsibility: "fixture",
      files: ["apps/web/src/fixture.ts"],
      findingIds: [],
      qualityFindingIds: [],
      boundaryViolationIds: [],
      blockingBoundaryViolationIds: [],
      informativeRelationIds: [],
      findingReferences: [],
      informativeRelationReferences: [],
      candidateGroups: [],
      coupling: { runtimeFanIn: 0, runtimeFanOut: 1, typeOnlyFanIn: 0, typeOnlyFanOut: 0, testFanIn: 0, testFanOut: 0 },
    });
    assert.match(fs.readFileSync(result.projectionPaths.summary, "utf8"), /FUNCTIONAL DOMAIN INDEX/);
    assert.equal(fs.statSync(result.projectionPaths.bundle).isFile(), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all produit la projection pour un checkout dirty et ancien sans métadonnée de propreté", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("all", {
      root,
      runId: "run-informative",
      snapshot: () => ({ ...stableSnapshot, originMain: "b".repeat(40), worktree: " M foreign.ts", worktreeClean: false, baselineStable: false }),
      engine: async (audit) => fixtureResult(audit),
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.projectionStatus, "PASS");
    assert.ok(result.projectionPaths.index);
    const index = JSON.parse(fs.readFileSync(result.projectionPaths.index, "utf8"));
    assert.equal(index.source.reproducible, undefined);
    assertNoRemovedAuditMetadata(index.source);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un échec de projection est exposé sans transformer le verdict des engines en faux résultat", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("all", {
      root,
      runId: "run-projection-failure",
      snapshot: () => stableSnapshot,
      engine: async (audit) => fixtureResult(audit),
      architectureBuilder: () => ({ state: "PRESENT", files: null, domains: [] }),
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.projectionStatus, "FAIL");
    assert.match(result.projectionPaths.error, /is not iterable/);
    assert.ok(formatQualityAuditCliResult(result).some((line) => line.startsWith("QUALITY_AUDIT_PROJECTION_ERROR:")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all produit index et ZIP même lorsqu'un contrôle échoue avec un diagnostic exploitable", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("all", {
      root,
      runId: "run-failing-control",
      snapshot: () => stableSnapshot,
      engine: async (audit) => audit === "complexity"
        ? { status: "FAIL", error: { code: "FIXTURE_FAILED", message: "complexity indisponible" } }
        : fixtureResult(audit),
    });
    assert.equal(result.status, "FAIL");
    assert.equal(result.results.find((entry) => entry.audit === "complexity").status, "FAIL");
    assert.ok(result.projectionPaths.index);
    assert.ok(result.projectionPaths.summary);
    assert.ok(result.projectionPaths.bundle);
    assert.equal(fs.statSync(result.projectionPaths.bundle).isFile(), true);
    const index = JSON.parse(fs.readFileSync(result.projectionPaths.index, "utf8"));
    assert.equal(index.audits.complexity.state, "NOT_MEASURED");
    assert.equal(index.source.initialStatus, "FAIL");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("attention rules cover dead-code, duplication, top-heavy, complexity and cycles", () => {
  const dead = fixtureResult("dead-code");
  dead.comparison.newFindings.push({ file: "src/new.ts" });
  assert.equal(attentionRequired("dead-code", dead), true);

  const duplication = fixtureResult("duplication");
  duplication.results[0].metrics.newClones = 1;
  assert.equal(attentionRequired("duplication", duplication), true);

  const topHeavy = fixtureResult("top-heavy");
  topHeavy.evaluation.reviewWarnings.push({ file: "src/large.ts" });
  topHeavy.evaluation.reviewWarningsRequiringDecision = [{ file: "src/large.ts" }];
  assert.equal(attentionRequired("top-heavy", topHeavy), true);

  const complexity = fixtureResult("complexity");
  complexity.result.improvements.push({ key: "improvement" });
  assert.equal(attentionRequired("complexity", complexity), true);

  const cycles = fixtureResult("cycles");
  cycles.comparison.added.push("cycle");
  assert.equal(attentionRequired("cycles", cycles), true);
});

test("top-heavy distingue les décisions acquises, REVIEW_REQUIRED et les deltas", () => {
  const acquired = {
    "src/decided.ts": {
      file: "src/decided.ts",
      architectureDecision: "PROACTIVE_SPLIT",
      priority: "LATER",
      dependencyOrBlocker: "aucun",
      nextTrigger: "prochain changement",
      decisionAcquired: true,
    },
  };
  const baseEvaluation = {
    blockingFindings: [],
    reviewWarnings: [{ file: "src/decided.ts", lines: 501, bytes: 100, kind: "runtime" }],
    reviewImprovements: [],
    staleReviewBaselineEntries: [],
    staleBaselineEntries: [],
  };
  const decided = enrichTopHeavyEvaluation(baseEvaluation, acquired);
  assert.equal(decided.reviewWarningsWithDecision.length, 1);
  assert.equal(decided.reviewWarningsRequiringDecision.length, 0);
  assert.equal(attentionRequired("top-heavy", { evaluation: decided }), false);

  const undecided = enrichTopHeavyEvaluation({ ...baseEvaluation, reviewWarnings: [{ ...baseEvaluation.reviewWarnings[0], file: "src/unknown.ts" }] }, acquired);
  assert.equal(undecided.reviewWarningsWithDecision.length, 0);
  assert.equal(undecided.reviewWarningsRequiringDecision.length, 1);
  assert.equal(attentionRequired("top-heavy", { evaluation: undecided }), true);

  const reviewRequired = enrichTopHeavyEvaluation(baseEvaluation, {
    "src/decided.ts": { ...acquired["src/decided.ts"], architectureDecision: "REVIEW_REQUIRED", decisionAcquired: false },
  });
  assert.equal(reviewRequired.reviewWarningsWithDecision[0].architectureDecision, "REVIEW_REQUIRED");
  assert.equal(reviewRequired.reviewWarningsRequiringDecision.length, 1);
  assert.equal(attentionRequired("top-heavy", { evaluation: reviewRequired }), true);

  const improvement = enrichTopHeavyEvaluation({ ...baseEvaluation, reviewImprovements: [{ file: "src/decided.ts" }] }, acquired);
  assert.equal(attentionRequired("top-heavy", { evaluation: improvement }), true);
});

test("la projection humaine associe le registre canonique aux chemins", () => {
  const markdown = fs.readFileSync(path.join(process.cwd(), "documentation", "architecture", "modularity-decisions.md"), "utf8");
  const decisions = buildHumanDecisionsByFile(markdown);
  assert.equal(decisions["apps/web/src/components/chat/chat-shell.tsx"].architectureDecision, "ALREADY_MODULARIZED");
  assert.equal(decisions["apps/web/src/components/chat/chat-shell.tsx"].decisionAcquired, true);
  assert.equal(decisions["apps/web/src/components/chat/chat-shell.tsx"].priority, "NONE");
});

test("executeAudit attend la promesse de complexité et conserve ses métriques", async () => {
  const root = tempRoot();
  try {
    const result = await executeAudit("complexity", root, {
      complexityRunner: async () => complexityEngineResult(),
    });
    assert.equal(result.status, "FAIL");
    assert.equal(result.readProvenance, "WORKTREE_LIVE");
    assert.equal(result.metrics[0].value, 23);
    assert.deepEqual(result.result.failures, [{ key: "fixture-complexity" }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("executeAudit attend aussi la promesse de maintenabilité", async () => {
  const root = tempRoot();
  try {
    const result = await executeAudit("maintainability", root, {
      maintainabilityRunner: async () => fixtureResult("maintainability"),
    });
    assert.equal(result.status, "PASS");
    assert.equal(result.readProvenance, "WORKTREE_LIVE");
    assert.equal(result.kind, "quality-maintainability");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("executeAudit attend la promesse de cycles et conserve le gate et la comparaison", async () => {
  const root = tempRoot();
  try {
    const result = await executeAudit("cycles", root, {
      cycleRunner: async () => cycleEngineResult(),
    });
    assert.equal(result.gateStatus, "PASS");
    assert.deepEqual(result.cycles, ["fixture-cycle"]);
    assert.deepEqual(result.comparison, { added: [], stale: [] });
    assert.equal(result.readProvenance, "WORKTREE_LIVE");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("executeAudit conserve SKIPPED_BY_POLICY sans produire une mesure de cycles", async () => {
  const root = tempRoot();
  try {
    const result = await executeAudit("cycles", root, {
      cycleRunner: async () => ({
        status: "SKIPPED_BY_POLICY",
        gateStatus: "SKIPPED_BY_POLICY",
        reason: "fixture policy",
        cycles: [],
        cycleObjects: [],
        comparison: { added: [], stale: [] },
      }),
    });
    assert.equal(result.status, "SKIPPED_BY_POLICY");
    assert.equal(result.readProvenance, "NOT_RUN");
    assert.deepEqual(result.cycles, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("executeAudit transmet le SHA audité aux projections hotspots et testability", async () => {
  const root = tempRoot();
  const auditedHead = "d".repeat(40);
  try {
    let hotspotSha = null;
    let testabilitySha = null;
    const hotspots = await executeAudit("hotspots", root, {
      auditedHead,
      hotspotsRunner: ({ auditedSha }) => {
        hotspotSha = auditedSha;
        return { kind: "quality-hotspots", status: "PASS", methodology: {}, summary: {}, files: [], diagnostics: [] };
      },
    });
    const testability = await executeAudit("testability", root, {
      auditedHead,
      testabilityRunner: ({ auditedSha }) => {
        testabilitySha = auditedSha;
        return { kind: "quality-testability", status: "PASS", summary: {}, domains: [], diagnostics: [] };
      },
    });
    assert.equal(hotspots.status, "PASS");
    assert.equal(testability.status, "PASS");
    assert.equal(hotspotSha, auditedHead);
    assert.equal(testabilitySha, auditedHead);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("une promesse asynchrone rejetée produit un FAIL diagnostiqué et laisse les engines suivants s'exécuter", async () => {
  const root = tempRoot();
  let snapshotCount = 0;
  const startSnapshot = { ...stableSnapshot, worktree: " M foreign.ts", worktreeClean: false, baselineStable: false };
  const endSnapshot = { ...startSnapshot, worktree: " M foreign.ts\n?? another-foreign.ts" };
  const calls = [];
  try {
    const result = await runQualityAudit("all", {
      root,
      snapshot: () => (++snapshotCount === 1 ? startSnapshot : endSnapshot),
      engine: async (audit, engineRoot, context) => {
        if (audit === "complexity") {
          return executeAudit(audit, engineRoot, {
            ...context,
            complexityRunner: async () => {
              calls.push("complexity");
              const error = new Error("fixture complexity failure");
              error.code = "FIXTURE_COMPLEXITY_FAILED";
              throw error;
            },
          });
        }
        if (audit === "cycles") {
          return executeAudit(audit, engineRoot, {
            ...context,
            cycleRunner: async () => {
              calls.push("cycles");
              return cycleEngineResult();
            },
          });
        }
        calls.push(audit);
        return fixtureResult(audit);
      },
    });

    const complexity = result.results.find((entry) => entry.audit === "complexity");
    const cycles = result.results.find((entry) => entry.audit === "cycles");
    const complexityReport = JSON.parse(fs.readFileSync(complexity.paths.report, "utf8"));
    const cyclesReport = JSON.parse(fs.readFileSync(cycles.paths.report, "utf8"));
    const manifest = JSON.parse(fs.readFileSync(result.allPaths.manifest, "utf8"));

    assert.deepEqual(calls, ["dead-code", "duplication", "top-heavy", "complexity", "cycles", "maintainability", "type-safety", "hotspots", "testability", "coverage"]);
    assert.equal(complexity.status, "FAIL");
    assert.equal(complexityReport.status, "FAIL");
    assert.equal(complexityReport.error.code, "FIXTURE_COMPLEXITY_FAILED");
    assert.equal(complexityReport.error.message, "fixture complexity failure");
    assert.equal(cycles.status, "PASS");
    assert.equal(cyclesReport.gateStatus, "PASS");
    assert.equal(manifest.resultClass, "FAILURE");
    assertNoRemovedAuditMetadata(manifest);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un résultat asynchrone malformé produit un FAIL diagnostiqué pour les deux branches réelles", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("all", {
      root,
      snapshot: () => stableSnapshot,
      engine: async (audit, engineRoot, context) => {
        if (audit === "complexity") {
          return executeAudit(audit, engineRoot, {
            ...context,
            complexityRunner: async () => ({ status: "PASS" }),
          });
        }
        if (audit === "cycles") {
          return executeAudit(audit, engineRoot, {
            ...context,
            cycleRunner: async () => ({ gateStatus: "PASS" }),
          });
        }
        return fixtureResult(audit);
      },
    });

    for (const audit of ["complexity", "cycles"]) {
      const entry = result.results.find((candidate) => candidate.audit === audit);
      const report = JSON.parse(fs.readFileSync(entry.paths.report, "utf8"));
      assert.equal(entry.status, "FAIL");
      assert.equal(report.status, "FAIL");
      assert.equal(report.error.code, "MALFORMED_RESULT");
    }
    assert.equal(result.status, "FAIL");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all runs each engine once, aggregates statuses and retains other results after failure", async () => {
  const root = tempRoot();
  const calls = [];
  try {
    const result = await runQualityAudit("all", {
      root,
      snapshot: () => stableSnapshot,
      engine: async (audit) => {
        calls.push(audit);
        if (audit === "duplication") throw new Error("fixture engine failure");
        return fixtureResult(audit);
      },
    });
    assert.deepEqual(calls, ["dead-code", "duplication", "top-heavy", "complexity", "cycles", "maintainability", "type-safety", "hotspots", "testability", "coverage"]);
    assert.equal(result.results.length, 10);
    assert.equal(result.status, "FAIL");
    assert.equal(result.results.find((entry) => entry.audit === "duplication").status, "FAIL");
    assert.equal(result.results.find((entry) => entry.audit === "cycles").status, "PASS");
    assert.ok(fs.existsSync(result.allPaths.manifest));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("all correlates the five current gate results after execution without rerunning an engine", async () => {
  const root = tempRoot();
  try {
    const candidate = { file: "apps/web/src/example.ts", lines: 601, bytes: 20_000, kind: "runtime" };
    const result = await runQualityAudit("all", {
      root,
      snapshot: () => stableSnapshot,
      engine: async (audit) => {
        if (audit === "top-heavy") return { ...fixtureResult(audit), rows: [candidate] };
        if (audit === "complexity") return { ...fixtureResult(audit), metrics: [{ metric: "complexity", path: candidate.file, category: "React/JSX", value: 23 }] };
        return fixtureResult(audit);
      },
    });
    const topHeavy = result.results.find((entry) => entry.audit === "top-heavy").result;
    assert.equal(topHeavy.radarProjection.rows[0].signals.size.state, "PRESENT");
    assert.equal(topHeavy.radarProjection.rows[0].signals.complexity.state, "PRESENT");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("duplication audit accepts a dirty worktree without recording checkout metadata", async () => {
  const root = tempRoot();
  const dirtySnapshot = { ...stableSnapshot, worktree: " M src/dirty.ts", worktreeClean: false, baselineStable: false };
  try {
    const result = await runQualityAudit("duplication", {
      root,
      snapshot: () => dirtySnapshot,
      engine: async () => fixtureResult("duplication"),
    });
    const manifest = JSON.parse(fs.readFileSync(result.results[0].paths.manifest, "utf8"));
    assert.equal(result.status, "PASS");
    assert.equal(manifest.resultClass, "MEASURED");
    assertNoRemovedAuditMetadata(manifest);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all audits accept a dirty worktree without recording checkout metadata", async () => {
  const root = tempRoot();
  const dirtySnapshot = { ...stableSnapshot, worktree: " M src/dirty.ts", worktreeClean: false, baselineStable: false };
  try {
    const result = await runQualityAudit("all", {
      root,
      snapshot: () => dirtySnapshot,
      engine: async (audit) => fixtureResult(audit),
    });
    const manifest = JSON.parse(fs.readFileSync(result.allPaths.manifest, "utf8"));
    assert.equal(result.status, "PASS");
    assert.equal(manifest.resultClass, "MEASURED");
    assertNoRemovedAuditMetadata(manifest);
    assert.equal(manifest.audit, "all");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("non-conflicting concurrent execution does not stop an audit or alter its findings", async () => {
  const root = tempRoot();
  try {
    let snapshotCount = 0;
    let engineCalls = 0;
    const changed = {
      ...stableSnapshot,
    };
    const result = await runQualityAudit("dead-code", {
      root,
      runId: "run-changed",
      snapshot: () => (++snapshotCount === 1 ? { ...stableSnapshot } : changed),
      engine: async () => {
        engineCalls += 1;
        return fixtureResult("dead-code");
      },
    });
    const manifest = JSON.parse(fs.readFileSync(result.results[0].paths.manifest, "utf8"));
    assert.equal(result.status, "PASS");
    assert.equal(engineCalls, 1);
    assert.equal(manifest.auditedHead, sha);
    assert.equal(manifest.resultClass, "MEASURED");
    assertNoRemovedAuditMetadata(manifest);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an audit on an old SHA is accepted without a reproducibility classification", async () => {
  const root = tempRoot();
  try {
    const localSnapshot = { ...stableSnapshot };
    const result = await runQualityAudit("dead-code", { root, runId: "run-local-commit", snapshot: () => localSnapshot, engine: async () => fixtureResult("dead-code") });
    const manifest = JSON.parse(fs.readFileSync(result.results[0].paths.manifest, "utf8"));
    assert.equal(result.status, "PASS");
    assert.equal(manifest.resultClass, "MEASURED");
    assertNoRemovedAuditMetadata(manifest);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("each engine retains provenance and concurrent runs use distinct artifact roots", async () => {
  const root = tempRoot();
  try {
    const engine = async (audit) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { ...fixtureResult(audit), readProvenance: audit === "top-heavy" ? "COMMITTED_SNAPSHOT" : "WORKTREE_LIVE" };
    };
    const [first, second] = await Promise.all([
      runQualityAudit("all", { root, runId: "run-a", snapshot: () => stableSnapshot, engine }),
      runQualityAudit("all", { root, runId: "run-b", snapshot: () => stableSnapshot, engine }),
    ]);
    assert.notEqual(first.results[0].paths.report, second.results[0].paths.report);
    assert.ok(fs.existsSync(first.allPaths.manifest));
    assert.ok(fs.existsSync(second.allPaths.manifest));
    const topHeavy = first.results.find((entry) => entry.audit === "top-heavy");
    assert.equal(topHeavy.readProvenance, "COMMITTED_SNAPSHOT");
    assert.equal(topHeavy.resultClass, "MEASURED");
    assertNoRemovedAuditMetadata(topHeavy);
    assert.equal(first.results.find((entry) => entry.audit === "dead-code").readProvenance, "WORKTREE_LIVE");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("retention keeps the three most recently executed SHA directories", async () => {
  const root = tempRoot();
  try {
    for (let index = 0; index < 4; index += 1) {
      writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);
    }
    const retention = await retainQualityAuditArtifacts({ root });
    const directories = fs.readdirSync(path.join(root, "artifacts", "quality-audits"), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    assert.equal(retention.status, "PASS");
    assert.deepEqual(directories, ["1".repeat(40), "2".repeat(40), "3".repeat(40)]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("quatre SHA valides avec projections suivent la rétention du SHA", async () => {
  const root = tempRoot();
  const oldest = "0".repeat(40);
  try {
    for (let index = 0; index < 4; index += 1) {
      const auditedHead = String(index).repeat(40);
      const runId = `run-${index}`;
      writeFlatQualityRun(root, auditedHead, runId, `2026-10-0${index + 1}T00:00:00.000Z`, [...qualityAudits, "all"]);
      const projection = createQualityProjectionPaths({ root, auditedHead, runId });
      fs.writeFileSync(projection.index, JSON.stringify({ schemaVersion: 1, kind: "quality-file-index", auditedHead, runId }));
      fs.writeFileSync(projection.summary, "# quality index\n");
      fs.writeFileSync(projection.bundle, Buffer.from("PK\x03\x04fixture"));
      assert.equal(listFlatQualityProjectionArtifacts({ root, auditedSha: auditedHead }).length, 3);
    }

    const retention = await retainQualityAuditArtifacts({ root });

    assert.equal(retention.status, "PASS");
    assert.ok(retention.removedSha.includes(oldest));
    assert.equal(fs.existsSync(path.join(root, "artifacts", "quality-audits", oldest)), false);
    assert.equal(retention.diagnostics.some((entry) => entry.includes("UNKNOWN_CONTENT_PRESERVED")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("les projections orphelines préservent le SHA entier et exposent leur diagnostic", async () => {
  for (const kind of ["index", "summary", "bundle"]) {
    const root = tempRoot();
    const oldest = "0".repeat(40);
    try {
      writeFlatQualityRun(root, oldest, "run-old", "2026-10-01T00:00:00.000Z", [...qualityAudits, "all"]);
      const projection = createQualityProjectionPaths({ root, auditedHead: oldest, runId: "run-orphan" });
      fs.writeFileSync(projection[kind], kind === "bundle" ? Buffer.from("PK\x03\x04orphan") : kind === "index" ? "{}" : "# orphan\n");
      const before = snapshotShaFiles(root, oldest);
      for (let index = 1; index < 4; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);

      const retention = await retainQualityAuditArtifacts({ root });

      assert.equal(retention.removedSha.includes(oldest), false);
      assert.ok(retention.diagnostics.some((entry) => entry.includes(`${oldest}:orphan-projection:`)));
      assert.deepEqual(snapshotShaFiles(root, oldest), before);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test("un rapport classique sans manifeste empêche toute suppression partielle du SHA", async () => {
  const root = tempRoot();
  const oldest = "0".repeat(40);
  try {
    writeFlatQualityRun(root, oldest, "run-old", "2026-10-01T00:00:00.000Z");
    const shaRoot = path.join(root, "artifacts", "quality-audits", oldest);
    fs.writeFileSync(path.join(shaRoot, "dead-code--run-orphan--report.json"), "orphan report");
    const before = snapshotShaFiles(root, oldest);
    for (let index = 1; index < 4; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);

    const retention = await retainQualityAuditArtifacts({ root });

    assert.equal(retention.removedSha.includes(oldest), false);
    assert.ok(retention.diagnostics.some((entry) => entry.includes(`${oldest}:unattributed-artifact:dead-code--run-orphan--report.json`)));
    assert.deepEqual(snapshotShaFiles(root, oldest), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("les projections de plusieurs runs valides restent rattachées à leurs manifestes", async () => {
  const root = tempRoot();
  const multi = "1".repeat(40);
  try {
    writeFlatQualityRun(root, "0".repeat(40), "run-old", "2026-10-01T00:00:00.000Z", [...qualityAudits, "all"]);
    for (const [runId, day] of [["run-a", "02"], ["run-b", "03"]]) {
      writeFlatQualityRun(root, multi, runId, `2026-10-${day}T00:00:00.000Z`, [...qualityAudits, "all"]);
      const projection = createQualityProjectionPaths({ root, auditedHead: multi, runId });
      fs.writeFileSync(projection.index, JSON.stringify({ runId }));
      fs.writeFileSync(projection.summary, `# ${runId}\n`);
      fs.writeFileSync(projection.bundle, Buffer.from(`PK\x03\x04${runId}`));
    }
    for (const index of [2, 3]) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 2}T00:00:00.000Z`, [...qualityAudits, "all"]);

    const retention = await retainQualityAuditArtifacts({ root });

    assert.ok(retention.removedSha.includes("0".repeat(40)));
    assert.equal(fs.existsSync(createQualityProjectionPaths({ root, auditedHead: multi, runId: "run-a" }).index), true);
    assert.equal(fs.existsSync(createQualityProjectionPaths({ root, auditedHead: multi, runId: "run-b" }).bundle), true);
    assert.equal(retention.diagnostics.some((entry) => entry.includes(`${multi}:UNKNOWN_CONTENT_PRESERVED`)), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un marqueur actif tronqué protège le SHA identifiable sans suppression partielle", async () => {
  const root = tempRoot();
  const oldest = "0".repeat(40);
  try {
    writeFlatQualityRun(root, oldest, "run-old", "2026-10-01T00:00:00.000Z", [...qualityAudits, "all"]);
    const projection = createQualityProjectionPaths({ root, auditedHead: oldest, runId: "run-old" });
    fs.writeFileSync(projection.index, "{\"runId\":\"run-old\"}");
    fs.writeFileSync(projection.summary, "# old\n");
    fs.writeFileSync(projection.bundle, Buffer.from("PK\\x03\\x04old"));
    const before = snapshotShaFiles(root, oldest);
    fs.writeFileSync(path.join(root, "artifacts", "quality-audits", `.active-${oldest}--truncated.json`), "{\"schemaVersion\":1");
    for (let index = 1; index < 4; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);

    const retention = await retainQualityAuditArtifacts({ root });

    assert.equal(retention.removedSha.includes(oldest), false);
    assert.ok(retention.retainedSha.includes(oldest));
    assert.ok(retention.diagnostics.some((entry) => entry.includes(`${oldest}--truncated.json:ACTIVE_MARKER_AMBIGUOUS_PRESERVED`)));
    assert.deepEqual(snapshotShaFiles(root, oldest), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un JSON de marqueur invalide protège le SHA du nom et conserve toutes ses preuves", async () => {
  const root = tempRoot();
  const oldest = "0".repeat(40);
  try {
    writeFlatQualityRun(root, oldest, "run-old", "2026-10-01T00:00:00.000Z", [...qualityAudits, "all"]);
    const projection = createQualityProjectionPaths({ root, auditedHead: oldest, runId: "run-old" });
    fs.writeFileSync(projection.index, "{}");
    fs.writeFileSync(projection.summary, "# old\n");
    fs.writeFileSync(projection.bundle, Buffer.from("PK\\x03\\x04old"));
    const before = snapshotShaFiles(root, oldest);
    const markerPath = path.join(root, "artifacts", "quality-audits", `.active-${oldest}--invalid.json`);
    fs.writeFileSync(markerPath, "not-json");
    for (let index = 1; index < 4; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);

    const retention = await retainQualityAuditArtifacts({ root });

    assert.equal(retention.removedSha.includes(oldest), false);
    assert.ok(fs.existsSync(path.join(root, "artifacts", "quality-audits", oldest)));
    assert.ok(fs.existsSync(markerPath));
    assert.ok(retention.diagnostics.some((entry) => entry.includes(`${oldest}--invalid.json:ACTIVE_MARKER_AMBIGUOUS_PRESERVED`)));
    assert.deepEqual(snapshotShaFiles(root, oldest), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("une contradiction d'identité protège les SHA du nom et du contenu", async () => {
  const root = tempRoot();
  const namedSha = "1".repeat(40);
  const declaredSha = "0".repeat(40);
  try {
    for (let index = 0; index < 5; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);
    const beforeNamed = snapshotShaFiles(root, namedSha);
    const beforeDeclared = snapshotShaFiles(root, declaredSha);
    const markerPath = path.join(root, "artifacts", "quality-audits", `.active-${namedSha}--contradiction.json`);
    fs.writeFileSync(markerPath, `${JSON.stringify({ schemaVersion: 1, kind: "quality-audit-active", auditedHead: declaredSha, runId: "contradiction", startedAt: "2020-01-01T00:00:00.000Z", owner: { pid: process.pid, hostname: os.hostname(), instanceId: "contradiction" } })}\n`);

    const retention = await retainQualityAuditArtifacts({ root });

    assert.equal(retention.removedSha.includes(namedSha), false);
    assert.equal(retention.removedSha.includes(declaredSha), false);
    assert.ok(retention.retainedSha.includes(namedSha));
    assert.ok(retention.retainedSha.includes(declaredSha));
    assert.ok(retention.diagnostics.some((entry) => entry.includes("ACTIVE_MARKER_IDENTITY_CONTRADICTION_PRESERVED")));
    assert.equal(fs.existsSync(markerPath), true);
    assert.deepEqual(snapshotShaFiles(root, namedSha), beforeNamed);
    assert.deepEqual(snapshotShaFiles(root, declaredSha), beforeDeclared);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un marqueur sans SHA identifiable conserve son diagnostic sans rattachement inventé", async () => {
  const root = tempRoot();
  const oldest = "0".repeat(40);
  try {
    writeFlatQualityRun(root, oldest, "run-old", "2026-10-01T00:00:00.000Z");
    const markerPath = path.join(root, "artifacts", "quality-audits", ".active-corrupt.json");
    fs.writeFileSync(markerPath, "{}");
    for (let index = 1; index < 4; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);

    const retention = await retainQualityAuditArtifacts({ root });

    assert.ok(retention.removedSha.includes(oldest));
    assert.ok(fs.existsSync(markerPath));
    assert.ok(retention.diagnostics.some((entry) => entry.includes(".active-corrupt.json:ACTIVE_MARKER_IDENTITY_UNRESOLVED_PRESERVED")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un owner absent récupère le marqueur et la rétention supprime normalement le SHA expiré", async () => {
  const root = tempRoot();
  const oldest = "0".repeat(40);
  try {
    writeFlatQualityRun(root, oldest, "run-old", "2026-10-01T00:00:00.000Z");
    const markerPath = path.join(root, "artifacts", "quality-audits", `.active-${oldest}--abandoned.json`);
    fs.writeFileSync(markerPath, `${JSON.stringify({ schemaVersion: 1, kind: "quality-audit-active", auditedHead: oldest, runId: "abandoned", startedAt: "2020-01-01T00:00:00.000Z", owner: { pid: 2147483647, hostname: os.hostname(), instanceId: "abandoned" } })}\n`);
    for (let index = 1; index < 4; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);

    const retention = await retainQualityAuditArtifacts({ root });

    assert.ok(retention.removedSha.includes(oldest));
    assert.equal(fs.existsSync(path.join(root, "artifacts", "quality-audits", oldest)), false);
    assert.equal(fs.existsSync(markerPath), false);
    assert.ok(retention.diagnostics.some((entry) => entry.includes("ABANDONED_MARKER_RECOVERED")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a failed audit is retained and active executions are never removed", async () => {
  const root = tempRoot();
  const oldest = "0".repeat(40);
  try {
    writeFlatQualityRun(root, oldest, "run-old", "2026-10-01T00:00:00.000Z");
    for (let index = 1; index < 4; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);
    const marker = await beginActiveAudit({ root, auditedHead: oldest, runId: "active-run" });
    const retention = await retainQualityAuditArtifacts({ root });
    assert.equal(retention.status, "PASS");
    assert.ok(fs.existsSync(path.join(root, "artifacts", "quality-audits", oldest)));
    endActiveAudit(marker);
    const afterRelease = await retainQualityAuditArtifacts({ root });
    assert.ok(afterRelease.removedSha.includes(oldest));

    const failed = await runQualityAudit("dead-code", {
      root,
      runId: "failed-run",
      snapshot: () => stableSnapshot,
      engine: async () => ({ status: "FAIL", error: { message: "fixture failure" } }),
    });
    assert.equal(failed.status, "FAIL");
    assert.ok(fs.existsSync(failed.results[0].paths.report));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("l'enregistrement actif attend le même verrou que la rétention", async () => {
  const root = tempRoot();
  try {
    const lock = await acquireRetentionLock(root, { waitMs: 100 });
    assert.equal(lock.status, "ACQUIRED");
    const pending = beginActiveAudit({ root, auditedHead: sha, runId: "concurrent-run", lockWaitMs: 250 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const markerPath = path.join(root, "artifacts", "quality-audits", ".active-" + sha + "--concurrent-run.json");
    assert.equal(fs.existsSync(markerPath), false);
    releaseRetentionLock(lock);
    const released = await pending;
    assert.equal(released, markerPath);
    assert.equal(JSON.parse(fs.readFileSync(markerPath, "utf8")).owner.hostname, os.hostname());
    endActiveAudit(markerPath);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un marqueur actif ancien reste protégé tant que son owner est vivant", async () => {
  const root = tempRoot();
  try {
    const marker = await beginActiveAudit({ root, auditedHead: "0".repeat(40), runId: "old-active", now: () => "2020-01-01T00:00:00.000Z" });
    const retention = await retainQualityAuditArtifacts({ root });
    assert.equal(retention.status, "PASS");
    assert.ok(fs.existsSync(marker));
    assert.ok(retention.retainedSha.includes("0".repeat(40)));
    endActiveAudit(marker);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un owner absent est récupéré, mais un owner ambigu reste préservé", async () => {
  const root = tempRoot();
  const qualityRoot = path.join(root, "artifacts", "quality-audits");
  const abandonedSha = "0".repeat(40);
  const ambiguousSha = "1".repeat(40);
  try {
    fs.mkdirSync(qualityRoot, { recursive: true });
    const abandonedPath = path.join(qualityRoot, `.active-${abandonedSha}--crashed.json`);
    const ambiguousPath = path.join(qualityRoot, `.active-${ambiguousSha}--unknown.json`);
    fs.writeFileSync(abandonedPath, `${JSON.stringify({ schemaVersion: 1, kind: "quality-audit-active", auditedHead: abandonedSha, runId: "crashed", startedAt: "2020-01-01T00:00:00.000Z", owner: { pid: 2147483647, hostname: os.hostname(), instanceId: "crashed-process" } })}\n`);
    fs.writeFileSync(ambiguousPath, `${JSON.stringify({ schemaVersion: 1, kind: "quality-audit-active", auditedHead: ambiguousSha, runId: "unknown", startedAt: "2020-01-01T00:00:00.000Z", owner: { pid: process.pid, hostname: "unknown-host" } })}\n`);
    const retention = await retainQualityAuditArtifacts({ root });
    assert.ok(retention.diagnostics.some((entry) => entry.includes("ABANDONED_MARKER_RECOVERED")));
    assert.ok(retention.diagnostics.some((entry) => entry.includes("ACTIVE_MARKER_AMBIGUOUS_PRESERVED")));
    assert.equal(fs.existsSync(abandonedPath), false);
    assert.equal(fs.existsSync(ambiguousPath), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("un verrou de rétention indisponible reporte sans supprimer", async () => {
  const root = tempRoot();
  const qualityRoot = path.join(root, "artifacts", "quality-audits");
  const oldest = "0".repeat(40);
  try {
    writeFlatQualityRun(root, oldest, "run-old", "2020-01-01T00:00:00.000Z");
    for (let index = 1; index < 4; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);
    fs.mkdirSync(path.join(qualityRoot, ".retention.lock"));
    const retention = await retainQualityAuditArtifacts({ root, lockWaitMs: 25 });
    assert.equal(retention.status, "DEFERRED");
    assert.deepEqual(retention.diagnostics, ["LOCK_ACTIVE"]);
    assert.ok(fs.existsSync(path.join(qualityRoot, oldest)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("unknown files and ZIP archives are preserved by retention", async () => {
  const root = tempRoot();
  const shaToPreserve = "0".repeat(40);
  try {
    writeFlatQualityRun(root, shaToPreserve, "run-old", "2026-10-01T00:00:00.000Z");
    const shaRoot = path.join(root, "artifacts", "quality-audits", shaToPreserve);
    fs.writeFileSync(path.join(shaRoot, "user-note.txt"), "keep");
    fs.symlinkSync("user-note.txt", path.join(shaRoot, "user-note-link"), "file");
    fs.writeFileSync(path.join(root, "artifacts", "quality-audits", "archive.zip"), "zip");
    for (let index = 1; index < 4; index += 1) writeFlatQualityRun(root, String(index).repeat(40), `run-${index}`, `2026-10-0${index + 1}T00:00:00.000Z`);
    const retention = await retainQualityAuditArtifacts({ root });
    assert.ok(retention.diagnostics.some((entry) => entry.includes("UNKNOWN_CONTENT_PRESERVED")));
    assert.ok(fs.existsSync(path.join(root, "artifacts", "quality-audits", shaToPreserve, "user-note.txt")));
    assert.equal(fs.lstatSync(path.join(shaRoot, "user-note-link")).isSymbolicLink(), true);
    assert.ok(fs.existsSync(path.join(root, "artifacts", "quality-audits", "archive.zip")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("legacy runs migrate atomically and collisions preserve both source and destination", async () => {
  const root = tempRoot();
  const sha = "a".repeat(40);
  try {
    writeLegacyQualityRun(root, sha, "legacy-run", "2026-10-04T00:00:00.000Z");
    const before = fs.readFileSync(path.join(root, "artifacts", "quality-audits", sha, "legacy-run", "dead-code", "report.json"), "utf8");
    const retention = await retainQualityAuditArtifacts({ root });
    assert.equal(retention.status, "PASS");
    const migrated = path.join(root, "artifacts", "quality-audits", sha, "dead-code--legacy-run--report.json");
    assert.equal(fs.readFileSync(migrated, "utf8"), before);
    assert.ok(!fs.existsSync(path.join(root, "artifacts", "quality-audits", sha, "legacy-run")));

    writeLegacyQualityRun(root, "b".repeat(40), "legacy-collision", "2026-10-03T00:00:00.000Z");
    const collision = path.join(root, "artifacts", "quality-audits", "b".repeat(40), "dead-code--legacy-collision--report.json");
    fs.mkdirSync(path.dirname(collision), { recursive: true });
    fs.writeFileSync(collision, "different");
    const second = await retainQualityAuditArtifacts({ root });
    assert.ok(second.diagnostics.some((entry) => entry.includes("UNKNOWN_CONTENT_PRESERVED")));
    assert.ok(fs.existsSync(path.join(root, "artifacts", "quality-audits", "b".repeat(40), "legacy-collision", "dead-code", "report.json")));
    assert.equal(fs.readFileSync(collision, "utf8"), "different");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("serializes shared findings in each branch instead of marking them circular", () => {
  const staleEntry = {
    path: "src/example.ts",
    metric: "complexity",
    identity: "function:example",
    value: 23,
  };
  const report = {
    baseline: { entries: [staleEntry] },
    result: { stale: [staleEntry] },
  };

  const serialized = serialize(report);

  assert.deepEqual(serialized.baseline.entries[0], serialized.result.stale[0]);
  assert.notEqual(serialized.result.stale[0], "[Circular]");
  assert.equal(serialized.result.stale[0].path, "src/example.ts");
  assert.equal(serialized.result.stale[0].metric, "complexity");
  assert.equal(serialized.result.stale[0].identity, "function:example");
  assert.equal(serialized.result.stale[0].value, 23);
});

test("protects true circular references", () => {
  const value = { name: "cycle" };
  value.self = value;

  assert.deepEqual(serialize(value), { name: "cycle", self: "[Circular]" });
});

test("serializes metrics and diagnostic error fields", () => {
  const error = new Error("engine failed");
  error.code = "ENGINE_FAILED";

  assert.deepEqual(serialize({
    metrics: {
      complexity: 23,
      duplicatedLines: 7,
      nonFinite: Number.POSITIVE_INFINITY,
    },
    error,
  }), {
    metrics: {
      complexity: 23,
      duplicatedLines: 7,
      nonFinite: null,
    },
    error: {
      name: "Error",
      message: "engine failed",
      code: "ENGINE_FAILED",
    },
  });
});

test("executeAudit propagates malformed current registry errors", async () => { const root = tempRoot(); try { const malformed = "<!-- RADAR:HUMAN_DECISIONS:BEGIN -->\n| PATH | ARCHITECTURE_DECISION | PRIORITY | DEPENDENCY_OR_BLOCKER | NEXT_TRIGGER |\n| --- | --- | --- | --- | --- |\n<!-- RADAR:HUMAN_DECISIONS:END -->"; const view = { isFile: (file) => file === "documentation/architecture/modularity-decisions.md", readText: () => malformed }; await assert.rejects(() => executeAudit("top-heavy", root, { auditedHead: sha, topHeavyRunner: () => fixtureResult("top-heavy"), repositoryViewFactory: () => view }), /Registre canonique des décisions illisible/); } finally { fs.rmSync(root, { recursive: true, force: true }); } });

// End-to-end engine execution belongs to the audit commands, not this plumbing suite.
