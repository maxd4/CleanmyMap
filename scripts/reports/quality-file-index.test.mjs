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
import { createAuditPaths, createQualityProjectionPaths, listFlatQualityProjectionArtifacts } from "../audits/quality-audit-storage.mjs";

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
  assert.equal(index.documentationDomains.state, "NOT_MEASURED");
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
  const initialTopHeavyId = indexedA.findings.topHeavy.items.find((finding) => finding.provenance === "INITIAL")?.id;
  const derivedTopHeavyId = indexedA.findings.topHeavy.items.find((finding) => finding.provenance === "DERIVED")?.id;

  assert.ok(components);
  assert.ok(domain);
  assert.ok(uiFindingId);
  assert.ok(testFindingId);
  assert.notEqual(uiFindingId, testFindingId);
  assert.ok(components.qualityFindingIds.includes(uiFindingId));
  assert.ok(components.qualityFindingIds.includes(testFindingId));
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
  assert.ok(components.findingIds.includes(duplicationFindingId));
  assert.ok(domain.findingIds.includes(duplicationFindingId));
  assert.equal(components.findingIds.filter((id) => id === duplicationFindingId).length, 1);
  assert.equal(domain.findingIds.filter((id) => id === duplicationFindingId).length, 1);

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
