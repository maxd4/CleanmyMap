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
import { stableId } from "./quality-index-primitives.mjs";

const sha = "c".repeat(40);
const runId = "projection-run";
const fileA = "apps/web/src/a.ts";
const fileB = "apps/web/src/b.ts";
const testFile = "apps/web/src/a.test.ts";
const dataFile = "apps/web/src/data/config.ts";

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

test("préserve l'identifiant historique d'un cycle indépendant de la casse et de la permutation", () => {
  const expectedId = "27ae585ac6925adce9b659b5";
  const buildCycleIndex = (cycleFiles) => {
    const run = buildRun();
    run.reports.cycles = {
      status: "PASS",
      cycleObjects: [{ files: cycleFiles, edges: [] }],
      comparison: { added: [], stale: [] },
    };
    return buildQualityFileIndex({ run, mode: "OFFLINE" });
  };

  const first = buildCycleIndex(["A.ts", "a.ts"]);
  const permuted = buildCycleIndex(["a.ts", "A.ts"]);
  assert.equal(stableId("cycle", ["A.ts", "a.ts"]), expectedId);
  assert.equal(first.audits.cycles.cycles[0].id, expectedId);
  assert.equal(permuted.audits.cycles.cycles[0].id, expectedId);
});

test("projette un triage borné sans inventer une décision architecturale", () => {
  const run = buildRun();
  run.reports["top-heavy"].rows.push(
    { file: testFile, kind: "test", lines: 1_100, bytes: 60_000, generated: false },
    { file: dataFile, kind: "data/config", lines: 1_600, bytes: 90_000, generated: false },
  );
  run.documentation = documentationReport();
  const current = { ...run.documentation.documents[0], path: "documentation/current.md", lifecycle: { statuses: ["CURRENT"], source: "EXPLICIT" }, lines: 1_600, level: "ARCHITECTURE_REVIEW" };
  const historical = { ...run.documentation.documents[0], path: "documentation/history.md", lifecycle: { statuses: ["HISTORY"], source: "EXPLICIT" }, lines: 1_400, level: "REVIEW_REQUIRED" };
  run.documentation.documents = [current, historical];
  run.documentation.ranking = [current, historical];
  run.documentation.summary = { trackedDocuments: 2, surveillance: 0, reviewRequired: 1, architectureReview: 1, invalidReferences: 0 };

  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const markdown = buildQualityFileIndexMarkdown(index);

  assert.equal(index.triage.code.candidates.length, 2);
  assert.equal(index.triage.code.candidates[0].path, dataFile);
  assert.equal(index.triage.tests.candidates.length, 1);
  assert.equal(index.triage.tests.candidates[0].path, testFile);
  assert.equal(index.triage.functions.candidates.length, 1);
  assert.ok(index.triage.documentation.currentPlan.some((candidate) => candidate.path === "documentation/current.md"));
  assert.ok(index.triage.documentation.historyAudit.some((candidate) => candidate.path === "documentation/history.md"));
  assert.equal(new Set(index.triage.code.candidates.map((candidate) => candidate.path)).size, index.triage.code.candidates.length);
  assert.equal(new Set(index.triage.functions.candidates.map((candidate) => candidate.path)).size, index.triage.functions.candidates.length);
  assert.equal(new Set(index.triage.documentation.candidates.map((candidate) => candidate.path)).size, index.triage.documentation.candidates.length);
  assert.equal(index.triage.code.candidates[0].decision, "NOT_RECORDED_IN_QUALITY_INDEX");
  assert.ok(!JSON.stringify(index.triage).includes("MONOLITH"));
  assert.match(markdown, /## Synthèse de triage/);
  assert.ok(markdown.indexOf("### 1. Code") < markdown.indexOf("### 2. Tests"));
  assert.ok(markdown.indexOf("### 2. Tests") < markdown.indexOf("### 3. Documentation"));
  assert.ok(markdown.indexOf("### 3. Documentation") < markdown.indexOf("### 4. Fonctions"));
  assert.match(markdown, /#### CURRENT \/ PLAN/);
  assert.match(markdown, /#### HISTORY \/ AUDIT/);
  assert.match(markdown, /NOT_RECORDED_IN_QUALITY_INDEX/);
  assert.match(markdown, /FILE INDEX/);
});

test("conserve l'absence de mesure et la preuve périmée dans le triage des fonctions", () => {
  const run = buildRun();
  run.reports.complexity = { error: { code: "COMPLEXITY_UNAVAILABLE", message: "fixture" } };
  const index = buildQualityFileIndex({ run, mode: "OFFLINE" });
  assert.equal(index.triage.functions.state, "NOT_MEASURED");
  assert.equal(index.triage.functions.candidates.length, 0);

  const staleRun = buildRun();
  staleRun.reports.complexity.result.stale = [{ metric: "complexity", path: fileA, value: 22, type: "stale" }];
  const staleIndex = buildQualityFileIndex({ run: staleRun, mode: "OFFLINE" });
  assert.equal(staleIndex.triage.functions.state, "PRESENT");
  assert.equal(staleIndex.triage.functions.staleEvidenceCount, 1);
  assert.equal(staleIndex.files.find((file) => file.path === fileA).findings.complexity.state, "PRESENT");
});

function decisionTriageFixtureRun() {
  const run = buildRun();
  const uiFile = "apps/web/src/components/triage-card.tsx";
  const authzFile = "apps/web/src/lib/authz/triage-guard.ts";
  run.reports["top-heavy"].readProvenance = "COMMITTED_SNAPSHOT";
  run.reports["top-heavy"].rows.push({ file: uiFile, kind: "runtime", lines: 510, bytes: 41_000, generated: false });
  run.reports["top-heavy"].baseline.review.push({ path: uiFile, maxLines: 500, maxBytes: 40_000, status: "IMPROVED" });
  run.reports.hotspots = {
    status: "PASS",
    kind: "quality-hotspots",
    readProvenance: "COMMITTED_SNAPSHOT",
    methodology: { historyWindowDays: 180 },
    files: [{
      file: uiFile,
      activity: { commits: 6, substantiveChanges: 2, addedLines: 100, deletedLines: 20, highActivity: true },
      structuralDebt: { state: "PRESENT", signals: ["top-heavy"], signalCount: 1 },
      regressionRecurrence: { state: "NOT_MEASURED" },
      hotspotCandidate: true,
      severity: "informational",
    }],
    summary: { trackedFilesExamined: 4, filesReported: 1, highActivityFiles: 1, hotspotCandidates: 1, structuralDebtFiles: 1 },
    diagnostics: [],
  };
  run.reports.complexity.metrics.push({ metric: "complexity", path: authzFile, value: 99, line: 8, endLine: 80, functionIdentity: "authorizeTriage" });
  run.reports.complexity.result.failures.push({ metric: "complexity", path: authzFile, value: 99, line: 8, type: "failures" });
  run.reports.complexity.result.stale.push({ metric: "complexity", path: fileA, value: null, line: null, type: "stale" });
  const occurrence = (fingerprint, occurrenceA, occurrenceB) => ({ fingerprint, occurrenceA, occurrenceB });
  run.reports.duplication = {
    status: "FAIL",
    results: [{
      scopeName: "runtime",
      metrics: { clones: 4, duplicatedLines: 16, duplicatedTokens: 80, newClones: 3 },
      fingerprints: ["fp-shared", "fp-second", "fp-authz"],
      occurrences: [
        occurrence("fp-shared", { path: fileA, startLine: 12, endLine: 15 }, { path: fileB, startLine: 22, endLine: 25 }),
        occurrence("fp-shared", { path: fileA, startLine: 14, endLine: 18 }, { path: fileB, startLine: 24, endLine: 28 }),
        occurrence("fp-second", { path: fileA, startLine: 50, endLine: 53 }, { path: fileB, startLine: 60, endLine: 63 }),
        occurrence("fp-authz", { path: uiFile, startLine: 10, endLine: 14 }, { path: authzFile, startLine: 20, endLine: 24 }),
      ],
    }],
    justificationReport: {
      classifications: { KEEP_INTENTIONAL: ["runtime:fp-second"], NO_ACTION_NOISE: [] },
      classificationCounts: { KEEP_INTENTIONAL: 1, NO_ACTION_NOISE: 0 },
    },
  };
  run.reports.cycles = { status: "SKIPPED_BY_POLICY", reason: "CURRENT_POLICY", cycleObjects: [], comparison: { added: [], stale: [] } };
  return { run, uiFile, authzFile };
}

test("classe les gains, la prudence et les groupes sans double comptage", () => {
  const { run, uiFile, authzFile } = decisionTriageFixtureRun();
  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const decision = index.triage.decision;
  const duplication = decision.candidates.filter((candidate) => candidate.auditCategory === "duplication");
  const shared = duplication.find((candidate) => candidate.evidence.group?.fingerprint === "fp-shared");
  const second = duplication.find((candidate) => candidate.evidence.group?.fingerprint === "fp-second");
  const authz = duplication.find((candidate) => candidate.evidence.group?.fingerprint === "fp-authz");
  const quick = decision.views.quickWins.find((candidate) => candidate.files.includes(uiFile));

  assert.equal(duplication.length, 3);
  assert.equal(shared.evidence.group.occurrencePairs, 2);
  assert.deepEqual(shared.evidence.group.uniqueFiles, [fileA, fileB]);
  assert.equal(shared.evidence.group.distinctLinesAcrossFiles, 14);
  assert.equal(shared.benefitPotential.measures.occurrencePairs, 2);
  assert.equal(shared.benefitPotential.measures.distinctLinesAcrossFiles, 14);
  assert.equal(shared.benefitPotential.level, "HIGH");
  assert.notEqual(shared.id, second.id);
  assert.equal(second.humanDecision, "KEEP_INTENTIONAL");
  assert.equal(second.recommendation, "KEEP_JUSTIFIED");
  assert.equal(authz.prudence.level, "R4");
  assert.equal(authz.validationEffort, "REINFORCED");
  assert.ok(authz.prudence.participants.some((participant) => participant.file === uiFile && participant.level === "R2"));
  assert.ok(authz.prudence.participants.some((participant) => participant.file === authzFile && participant.level === "R4"));
  assert.ok(authz.prudence.level === "R4" && decision.views.reinforcedReview.some((candidate) => candidate.id === authz.id));
  assert.ok(quick);
  assert.equal(quick.proposedPriority, "P1");
  assert.equal(quick.effort.level, "APPARENTLY_LIMITED");
  assert.equal(quick.confidence, "HIGH");
  assert.match(buildQualityFileIndexMarkdown(index), /Gains rapides et maîtrisés/);
  assert.match(buildQualityFileIndexMarkdown(index), /Corrections importantes sous revue renforcée/);
});

test("sépare les preuves manquantes, la complexité sensible et les cycles suspendus", () => {
  const { run, authzFile } = decisionTriageFixtureRun();
  const index = buildQualityFileIndex({ run, mode: "OFFLINE" });
  const decision = index.triage.decision;
  const complexAuthz = decision.candidates.find((candidate) => candidate.auditCategory === "complexity" && candidate.files.includes(authzFile));
  const stale = decision.candidates.find((candidate) => candidate.auditCategory === "complexity" && candidate.evidence.finding?.type === "stale");
  const cycleCandidates = decision.candidates.filter((candidate) => candidate.auditCategory === "cycles");

  assert.equal(index.audits.cycles.state, "SKIPPED_BY_POLICY");
  assert.equal(index.audits.cycles.status, "SKIPPED_BY_POLICY");
  assert.equal(cycleCandidates.filter((candidate) => candidate.sourceKind === "group").length, 0);
  assert.ok(cycleCandidates.some((candidate) => candidate.sourceKind === "measurement-gap" && candidate.proposedPriority === "REVIEW_REQUIRED"));
  assert.equal(complexAuthz.prudence.level, "R4");
  assert.equal(complexAuthz.recommendation, "REVIEW_FIRST");
  assert.equal(complexAuthz.proposedPriority, "P2");
  assert.ok(complexAuthz.validations.some((validation) => /renforcée|sécurité/i.test(validation)));
  assert.equal(stale.evidence.state, "STALE_EVIDENCE");
  assert.equal(stale.proposedPriority, "REVIEW_REQUIRED");
  assert.equal(stale.effort.level, "NOT_ESTIMABLE");
  assert.equal(stale.validationEffort, "NOT_ESTIMABLE");
  assert.ok(stale.gaps.some((gap) => /périmée/i.test(gap)));

  const historicalIndex = buildQualityFileIndex({ run: buildRun(), mode: "OFFLINE" });
  assert.equal(historicalIndex.triage.decision.source.auditedHead, sha);
  assert.equal(historicalIndex.triage.decision.source.runId, runId);
  assert.ok(historicalIndex.triage.decision.candidates.some((candidate) => candidate.sourceKind === "measurement-gap"));
});

test("conserve l'identité du run et un ordre décisionnel reproductible", () => {
  const { run } = decisionTriageFixtureRun();
  const first = buildQualityFileIndex({ run, mode: "ALL" });
  const second = buildQualityFileIndex({ run, mode: "ALL" });

  assert.equal(first.schemaVersion, 7);
  assert.equal(first.triage.decision.source.auditedHead, sha);
  assert.equal(first.triage.decision.source.runId, runId);
  assert.deepEqual(first.triage.decision, second.triage.decision);
  assert.deepEqual(JSON.parse(JSON.stringify(first.triage.decision)), first.triage.decision);
  assert.equal(first.source.initialStatus, "FAIL");
  assert.equal(first.audits.complexity.status, "FAIL");
  assert.equal(first.audits.duplication.status, "FAIL");
  assert.equal(first.audits.cycles.status, "SKIPPED_BY_POLICY");
  assert.equal(first.triage.decision.candidates.every((candidate) => candidate.rank >= 1), true);
});

function criticalTriageCandidate(finding = {}) {
  const run = buildRun();
  const criticalPath = "apps/web/src/lib/authz/critical-triage.ts";
  const metric = { metric: "complexity", path: criticalPath, value: 99, line: 8, ...finding };
  run.reports.complexity.metrics = [metric];
  run.reports.complexity.result.failures = [{ type: "failures", ...metric }];
  const index = buildQualityFileIndex({ run, mode: "OFFLINE" });
  return index.triage.decision.candidates.find((candidate) => candidate.auditCategory === "complexity" && candidate.files.includes(criticalPath));
}

test("n'attribue jamais P0 à une présence textuelle ou à un champ non structuré", () => {
  const cases = [
    { confirmed: false, critical: false },
    { message: "not confirmed" },
    { message: "critical risk not established" },
    {},
    { confirmed: true, critical: false },
    { criticality: { defectConfirmed: true, criticalityConfirmed: true, attributedTo: "security-review" } },
  ];

  for (const finding of cases) {
    const candidate = criticalTriageCandidate(finding);
    assert.ok(candidate, `finding candidate missing for ${JSON.stringify(finding)}`);
    assert.equal(candidate.prudence.level, "R4");
    assert.notEqual(candidate.proposedPriority, "P0");
    assert.equal(candidate.proposedPriority, "P2");
  }
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

test("projette la structure AST, sa relation aux métriques existantes et les signaux cumulés sans créer de finding", () => {
  const run = buildRun();
  run.reports.complexity.metrics = [
    { metric: "complexity", path: fileA, functionIdentity: "named:fixture#1", value: 12, line: 5, functionStartLine: 5, functionEndLine: 20, category: "runtime/services/orchestration" },
    { metric: "functionLength", path: fileA, functionIdentity: "named:fixture#1", value: 44, line: 5, functionStartLine: 5, functionEndLine: 20, category: "runtime/services/orchestration" },
  ];
  run.reports.maintainability = {
    status: "PASS",
    measurementStatus: "MEASURED_NOT_RATCHETED",
    summary: { findingsByRule: {} },
    metrics: [{ category: "cognitive-complexity", metric: "cognitiveComplexity", path: fileA, functionIdentity: "named:fixture#1", function: "named:fixture", line: 5, functionStartLine: 5, functionEndLine: 20, value: 18, thresholdTarget: 15 }],
    controlFlowProfiles: [{
      status: "PRESENT",
      path: fileA,
      functionIdentity: "named:fixture#1",
      functionStartLine: 5,
      functionEndLine: 20,
      line: 5,
      decisionPoints: 5,
      maxDecisionNestingDepth: 3,
      nestedDecisionCount: 2,
      decisionKinds: { if: 3, "&&": 1, ternary: 1 },
      decisionSubtrees: [{ index: 0, kind: "IfStatement", line: 6, endLine: 15, decisionPoints: 5, maxDecisionNestingDepth: 3, nestedDecisionCount: 2, decisionKinds: { if: 3, "&&": 1, ternary: 1 }, locations: [] }],
      busiestSubtree: { index: 0, kind: "IfStatement", line: 6, endLine: 15, decisionPoints: 5 },
    }],
    findings: [],
    diagnostics: [],
  };
  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const indexed = index.files.find((file) => file.path === fileA);
  const profile = indexed.metrics.controlFlowStructure.items[0];

  assert.equal(indexed.metrics.controlFlowStructure.state, "PRESENT");
  assert.equal(profile.decisionPoints, 5);
  assert.deepEqual(profile.relation.cyclomaticComplexity, { value: 12, category: "runtime/services/orchestration", line: 5 });
  assert.deepEqual(profile.relation.functionLength, { value: 44, category: "runtime/services/orchestration", line: 5 });
  assert.deepEqual(profile.relation.cognitiveComplexity, { value: 18, line: 5, thresholdTarget: 15 });
  assert.equal(indexed.findings.localMaintainability.state, "NONE");
  assert.equal(index.triage.functions.candidates.length, 1);
  assert.deepEqual(index.triage.functions.candidates[0].functionSignals[0].signals, ["complexity", "functionLength", "cognitiveComplexity", "controlFlowStructure"]);
  assert.match(buildQualityFileIndexMarkdown(index), /FUNCTION CONTROL-FLOW STRUCTURE/);
  assert.match(buildQualityFileIndexMarkdown(index), /named:fixture#1/);
});

test("projette une comparaison historique exacte dans l'index et le triage sans changer le verdict", () => {
  const current = buildRun();
  current.reports.complexity.metrics = [
    { metric: "complexity", path: fileA, functionIdentity: "named:fixture#1", value: 12, line: 5, functionStartLine: 5, functionEndLine: 20 },
    { metric: "functionLength", path: fileA, functionIdentity: "named:fixture#1", value: 50, line: 5, functionStartLine: 5, functionEndLine: 20 },
  ];
  current.reports.maintainability = {
    schemaVersion: 1,
    kind: "quality-maintainability",
    status: "PASS",
    measurementStatus: "MEASURED_NOT_RATCHETED",
    readProvenance: "COMMITTED_SNAPSHOT",
    engine: { name: "eslint-plugin-sonarjs", version: "3.0.0", eslint: "9.0.0" },
    sourceRoots: ["scripts"],
    rules: { "sonarjs/cognitive-complexity": { thresholdTarget: 15 } },
    policy: { controlFlowStructure: "descriptive" },
    metrics: [{ metric: "cognitiveComplexity", path: fileA, functionIdentity: "named:fixture#1", function: "fixture", value: 18, line: 5, functionStartLine: 5, functionEndLine: 20 }],
    findings: [{ category: "local-maintainability", ruleId: "sonarjs/no-collapsible-if", file: fileA, functionIdentity: "named:fixture#1", line: 9 }],
    controlFlowProfiles: [{ status: "PRESENT", path: fileA, functionIdentity: "named:fixture#1", functionStartLine: 5, functionEndLine: 20, decisionPoints: 5, maxDecisionNestingDepth: 2, nestedDecisionCount: 1, busiestSubtree: { decisionPoints: 3 }, decisionSubtrees: [{ index: 0, kind: "IfStatement", decisionPoints: 3 }] }],
    maintainabilityStatuses: [{ path: fileA, status: "PRESENT", reason: null }],
    summary: { findingsByRule: {} },
  };
  const previous = structuredClone(current);
  previous.auditedSha = "d".repeat(40);
  previous.runId = "previous-projection-run";
  previous.reports.complexity.metrics[0].value = 8;
  previous.reports.complexity.metrics[1].value = 44;
  previous.reports.maintainability.metrics[0].value = 12;
  previous.reports.maintainability.findings = [];
  previous.manifests.maintainability = { readProvenance: "COMMITTED_SNAPSHOT", status: "PASS" };
  current.manifests.maintainability = { readProvenance: "COMMITTED_SNAPSHOT", status: "PASS" };

  const index = buildQualityFileIndex({ run: current, previousRun: previous, comparisonRequested: true, mode: "OFFLINE" });
  assert.equal(index.source.initialStatus, "FAIL");
  assert.equal(index.comparison.state, "PRESENT");
  assert.equal(index.comparison.summary.functionsChanged, 1);
  assert.equal(index.triage.decision.historicalComparison.candidates.length, 1);
  assert.equal(index.triage.decision.historicalComparison.candidates[0].priority, "REVIEW_REQUIRED");
  assert.match(buildQualityFileIndexMarkdown(index), /Comparaison historique non bloquante/);
  assert.match(buildQualityFileIndexMarkdown(index), /named:fixture#1/);
});

test("projette la couverture MJS et conserve NOT_MEASURED pour un parseur invalide", () => {
  const run = buildRun();
  const mjsFile = "scripts/reports/fixture.mjs";
  const invalidFile = "scripts/reports/invalid.mjs";
  run.reports.complexity.metrics.push(
    { metric: "complexity", path: mjsFile, functionIdentity: "named:fixture#1", value: 12, line: 2, functionStartLine: 2, functionEndLine: 5 },
    { metric: "functionLength", path: mjsFile, functionIdentity: "named:fixture#1", value: 8, line: 2, functionStartLine: 2, functionEndLine: 5 },
  );
  run.reports.maintainability = {
    status: "FAIL",
    measurementStatus: "MEASUREMENT_FAILED",
    summary: { findingsByRule: {}, filesMeasured: 1, filesNotMeasured: 1 },
    metrics: [{
      category: "cognitive-complexity",
      metric: "cognitiveComplexity",
      path: mjsFile,
      functionIdentity: "named:fixture#1",
      function: "named:fixture",
      line: 2,
      functionStartLine: 2,
      functionEndLine: 5,
      value: 18,
      thresholdTarget: 15,
    }],
    controlFlowProfiles: [{
      status: "PRESENT",
      path: mjsFile,
      functionIdentity: "named:fixture#1",
      line: 2,
      functionStartLine: 2,
      functionEndLine: 5,
      decisionPoints: 1,
      nestedDecisionCount: 0,
      decisionKinds: { if: 1 },
      decisionSubtrees: [],
      busiestSubtree: null,
    }],
    controlFlowStatuses: [
      { path: mjsFile, status: "PRESENT", reason: null },
      { path: invalidFile, status: "NOT_MEASURED", reason: "PARSER_FAILED" },
    ],
    maintainabilityStatuses: [
      { path: mjsFile, status: "PRESENT", reason: null },
      { path: invalidFile, status: "NOT_MEASURED", reason: "PARSER_FAILED" },
    ],
    findings: [],
    diagnostics: [{ file: invalidFile, message: "Parsing error: Unexpected token", severity: "error" }],
  };

  const index = buildQualityFileIndex({ run, mode: "ALL" });
  const measured = index.files.find((file) => file.path === mjsFile);
  const invalid = index.files.find((file) => file.path === invalidFile);
  assert.equal(measured.metrics.cognitiveComplexity.state, "PRESENT");
  assert.equal(measured.metrics.controlFlowStructure.state, "PRESENT");
  assert.equal(invalid.metrics.cognitiveComplexity.state, "NOT_MEASURED");
  assert.equal(invalid.metrics.controlFlowStructure.state, "NOT_MEASURED");
  assert.equal(index.audits.maintainability.filesNotMeasured, 1);
  assert.equal(index.triage.functions.candidates.some((candidate) => candidate.path === mjsFile), true);
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

test("la projection offline conserve le run courant quand le run historique demandé est absent", async () => {
  const root = tempRoot();
  try {
    writeRun(root);
    const generated = await generateQualityFileIndex({
      root,
      auditedSha: sha,
      runId,
      previousSha: "d".repeat(40),
      previousRunId: "missing-history",
    });
    assert.equal(generated.index.auditedHead, sha);
    assert.equal(generated.index.runId, runId);
    assert.equal(generated.index.source.initialStatus, "FAIL");
    assert.equal(generated.index.comparison.state, "NOT_MEASURED");
    assert.equal(generated.index.comparison.reason, "PREVIOUS_RUN_UNAVAILABLE");
    assert.equal(generated.index.triage.decision.historicalComparison.reason, "PREVIOUS_RUN_UNAVAILABLE");
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

test("projection conserve la suspension des cycles comme SKIPPED_BY_POLICY", () => {
  const run = buildRun();
  run.reports.cycles = { status: "SKIPPED_BY_POLICY", reason: "fixture policy", cycleObjects: [], comparison: { added: [], stale: [] } };
  const index = buildQualityFileIndex({ run, mode: "OFFLINE" });
  assert.equal(index.audits.cycles.state, "SKIPPED_BY_POLICY");
  assert.equal(index.files.find((file) => file.path === fileA)?.findings.cycles.state, "SKIPPED_BY_POLICY");
});

test("projection conserve un rapport dead-code absent en NOT_MEASURED sans planter", () => {
  const run = buildRun();
  run.reports["dead-code"] = null;
  const index = buildQualityFileIndex({ run, mode: "OFFLINE" });
  assert.equal(index.audits.deadCode.state, "NOT_MEASURED");
  assert.equal(index.audits.deadCode.error.code, "DEAD_CODE_REPORT_ABSENT");
});

test("offline accepte une ancienne archive sans confondre reproductibilité et identité SHA/run", async () => {
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
    assert.equal(generated.index.source.reproducible, undefined);
    assert.equal(generated.index.source.aggregateManifest.reproducible, undefined);
    for (const manifest of Object.values(generated.index.source.auditManifests)) {
      assert.equal(manifest.reproducible, undefined);
      assert.equal(manifest.baselineStable, undefined);
      assert.equal(manifest.worktreeChanged, undefined);
      assert.equal(manifest.worktreeClean, undefined);
      assert.equal(manifest.initialWorktreeClean, undefined);
    }
    assert.equal(generated.bundle.entries.length, 20);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("offline accepte un nouveau bundle sans les métadonnées de checkout supprimées", async () => {
  const root = tempRoot();
  try {
    writeRun(root);
    const shaRoot = path.join(root, "artifacts", "quality-audits", sha);
    const removed = ["reproducible", "baselineStable", "worktreeChanged", "worktreeClean", "initialWorktreeClean"];
    for (const audit of [...Object.keys(reports()), "all"]) {
      const manifestPath = path.join(shaRoot, `${audit}--${runId}--manifest.json`);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      for (const field of removed) delete manifest[field];
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
    }
    const generated = await generateQualityFileIndex({ root, auditedSha: sha, runId, includeBundle: true });
    assert.equal(generated.index.auditedHead, sha);
    assert.equal(generated.index.runId, runId);
    assert.equal(generated.index.source.reproducible, undefined);
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
