import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildArchitectureCouplingProjection,
  buildQualityFileIndex,
  buildQualityFileIndexMarkdown,
  generateQualityFileIndex,
  readOfflineQualityRun,
} from "./quality-file-index.mjs";
import { createAuditPaths, listFlatQualityProjectionArtifacts } from "../audits/quality-audit-storage.mjs";

const sha = "c".repeat(40);
const runId = "projection-run";
const fileA = "apps/web/src/a.ts";
const fileB = "apps/web/src/b.ts";

function architectureProjectionFixture() {
  const ui = "apps/web/src/components/entry.tsx";
  const domain = "apps/web/src/lib/domain/value.ts";
  const infrastructure = "apps/web/src/lib/supabase/adapter.ts";
  const testFile = "apps/web/src/components/entry.test.tsx";
  const nodes = [
    { path: ui, domain: "components", layer: "ui", effectiveLayer: "ui", sourceKind: "runtime", clientEntry: true, clientReachable: true, serverBoundary: false, publicFacade: false, facadeOwner: null },
    { path: domain, domain: "domain", layer: "domain", effectiveLayer: "domain", sourceKind: "runtime", clientEntry: false, clientReachable: false, serverBoundary: false, publicFacade: false, facadeOwner: null },
    { path: infrastructure, domain: "supabase", layer: "infrastructure", effectiveLayer: "infrastructure", sourceKind: "runtime", clientEntry: false, clientReachable: false, serverBoundary: false, publicFacade: true, facadeOwner: "apps/web/src/lib/supabase" },
    { path: testFile, domain: "components", layer: "test", effectiveLayer: "test", sourceKind: "test", clientEntry: false, clientReachable: false, serverBoundary: false, publicFacade: false, facadeOwner: null },
  ];
  const edge = (from, to, kind, sourceKind, line, flags = {}) => ({
    from, to, kind, sourceKind, form: "import", specifier: `./${path.basename(to, path.extname(to))}`, line,
    fromDomain: nodes.find((node) => node.path === from).domain,
    toDomain: nodes.find((node) => node.path === to).domain,
    fromLayer: nodes.find((node) => node.path === from).layer,
    toLayer: nodes.find((node) => node.path === to).layer,
    fromEffectiveLayer: nodes.find((node) => node.path === from).effectiveLayer,
    toEffectiveLayer: nodes.find((node) => node.path === to).effectiveLayer,
    crossDomain: true,
    targetsPublicFacade: false,
    importsOwnFacade: false,
    uiToInfrastructure: false,
    domainToUi: false,
    invertedLayer: false,
    ...flags,
  });
  const edges = [
    edge(ui, domain, "runtime", "runtime", 4, { crossDomain: true }),
    edge(ui, infrastructure, "runtime", "runtime", 5, { crossDomain: true, targetsPublicFacade: true, uiToInfrastructure: true }),
    edge(testFile, domain, "type-only", "test", 2, { crossDomain: true }),
  ];
  const graph = {
    gitSha: sha,
    provenance: { gitRef: sha, measuredSource: "git", verified: true },
    nodes,
    edges,
    summary: { files: nodes.length, imports: edges.length, unresolvedInternalImports: 1, crossDomainImports: 3, uiToInfrastructure: 1 },
    findings: { unresolvedInternal: [{ from: ui, specifier: "@/missing", line: 8 }] },
    domains: [
      { domain: "components", layers: ["ui", "test"], files: 2, runtimeFanIn: 0, runtimeFanOut: 2, typeOnlyFanIn: 0, typeOnlyFanOut: 0, testFanIn: 0, testFanOut: 1 },
      { domain: "domain", layers: ["domain"], files: 1, runtimeFanIn: 1, runtimeFanOut: 0, typeOnlyFanIn: 0, typeOnlyFanOut: 0, testFanIn: 1, testFanOut: 0 },
      { domain: "supabase", layers: ["infrastructure"], files: 1, runtimeFanIn: 1, runtimeFanOut: 0, typeOnlyFanIn: 0, typeOnlyFanOut: 0, testFanIn: 0, testFanOut: 0 },
    ],
  };
  const violation = { id: "boundary-1", signature: "UI_TO_INFRASTRUCTURE|fixture", rule: "UI_TO_INFRASTRUCTURE", from: ui, to: infrastructure, kind: "runtime", sourceKind: "runtime", specifier: "./adapter", line: 5 };
  return buildArchitectureCouplingProjection({ graph, boundary: { status: "FAIL", currentViolations: [violation], newViolations: [violation], reintroduced: [], staleExceptions: [], invalidExceptions: [] } });
}

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
    aggregateReport: { audits: Object.keys(auditReports).map((audit) => ({ audit, status: manifests()[audit].status })) },
    provenance: "MIXED",
  };
}

function documentationReport() {
  const document = {
    path: "README.md",
    domain: "root",
    lifecycle: { statuses: [], source: "NOT_STATED" },
    lines: 1_200,
    bytes: 24_000,
    headingCount: 4,
    maxHeadingDepth: 3,
    sections: [{ title: "Guide", depth: 1, startLine: 1, endLine: 1_200, lines: 1_200 }],
    largestSection: { title: "Guide", depth: 1, startLine: 1, endLine: 1_200, lines: 1_200 },
    internalLinks: { count: 2, items: [], invalid: [] },
    level: "REVIEW_REQUIRED",
  };
  return {
    schemaVersion: 1,
    kind: "documentation-maintainability",
    status: "PASS",
    attentionRequired: true,
    auditedHead: sha,
    runId,
    provenance: "COMMITTED_SNAPSHOT",
    thresholds: { surveillance: 601, reviewRequired: 1_001, architectureReview: 1_501 },
    documents: [document],
    ranking: [document],
    summary: { trackedDocuments: 1, surveillance: 0, reviewRequired: 1, architectureReview: 0, invalidReferences: 0 },
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
  const topHeavyFindings = indexedA.findings.topHeavy.items;
  assert.equal(topHeavyFindings.filter((finding) => finding.provenance === "INITIAL").length, 0);
  assert.equal(topHeavyFindings.filter((finding) => finding.provenance === "DERIVED" && finding.type === "reviewRatchetViolations").length, 1);
  assert.equal(topHeavyFindings.find((finding) => finding.provenance === "DERIVED").limits.ratified.maxLines, 500);
  assert.deepEqual(index.audits.topHeavy.findingViews, { initial: { count: 0 }, derived: { count: 2 } });
  assert.equal(index.audits.duplication.fingerprints.length, 1);
  assert.deepEqual(index.audits.duplication.fingerprints[0].occurrences[0], {
    occurrenceA: { path: fileA, startLine: 12, endLine: 15 },
    occurrenceB: { path: fileB, startLine: 22, endLine: 25 },
  });
  assert.equal(index.audits.cycles.cycles.length, 1);
  assert.equal(index.candidateGroups.length, 2);
  assert.ok(index.auditCategories.some((category) => category.id === "top-heavy"));
  assert.equal(index.functionalDomains.state, "NOT_MEASURED");
  assert.deepEqual(index.files.find((file) => file.path === fileA).functionalDomains, []);
  assert.equal(index.domains, undefined);
  assert.match(buildQualityFileIndexMarkdown(index), /verdict initial et réévaluation dérivée/);
  assert.equal(index.audits.documentation.state, "NOT_MEASURED");
  assert.equal(index.audits.documentation.reason, "HISTORICAL_ABSENCE");
  assert.equal(index.documentationDomains.state, "NOT_MEASURED");
  assert.equal(index.documentationDomains.reason, "HISTORICAL_ABSENCE");
});

test("projette la couverture détaillée et ses branches sans la confondre avec les gates", () => {
  const run = buildRun();
  run.reports.coverage = {
    schemaVersion: 1,
    kind: "quality-coverage-insights",
    status: "PASS",
    blocking: false,
    measurementStatus: "MEASURED",
    thresholds: { coverageWarningPct: 80, duplicationWarningPct: 3 },
    scopes: [{
      scope: "web",
      state: "MEASURED",
      metrics: {
        statements: { covered: 8, total: 10, uncovered: 2, pct: 80, state: "MEASURED", source: "summary" },
        branches: { covered: 1, total: 2, uncovered: 1, pct: 50, state: "MEASURED", source: "summary" },
        functions: { covered: 2, total: 2, uncovered: 0, pct: 100, state: "MEASURED", source: "summary" },
        lines: { covered: 8, total: 10, uncovered: 2, pct: 80, state: "MEASURED", source: "summary" },
      },
      warnings: [{ code: "COVERAGE_BELOW_TARGET", metric: "branches", value: 50, threshold: 80, severity: "WARNING" }],
      files: [{ scope: "web", path: fileA, metrics: { branches: { pct: 50, state: "MEASURED" } }, uncoveredBranches: 1, uncoveredBranchLines: [12], priority: "HIGH", provenance: { state: "MEASURED" } }],
      diagnostics: [],
      decisionPoints: [],
    }],
    duplication: { state: "NOT_MEASURED", scopes: [], warnings: [], diagnostics: [] },
    warnings: [{ code: "COVERAGE_BELOW_TARGET", metric: "branches", value: 50, threshold: 80, severity: "WARNING" }],
    diagnostics: [],
    summary: { scopes: 1, scopesMeasured: 1, warnings: 1, diagnosticCount: 0, topUncoveredBranchFiles: [], elapsedMs: 1 },
    attentionRequired: true,
  };
  run.manifests.coverage = { schemaVersion: 1, audit: "coverage", runId, auditedHead: sha, originMain: sha, baselineStable: true, worktreeClean: true, readProvenance: "MIXED", reproducible: false, resultClass: "INFORMATIVE", status: "PASS", attentionRequired: true, generatedAt: "2026-10-21T20:00:00.000Z" };
  const index = buildQualityFileIndex({ run, mode: "OFFLINE" });
  const indexed = index.files.find((file) => file.path === fileA);
  assert.equal(index.audits.coverage.state, "PRESENT");
  assert.equal(indexed.findings.coverage.state, "PRESENT");
  assert.equal(indexed.findings.coverage.items[0].uncoveredBranches, 1);
  assert.equal(indexed.metrics.coverage.items[0].metrics.branches.pct, 50);
  assert.equal(index.source.sourceReports.some((entry) => entry.audit === "coverage"), true);
});

test("projette la complexité cognitive et les défauts locaux avec leurs relations", () => {
  const run = buildRun();
  run.reports.maintainability = {
    status: "PASS",
    measurementStatus: "MEASURED_NOT_RATCHETED",
    summary: { findingsByRule: { "sonarjs/no-redundant-boolean": 1 } },
    rules: { "sonarjs/cognitive-complexity": { thresholdTarget: 15 } },
    metrics: [{
      category: "cognitive-complexity",
      metric: "cognitiveComplexity",
      path: fileA,
      functionIdentity: "named:fixture#1",
      function: "named:fixture",
      line: 5,
      functionStartLine: 5,
      functionEndLine: 20,
      value: 18,
      thresholdTarget: 15,
      relation: {
        status: "PRESENT",
        cyclomaticComplexity: { value: 12, category: "runtime/services/orchestration", line: 5 },
        functionLength: { value: 44, category: "runtime/services/orchestration", line: 5 },
      },
    }],
    findings: [{
      category: "local-maintainability",
      ruleId: "sonarjs/no-redundant-boolean",
      file: fileA,
      functionIdentity: "named:fixture#1",
      line: 9,
      column: 7,
      endLine: 9,
      endColumn: 11,
      message: "fixture finding",
      severity: "warning",
      measure: { kind: "redundant boolean literal" },
      relation: { status: "PRESENT", cyclomaticComplexity: { value: 12 }, functionLength: { value: 44 } },
    }],
    diagnostics: [],
  };
  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const indexedA = index.files.find((file) => file.path === fileA);

  assert.equal(indexedA.metrics.cognitiveComplexity.items[0].value, 18);
  assert.equal(indexedA.findings.cognitiveComplexity.state, "PRESENT");
  assert.equal(indexedA.findings.localMaintainability.state, "PRESENT");
  assert.deepEqual(indexedA.findings.cognitiveComplexity.items[0].relation.functionLength, { value: 44, category: "runtime/services/orchestration", line: 5 });
  assert.equal(index.auditCategories.some((category) => category.id === "cognitive-complexity"), true);
  assert.equal(index.auditCategories.some((category) => category.id === "local-maintainability"), true);
});

test("projette séparément TYPE_SAFETY et ASYNC_SAFETY par fichier", () => {
  const run = buildRun();
  run.reports["type-safety"] = {
    status: "FAIL",
    kind: "quality-type-safety",
    measurementStatus: "MEASURED_NOT_RATCHETED",
    coverage: [{ workspace: "mobile", effectiveCoverage: "TYPED", filesMeasured: 2, scopedFilePaths: [fileA, fileB], measuredFilePaths: [fileA, fileB] }],
    diagnostics: [],
    findings: [
      { family: "TYPE_SAFETY", ruleId: "@typescript-eslint/no-unsafe-call", file: fileA, line: 7, column: 3, message: "unsafe call", status: "HISTORICAL" },
      { family: "ASYNC_SAFETY", ruleId: "@typescript-eslint/no-misused-promises", file: fileB, line: 8, column: 5, message: "misused promise", status: "HISTORICAL" },
    ],
    summary: { filesInScope: 2, filesMeasured: 2, filesWithTypedCoverage: 2, findingsByFamily: { TYPE_SAFETY: 1, ASYNC_SAFETY: 1 }, findingsByRule: { "@typescript-eslint/no-unsafe-call": 1, "@typescript-eslint/no-misused-promises": 1 } },
  };
  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const indexedA = index.files.find((file) => file.path === fileA);
  const indexedB = index.files.find((file) => file.path === fileB);
  assert.equal(index.globalCounts.typeSafetyFindings, 1);
  assert.equal(index.globalCounts.asyncSafetyFindings, 1);
  assert.equal(indexedA.findings.typeSafety.state, "PRESENT");
  assert.equal(indexedA.findings.asyncSafety.state, "NONE");
  assert.equal(indexedB.findings.asyncSafety.state, "PRESENT");
  assert.ok(index.auditCategories.some((category) => category.id === "type-safety"));
  assert.ok(index.auditCategories.some((category) => category.id === "async-safety"));
  assert.match(buildQualityFileIndexMarkdown(index), /TYPE_SAFETY/);
  assert.match(buildQualityFileIndexMarkdown(index), /ASYNC_SAFETY/);
});

test("distingue les fichiers Mobile mesurés des fichiers Web incompatibles", () => {
  const run = buildRun();
  const mobileFile = "apps/mobile/src/clean.ts";
  const webFile = "apps/web/src/unmeasured.ts";
  run.reports["type-safety"] = {
    status: "FAIL",
    kind: "quality-type-safety",
    measurementStatus: "MEASUREMENT_FAILED",
    coverage: [
      { workspace: "web", effectiveCoverage: "UNSUPPORTED_CONFIGURATION", scopedFilePaths: [webFile], measuredFilePaths: [] },
      { workspace: "mobile", effectiveCoverage: "TYPED", scopedFilePaths: [mobileFile], measuredFilePaths: [mobileFile] },
    ],
    diagnostics: [{ code: "UNSUPPORTED_TYPESCRIPT_VERSION" }],
    findings: [],
    summary: { filesInScope: 2, filesMeasured: 1, filesWithTypedCoverage: 1, measuredFilePaths: [mobileFile], findingsByFamily: { TYPE_SAFETY: 0, ASYNC_SAFETY: 0 }, findingsByRule: {} },
  };
  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const indexedMobile = index.files.find((file) => file.path === mobileFile);
  const indexedWeb = index.files.find((file) => file.path === webFile);
  assert.equal(indexedMobile.metrics.typeSafety.state, "NONE");
  assert.equal(indexedMobile.metrics.asyncSafety.state, "NONE");
  assert.equal(indexedMobile.findings.typeSafety.state, "NONE");
  assert.equal(indexedMobile.findings.asyncSafety.state, "NONE");
  assert.equal(indexedWeb.metrics.typeSafety.state, "NOT_MEASURED");
  assert.equal(indexedWeb.findings.typeSafety.state, "NOT_MEASURED");
  assert.match(indexedWeb.findings.typeSafety.detail, /UNSUPPORTED_CONFIGURATION/);
  assert.equal(index.audits.typeSafety.coverage[0].scopedFilePaths.length, 1);
});

test("conserve PARSER_FAILED par fichier sans déduire NONE", () => {
  const run = buildRun();
  const failedFile = "apps/mobile/src/parser-failed.ts";
  run.reports["type-safety"] = {
    status: "FAIL",
    kind: "quality-type-safety",
    measurementStatus: "MEASUREMENT_FAILED",
    coverage: [{
      workspace: "mobile",
      effectiveCoverage: "TYPED",
      scopedFilePaths: [failedFile],
      measuredFilePaths: [],
      failedFilePaths: [failedFile],
      notMeasuredFileReasons: { [failedFile]: "PARSER_FAILED" },
    }],
    diagnostics: [{ code: "PARSER_FAILED", file: failedFile }],
    findings: [],
    summary: { filesInScope: 1, filesMeasured: 0, filesWithTypedCoverage: 0, filesFailed: 1, findingsByFamily: { TYPE_SAFETY: 0, ASYNC_SAFETY: 0 }, findingsByRule: {} },
  };
  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const indexed = index.files.find((file) => file.path === failedFile);
  assert.equal(indexed.metrics.typeSafety.state, "NOT_MEASURED");
  assert.equal(indexed.metrics.asyncSafety.state, "NOT_MEASURED");
  assert.equal(indexed.findings.typeSafety.state, "NOT_MEASURED");
  assert.match(indexed.findings.typeSafety.detail, /PARSER_FAILED/);
});

test("ne déduit aucune couverture par fichier pour un ancien rapport sans inventaire", () => {
  const run = buildRun();
  run.reports["type-safety"] = {
    status: "PASS",
    kind: "quality-type-safety",
    measurementStatus: "MEASURED_NOT_RATCHETED",
    coverage: [{ workspace: "mobile", effectiveCoverage: "TYPED", filesMeasured: 1 }],
    diagnostics: [],
    findings: [{ family: "TYPE_SAFETY", ruleId: "@typescript-eslint/no-unsafe-call", file: fileA, line: 4, column: 2, message: "historical" }],
    summary: { filesInScope: 1, filesMeasured: 1, filesWithTypedCoverage: 1, findingsByFamily: { TYPE_SAFETY: 1, ASYNC_SAFETY: 0 }, findingsByRule: { "@typescript-eslint/no-unsafe-call": 1 } },
  };
  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const indexed = index.files.find((file) => file.path === fileA);
  assert.equal(indexed.metrics.typeSafety.state, "NOT_MEASURED");
  assert.equal(indexed.findings.typeSafety.state, "NOT_MEASURED");
  assert.match(indexed.findings.typeSafety.detail, /inventaire/);
});

test("projette les hotspots par fichier et la testabilité par domaine sans inventer de correspondance", () => {
  const run = buildRun();
  run.reports.hotspots = {
    status: "PASS",
    kind: "quality-hotspots",
    measurementStatus: "MEASURED",
    methodology: { historyWindowDays: 180, substantiveChangeMinimumLines: 20, highActivityDescriptiveMinimumCommits: 5 },
    summary: { trackedFilesExamined: 3, filesReported: 1, filesMeasured: 1, highActivityFiles: 1, hotspotCandidates: 1, structuralDebtFiles: 1, regressionRecurrence: "NOT_MEASURED" },
    structuralDebtAvailability: { state: "COMPLETE", availableReports: ["complexity"], missingReports: [], invalidReports: [] },
    files: [{
      file: fileA,
      activity: { commits: 6, substantiveChanges: 2, addedLines: 100, deletedLines: 40, highActivity: true },
      structuralDebt: { state: "PRESENT", signals: ["complexity"], signalCount: 1 },
      hotspotCandidate: true,
      severity: "informational",
      regressionRecurrence: { state: "NOT_MEASURED" },
      provenance: { history: "COMMITTED_SNAPSHOT", debt: "QUALITY_AUDIT_RESULTS" },
    }],
    diagnostics: [],
  };
  run.reports.testability = {
    status: "PASS",
    kind: "quality-testability",
    measurementStatus: "MEASURED",
    summary: { domainsMeasured: 1, criticalDomainsWithoutSufficientEvidence: 1 },
    domains: [{
      domain: "api",
      module: "api",
      runtimeFiles: 2,
      testFiles: 1,
      testPresence: { state: "PRESENT", runtimeFilesWithoutDirectAssociation: 1 },
      coverage: { state: "NOT_MEASURED", reason: "COVERAGE_NOT_MEASURED" },
      mutation: { state: "NOT_MEASURED", reason: "MUTATION_REPORT_MISSING" },
      criticalEvidence: "NOT_MEASURED",
    }],
    diagnostics: [{ code: "MUTATION_REPORT_MISSING" }],
  };
  const architecture = {
    state: "PRESENT",
    files: [{ path: fileA, metrics: { fanIn: { runtime: 2 }, fanOut: { runtime: 3 } } }],
    domains: [],
    boundary: { state: "PRESENT", blocking: [], current: [] },
  };
  const index = buildQualityFileIndex({ run, architecture, mode: "ALL" });
  const indexedA = index.files.find((file) => file.path === fileA);

  assert.equal(indexedA.metrics.hotspots.state, "PRESENT");
  assert.equal(indexedA.metrics.hotspots.items[0].currentMetrics.cyclomaticComplexity.length, 1);
  assert.ok(indexedA.metrics.hotspots.items[0].debtAccumulation.categories.includes("complexity"));
  assert.equal(indexedA.findings.hotspots.state, "PRESENT");
  assert.equal(index.audits.testability.measuredDomains, 1);
  assert.equal(index.audits.testability.criticalDomainsWithoutSufficientEvidence, 1);
  assert.equal(index.audits.hotspots.trackedFilesExamined, 3);
  assert.equal(index.audits.hotspots.filesReported, 1);
  assert.equal(index.audits.hotspots.findingCounts.structuralDebtFiles, 1);
  assert.equal(index.audits.hotspots.structuralDebtAvailability.state, "COMPLETE");
  assert.ok(index.auditCategories.some((category) => category.id === "hotspots"));
  assert.ok(index.auditCategories.some((category) => category.id === "testability:api"));
  const markdown = buildQualityFileIndexMarkdown(index);
  assert.match(markdown, /## HOTSPOTS/);
  assert.match(markdown, /## TESTABILITY/);
  assert.match(markdown, /\| Hotspots \| Testabilité \|/);
  assert.match(markdown, /Fichiers suivis examinés/);
});

test("projette la maintenabilité documentaire dans les fichiers et le domain index", () => {
  const run = buildRun();
  run.documentation = documentationReport();
  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const document = index.files.find((file) => file.path === "README.md");

  assert.equal(index.audits.documentation.state, "PRESENT");
  assert.equal(index.globalCounts.documentationFiles, 1);
  assert.equal(document.metrics.documentation.items[0].largestSection.lines, 1_200);
  assert.equal(document.findings.documentation.state, "PRESENT");
  assert.equal(index.documentationDomains.items[0].id, "root");
  assert.equal(index.documentationDomains.items[0].levels.REVIEW_REQUIRED, 1);
  assert.match(buildQualityFileIndexMarkdown(index), /DOCUMENTATION MAINTAINABILITY/);
  assert.match(buildQualityFileIndexMarkdown(index), /DOCUMENTATION DOMAIN INDEX/);
});

test("projette le couplage architectural par fichier et domaine sans confondre les types ni les tests", () => {
  const architecture = architectureProjectionFixture();
  assert.deepEqual(architecture, architectureProjectionFixture());
  const entry = architecture.files.find((file) => file.path.endsWith("components/entry.tsx"));
  const testFile = architecture.files.find((file) => file.path.endsWith("components/entry.test.tsx"));
  const domain = architecture.domains.find((item) => item.id === "architecture:domain");

  assert.deepEqual(entry.metrics.fanOut, { runtime: 2, typeOnly: 0, tests: 0 });
  assert.deepEqual(entry.metrics.fanIn, { runtime: 0, typeOnly: 0, tests: 0 });
  assert.deepEqual(testFile.metrics.fanOut, { runtime: 0, typeOnly: 0, tests: 1 });
  assert.equal(entry.relations.dependencies.find((relation) => relation.to.endsWith("supabase/adapter.ts"))?.specifier, "./adapter");
  assert.equal(entry.findings.boundaryViolations.state, "PRESENT");
  assert.equal(entry.findings.unresolvedInternal.state, "PRESENT");
  assert.equal(architecture.boundary.blockingStatus, "FAIL");
  assert.deepEqual(domain.metrics, {
    layers: ["domain"], files: 1, runtimeFanIn: 1, runtimeFanOut: 0,
    typeOnlyFanIn: 0, typeOnlyFanOut: 0, testFanIn: 1, testFanOut: 0,
  });
});

test("rattache les findings des fichiers aux domaines fonctionnels sans confondre les vues architecturales", () => {
  const run = buildRun();
  const architecture = architectureProjectionFixture();
  const ui = architecture.files.find((file) => file.path.endsWith("components/entry.tsx"));
  const testFile = architecture.files.find((file) => file.path.endsWith("components/entry.test.tsx"));
  const emptyArchitectureFindings = {
    crossDomainImports: { state: "NONE", detail: "", items: [] },
    layerCrossings: { state: "NONE", detail: "", items: [] },
    boundaryViolations: { state: "NONE", detail: "", items: [] },
    unresolvedInternal: { state: "NONE", detail: "", items: [] },
  };
  const extraFile = (source, filePath, domain) => ({
    ...source,
    path: filePath,
    domain,
    findings: emptyArchitectureFindings,
    relations: { dependencies: [], dependents: [], crossDomainImports: [], layerCrossings: [] },
  });
  architecture.files.push(extraFile(ui, fileA, "components"), extraFile(ui, fileB, "domain"));
  architecture.domains.find((domain) => domain.id === "architecture:components").files.push(fileA);
  architecture.domains.find((domain) => domain.id === "architecture:domain").files.push(fileB);

  const deadCode = run.reports["dead-code"];
  const uiFinding = { file: ui.path, type: "export", name: "uiUnused" };
  const testFinding = { file: testFile.path, type: "export", name: "testUnused" };
  deadCode.currentFindings.push(uiFinding, testFinding);
  deadCode.comparison.newFindings.push(uiFinding, testFinding);
  run.reports["top-heavy"].evaluation.reviewWarnings = [{ file: fileA, kind: "runtime", lines: 510, bytes: 41_000 }];

  const index = buildQualityFileIndex({ run, architecture, mode: "ALL" });
  const components = index.functionalDomains.items.find((domain) => domain.id === "architecture:components");
  const domain = index.functionalDomains.items.find((item) => item.id === "architecture:domain");
  const indexedA = index.files.find((file) => file.path === fileA);
  const indexedUi = index.files.find((file) => file.path === ui.path);
  const indexedTest = index.files.find((file) => file.path === testFile.path);
  const uiFindingId = indexedUi.findings.deadCode.items.find((finding) => finding.name === "uiUnused")?.id;
  const testFindingId = indexedTest.findings.deadCode.items.find((finding) => finding.name === "testUnused")?.id;
  const duplicationFindingId = indexedA.findings.duplication.items[0].id;
  const complexityFindingId = indexedA.findings.complexity.items[0].id;
  const functionLengthFindingId = indexedA.findings.functionLength.items[0].id;
  const initialTopHeavyId = indexedA.findings.topHeavy.items.find((finding) => finding.provenance === "INITIAL")?.id;
  const derivedTopHeavyId = indexedA.findings.topHeavy.items.find((finding) => finding.provenance === "DERIVED")?.id;

  assert.ok(components);
  assert.ok(domain);
  assert.ok(uiFindingId);
  assert.ok(testFindingId);
  assert.notEqual(uiFindingId, testFindingId);
  assert.ok(components.qualityFindingIds.includes(uiFindingId));
  assert.ok(components.qualityFindingIds.includes(testFindingId));
  assert.ok(components.qualityFindingIds.includes(complexityFindingId));
  assert.ok(components.qualityFindingIds.includes(functionLengthFindingId));
  assert.ok(components.findingIds.includes("boundary-1"));
  assert.deepEqual(components.boundaryViolationIds, ["boundary-1"]);
  assert.ok(components.blockingBoundaryViolationIds.includes("boundary-1"));
  assert.ok(components.informativeRelationIds.length > 0);
  assert.ok(components.informativeRelationIds.every((id) => !components.findingIds.includes(id)));
  assert.ok(initialTopHeavyId);
  assert.ok(derivedTopHeavyId);
  assert.notEqual(initialTopHeavyId, derivedTopHeavyId);
  assert.ok(components.findingReferences.some((reference) => reference.id === uiFindingId && reference.file === ui.path));
  assert.ok(components.findingReferences.some((reference) => reference.id === testFindingId && reference.file === testFile.path));
  assert.deepEqual(
    components.findingReferences.find((reference) => reference.id === complexityFindingId && reference.file === fileA),
    { id: complexityFindingId, file: fileA, category: "complexity" },
  );
  assert.deepEqual(
    components.findingReferences.find((reference) => reference.id === functionLengthFindingId && reference.file === fileA),
    { id: functionLengthFindingId, file: fileA, category: "functionLength" },
  );
  for (const reference of components.findingReferences) {
    const indexedFile = index.files.find((file) => file.path === reference.file);
    const indexedFindings = reference.category === "boundaryViolations"
      ? indexedFile?.architecture?.findings?.boundaryViolations?.items ?? []
      : indexedFile?.findings?.[reference.category]?.items ?? [];
    assert.ok(indexedFindings.some((finding) => finding.id === reference.id), `${reference.category}/${reference.id} must resolve in FILE INDEX`);
  }
  assert.ok(components.findingIds.includes(duplicationFindingId));
  assert.ok(domain.findingIds.includes(duplicationFindingId));
  assert.equal(components.findingIds.filter((id) => id === duplicationFindingId).length, 1);
  assert.equal(domain.findingIds.filter((id) => id === duplicationFindingId).length, 1);
  assert.equal(new Set(components.findingIds).size, components.findingIds.length);
  assert.equal(new Set(components.qualityFindingIds).size, components.qualityFindingIds.length);
  const supabase = index.functionalDomains.items.find((item) => item.id === "architecture:supabase");
  assert.deepEqual(supabase.findingIds, []);
  assert.deepEqual(supabase.qualityFindingIds, []);
  assert.deepEqual(supabase.findingReferences, []);

  const markdown = buildQualityFileIndexMarkdown(index);
  assert.match(markdown, /Findings qualité :/);
  assert.match(markdown, /Violations de frontières : 1/);
  assert.match(markdown, /Relations architecturales informatives :/);
  assert.match(markdown, new RegExp(`Références FILE INDEX : .*${uiFindingId}`));
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
    assert.equal(generated.index.audits.documentation.state, "NOT_MEASURED");
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

test("offline lit les auxiliaires hotspots et testability du même SHA/run et les conserve dans le ZIP", async () => {
  const root = tempRoot();
  try {
    writeRun(root);
    const optional = {
      hotspots: {
        status: "PASS",
        kind: "quality-hotspots",
        measurementStatus: "MEASURED",
        methodology: { historyWindowDays: 180 },
        summary: { filesMeasured: 0, highActivityFiles: 0, hotspotCandidates: 0, regressionRecurrence: "NOT_MEASURED" },
        files: [],
        diagnostics: [],
      },
      testability: {
        status: "PASS",
        kind: "quality-testability",
        measurementStatus: "NOT_MEASURED",
        summary: { domainsMeasured: 0, criticalDomainsWithoutSufficientEvidence: 0 },
        domains: [],
        diagnostics: [{ code: "MODULE_TEST_METRICS_STALE_OR_UNATTRIBUTABLE" }],
      },
    };
    const shaRoot = path.join(root, "artifacts", "quality-audits", sha);
    const aggregatePath = createAuditPaths({ root, auditedHead: sha, audit: "all", runId });
    const aggregate = JSON.parse(fs.readFileSync(aggregatePath.report, "utf8"));
    for (const [audit, report] of Object.entries(optional)) {
      const paths = createAuditPaths({ root, auditedHead: sha, audit, runId });
      const manifest = { schemaVersion: 1, audit, runId, auditedHead: sha, originMain: sha, baselineStable: true, worktreeClean: true, readProvenance: "MIXED", reproducible: false, resultClass: "INFORMATIVE", status: "PASS", attentionRequired: false, generatedAt: "2026-10-21T20:00:00.000Z" };
      fs.writeFileSync(paths.manifest, `${JSON.stringify(manifest)}\n`);
      fs.writeFileSync(paths.report, `${JSON.stringify(report)}\n`);
      fs.writeFileSync(paths.summary, `# ${audit}\n`);
      aggregate.audits.push({ audit, status: "PASS", attentionRequired: false, readProvenance: "MIXED", reproducible: false, resultClass: "INFORMATIVE" });
    }
    fs.writeFileSync(aggregatePath.report, `${JSON.stringify(aggregate)}\n`);
    const generated = await generateQualityFileIndex({ root, auditedSha: sha, runId, mode: "OFFLINE", includeBundle: true, generatedAt: "2026-10-21T20:01:00.000Z" });
    assert.equal(generated.run.reports.hotspots.kind, "quality-hotspots");
    assert.equal(generated.run.reports.testability.kind, "quality-testability");
    assert.ok(generated.bundle.entries.includes("hotspots--projection-run--report.json"));
    assert.ok(generated.bundle.entries.includes("testability--projection-run--report.json"));
    assert.equal(generated.bundle.entries.length, 26);
    assert.equal(fs.existsSync(path.join(shaRoot, "hotspots--projection-run--report.json")), true);
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

test("offline accepte un run informatif sans confondre reproductibilité et identité SHA/run", async () => {
  const root = tempRoot();
  try {
    writeRun(root);
    const shaRoot = path.join(root, "artifacts", "quality-audits", sha);
    for (const audit of [...Object.keys(reports()), "all"]) {
      const manifestPath = path.join(shaRoot, `${audit}--${runId}--manifest.json`);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (audit === "all") delete manifest.originMain;
      else manifest.originMain = null;
      manifest.baselineStable = false;
      manifest.worktreeClean = false;
      manifest.reproducible = false;
      manifest.resultClass = "INFORMATIVE";
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
    }
    const run = readOfflineQualityRun({ root, auditedSha: sha, runId });
    assert.equal(run.provenance, "MIXED");
    const generated = await generateQualityFileIndex({ root, auditedSha: sha, runId, includeBundle: true });
    assert.equal(generated.index.source.reproducible, false);
    assert.equal(generated.bundle.entries.length, 20);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("offline refuse un mélange de manifestes appartenant à un autre run", () => {
  const root = tempRoot();
  try {
    writeRun(root);
    const manifestPath = path.join(root, "artifacts", "quality-audits", sha, `complexity--${runId}--manifest.json`);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.runId = "other-run";
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
    assert.throws(() => readOfflineQualityRun({ root, auditedSha: sha, runId }), /Manifest complexity incohérent: runId/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("offline refuse un verdict agrégé contradictoire avec les manifestes individuels", () => {
  const root = tempRoot();
  try {
    writeRun(root);
    const reportPath = path.join(root, "artifacts", "quality-audits", sha, `all--${runId}--report.json`);
    const aggregate = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    aggregate.audits.find((entry) => entry.audit === "complexity").status = "PASS";
    fs.writeFileSync(reportPath, `${JSON.stringify(aggregate)}\n`);
    assert.throws(() => readOfflineQualityRun({ root, auditedSha: sha, runId }), /Rapport all incohérent: verdict complexity/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
