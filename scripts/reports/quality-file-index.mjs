#!/usr/bin/env node

/**
 * Projection des cinq rapports de gate et du rapport auxiliaire de maintenabilité d'un même run.
 *
 * Ce module ne scanne jamais le dépôt. Il lit uniquement les rapports et les
 * manifestes déjà écrits par run-quality-audit.mjs. La vue "derived" du
 * top-heavy réévalue seulement les lignes présentes dans le rapport, afin de
 * rendre visible une correction de ratchet sans réécrire le verdict initial.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

import { evaluatePolicy } from "../checks/check-top-heavy-files.mjs";
import { FILE_KIND_POLICY, isAboveHard, isAboveReview } from "../checks/top-heavy-policy.mjs";
import { loadBoundaryBaseline, evaluateBoundary } from "../checks/check-architecture-import-boundary.mjs";
import { createRepositoryView } from "../checks/repository-view.mjs";
import {
  createAuditPaths,
  createQualityProjectionPaths,
  writeNewFile,
} from "../audits/quality-audit-storage.mjs";
import { validateDocumentationReport } from "../audits/documentation-maintainability.mjs";
import { buildArchitectureImportGraph } from "./generate-architecture-import-graph.mjs";
import { createCorrelationSignalsFromAuditResults } from "./generate-modularity-radar.mjs";

export const QUALITY_INDEX_SCHEMA_VERSION = 6;
export const QUALITY_INDEX_AUDITS = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles", "maintainability", "type-safety", "hotspots", "testability", "coverage"]);
export const QUALITY_GATE_INDEX_AUDITS = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles"]);
export const QUALITY_INDEX_PREFIX = "quality-index";
export const QUALITY_ARCHITECTURE_DOMAIN_PREFIX = "architecture:";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const QUALITY_STATUS_STATES = new Set(["PRESENT", "NONE", "NOT_MEASURED", "NOT_APPLICABLE", "OUT_OF_INSTRUMENTATION"]);

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function architectureEdgeId(edge) {
  return stableId("architecture-edge", {
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
    sourceKind: edge.sourceKind,
    form: edge.form,
    specifier: edge.specifier,
    line: edge.line,
  });
}

function serializeArchitectureEdge(edge) {
  return {
    id: architectureEdgeId(edge),
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
    sourceKind: edge.sourceKind,
    form: edge.form,
    specifier: edge.specifier,
    line: edge.line,
    fromDomain: edge.fromDomain,
    toDomain: edge.toDomain,
    fromLayer: edge.fromLayer,
    toLayer: edge.toLayer,
    fromEffectiveLayer: edge.fromEffectiveLayer ?? edge.fromLayer,
    toEffectiveLayer: edge.toEffectiveLayer ?? edge.toLayer,
    crossDomain: Boolean(edge.crossDomain),
    targetsPublicFacade: Boolean(edge.targetsPublicFacade),
    importsOwnFacade: Boolean(edge.importsOwnFacade),
    uiToInfrastructure: Boolean(edge.uiToInfrastructure),
    domainToUi: Boolean(edge.domainToUi),
    invertedLayer: Boolean(edge.invertedLayer),
  };
}

function architectureState(items, detail) {
  return state(items.length > 0 ? "PRESENT" : "NONE", detail, items);
}

function architectureBucket(edge) {
  if (edge.sourceKind === "test") return "tests";
  return edge.kind === "type-only" ? "typeOnly" : "runtime";
}

export function buildArchitectureCouplingProjection({ graph, boundary = null, error = null } = {}) {
  if (error || !graph) {
    return {
      state: "NOT_MEASURED",
      detail: error?.message ?? "graphe d'import architectural absent",
      error: error ? { name: error.name, message: error.message, code: error.code ?? null } : null,
      files: [],
      domains: [],
      boundary: { state: "NOT_MEASURED", blocking: [], current: [] },
    };
  }

  const outgoing = new Map((graph.nodes ?? []).map((node) => [node.path, []]));
  const incoming = new Map((graph.nodes ?? []).map((node) => [node.path, []]));
  for (const edge of graph.edges ?? []) {
    const serialized = serializeArchitectureEdge(edge);
    outgoing.get(edge.from)?.push(serialized);
    incoming.get(edge.to)?.push(serialized);
  }
  for (const relations of [...outgoing.values(), ...incoming.values()]) relations.sort((left, right) => left.id.localeCompare(right.id));

  const unresolvedByFile = new Map();
  for (const unresolved of graph.findings?.unresolvedInternal ?? []) {
    const item = { from: unresolved.from, specifier: unresolved.specifier, line: unresolved.line };
    const values = unresolvedByFile.get(unresolved.from) ?? [];
    values.push(item);
    unresolvedByFile.set(unresolved.from, values);
  }
  for (const values of unresolvedByFile.values()) values.sort((left, right) => `${left.specifier}:${left.line}`.localeCompare(`${right.specifier}:${right.line}`));

  const currentBoundary = boundary?.currentViolations ?? [];
  const blockingBoundaryIds = new Set([
    ...(boundary?.newViolations ?? []),
    ...(boundary?.reintroduced ?? []),
  ].map((violation) => violation.id));
  const boundaryByFile = new Map();
  for (const violation of currentBoundary) {
    const item = { ...violation, blocking: blockingBoundaryIds.has(violation.id) };
    const values = boundaryByFile.get(violation.from) ?? [];
    values.push(item);
    boundaryByFile.set(violation.from, values);
  }
  for (const values of boundaryByFile.values()) values.sort((left, right) => left.signature.localeCompare(right.signature));

  const files = (graph.nodes ?? []).map((node) => {
    const dependencies = outgoing.get(node.path) ?? [];
    const dependents = incoming.get(node.path) ?? [];
    const countByBucket = (relations) => Object.fromEntries(["runtime", "typeOnly", "tests"].map((bucket) => [bucket, relations.filter((edge) => architectureBucket(edge) === bucket).length]));
    const crossDomainImports = dependencies.filter((edge) => edge.crossDomain);
    const layerCrossings = dependencies.filter((edge) => edge.fromLayer !== edge.toLayer || edge.fromEffectiveLayer !== edge.toEffectiveLayer);
    const boundaryFindings = boundaryByFile.get(node.path) ?? [];
    const unresolved = unresolvedByFile.get(node.path) ?? [];
    return {
      path: node.path,
      domain: node.domain,
      layer: node.layer,
      effectiveLayer: node.effectiveLayer,
      sourceKind: node.sourceKind,
      clientEntry: node.clientEntry,
      clientReachable: node.clientReachable,
      serverBoundary: node.serverBoundary,
      publicFacade: node.publicFacade,
      facadeOwner: node.facadeOwner,
      metrics: {
        fanIn: countByBucket(dependents),
        fanOut: countByBucket(dependencies),
        totalFanIn: dependents.length,
        totalFanOut: dependencies.length,
      },
      relations: {
        dependencies,
        dependents,
        crossDomainImports,
        layerCrossings,
      },
      findings: {
        crossDomainImports: architectureState(crossDomainImports, "imports sortants vers un autre domaine"),
        layerCrossings: architectureState(layerCrossings, "imports sortants traversant une couche"),
        boundaryViolations: architectureState(boundaryFindings, "règles de frontière architecturale explicites"),
        unresolvedInternal: architectureState(unresolved, "imports internes non résolus"),
      },
    };
  }).sort((left, right) => left.path.localeCompare(right.path));

  const domainFiles = new Map();
  for (const file of files) {
    const values = domainFiles.get(file.domain) ?? [];
    values.push(file.path);
    domainFiles.set(file.domain, values);
  }
  const domains = (graph.domains ?? []).map((domain) => ({
    id: `${QUALITY_ARCHITECTURE_DOMAIN_PREFIX}${domain.domain}`,
    domain: domain.domain,
    responsibility: "couplage issu du graphe d'import TypeScript",
    files: [...(domainFiles.get(domain.domain) ?? [])].sort(),
    metrics: {
      layers: domain.layers,
      files: domain.files,
      runtimeFanIn: domain.runtimeFanIn,
      runtimeFanOut: domain.runtimeFanOut,
      typeOnlyFanIn: domain.typeOnlyFanIn,
      typeOnlyFanOut: domain.typeOnlyFanOut,
      testFanIn: domain.testFanIn,
      testFanOut: domain.testFanOut,
    },
  })).sort((left, right) => left.id.localeCompare(right.id));

  const blocking = [...(boundary?.newViolations ?? []), ...(boundary?.reintroduced ?? [])].sort((left, right) => left.signature.localeCompare(right.signature));
  return {
    state: "PRESENT",
    gitSha: graph.gitSha,
    provenance: graph.provenance,
    graphSummary: graph.summary,
    files,
    domains,
    boundary: {
      state: boundary ? "PRESENT" : "NOT_MEASURED",
      status: boundary?.status ?? "NOT_MEASURED",
      blocking,
      current: currentBoundary,
      new: boundary?.newViolations ?? [],
      reintroduced: boundary?.reintroduced ?? [],
      stale: boundary?.staleExceptions ?? [],
      invalid: boundary?.invalidExceptions ?? [],
      blockingStatus: blocking.length > 0 ? "FAIL" : "PASS",
    },
  };
}

export function buildArchitectureCouplingFromRepository({ root = REPOSITORY_ROOT, auditedSha } = {}) {
  if (!SHA_PATTERN.test(auditedSha ?? "")) throw new Error(`SHA architecture invalide: ${auditedSha}`);
  const view = createRepositoryView({ root, ref: auditedSha });
  const graph = buildArchitectureImportGraph({ root, source: "git-ref", ref: auditedSha, view });
  const baseline = loadBoundaryBaseline({ view });
  const boundary = evaluateBoundary(graph, baseline);
  return buildArchitectureCouplingProjection({ graph, boundary });
}

function stableId(scope, value) {
  return crypto.createHash("sha256").update(`${scope}:${JSON.stringify(value)}`).digest("hex").slice(0, 24);
}

function state(value, detail = "", items = []) {
  if (!QUALITY_STATUS_STATES.has(value)) throw new Error(`État quality inconnu: ${value}`);
  return { state: value, detail, items };
}

function readJson(filePath, fsApi = fs) {
  try {
    return JSON.parse(fsApi.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Rapport quality illisible: ${filePath}: ${error.message}`);
  }
}

function assertOfflineIdentity(auditedSha, runId) {
  if (!SHA_PATTERN.test(auditedSha ?? "")) throw new Error(`SHA offline invalide: ${auditedSha}`);
  if (!RUN_ID_PATTERN.test(runId ?? "")) throw new Error(`runId offline invalide: ${runId}`);
}

function validateManifest(manifest, { audit, auditedSha, runId }) {
  if (!manifest || manifest.schemaVersion !== 1) throw new Error(`Manifest ${audit} absent ou schemaVersion invalide.`);
  for (const [field, expected] of [["audit", audit], ["auditedHead", auditedSha], ["runId", runId]]) {
    if (manifest[field] !== expected) throw new Error(`Manifest ${audit} incohérent: ${field}.`);
  }
  if (manifest.originMain !== null && manifest.originMain !== undefined && typeof manifest.originMain !== "string") {
    throw new Error(`Manifest ${audit} incohérent: originMain.`);
  }
  if (typeof manifest.baselineStable !== "boolean" || typeof manifest.worktreeClean !== "boolean") {
    throw new Error(`Manifest ${audit} incohérent: baseline/worktree absents.`);
  }
  if (typeof manifest.reproducible !== "boolean") throw new Error(`Manifest ${audit} sans qualification de reproductibilité.`);
  if (typeof manifest.readProvenance !== "string") throw new Error(`Manifest ${audit} sans readProvenance.`);
  if (!["PASS", "PASS_WITH_GRACE", "FAIL"].includes(manifest.status)) throw new Error(`Manifest ${audit} sans status valide.`);
  return manifest;
}

function reportStatus(audit, report) {
  if (report?.error) return "FAIL";
  if (typeof report?.status === "string") return report.status;
  if (audit === "cycles" && typeof report?.gateStatus === "string") return report.gateStatus === "PASS" ? "PASS" : "FAIL";
  return null;
}

function expectedOverallStatus(statuses) {
  if (statuses.includes("FAIL")) return "FAIL";
  if (statuses.includes("PASS_WITH_GRACE")) return "PASS_WITH_GRACE";
  return "PASS";
}

function validateReport(audit, report) {
  if (!report || typeof report !== "object") throw new Error(`Rapport ${audit} absent.`);
  if (report.error && typeof report.error === "object") return report;
  if (audit === "dead-code" && (!Array.isArray(report.currentFindings) || !report.comparison)) {
    throw new Error("Rapport dead-code incomplet.");
  }
  if (audit === "duplication" && !Array.isArray(report.results)) throw new Error("Rapport duplication incomplet.");
  if (audit === "top-heavy" && (!Array.isArray(report.rows) || !report.evaluation)) throw new Error("Rapport top-heavy incomplet.");
  if (audit === "complexity" && (!Array.isArray(report.metrics) || !report.result)) throw new Error("Rapport complexity incomplet.");
  if (audit === "cycles" && !report.error && (!Array.isArray(report.cycleObjects) || !report.comparison)) {
    throw new Error("Rapport cycles incomplet.");
  }
  if (audit === "maintainability" && (!Array.isArray(report.metrics) || !Array.isArray(report.findings) || !report.summary)) {
    throw new Error("Rapport maintainability incomplet.");
  }
  if (audit === "type-safety" && (!Array.isArray(report.findings) || !Array.isArray(report.diagnostics) || !Array.isArray(report.coverage) || !report.summary)) {
    throw new Error("Rapport type-safety incomplet.");
  }
  if (audit === "hotspots" && (!Array.isArray(report.files) || !report.methodology || !report.summary || !Array.isArray(report.diagnostics))) {
    throw new Error("Rapport hotspots incomplet.");
  }
  if (audit === "testability" && (!Array.isArray(report.domains) || !report.summary || !Array.isArray(report.diagnostics))) {
    throw new Error("Rapport testability incomplet.");
  }
  if (audit === "coverage" && (!Array.isArray(report.scopes) || !report.summary || !report.duplication || !Array.isArray(report.warnings) || !Array.isArray(report.diagnostics))) {
    throw new Error("Rapport coverage incomplet.");
  }
  return report;
}

function manifestPathExists(root, auditedSha, runId, audit, fsApi) {
  return fsApi.existsSync(createAuditPaths({ root, auditedHead: auditedSha, audit, runId }).manifest);
}

export function readOfflineQualityRun({ root = REPOSITORY_ROOT, auditedSha, runId, fsApi = fs } = {}) {
  assertOfflineIdentity(auditedSha, runId);
  const reports = {};
  const manifests = {};
  const sourceFiles = [];

  for (const audit of QUALITY_GATE_INDEX_AUDITS) {
    const paths = createAuditPaths({ root, auditedHead: auditedSha, audit, runId });
    const manifest = validateManifest(readJson(paths.manifest, fsApi), { audit, auditedSha, runId });
    const report = validateReport(audit, readJson(paths.report, fsApi));
    const measuredStatus = reportStatus(audit, report);
    if (measuredStatus && measuredStatus !== manifest.status) throw new Error(`Rapport ${audit} contradictoire avec son manifeste: status.`);
    try { fsApi.readFileSync(paths.summary, "utf8"); } catch { throw new Error(`Résumé ${audit} absent ou illisible.`); }
    manifests[audit] = manifest;
    reports[audit] = report;
    sourceFiles.push(paths.manifest, paths.report, paths.summary);
  }

  for (const audit of ["maintainability", "type-safety", "hotspots", "testability", "coverage"]) {
    if (!manifestPathExists(root, auditedSha, runId, audit, fsApi)) continue;
    const paths = createAuditPaths({ root, auditedHead: auditedSha, audit, runId });
    const manifest = validateManifest(readJson(paths.manifest, fsApi), { audit, auditedSha, runId });
    const report = validateReport(audit, readJson(paths.report, fsApi));
    const measuredStatus = reportStatus(audit, report);
    if (measuredStatus && measuredStatus !== manifest.status) throw new Error(`Rapport ${audit} contradictoire avec son manifeste: status.`);
    try { fsApi.readFileSync(paths.summary, "utf8"); } catch { throw new Error(`Résumé ${audit} absent ou illisible.`); }
    manifests[audit] = manifest;
    reports[audit] = report;
    sourceFiles.push(paths.manifest, paths.report, paths.summary);
  }
  const allPaths = createAuditPaths({ root, auditedHead: auditedSha, audit: "all", runId });
  const aggregateManifest = validateManifest(readJson(allPaths.manifest, fsApi), { audit: "all", auditedSha, runId });
  const aggregateReport = readJson(allPaths.report, fsApi);
  try { fsApi.readFileSync(allPaths.summary, "utf8"); } catch { throw new Error("Résumé all absent ou illisible."); }
  const optionalAudits = ["maintainability", "type-safety", "hotspots", "testability", "coverage"].filter((audit) => Boolean(manifestPathExists(root, auditedSha, runId, audit, fsApi)));
  if (!Array.isArray(aggregateReport?.audits) || aggregateReport.audits.length !== QUALITY_GATE_INDEX_AUDITS.length + optionalAudits.length) {
    throw new Error("Rapport all incomplet: les cinq audits de gate et les auxiliaires présents sont attendus.");
  }
  const aggregateAudits = new Map(aggregateReport.audits.map((entry) => [entry.audit, entry]));
  const expectedAudits = [...QUALITY_GATE_INDEX_AUDITS, ...optionalAudits];
  if (aggregateAudits.size !== expectedAudits.length || expectedAudits.some((audit) => !aggregateAudits.has(audit))) {
    throw new Error("Rapport all incohérent: audit manquant ou dupliqué.");
  }
  for (const audit of expectedAudits) {
    const entry = aggregateAudits.get(audit);
    if (!entry || typeof entry.status !== "string" || entry.status !== manifests[audit].status) {
      throw new Error(`Rapport all incohérent: verdict ${audit}.`);
    }
  }
  const individualStatuses = QUALITY_GATE_INDEX_AUDITS.map((audit) => manifests[audit].status);
  if (aggregateManifest.status !== expectedOverallStatus(individualStatuses)) throw new Error("Manifeste all incohérent: verdict global.");
  if (aggregateManifest.attentionRequired !== Object.values(manifests).some((manifest) => manifest.attentionRequired)) {
    throw new Error("Manifeste all incohérent: attentionRequired.");
  }
  sourceFiles.push(allPaths.manifest, allPaths.report, allPaths.summary);
  const documentation = validateDocumentationReport(aggregateReport.documentation ?? null, { auditedSha, runId });

  const readProvenance = new Set(Object.values(manifests).map((manifest) => manifest.readProvenance));
  readProvenance.add(aggregateManifest.readProvenance);
  return {
    root,
    auditedSha,
    runId,
    reports,
    manifests,
    aggregateManifest,
    aggregateReport,
    documentation,
    sourceFiles,
    shaRoot: allPaths.shaRoot,
    provenance: readProvenance.size === 1 ? [...readProvenance][0] : "MIXED",
  };
}

function ensureFile(files, filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized) return null;
  if (!files.has(normalized)) {
    files.set(normalized, {
      path: normalized,
      auditCategories: new Set(),
      functionalDomains: new Set(),
      topHeavy: { measurements: null, findings: new Map(), exceptions: [] },
      complexity: { metrics: [], findings: new Map() },
      maintainability: { cognitiveMetrics: [], findings: new Map() },
      typeSafety: { findings: new Map(), coverage: null },
      hotspots: { measurement: null, findings: new Map() },
      testability: { measurement: null, findings: new Map() },
      coverage: { measurement: null, findings: new Map() },
      deadCode: { findings: new Map(), exceptions: [] },
      duplication: { findings: new Map() },
      cycles: { findings: new Map() },
      documentation: { measurements: null, findings: new Map(), lifecycle: null, domain: null },
      architecture: null,
    });
  }
  return files.get(normalized);
}

function addFinding(file, category, finding, domain, key = stableId(category, finding)) {
  if (!file) return;
  const target = file[category].findings;
  if (!target.has(key)) target.set(key, { id: key, ...finding });
  file.auditCategories.add(domain);
  return key;
}

function addDomain(domains, id, responsibility, file, findingId, relationId = null) {
  if (!domains.has(id)) domains.set(id, { id, responsibility, files: new Set(), findingIds: new Set(), candidateGroups: new Set() });
  const domain = domains.get(id);
  if (file) domain.files.add(file.path);
  if (findingId) domain.findingIds.add(findingId);
  if (relationId) domain.candidateGroups.add(relationId);
}

function normalizeOccurrence(occurrence) {
  return {
    path: normalizePath(occurrence?.path),
    startLine: occurrence?.startLine ?? null,
    endLine: occurrence?.endLine ?? null,
  };
}

function summarizeEvaluation(evaluation) {
  if (!evaluation) return { state: "NOT_MEASURED", detail: "évaluation top-heavy absente" };
  const keys = [
    "hardOffenders", "reviewWarnings", "newHardOffenders", "ratchetViolations",
    "newReviewOffenders", "reviewRatchetViolations", "improvedReviewRegressions",
    "reviewImprovements", "acquiredReviewImprovements", "staleBaselineEntries",
    "staleReviewBaselineEntries",
  ];
  const counts = Object.fromEntries(keys.map((key) => [key, evaluation[key]?.length ?? 0]));
  return {
    state: "PRESENT",
    status: evaluation.blockingFindings?.length ? "FAIL" : "PASS",
    blockingFindings: [...(evaluation.blockingFindings ?? [])],
    counts,
  };
}

function deriveTopHeavyEvaluation(report) {
  if (!Array.isArray(report?.rows) || !report.baseline?.allowed || !report.baseline?.review) {
    return { state: "NOT_MEASURED", detail: "baseline top-heavy absente du rapport historique" };
  }
  const baseline = {
    allowed: new Map(report.baseline.allowed.map((entry) => [entry.path, entry])),
    review: new Map(report.baseline.review.map((entry) => [entry.path, entry])),
  };
  const evaluation = evaluatePolicy({ rows: report.rows, baseline });
  return {
    state: "PRESENT",
    status: evaluation.blockingFindings.length ? "FAIL" : "PASS",
    blockingFindings: [...evaluation.blockingFindings],
    counts: {
      reviewRatchetViolations: evaluation.reviewRatchetViolations.length,
      ratchetViolations: evaluation.ratchetViolations.length,
      newReviewOffenders: evaluation.newReviewOffenders.length,
      improvedReviewRegressions: evaluation.improvedReviewRegressions.length,
    },
    findings: {
      reviewRatchetViolations: evaluation.reviewRatchetViolations,
      ratchetViolations: evaluation.ratchetViolations,
      newReviewOffenders: evaluation.newReviewOffenders,
      improvedReviewRegressions: evaluation.improvedReviewRegressions,
    },
  };
}

function topHeavyFinding(item, type, provenance, report) {
  const filePath = item.file ?? item.path;
  const row = report.rows?.find((candidate) => candidate.file === filePath) ?? null;
  const policy = row ? FILE_KIND_POLICY[row.kind] ?? FILE_KIND_POLICY.runtime : null;
  const ratified = [...(report.baseline?.allowed ?? []), ...(report.baseline?.review ?? [])].find((entry) => entry.path === filePath) ?? null;
  return {
    type,
    provenance,
    file: filePath,
    kind: row?.kind ?? item.kind ?? null,
    lines: row?.lines ?? item.lines ?? null,
    bytes: row?.bytes ?? item.bytes ?? null,
    limits: {
      policy: policy ? { review: policy.review ?? null, hard: policy.hard ?? null } : null,
      ratified: ratified ? { maxLines: ratified.maxLines ?? null, maxBytes: ratified.maxBytes ?? null, status: ratified.status ?? null, reviewedRef: ratified.reviewedRef ?? null } : null,
    },
    ...item,
  };
}

function addTopHeavy(report, files, auditCategories) {
  if (report.error) {
    return {
      state: "NOT_MEASURED",
      status: "FAIL",
      error: report.error,
      initialVerdict: { status: "FAIL", evaluation: { state: "NOT_MEASURED", detail: "rapport top-heavy en erreur", counts: {} } },
      derivedReevaluation: { state: "NOT_MEASURED", detail: "rapport top-heavy en erreur" },
      measuredFiles: 0,
    };
  }
  const evaluation = report.evaluation;
  const findingKeys = [
    "hardOffenders", "newHardOffenders", "ratchetViolations", "reviewWarnings",
    "newReviewOffenders", "reviewRatchetViolations", "improvedReviewRegressions",
    "reviewImprovements", "acquiredReviewImprovements", "staleBaselineEntries", "staleReviewBaselineEntries",
  ];
  const rows = new Map();
  for (const row of report.rows) {
    const file = ensureFile(files, row.file);
    rows.set(row.file, file);
    const policy = FILE_KIND_POLICY[row.kind] ?? FILE_KIND_POLICY.runtime;
    file.topHeavy.measurements = {
      lines: row.lines,
      bytes: row.bytes,
      kind: row.kind,
      generated: Boolean(row.generated),
      limits: policy.review ? { review: policy.review, hard: policy.hard } : { review: null, hard: null },
      aboveReview: isAboveReview(row),
      aboveHard: isAboveHard(row),
    };
  }
  for (const entry of [...(report.baseline?.allowed ?? []), ...(report.baseline?.review ?? [])]) {
    const file = ensureFile(files, entry.path);
    if (file) file.topHeavy.exceptions.push({ ...entry });
  }
  for (const key of findingKeys) {
    for (const item of evaluation?.[key] ?? []) {
      const file = ensureFile(files, item.file ?? item.path);
      const findingId = addFinding(file, "topHeavy", topHeavyFinding(item, key, "INITIAL", report), "top-heavy");
      addDomain(auditCategories, "top-heavy", "seuils, plafonds et ratchets de taille", file, findingId);
    }
  }
  const derivedReevaluation = deriveTopHeavyEvaluation(report);
  const derivedFindings = derivedReevaluation.findings ?? {};
  for (const [key, items] of Object.entries(derivedFindings)) {
    for (const item of items) {
      const file = ensureFile(files, item.file ?? item.path);
      const findingId = addFinding(file, "topHeavy", topHeavyFinding(item, key, "DERIVED", report), "top-heavy");
      addDomain(auditCategories, "top-heavy", "seuils, plafonds et ratchets de taille", file, findingId);
    }
  }
  return {
    state: "PRESENT",
    initialVerdict: { status: report.status, evaluation: summarizeEvaluation(evaluation) },
    derivedReevaluation,
    findingViews: {
      initial: { count: findingKeys.reduce((sum, key) => sum + (evaluation?.[key]?.length ?? 0), 0) },
      derived: { count: Object.values(derivedFindings).reduce((sum, items) => sum + items.length, 0) },
    },
    measuredFiles: rows.size,
  };
}

function addComplexity(report, files, domains) {
  if (report.error) return { state: "NOT_MEASURED", status: "FAIL", error: report.error, measuredFunctions: 0, measuredFiles: 0, findingCounts: {} };
  const measured = new Map();
  for (const metric of report.metrics ?? []) {
    const file = ensureFile(files, metric.path);
    const item = file.complexity;
    item.metrics.push({
      metric: metric.metric,
      value: metric.value,
      line: metric.line ?? null,
      endLine: metric.endLine ?? null,
      functionIdentity: metric.functionIdentity ?? null,
      functionStartLine: metric.functionStartLine ?? null,
      functionEndLine: metric.functionEndLine ?? null,
      category: metric.category ?? null,
    });
    measured.set(metric.path, (measured.get(metric.path) ?? 0) + 1);
  }
  for (const key of ["failures", "reviews", "improvements", "stale"]) {
    for (const metric of report.result?.[key] ?? []) {
      const file = ensureFile(files, metric.path);
      const domain = metric.metric === "functionLength" ? "functionLength" : "complexity";
      const findingId = addFinding(file, "complexity", { type: key, ...metric }, domain, stableId(`complexity:${key}`, metric));
      addDomain(domains, domain, metric.metric === "functionLength" ? "longueur des fonctions (top-length)" : "complexité des fonctions", file, findingId);
    }
  }
  return {
    state: "PRESENT",
    status: report.status,
    measuredFunctions: report.metrics?.length ?? 0,
    measuredFiles: measured.size,
    findingCounts: Object.fromEntries(["failures", "reviews", "improvements", "stale"].map((key) => [key, report.result?.[key]?.length ?? 0])),
  };
}

function addMaintainability(report, files, domains, complexityReport) {
  if (!report || report.error) return { state: "NOT_MEASURED", status: report?.error ? "FAIL" : "NOT_MEASURED", error: report?.error ?? null, measuredFunctions: 0, measuredFiles: 0, findingCounts: {} };
  const complexityMetrics = complexityReport?.metrics ?? [];
  const related = (item) => item.relation ?? (() => {
    const sameFunction = complexityMetrics.filter((metric) => metric.path === item.path && metric.functionIdentity === item.functionIdentity);
    const sameRange = complexityMetrics.filter((metric) => metric.path === item.path
      && typeof metric.functionStartLine === "number"
      && typeof metric.functionEndLine === "number"
      && metric.functionStartLine <= (item.functionEndLine ?? item.line)
      && metric.functionEndLine >= (item.functionStartLine ?? item.line));
    const candidates = sameFunction.length > 0 ? sameFunction : sameRange;
    const pick = (metric) => candidates.find((entry) => entry.metric === metric) ?? null;
    const complexity = pick("complexity");
    const functionLength = pick("functionLength");
    return {
      status: candidates.length > 0 ? "PRESENT" : "NOT_MEASURED",
      cyclomaticComplexity: complexity ? { value: complexity.value, category: complexity.category ?? null, line: complexity.line ?? null } : null,
      functionLength: functionLength ? { value: functionLength.value, category: functionLength.category ?? null, line: functionLength.line ?? null } : null,
    };
  })();
  for (const metric of report.metrics ?? []) {
    const file = ensureFile(files, metric.path);
    const enrichedMetric = { ...metric, relation: related(metric) };
    file.maintainability.cognitiveMetrics.push(enrichedMetric);
    if (metric.value > (metric.thresholdTarget ?? Number.POSITIVE_INFINITY)) {
      const findingId = addFinding(file, "maintainability", {
        type: "above-target-informative",
        ...enrichedMetric,
        severity: "informational",
      }, "cognitive-complexity", stableId("maintainability:cognitive-complexity", enrichedMetric));
      addDomain(domains, "cognitive-complexity", "complexité cognitive au-dessus de la cible informative", file, findingId);
    }
  }
  for (const finding of report.findings ?? []) {
    const file = ensureFile(files, finding.file);
    const domain = finding.category === "cognitive-complexity" ? "cognitive-complexity" : "local-maintainability";
    const findingId = addFinding(file, "maintainability", { ...finding, relation: related(finding) }, domain, stableId(`maintainability:${finding.ruleId}`, finding));
    addDomain(domains, domain, domain === "cognitive-complexity" ? "complexité cognitive des fonctions" : "défauts locaux de maintenabilité sélectionnés", file, findingId);
  }
  const cognitiveMetrics = report.metrics ?? [];
  return {
    state: "PRESENT",
    status: report.status,
    measurementStatus: report.measurementStatus ?? "MEASURED_NOT_RATCHETED",
    measuredFunctions: cognitiveMetrics.length,
    measuredFiles: new Set(cognitiveMetrics.map((metric) => metric.path)).size,
    findingCounts: {
      cognitiveComplexity: cognitiveMetrics.filter((metric) => metric.value > (metric.thresholdTarget ?? Number.POSITIVE_INFINITY)).length,
      localMaintainability: report.findings?.length ?? 0,
      byRule: report.summary?.findingsByRule ?? {},
    },
    rules: report.rules ?? {},
    summary: report.summary ?? null,
  };
}

function addTypeSafety(report, files, domains) {
  if (!report || report.error) return { state: "NOT_MEASURED", status: report?.error ? "FAIL" : "NOT_MEASURED", error: report?.error ?? null, measuredFiles: 0, findingCounts: {} };
  const coverageEntries = Array.isArray(report.coverage) ? report.coverage : [];
  const hasCoverageInventory = coverageEntries.some((entry) => Array.isArray(entry.scopedFilePaths) && Array.isArray(entry.measuredFilePaths));
  if (hasCoverageInventory) {
    for (const entry of coverageEntries) {
      const measuredPaths = new Set(entry.measuredFilePaths);
      for (const filePath of entry.scopedFilePaths) {
        const file = ensureFile(files, filePath);
        if (!file) continue;
        const typed = entry.effectiveCoverage === "TYPED" && measuredPaths.has(filePath);
        const notMeasuredReason = entry.notMeasuredFileReasons?.[filePath]
          ?? entry.reason
          ?? "UNSUPPORTED_CONFIGURATION";
        file.typeSafety.coverage = typed
          ? { state: "TYPED", workspace: entry.workspace, effectiveCoverage: entry.effectiveCoverage, reason: null }
          : { state: "NOT_MEASURED", workspace: entry.workspace, effectiveCoverage: entry.effectiveCoverage, reason: notMeasuredReason };
      }
    }
  }
  for (const finding of report.findings ?? []) {
    const file = ensureFile(files, finding.file);
    const domain = finding.family === "ASYNC_SAFETY" ? "async-safety" : "type-safety";
    const findingId = addFinding(file, "typeSafety", finding, domain, stableId(`type-safety:${finding.ruleId}`, finding));
    addDomain(domains, domain, domain === "async-safety" ? "promesses flottantes et callbacks asynchrones mal utilisés" : "contournements et opérations non sûres du système de types", file, findingId);
  }
  return {
    state: "PRESENT",
    status: report.status,
    measurementStatus: report.measurementStatus ?? "MEASURED_NOT_RATCHETED",
    measuredFiles: report.summary?.filesMeasured ?? 0,
    filesInScope: report.summary?.filesInScope ?? 0,
    typedFiles: report.summary?.filesWithTypedCoverage ?? 0,
    findingCounts: {
      typeSafety: report.summary?.findingsByFamily?.TYPE_SAFETY ?? 0,
      asyncSafety: report.summary?.findingsByFamily?.ASYNC_SAFETY ?? 0,
      byRule: report.summary?.findingsByRule ?? {},
    },
    coverage: report.coverage ?? [],
    diagnostics: report.diagnostics ?? [],
    summary: report.summary ?? null,
  };
}

function addHotspots(report, files, domains, architecture) {
  if (!report || report.error) return { state: "NOT_MEASURED", status: report?.error ? "FAIL" : "NOT_MEASURED", error: report?.error ?? null, measuredFiles: 0, findingCounts: {} };
  const architectureByFile = new Map((architecture?.files ?? []).map((entry) => [normalizePath(entry.path), entry]));
  for (const item of report.files ?? []) {
    const file = ensureFile(files, item.file);
    if (!file) continue;
    const coupling = architectureByFile.get(item.file)?.metrics ?? null;
    file.hotspots.measurement = {
      activity: item.activity,
      structuralDebt: item.structuralDebt,
      regressionRecurrence: item.regressionRecurrence,
      coupling: coupling ? { state: "PRESENT", value: coupling } : { state: "NOT_MEASURED", reason: "ARCHITECTURE_PROJECTION_ABSENT" },
      provenance: item.provenance,
    };
    if (item.hotspotCandidate) {
      const findingId = addFinding(file, "hotspots", {
        type: "activity-structural-debt-candidate",
        file: item.file,
        position: item.position,
        activity: item.activity,
        structuralDebt: item.structuralDebt,
        severity: item.severity,
        relation: "correlation only; not a new gate finding",
      }, "hotspots", stableId("hotspots:candidate", item));
      addDomain(domains, "hotspots", "activité Git et dette structurelle corrélées", file, findingId);
    }
  }
  return {
    state: "PRESENT",
    status: report.status,
    measurementStatus: report.measurementStatus,
    trackedFilesExamined: report.summary?.trackedFilesExamined ?? null,
    filesReported: report.summary?.filesReported ?? report.summary?.filesMeasured ?? report.files?.length ?? 0,
    measuredFiles: report.summary?.filesReported ?? report.summary?.filesMeasured ?? report.files?.length ?? 0,
    structuralDebtAvailability: report.structuralDebtAvailability ?? null,
    findingCounts: {
      hotspotCandidates: report.summary?.hotspotCandidates ?? 0,
      highActivityFiles: report.summary?.highActivityFiles ?? 0,
      structuralDebtFiles: report.summary?.structuralDebtFiles ?? 0,
    },
    methodology: report.methodology,
    summary: report.summary,
    diagnostics: report.diagnostics ?? [],
  };
}

function addTestability(report, domains) {
  if (!report || report.error) return { state: "NOT_MEASURED", status: report?.error ? "FAIL" : "NOT_MEASURED", error: report?.error ?? null, measuredDomains: 0, findingCounts: {} };
  for (const item of report.domains ?? []) {
    const id = `testability:${item.domain}`;
    const domain = domains.get(id) ?? { id, responsibility: "qualité des preuves de test", files: new Set(), findingIds: new Set(), candidateGroups: new Set() };
    domain.testability = item;
    domains.set(id, domain);
  }
  return {
    state: report.measurementStatus === "NOT_MEASURED" ? "NOT_MEASURED" : "PRESENT",
    status: report.status,
    measurementStatus: report.measurementStatus,
    measuredDomains: report.summary?.domainsMeasured ?? report.domains?.length ?? 0,
    criticalDomainsWithoutSufficientEvidence: report.summary?.criticalDomainsWithoutSufficientEvidence ?? null,
    sources: report.sources,
    methodology: report.methodology,
    summary: report.summary,
    diagnostics: report.diagnostics ?? [],
  };
}

function addCoverage(report, files, domains) {
  if (!report || report.error) return { state: "NOT_MEASURED", status: report?.error ? "FAIL" : "NOT_MEASURED", error: report?.error ?? null, scopes: [], warnings: [], findingCounts: {} };
  const coverageFiles = [];
  for (const scope of report.scopes ?? []) {
    for (const item of scope.files ?? []) {
      const file = ensureFile(files, item.path);
      if (!file) continue;
      file.coverage.measurement = {
        scope: item.scope,
        state: scope.state,
        metrics: item.metrics,
        uncoveredBranches: item.uncoveredBranches,
        uncoveredBranchLines: item.uncoveredBranchLines,
        priority: item.priority,
        provenance: item.provenance,
      };
      coverageFiles.push(item);
      if (item.uncoveredBranches > 0) {
        const finding = {
          type: "uncovered-branches",
          scope: item.scope,
          file: item.path,
          uncoveredBranches: item.uncoveredBranches,
          uncoveredBranchLines: item.uncoveredBranchLines,
          priority: item.priority,
          severity: "informational",
          relation: "branch ranking from canonical coverage report; no verdict or ratchet change",
        };
        const findingId = addFinding(file, "coverage", finding, "coverage", stableId("coverage:uncovered-branches", finding));
        addDomain(domains, "coverage", "couverture détaillée et branches non couvertes", file, findingId);
      }
    }
  }
  for (const warning of report.warnings ?? []) {
    const domain = warning.code === "DUPLICATION_ABOVE_TARGET" ? "duplication-warning" : "coverage-warning";
    addDomain(domains, domain, warning.code === "DUPLICATION_ABOVE_TARGET" ? "alerte informative de duplication" : "alerte informative de couverture", null, stableId(`coverage:${warning.code}`, warning));
  }
  return {
    state: report.measurementStatus === "NOT_MEASURED" ? "NOT_MEASURED" : "PRESENT",
    status: report.status,
    measurementStatus: report.measurementStatus,
    thresholds: report.thresholds,
    scopes: report.scopes ?? [],
    duplication: report.duplication,
    warnings: report.warnings ?? [],
    diagnostics: report.diagnostics ?? [],
    measuredFiles: coverageFiles.length,
    findingCounts: {
      uncoveredBranchFiles: coverageFiles.filter((item) => item.uncoveredBranches > 0).length,
      warnings: report.warnings?.length ?? 0,
    },
  };
}

function deadCodeKey(finding) {
  return JSON.stringify({ type: finding.type, file: normalizePath(finding.file), name: finding.name ?? null, namespace: finding.namespace ?? null, kind: finding.kind ?? null, specifier: finding.specifier ?? null, symbols: finding.symbols ?? null });
}

function addDeadCode(report, files, domains) {
  if (report.error) return { state: "NOT_MEASURED", status: "FAIL", error: report.error, currentCount: null, findingCounts: {}, justifications: [] };
  const baselineByKey = new Map((report.baseline?.findings ?? []).map((finding) => [deadCodeKey(finding), finding]));
  const justificationsById = new Map((report.justifications?.justifications ?? []).map((entry) => [entry.id, entry]));
  for (const finding of report.currentFindings ?? []) {
    const file = ensureFile(files, finding.file);
    const baseline = baselineByKey.get(deadCodeKey(finding));
    const justification = baseline ? justificationsById.get(baseline.id) : null;
    const findingId = addFinding(file, "deadCode", { type: "current", ...finding, baselineId: baseline?.id ?? null, justification: justification ?? null }, "dead-code", stableId("dead-code:current", finding));
    if (justification) file.deadCode.exceptions.push({ ...justification });
    addDomain(domains, "dead-code", "exports, fichiers et symboles non consommés", file, findingId);
  }
  for (const [key, entries] of Object.entries({
    new: report.comparison?.newFindings,
    historicalActionable: report.comparison?.historicalActionableFindings,
    keepJustified: report.comparison?.keepJustifiedFindings,
    resolved: report.comparison?.resolvedFindings,
    staleJustification: report.comparison?.staleKeepJustifications,
  })) {
    for (const finding of entries ?? []) {
      const file = ensureFile(files, finding.file);
      const findingId = addFinding(file, "deadCode", { type: key, ...finding }, "dead-code", stableId(`dead-code:${key}`, finding));
      if (finding.classification === "KEEP_JUSTIFIED" || key === "keepJustified") file.deadCode.exceptions.push({ ...finding });
      addDomain(domains, "dead-code", "exports, fichiers et symboles non consommés", file, findingId);
    }
  }
  return {
    state: "PRESENT",
    status: report.status,
    currentCount: report.comparison?.currentCount ?? report.currentFindings?.length ?? 0,
    findingCounts: Object.fromEntries(["newFindings", "historicalActionableFindings", "keepJustifiedFindings", "resolvedFindings", "staleKeepJustifications"].map((key) => [key, report.comparison?.[key]?.length ?? 0])),
    justifications: report.justifications?.justifications ?? [],
  };
}

function addDuplication(report, files, domains, candidateGroups) {
  if (report.error) return { state: "NOT_MEASURED", status: "FAIL", error: report.error, scopes: [], fingerprints: [], classificationCounts: {} };
  const global = [];
  for (const result of report.results ?? []) {
    const scope = result.scopeName;
    const classifications = new Map([
      ...((report.justificationReport?.classifications?.KEEP_INTENTIONAL ?? []).map((value) => [value, "KEEP_INTENTIONAL"])),
      ...((report.justificationReport?.classifications?.NO_ACTION_NOISE ?? []).map((value) => [value, "NO_ACTION_NOISE"])),
    ]);
    for (const occurrence of result.occurrences ?? []) {
      const fingerprint = occurrence.fingerprint;
      const relationId = stableId(`duplication:${scope}`, fingerprint);
      const classification = classifications.get(`${scope}:${fingerprint}`) ?? null;
      const pair = { occurrenceA: normalizeOccurrence(occurrence.occurrenceA), occurrenceB: normalizeOccurrence(occurrence.occurrenceB) };
      const item = { scope, fingerprint, classification, occurrences: [pair], relationId };
      for (const occurrencePath of [pair.occurrenceA.path, pair.occurrenceB.path]) {
        const file = ensureFile(files, occurrencePath);
        const findingId = addFinding(file, "duplication", item, `duplication:${scope}`, relationId);
        addDomain(domains, `duplication:${scope}`, `duplication ${scope}`, file, findingId, relationId);
      }
      const existing = global.find((entry) => entry.relationId === relationId);
      if (existing) existing.occurrences.push(pair);
      else global.push(item);
      const group = candidateGroups.get(relationId) ?? { id: relationId, domain: `duplication:${scope}`, basis: "fingerprint partagé", files: new Set(), relations: [] };
      group.files.add(pair.occurrenceA.path);
      group.files.add(pair.occurrenceB.path);
      group.relations.push(pair);
      candidateGroups.set(relationId, group);
    }
  }
  return {
    state: "PRESENT",
    status: report.status,
    scopes: (report.results ?? []).map((result) => ({ scope: result.scopeName, metrics: result.metrics, uniqueFingerprintCount: result.fingerprints?.length ?? 0, occurrencePairCount: result.occurrences?.length ?? 0 })),
    fingerprints: global,
    classificationCounts: report.justificationReport?.classificationCounts ?? {},
  };
}

function addCycles(report, files, domains, candidateGroups) {
  if (report.error) return { state: "NOT_MEASURED", status: "FAIL", error: report.error };
  const cycles = [];
  for (const cycle of report.cycleObjects ?? []) {
    const cycleFiles = [...new Set((cycle.files ?? []).map(normalizePath).filter(Boolean))].sort();
    const cycleId = stableId("cycle", cycleFiles);
    const item = { id: cycleId, files: cycleFiles, cycle };
    cycles.push(item);
    const group = { id: cycleId, domain: "cycles", basis: "participants du même cycle", files: new Set(cycleFiles), relations: [{ files: cycleFiles }] };
    candidateGroups.set(cycleId, group);
    for (const filePath of cycleFiles) {
      const file = ensureFile(files, filePath);
      const findingId = addFinding(file, "cycles", item, "cycles", cycleId);
      addDomain(domains, "cycles", "cycles d'import", file, findingId, cycleId);
    }
  }
  return { state: cycles.length > 0 ? "PRESENT" : "NONE", status: report.status, cycles };
}

function addDocumentation(report, files, domains) {
  if (!report) {
    return { state: "NOT_MEASURED", status: "NOT_MEASURED", reason: "HISTORICAL_ABSENCE", detail: "run historique sans dimension documentaire", documents: [], ranking: [] };
  }
  if (report.status === "NOT_MEASURED" || report.error) {
    const reason = report.reason ?? (report.error ? "MEASUREMENT_FAILED" : "HISTORICAL_ABSENCE");
    return { state: "NOT_MEASURED", status: "NOT_MEASURED", reason, detail: reason === "MEASUREMENT_FAILED" ? "mesure documentaire échouée" : "run historique sans dimension documentaire", error: report.error ?? null, documents: [], ranking: [] };
  }
  const findingCounts = { surveillance: 0, reviewRequired: 0, architectureReview: 0, invalidReferences: 0 };
  for (const document of report.documents ?? []) {
    const file = ensureFile(files, document.path);
    if (!file) continue;
    file.documentation.measurements = {
      lines: document.lines,
      bytes: document.bytes,
      headingCount: document.headingCount,
      maxHeadingDepth: document.maxHeadingDepth,
      sections: document.sections,
      largestSection: document.largestSection,
      internalLinks: document.internalLinks,
      level: document.level,
    };
    file.documentation.lifecycle = document.lifecycle;
    file.documentation.domain = document.domain;
    const domainId = document.domain;
    const domain = domains.get(domainId) ?? {
      id: domainId,
      responsibility: "maintenabilité des documents Markdown et MDX",
      files: new Set(),
      findingIds: new Set(),
      candidateGroups: new Set(),
      statuses: new Map(),
      levels: new Map(),
      invalidReferences: 0,
    };
    domain.files.add(document.path);
    for (const status of document.lifecycle?.statuses ?? []) domain.statuses.set(status, (domain.statuses.get(status) ?? 0) + 1);
    domain.levels.set(document.level, (domain.levels.get(document.level) ?? 0) + 1);
    domain.invalidReferences += document.internalLinks?.invalid?.length ?? 0;
    domains.set(domainId, domain);
    if (document.level === "SURVEILLANCE") findingCounts.surveillance += 1;
    if (document.level === "REVIEW_REQUIRED") findingCounts.reviewRequired += 1;
    if (document.level === "ARCHITECTURE_REVIEW") findingCounts.architectureReview += 1;
    findingCounts.invalidReferences += document.internalLinks?.invalid?.length ?? 0;
    const signals = document.level === "NONE" && (document.internalLinks?.invalid?.length ?? 0) === 0
      ? []
      : [{
        type: "documentation-maintainability",
        path: document.path,
        level: document.level,
        lines: document.lines,
        bytes: document.bytes,
        largestSection: document.largestSection,
        invalidReferences: document.internalLinks?.invalid ?? [],
        lifecycle: document.lifecycle,
      }];
    for (const finding of signals) {
      const findingId = addFinding(file, "documentation", finding, domainId, stableId("documentation-maintainability", finding));
      addDomain(domains, domainId, "maintenabilité des documents Markdown et MDX", file, findingId);
    }
  }
  return {
    state: "PRESENT",
    status: report.status,
    attentionRequired: Boolean(report.attentionRequired),
    thresholds: report.thresholds,
    summary: report.summary,
    findingCounts,
    documents: report.documents ?? [],
    ranking: report.ranking ?? [],
  };
}

function addArchitecture(architecture, files, domains) {
  if (!architecture || architecture.state !== "PRESENT") return;
  const domainIdsByName = new Map((architecture.domains ?? []).map((domain) => [domain.domain, domain.id]));
  for (const architectureFile of architecture.files) {
    const file = ensureFile(files, architectureFile.path);
    file.architecture = architectureFile;
    file.functionalDomains.add(domainIdsByName.get(architectureFile.domain) ?? `${QUALITY_ARCHITECTURE_DOMAIN_PREFIX}${architectureFile.domain}`);
  }
  for (const architectureDomain of architecture.domains) {
    const domain = domains.get(architectureDomain.id) ?? {
      id: architectureDomain.id,
      responsibility: architectureDomain.responsibility,
      files: new Set(),
      findingIds: new Set(),
      candidateGroups: new Set(),
      coupling: null,
    };
    for (const file of architectureDomain.files) domain.files.add(file);
    domain.coupling = architectureDomain.metrics;
    domains.set(architectureDomain.id, domain);
  }
}

const FUNCTIONAL_QUALITY_CATEGORIES = Object.freeze([
  "topHeavy",
  "complexity",
  "maintainability",
  "typeSafety",
  "hotspots",
  "deadCode",
  "duplication",
  "cycles",
  "coverage",
  "documentation",
]);

const FUNCTIONAL_ARCHITECTURE_RELATION_CATEGORIES = Object.freeze([
  "crossDomainImports",
  "layerCrossings",
  "unresolvedInternal",
]);

function architectureRelationReference(category, relation) {
  const id = relation?.id ?? stableId(`architecture:${category}`, relation);
  return { id, category };
}

function complexityFindingCategory(finding) {
  return finding?.metric === "functionLength" ? "functionLength" : "complexity";
}

function attachFunctionalDomainFindings(files, domains) {
  for (const file of files.values()) {
    for (const domainId of file.functionalDomains) {
      const domain = domains.get(domainId);
      if (!domain) continue;
      domain.qualityFindingIds ??= new Set();
      domain.boundaryViolationIds ??= new Set();
      domain.blockingBoundaryViolationIds ??= new Set();
      domain.informativeRelationIds ??= new Set();
      domain.findingReferences ??= new Map();
      domain.informativeRelationReferences ??= new Map();

      for (const category of FUNCTIONAL_QUALITY_CATEGORIES) {
        for (const finding of file[category]?.findings?.values() ?? []) {
          const publicCategory = category === "complexity" ? complexityFindingCategory(finding) : category;
          domain.qualityFindingIds.add(finding.id);
          domain.findingIds.add(finding.id);
          domain.findingReferences.set(`${finding.id}:${file.path}`, { id: finding.id, file: file.path, category: publicCategory });
        }
      }

      for (const finding of file.architecture?.findings?.boundaryViolations?.items ?? []) {
        if (!finding?.id) continue;
        domain.boundaryViolationIds.add(finding.id);
        domain.findingIds.add(finding.id);
        if (finding.blocking) domain.blockingBoundaryViolationIds.add(finding.id);
        domain.findingReferences.set(`${finding.id}:${file.path}`, { id: finding.id, file: file.path, category: "boundaryViolations" });
      }

      for (const category of FUNCTIONAL_ARCHITECTURE_RELATION_CATEGORIES) {
        for (const relation of file.architecture?.findings?.[category]?.items ?? []) {
          const reference = architectureRelationReference(category, relation);
          domain.informativeRelationIds.add(reference.id);
          domain.informativeRelationReferences.set(`${reference.id}:${file.path}`, {
            ...reference,
            file: file.path,
          });
        }
      }
    }
  }
}

function finalizeFiles(files, reports, architecture) {
  const categoryAvailability = {
    topHeavy: reports["top-heavy"]?.error ? "NOT_MEASURED" : "PRESENT",
    complexity: reports.complexity?.error ? "NOT_MEASURED" : "PRESENT",
    maintainability: !reports.maintainability || reports.maintainability.error ? "NOT_MEASURED" : "PRESENT",
    typeSafety: !reports["type-safety"] || reports["type-safety"].error || reports["type-safety"].measurementStatus === "MEASUREMENT_FAILED" ? "NOT_MEASURED" : "PRESENT",
    hotspots: !reports.hotspots || reports.hotspots.error ? "NOT_MEASURED" : "PRESENT",
    testability: !reports.testability || reports.testability.error || reports.testability.measurementStatus === "NOT_MEASURED" ? "NOT_MEASURED" : "PRESENT",
    coverage: !reports.coverage || reports.coverage.error || reports.coverage.measurementStatus === "NOT_MEASURED" ? "NOT_MEASURED" : "PRESENT",
    deadCode: reports["dead-code"]?.error ? "NOT_MEASURED" : "PRESENT",
    duplication: reports.duplication?.error ? "NOT_MEASURED" : "PRESENT",
    cycles: reports.cycles?.error ? "NOT_MEASURED" : "PRESENT",
    documentation: !reports.documentation || reports.documentation.status === "NOT_MEASURED" ? "NOT_MEASURED" : "PRESENT",
  };
  const output = [];
  for (const file of files.values()) {
    const topHeavyFindingItems = [...file.topHeavy.findings.values()];
    const complexityItems = [...file.complexity.findings.values()];
    const functionLengthItems = complexityItems.filter((item) => complexityFindingCategory(item) === "functionLength");
    const complexityFindingItems = complexityItems.filter((item) => complexityFindingCategory(item) === "complexity");
    const maintainabilityFindingItems = [...file.maintainability.findings.values()];
    const typeSafetyFindingItems = [...file.typeSafety.findings.values()];
    const typeSafetyItems = typeSafetyFindingItems.filter((finding) => finding.family === "TYPE_SAFETY");
    const asyncSafetyItems = typeSafetyFindingItems.filter((finding) => finding.family === "ASYNC_SAFETY");
    const typeSafetyCoverage = file.typeSafety.coverage;
    const typeSafetyMeasured = typeSafetyCoverage?.state === "TYPED";
    const typeSafetyNotMeasured = !typeSafetyMeasured;
    const typeSafetyDetail = typeSafetyCoverage?.reason === "UNSUPPORTED_CONFIGURATION"
      ? "configuration TypeScript incompatible : UNSUPPORTED_CONFIGURATION"
      : typeSafetyCoverage?.reason ?? "inventaire des fichiers mesurés absent du rapport type-safety";
    const hotspotFindingItems = [...file.hotspots.findings.values()];
    const cognitiveMetrics = file.maintainability.cognitiveMetrics;
    const hotspotMeasurement = file.hotspots.measurement
      ? {
        ...file.hotspots.measurement,
        currentMetrics: {
          cyclomaticComplexity: file.complexity.metrics.filter((metric) => metric.metric === "complexity"),
          functionLength: file.complexity.metrics.filter((metric) => metric.metric === "functionLength"),
          cognitiveComplexity: cognitiveMetrics,
        },
        debtAccumulation: {
          categories: ["topHeavy", "complexity", "maintainability", "typeSafety", "deadCode", "duplication", "cycles", "documentation"]
            .filter((category) => file[category]?.findings?.size > 0),
          note: "catégories avec findings attribués ; les mêmes causes restent reliées par leur relation canonique et ne sont pas fusionnées implicitement",
        },
      }
      : null;
    const category = (auditKey, findingItems, measured, detail) => {
      if (findingItems.length > 0) return state("PRESENT", `${findingItems.length} finding(s)`, findingItems);
      if (categoryAvailability[auditKey] === "NOT_MEASURED") return state("NOT_MEASURED", detail);
      if (measured) return state("NONE", "aucun finding attribué", []);
      return state("NOT_MEASURED", "le rapport ne fournit pas une couverture négative par fichier", []);
    };
    const typeSafetyCategory = (family, findingItems) => typeSafetyNotMeasured
      ? state("NOT_MEASURED", typeSafetyDetail, findingItems)
      : state(findingItems.length > 0 ? "PRESENT" : "NONE", `${findingItems.length} finding(s) ${family}`, findingItems);
    output.push({
      path: file.path,
      auditCategories: [...file.auditCategories].sort(),
      functionalDomains: [...file.functionalDomains].sort(),
      metrics: {
        topHeavy: file.topHeavy.measurements ? state("PRESENT", "mesure de taille disponible", [file.topHeavy.measurements]) : categoryAvailability.topHeavy === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport top-heavy en échec") : state("NOT_APPLICABLE", "fichier hors roots top-heavy"),
        complexity: file.complexity.metrics.length > 0 ? state("PRESENT", `${file.complexity.metrics.length} fonction(s) mesurée(s)`, file.complexity.metrics) : categoryAvailability.complexity === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport complexity en échec") : state("NOT_APPLICABLE", "aucune fonction mesurée dans ce rapport"),
        cognitiveComplexity: cognitiveMetrics.length > 0 ? state("PRESENT", `${cognitiveMetrics.length} fonction(s) mesurée(s)`, cognitiveMetrics) : categoryAvailability.maintainability === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport maintainability en échec") : state("NOT_APPLICABLE", "aucune fonction mesurée dans ce rapport"),
        typeSafety: typeSafetyNotMeasured ? state("NOT_MEASURED", typeSafetyDetail, typeSafetyItems) : state(typeSafetyItems.length > 0 ? "PRESENT" : "NONE", `${typeSafetyItems.length} finding(s) TYPE_SAFETY`, typeSafetyItems),
        asyncSafety: typeSafetyNotMeasured ? state("NOT_MEASURED", typeSafetyDetail, asyncSafetyItems) : state(asyncSafetyItems.length > 0 ? "PRESENT" : "NONE", `${asyncSafetyItems.length} finding(s) ASYNC_SAFETY`, asyncSafetyItems),
        hotspots: hotspotMeasurement ? state("PRESENT", "activité, dette structurelle et relations de maintenance mesurées", [hotspotMeasurement]) : categoryAvailability.hotspots === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport hotspots absent ou en échec") : state("NOT_APPLICABLE", "aucune observation hotspot pour ce fichier"),
        testability: categoryAvailability.testability === "NOT_MEASURED" ? state("NOT_MEASURED", "preuve de testabilité absente, périmée ou non attribuable") : state("NOT_MEASURED", "aucune correspondance fichier inventée depuis une mesure par domaine"),
        coverage: file.coverage.measurement
          ? state(file.coverage.measurement.state === "MEASURED" ? (file.coverage.measurement.uncoveredBranches > 0 ? "PRESENT" : "NONE") : "NOT_MEASURED", file.coverage.measurement.state === "MEASURED" ? "mesure de couverture attribuée" : file.coverage.measurement.state, [file.coverage.measurement])
          : state(categoryAvailability.coverage === "NOT_MEASURED" ? "NOT_MEASURED" : "OUT_OF_INSTRUMENTATION", categoryAvailability.coverage === "NOT_MEASURED" ? "preuve de couverture absente ou non vérifiable" : "fichier absent des sources instrumentées", []),
        architecture: file.architecture
          ? { state: "PRESENT", detail: "graphe d'import architectural disponible", value: file.architecture.metrics }
          : state(architecture?.state === "NOT_MEASURED" ? "NOT_MEASURED" : "NOT_APPLICABLE", architecture?.detail ?? "fichier absent du graphe architectural"),
        documentation: file.documentation.measurements
          ? state("PRESENT", "mesures de maintenabilité documentaire disponibles", [file.documentation.measurements])
          : state(categoryAvailability.documentation === "NOT_MEASURED" ? "NOT_MEASURED" : "NOT_APPLICABLE", categoryAvailability.documentation === "NOT_MEASURED" ? "rapport documentaire absent du run" : "fichier hors projection documentaire"),
      },
      findings: {
        topHeavy: category("topHeavy", topHeavyFindingItems, Boolean(file.topHeavy.measurements), "rapport top-heavy en échec"),
        complexity: category("complexity", complexityFindingItems, file.complexity.metrics.some((metric) => metric.metric === "complexity"), "rapport complexity en échec"),
        functionLength: category("complexity", functionLengthItems, file.complexity.metrics.some((metric) => metric.metric === "functionLength"), "rapport complexity en échec"),
        cognitiveComplexity: category("maintainability", maintainabilityFindingItems.filter((finding) => finding.category === "cognitive-complexity"), cognitiveMetrics.length > 0, "rapport maintainability en échec"),
        localMaintainability: category("maintainability", maintainabilityFindingItems.filter((finding) => finding.category !== "cognitive-complexity"), Boolean(file.maintainability.findings.size), "rapport maintainability en échec"),
        typeSafety: typeSafetyCategory("TYPE_SAFETY", typeSafetyItems),
        asyncSafety: typeSafetyCategory("ASYNC_SAFETY", asyncSafetyItems),
        hotspots: category("hotspots", hotspotFindingItems, Boolean(file.hotspots.measurement), "rapport hotspots absent ou sans fichier mesuré"),
        testability: category("testability", [...file.testability.findings.values()], Boolean(file.testability.measurement), "la source de testabilité ne fournit pas de correspondance fichier sans preuve"),
        coverage: category("coverage", [...file.coverage.findings.values()], Boolean(file.coverage.measurement), "rapport coverage absent ou sans preuve attribuable"),
        deadCode: category("deadCode", [...file.deadCode.findings.values()], false, "rapport dead-code en échec"),
        duplication: category("duplication", [...file.duplication.findings.values()], false, "rapport duplication en échec"),
        cycles: category("cycles", [...file.cycles.findings.values()], false, "rapport cycles en échec"),
        documentation: category("documentation", [...file.documentation.findings.values()], Boolean(file.documentation.measurements), "rapport documentaire absent du run"),
      },
      architecture: file.architecture ?? {
        state: architecture?.state === "NOT_MEASURED" ? "NOT_MEASURED" : "NOT_APPLICABLE",
        detail: architecture?.detail ?? "fichier absent du graphe architectural",
      },
      exceptions: {
        topHeavy: file.topHeavy.exceptions,
        deadCode: file.deadCode.exceptions,
      },
      provenance: {
        topHeavy: reports["top-heavy"]?.readProvenance ?? null,
        complexity: reports.complexity?.readProvenance ?? null,
        maintainability: reports.maintainability?.readProvenance ?? null,
        typeSafety: reports["type-safety"]?.readProvenance ?? null,
        deadCode: reports["dead-code"]?.readProvenance ?? null,
        duplication: reports.duplication?.readProvenance ?? null,
        cycles: reports.cycles?.readProvenance ?? null,
        hotspots: reports.hotspots?.readProvenance ?? null,
        testability: reports.testability?.readProvenance ?? null,
        coverage: reports.coverage?.readProvenance ?? null,
        documentation: reports.documentation?.provenance ?? null,
      },
    });
  }
  return output.sort((left, right) => left.path.localeCompare(right.path));
}

function finalizeAuditCategories(domains) {
  return [...domains.values()].map((domain) => ({
    id: domain.id,
    responsibility: domain.responsibility,
    files: [...domain.files].sort(),
    findingIds: [...domain.findingIds].sort(),
    candidateGroups: [...domain.candidateGroups].sort(),
    coupling: domain.coupling ?? null,
    testability: domain.testability ?? null,
  })).sort((left, right) => left.id.localeCompare(right.id));
}

function finalizeFunctionalDomains(domains, architecture) {
  return {
    state: architecture?.state === "PRESENT" ? "PRESENT" : "NOT_MEASURED",
    detail: architecture?.state === "PRESENT"
      ? "domaines issus de la classification du graphe architectural sur le SHA audité"
      : "classification fonctionnelle absente des rapports historiques",
    items: [...domains.values()].map((domain) => ({
      id: domain.id,
      responsibility: domain.responsibility,
      files: [...domain.files].sort(),
      findingIds: [...domain.findingIds].sort(),
      qualityFindingIds: [...(domain.qualityFindingIds ?? [])].sort(),
      boundaryViolationIds: [...(domain.boundaryViolationIds ?? [])].sort(),
      blockingBoundaryViolationIds: [...(domain.blockingBoundaryViolationIds ?? [])].sort(),
      informativeRelationIds: [...(domain.informativeRelationIds ?? [])].sort(),
      findingReferences: [...(domain.findingReferences?.values() ?? [])].sort((left, right) => `${left.id}:${left.file}`.localeCompare(`${right.id}:${right.file}`)),
      informativeRelationReferences: [...(domain.informativeRelationReferences?.values() ?? [])].sort((left, right) => `${left.id}:${left.file}`.localeCompare(`${right.id}:${right.file}`)),
      candidateGroups: [...domain.candidateGroups].sort(),
      coupling: domain.coupling ?? null,
    })).sort((left, right) => left.id.localeCompare(right.id)),
  };
}

function finalizeDocumentationDomains(domains, report) {
  if (!report || report.state === "NOT_MEASURED") {
    return { state: "NOT_MEASURED", reason: report?.reason ?? "HISTORICAL_ABSENCE", detail: report?.detail ?? "run historique sans regroupement documentaire", items: [] };
  }
  return {
    state: "PRESENT",
    detail: "regroupements dérivés des chemins documentaires et des marqueurs de cycle de vie présents",
    items: [...domains.values()].map((domain) => ({
      id: domain.id,
      responsibility: domain.responsibility,
      files: [...domain.files].sort(),
      findingIds: [...domain.findingIds].sort(),
      lifecycleStatuses: Object.fromEntries([...domain.statuses.entries()].sort(([left], [right]) => left.localeCompare(right))),
      levels: Object.fromEntries([...domain.levels.entries()].sort(([left], [right]) => left.localeCompare(right))),
      invalidReferences: domain.invalidReferences,
    })).sort((left, right) => left.id.localeCompare(right.id)),
  };
}

export function buildQualityFileIndex({ run, mode = "OFFLINE", generatedAt = new Date().toISOString(), architecture = null } = {}) {
  if (!run?.reports || !run?.auditedSha || !run?.runId) throw new Error("Run quality absent pour construire l'index.");
  const architectureProjection = architecture ?? {
    state: "NOT_MEASURED",
    detail: "projection du graphe architectural absente pour ce run",
    files: [],
    domains: [],
    boundary: { state: "NOT_MEASURED", blocking: [], current: [] },
  };
  const files = new Map();
  const auditCategories = new Map();
  const functionalDomains = new Map();
  const documentationDomains = new Map();
  const candidateGroups = new Map();
  const correlationSignals = createCorrelationSignalsFromAuditResults(run.reports);
  const topHeavy = addTopHeavy(run.reports["top-heavy"], files, auditCategories);
  const complexity = addComplexity(run.reports.complexity, files, auditCategories);
  const maintainability = addMaintainability(run.reports.maintainability, files, auditCategories, run.reports.complexity);
  const typeSafety = addTypeSafety(run.reports["type-safety"], files, auditCategories);
  const hotspots = addHotspots(run.reports.hotspots, files, auditCategories, architectureProjection);
  const testability = addTestability(run.reports.testability, auditCategories);
  const coverage = addCoverage(run.reports.coverage, files, auditCategories);
  const deadCode = addDeadCode(run.reports["dead-code"], files, auditCategories);
  const duplication = addDuplication(run.reports.duplication, files, auditCategories, candidateGroups);
  const cycles = addCycles(run.reports.cycles, files, auditCategories, candidateGroups);
  const documentation = addDocumentation(run.documentation, files, documentationDomains);
  addArchitecture(architectureProjection, files, functionalDomains);
  attachFunctionalDomainFindings(files, functionalDomains);
  const reports = { ...run.reports, documentation: run.documentation };
  const finalFiles = finalizeFiles(files, reports, architectureProjection);
  const finalAuditCategories = finalizeAuditCategories(auditCategories);
  const finalFunctionalDomains = finalizeFunctionalDomains(functionalDomains, architectureProjection);
  const finalDocumentationDomains = finalizeDocumentationDomains(documentationDomains, documentation);
  const categorySummaries = {
    topHeavy,
    complexity,
    maintainability,
    typeSafety,
    hotspots,
    testability,
    coverage,
    deadCode,
    duplication,
    cycles,
    documentation,
  };
  const findingsByCategory = Object.fromEntries(Object.entries(categorySummaries).map(([key, value]) => [key, value.findingCounts ?? value.counts ?? {}]));
  return {
    schemaVersion: QUALITY_INDEX_SCHEMA_VERSION,
    kind: "quality-file-index",
    mode,
    generatedAt,
    auditedHead: run.auditedSha,
    runId: run.runId,
    source: {
      auditedHead: run.auditedSha,
      runId: run.runId,
      provenance: run.provenance,
      aggregateManifest: run.aggregateManifest,
      auditManifests: run.manifests,
      documentation: run.documentation ? { status: run.documentation.status, readProvenance: run.documentation.provenance, reason: run.documentation.reason ?? null, error: run.documentation.error ?? null, attentionRequired: run.documentation.attentionRequired } : { status: "NOT_MEASURED", readProvenance: "NOT_MEASURED", reason: "HISTORICAL_ABSENCE", error: null, attentionRequired: false },
      initialStatus: run.aggregateManifest.status,
      attentionRequired: run.aggregateManifest.attentionRequired,
      reproducible: run.aggregateManifest.reproducible,
      sourceReports: QUALITY_INDEX_AUDITS.filter((audit) => run.manifests[audit]).map((audit) => ({ audit, status: run.manifests[audit].status, readProvenance: run.manifests[audit].readProvenance, resultClass: run.manifests[audit].resultClass })),
    },
    correlation: {
      state: correlationSignals.measured ? "PRESENT" : "NOT_MEASURED",
      detail: correlationSignals.detail,
      source: "scripts/reports/generate-modularity-radar.mjs#createCorrelationSignalsFromAuditResults",
    },
    audits: categorySummaries,
    architecture: architectureProjection,
    globalCounts: {
      files: finalFiles.length,
      auditCategories: finalAuditCategories.length,
      functionalDomains: finalFunctionalDomains.items.length,
      candidateGroups: candidateGroups.size,
      findingsByCategory,
      duplicationFingerprintCount: duplication.fingerprints?.length ?? 0,
      duplicationOccurrencePairCount: duplication.scopes?.reduce((sum, scope) => sum + scope.occurrencePairCount, 0) ?? 0,
      cycleCount: cycles.cycles?.length ?? 0,
      architectureFiles: architectureProjection.files?.length ?? 0,
      architectureBlockingBoundaryCount: architectureProjection.boundary?.blocking?.length ?? 0,
      architectureUnresolvedInternalCount: architectureProjection.graphSummary?.unresolvedInternalImports ?? 0,
      documentationFiles: documentation.summary?.trackedDocuments ?? 0,
      documentationInvalidReferences: documentation.summary?.invalidReferences ?? 0,
      documentationUnverifiedReferences: documentation.summary?.unverifiedReferences ?? 0,
      typeSafetyFindings: typeSafety.findingCounts?.typeSafety ?? 0,
      asyncSafetyFindings: typeSafety.findingCounts?.asyncSafety ?? 0,
      hotspotCandidates: hotspots.findingCounts?.hotspotCandidates ?? 0,
      testabilityDomains: testability.measuredDomains ?? 0,
    },
    files: finalFiles,
    auditCategories: finalAuditCategories,
    functionalDomains: finalFunctionalDomains,
    documentationDomains: finalDocumentationDomains,
    candidateGroups: [...candidateGroups.values()].map((group) => ({ ...group, files: [...group.files].sort() })).sort((left, right) => left.id.localeCompare(right.id)),
    limitations: [
      "Les rapports originaux et leur verdict initial ne sont pas modifiés.",
      "La réévaluation top-heavy est dérivée uniquement des lignes et de la baseline contenues dans le rapport historique.",
      "Une catégorie en échec sans mesures exploitables reste NOT_MEASURED.",
      "Les groupes candidats sont fondés uniquement sur les fingerprints de duplication et les participants de cycles ; aucun regroupement par dossier ou score n'est inféré.",
      "Le couplage architectural est mesuré sur le SHA Git exact en mode all ; en projection offline sans source architecturale, il reste NOT_MEASURED.",
      "La maintenabilité documentaire est une dimension expérimentale non bloquante ; un run historique sans rapport documentaire reste NOT_MEASURED.",
      "La sûreté de typage et d'asynchronisme reste une dimension auxiliaire non bloquante ; une configuration TypeScript hors de la peer range est explicitement NOT_MEASURED, jamais traitée comme une couverture typée.",
      "Les hotspots utilisent une fenêtre Git de 180 jours, des seuils descriptifs de 5 commits et 20 lignes modifiées par changement substantiel ; aucune activité seule ne devient un finding bloquant et la récurrence multi-run reste NOT_MEASURED sans série attribuable.",
      "La testabilité réutilise uniquement les métriques de modules portant le SHA exact ; les couvertures absentes, périmées ou non attestées, la mutation non attribuable et les correspondances fichier-test non démontrées restent NOT_MEASURED.",
    ],
  };
}

function escapeMarkdown(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function stateLabel(value) {
  return value?.state ?? "NOT_MEASURED";
}

export function buildQualityFileIndexMarkdown(index) {
  const lines = [
    "# Quality Audit — index consolidé par fichier et domaine",
    "",
    `- SHA audité : \`${index.auditedHead}\``,
    `- runId : \`${index.runId}\``,
    `- Mode de projection : **${index.mode}**`,
    `- Provenance globale : **${index.source.provenance}**`,
    `- Verdict initial du run : **${index.source.initialStatus}**`,
    `- Fichiers indexés : **${index.globalCounts.files}**`,
    `- Groupes candidats relationnels : **${index.globalCounts.candidateGroups}**`,
    "",
    "La projection lit les cinq moteurs de gate, les audits auxiliaires de maintenabilité, sûreté typée/asynchrone, couverture détaillée, hotspots et testabilité, ainsi que la dimension documentaire du run identifié lorsqu'ils existent. Elle ne modifie ni les rapports, ni les manifestes, ni les baselines.",
    "",
    "## États et audits",
    "",
    "| Audit | État | Verdict initial | Provenance |",
    "| --- | --- | --- | --- |",
  ];
  for (const audit of QUALITY_INDEX_AUDITS) {
    const summary = index.audits[audit === "top-heavy" ? "topHeavy" : audit === "dead-code" ? "deadCode" : audit === "type-safety" ? "typeSafety" : audit];
    const source = index.source.sourceReports.find((entry) => entry.audit === audit);
    lines.push(`| ${audit} | ${summary.state ?? "PRESENT"} | ${source?.status ?? "NOT_MEASURED"} | ${source?.readProvenance ?? "NOT_MEASURED"} |`);
  }
  lines.push(`| documentation-maintainability | ${index.audits.documentation.state} | ${index.source.documentation.status} | ${index.source.documentation.readProvenance} |`);
  lines.push("", "## Top-heavy : verdict initial et réévaluation dérivée", "", "| Vue | État | Statut | Violations ratchet REVIEW |", "| --- | --- | --- | ---: |");
  lines.push(`| Initiale | ${index.audits.topHeavy.initialVerdict.evaluation.state} | ${index.audits.topHeavy.initialVerdict.status} | ${index.audits.topHeavy.initialVerdict.evaluation.counts.reviewRatchetViolations ?? 0} |`);
  lines.push(`| Dérivée | ${index.audits.topHeavy.derivedReevaluation.state} | ${index.audits.topHeavy.derivedReevaluation.status ?? "NOT_MEASURED"} | ${index.audits.topHeavy.derivedReevaluation.counts?.reviewRatchetViolations ?? 0} |`);
  lines.push("", "## DOCUMENTATION MAINTAINABILITY", "", `- État : **${index.audits.documentation.state}**`, `- Raison : **${index.audits.documentation.reason ?? (index.audits.documentation.state === "PRESENT" ? "MEASURED" : index.source.documentation.reason ?? "NOT_MEASURED")}**`, `- Diagnostic : **${index.audits.documentation.error?.message ?? "—"}**`, `- Documents suivis : **${index.globalCounts.documentationFiles}**`, `- Surveillance : **${index.audits.documentation.summary?.surveillance ?? "NOT_MEASURED"}**`, `- REVIEW_REQUIRED : **${index.audits.documentation.summary?.reviewRequired ?? "NOT_MEASURED"}**`, `- ARCHITECTURE_REVIEW : **${index.audits.documentation.summary?.architectureReview ?? "NOT_MEASURED"}**`, `- Références internes invalides : **${index.audits.documentation.summary?.invalidReferences ?? "NOT_MEASURED"}**`, `- Références non vérifiées : **${index.globalCounts.documentationUnverifiedReferences ?? "NOT_MEASURED"}**`, "", "| Rang | Document | Niveau | Lignes | Plus grande section | Références invalides | Cycle de vie |", "| ---: | --- | --- | ---: | --- | ---: | --- |");
  for (const [rank, document] of (index.audits.documentation.ranking ?? []).slice(0, 20).entries()) {
    lines.push(`| ${rank + 1} | \`${escapeMarkdown(document.path)}\` | ${document.level} | ${document.lines} | ${document.largestSection ? `L${document.largestSection.startLine}-${document.largestSection.endLine} (${document.largestSection.lines}) : ${escapeMarkdown(document.largestSection.title)}` : "—"} | ${document.internalLinks?.invalid?.length ?? 0} | ${document.lifecycle?.statuses?.join(" / ") || "NOT_STATED"} |`);
  }
  lines.push("", "## HOTSPOTS", "", `- État : **${index.audits.hotspots.state}**`, `- Fichiers suivis examinés : **${index.audits.hotspots.trackedFilesExamined ?? "NOT_MEASURED"}**`, `- Fichiers rapportés : **${index.audits.hotspots.filesReported ?? index.audits.hotspots.measuredFiles ?? "NOT_MEASURED"}**`, `- Activité élevée : **${index.audits.hotspots.findingCounts?.highActivityFiles ?? "NOT_MEASURED"}**`, `- Dette structurelle : **${index.audits.hotspots.findingCounts?.structuralDebtFiles ?? "NOT_MEASURED"}**`, `- Disponibilité dette structurelle : **${index.audits.hotspots.structuralDebtAvailability?.state ?? "NOT_MEASURED"}**`, `- Candidats activité + dette : **${index.globalCounts.hotspotCandidates ?? "NOT_MEASURED"}**`, `- Récurrence des régressions : **${index.audits.hotspots.summary?.regressionRecurrence ?? "NOT_MEASURED"}**`, "", "L'activité Git est descriptive et n'est pas un défaut en soi. Les candidats combinent activité élevée et signaux de dette ; le couplage est joint depuis le graphe architectural exact lorsque disponible. Une dette structurelle n'est déclarée NONE que lorsque les rapports structurels attendus sont tous exploitables.");
  lines.push("", "## TESTABILITY", "", `- État : **${index.audits.testability.state}**`, `- Domaines/modules mesurés : **${index.audits.testability.measuredDomains ?? "NOT_MEASURED"}**`, `- Domaines critiques sans preuve suffisante : **${index.audits.testability.criticalDomainsWithoutSufficientEvidence ?? "NOT_MEASURED"}**`, "", "Les preuves absentes, périmées ou non attribuables restent NOT_MEASURED. Aucune absence de fichier voisin et aucune correspondance fonction-test ne sont inventées.");
  lines.push("", "## Couplage architectural", "", `- État : **${index.architecture?.state ?? "NOT_MEASURED"}**`, `- Imports : **${index.architecture?.graphSummary?.imports ?? "NOT_MEASURED"}**`, `- Frontières bloquantes : **${index.architecture?.boundary?.blocking?.length ?? "NOT_MEASURED"}**`, `- Imports internes non résolus : **${index.architecture?.graphSummary?.unresolvedInternalImports ?? "NOT_MEASURED"}**`, "", "Les métriques de centralité sont informatives ; seuls les findings de frontière explicitement interdits sont bloquants.");
  lines.push("", "## COVERAGE", "", `- État : **${index.audits.coverage.state}**`, `- Seuil informatif couverture : **<${index.audits.coverage.thresholds?.coverageWarningPct ?? "NOT_MEASURED"}%**`, `- Seuil informatif duplication : **>${index.audits.coverage.thresholds?.duplicationWarningPct ?? "NOT_MEASURED"}%**`, `- Avertissements : **${index.audits.coverage.warnings?.length ?? "NOT_MEASURED"}**`, `- Fichiers avec branches non couvertes : **${index.audits.coverage.findingCounts?.uncoveredBranchFiles ?? "NOT_MEASURED"}**`, "", "Les quatre métriques (statements, branches, functions, lines) restent séparées. Les rapports absents, périmés ou non attestés restent NOT_MEASURED/EVIDENCE_UNVERIFIED ; aucun warning de seuil n'est fabriqué dans ce cas. Le classement complet des points de décision vient de LCOV BRDA ou des branches Cobertura réellement présentes.", "", "| Scope | État | Statements | Branches | Functions | Lines | Avertissements |", "| --- | --- | ---: | ---: | ---: | ---: | ---: |");
  for (const scope of index.audits.coverage.scopes ?? []) {
    const value = (name) => scope.metrics?.[name]?.state === "MEASURED" ? `${scope.metrics[name].pct}% (${scope.metrics[name].covered}/${scope.metrics[name].total})` : scope.metrics?.[name]?.state ?? "NOT_MEASURED";
    lines.push(`| ${scope.scope} | ${scope.state} | ${value("statements")} | ${value("branches")} | ${value("functions")} | ${value("lines")} | ${scope.warnings?.length ?? 0} |`);
  }
  lines.push("", "### Top 20 fichiers par branches non couvertes", "", "| Rang | Scope | Fichier | Branches non couvertes | Lignes | Priorité |", "| ---: | --- | --- | ---: | --- | --- |");
  for (const [rank, item] of (index.audits.coverage.scopes ?? []).flatMap((scope) => scope.files ?? []).filter((item) => item.uncoveredBranches > 0).slice(0, 20).entries()) lines.push(`| ${rank + 1} | ${item.scope} | \`${escapeMarkdown(item.path)}\` | ${item.uncoveredBranches} | ${item.uncoveredBranchLines.join(", ") || "—"} | ${item.priority} |`);
  lines.push("", "## FILE INDEX", "", "| Fichier | Catégories d'audit | Domaines fonctionnels | Top-heavy | Complexité cyclomatique | Longueur de fonction | Complexité cognitive | Défaut local de maintenabilité | TYPE_SAFETY | ASYNC_SAFETY | Coverage | Hotspots | Testabilité | Dead-code | Duplication | Cycles | Documentation | Architecture |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const file of index.files) {
    lines.push(`| \`${escapeMarkdown(file.path)}\` | ${escapeMarkdown(file.auditCategories.join(", ") || "—")} | ${escapeMarkdown(file.functionalDomains.join(", ") || "—")} | ${stateLabel(file.findings.topHeavy)} | ${stateLabel(file.findings.complexity)} | ${stateLabel(file.findings.functionLength)} | ${stateLabel(file.findings.cognitiveComplexity)} | ${stateLabel(file.findings.localMaintainability)} | ${stateLabel(file.findings.typeSafety)} | ${stateLabel(file.findings.asyncSafety)} | ${stateLabel(file.findings.coverage)} | ${stateLabel(file.findings.hotspots)} | ${stateLabel(file.findings.testability)} | ${stateLabel(file.findings.deadCode)} | ${stateLabel(file.findings.duplication)} | ${stateLabel(file.findings.cycles)} | ${stateLabel(file.findings.documentation)} | ${stateLabel(file.metrics.architecture)} |`);
  }
  lines.push("", "## AUDIT CATEGORY INDEX", "", "Les catégories décrivent les familles de contrôles ; elles ne constituent pas des domaines fonctionnels.", "");
  for (const domain of index.auditCategories) {
    lines.push(`### ${domain.id}`, "", `Responsabilité : ${domain.responsibility}`, "", `- Fichiers : ${domain.files.length}`, `- Findings dédupliqués : ${domain.findingIds.length}`, `- Groupes candidats : ${domain.candidateGroups.length}`, "");
    if (domain.coupling) {
      lines.push(`- Fan-in runtime/type-only/tests : ${domain.coupling.runtimeFanIn}/${domain.coupling.typeOnlyFanIn}/${domain.coupling.testFanIn}`, `- Fan-out runtime/type-only/tests : ${domain.coupling.runtimeFanOut}/${domain.coupling.typeOnlyFanOut}/${domain.coupling.testFanOut}`, "");
    }
    if (domain.candidateGroups.length > 0) lines.push(`Groupes : ${domain.candidateGroups.map((id) => `\`${id}\``).join(", ")}`, "");
  }
  lines.push("## DOCUMENTATION DOMAIN INDEX", "", `État : **${index.documentationDomains.state}**`, index.documentationDomains.detail, "", "| Domaine | Fichiers | Cycle de vie | Niveaux | Références invalides |", "| --- | ---: | --- | --- | ---: |");
  for (const domain of index.documentationDomains.items) {
    lines.push(`| ${domain.id} | ${domain.files.length} | ${escapeMarkdown(Object.entries(domain.lifecycleStatuses).map(([status, count]) => `${status}:${count}`).join(", ") || "NOT_STATED")} | ${escapeMarkdown(Object.entries(domain.levels).map(([level, count]) => `${level}:${count}`).join(", "))} | ${domain.invalidReferences} |`);
  }
  lines.push("", "## FUNCTIONAL DOMAIN INDEX", "", `État : **${index.functionalDomains.state}**`, index.functionalDomains.detail, "");
  for (const domain of index.functionalDomains.items) {
    lines.push(`### ${domain.id}`, "", `Responsabilité : ${domain.responsibility}`, "", `- Fichiers : ${domain.files.length}`, `- Relations de contrôle : ${domain.findingIds.length}`, "");
    lines.push(`- Findings qualité : ${domain.qualityFindingIds.length}`, `- Violations de frontières : ${domain.boundaryViolationIds.length}`, `- Violations de frontières bloquantes : ${domain.blockingBoundaryViolationIds.length}`, `- Relations architecturales informatives : ${domain.informativeRelationIds.length}`, "");
    if (domain.findingIds.length > 0) lines.push(`- Références FILE INDEX : ${domain.findingIds.map((id) => `\`${id}\``).join(", ")}`, "");
    if (domain.informativeRelationIds.length > 0) lines.push(`- Références architecturales informatives : ${domain.informativeRelationIds.map((id) => `\`${id}\``).join(", ")}`, "");
    if (domain.coupling) {
      lines.push(`- Fan-in runtime/type-only/tests : ${domain.coupling.runtimeFanIn}/${domain.coupling.typeOnlyFanIn}/${domain.coupling.testFanIn}`, `- Fan-out runtime/type-only/tests : ${domain.coupling.runtimeFanOut}/${domain.coupling.typeOnlyFanOut}/${domain.coupling.testFanOut}`, "");
    }
  }
  lines.push("## Limites conservées", "", ...index.limitations.map((limitation) => `- ${limitation}`), "");
  return `${lines.join("\n")}\n`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) { const buffer = Buffer.alloc(2); buffer.writeUInt16LE(value, 0); return buffer; }
function u32(value) { const buffer = Buffer.alloc(4); buffer.writeUInt32LE(value >>> 0, 0); return buffer; }

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll("\\", "/"), "utf8");
    const source = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const compressed = zlib.deflateRawSync(source);
    const crc = crc32(source);
    const local = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), u16(20), u16(0x800), u16(8), u16(0), u16(0), u32(crc), u32(compressed.length), u32(source.length), u16(name.length), u16(0), name, compressed]);
    localParts.push(local);
    const central = Buffer.concat([Buffer.from([0x50, 0x4b, 0x01, 0x02]), u16(20), u16(20), u16(0x800), u16(8), u16(0), u16(0), u32(crc), u32(compressed.length), u32(source.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
    centralParts.push(central);
    offset += local.length;
  }
  const central = Buffer.concat(centralParts);
  const locals = Buffer.concat(localParts);
  const end = Buffer.concat([Buffer.from([0x50, 0x4b, 0x05, 0x06]), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(central.length), u32(locals.length), u16(0)]);
  return Buffer.concat([locals, central, end]);
}

function zipEntryNames(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("ZIP invalide: end of central directory absent.");
  const count = buffer.readUInt16LE(end + 10);
  const centralOffset = buffer.readUInt32LE(end + 16);
  const names = [];
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("ZIP invalide: entrée centrale absente.");
    const nameLength = buffer.readUInt16LE(cursor + 28);
    names.push(buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8"));
    cursor += 46 + nameLength + buffer.readUInt16LE(cursor + 30) + buffer.readUInt16LE(cursor + 32);
  }
  return names;
}

export async function generateQualityFileIndex({ root = REPOSITORY_ROOT, auditedSha, runId, mode = "OFFLINE", generatedAt = new Date().toISOString(), includeBundle = false, architecture = null, fsApi = fs } = {}) {
  const run = readOfflineQualityRun({ root, auditedSha, runId, fsApi });
  const index = buildQualityFileIndex({ run, mode, generatedAt, architecture });
  const markdown = buildQualityFileIndexMarkdown(index);
  const paths = createQualityProjectionPaths({ root, auditedHead: auditedSha, runId });
  fsApi.mkdirSync(paths.shaRoot, { recursive: true });
  writeNewFile(paths.index, `${JSON.stringify(index, null, 2)}\n`, fsApi);
  writeNewFile(paths.summary, markdown, fsApi);

  let bundle = null;
  if (includeBundle) {
    const originalEntries = run.sourceFiles.map((filePath) => ({
      name: path.relative(run.shaRoot, filePath).replaceAll("\\", "/"),
      data: fsApi.readFileSync(filePath),
    }));
    const entries = [
      ...originalEntries,
      { name: path.relative(run.shaRoot, paths.index).replaceAll("\\", "/"), data: fsApi.readFileSync(paths.index) },
      { name: path.relative(run.shaRoot, paths.summary).replaceAll("\\", "/"), data: fsApi.readFileSync(paths.summary) },
    ].sort((left, right) => left.name.localeCompare(right.name));
    const zip = createZip(entries);
    const names = zipEntryNames(zip);
    const expected = entries.map((entry) => entry.name);
    if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error("ZIP incomplet ou ordre des chemins incohérent.");
    writeNewFile(paths.bundle, zip, fsApi);
    bundle = { path: paths.bundle, entries: expected, bytes: zip.length };
  }
  return { run, index, markdown, paths, bundle };
}

function option(args, name) {
  const prefix = `--${name}=`;
  const value = args.find((arg) => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

export async function main(args = process.argv.slice(2)) {
  try {
    if (!args.includes("--offline")) throw new Error("Le mode offline exige --offline.");
    const auditedSha = option(args, "sha");
    const runId = option(args, "run-id");
    if (!auditedSha || !runId) throw new Error("Usage: node scripts/reports/quality-file-index.mjs --offline --sha=<SHA> --run-id=<runId> [--bundle]");
    const result = await generateQualityFileIndex({ auditedSha, runId, includeBundle: args.includes("--bundle") });
    console.log(`Quality file index généré: ${result.paths.index}`);
    console.log(`Quality domain summary générée: ${result.paths.summary}`);
    if (result.bundle) console.log(`ZIP généré: ${result.bundle.path}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
