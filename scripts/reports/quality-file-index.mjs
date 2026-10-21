#!/usr/bin/env node

/**
 * Projection des cinq rapports quality d'un même run.
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
import {
  createAuditPaths,
  createQualityProjectionPaths,
  writeNewFile,
} from "../audits/quality-audit-storage.mjs";
import { createCorrelationSignalsFromAuditResults } from "./generate-modularity-radar.mjs";

export const QUALITY_INDEX_SCHEMA_VERSION = 1;
export const QUALITY_INDEX_AUDITS = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles"]);
export const QUALITY_INDEX_PREFIX = "quality-index";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const QUALITY_STATUS_STATES = new Set(["PRESENT", "NONE", "NOT_MEASURED", "NOT_APPLICABLE"]);

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
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
  if (manifest.originMain !== auditedSha) throw new Error(`Manifest ${audit} incohérent: originMain.`);
  if (typeof manifest.baselineStable !== "boolean" || typeof manifest.worktreeClean !== "boolean") {
    throw new Error(`Manifest ${audit} incohérent: baseline/worktree absents.`);
  }
  if (manifest.reproducible !== true) throw new Error(`Manifest ${audit} non reproductible.`);
  if (typeof manifest.readProvenance !== "string") throw new Error(`Manifest ${audit} sans readProvenance.`);
  if (typeof manifest.status !== "string") throw new Error(`Manifest ${audit} sans status.`);
  return manifest;
}

function validateReport(audit, report) {
  if (!report || typeof report !== "object") throw new Error(`Rapport ${audit} absent.`);
  if (audit === "dead-code" && (!Array.isArray(report.currentFindings) || !report.comparison)) {
    throw new Error("Rapport dead-code incomplet.");
  }
  if (audit === "duplication" && !Array.isArray(report.results)) throw new Error("Rapport duplication incomplet.");
  if (audit === "top-heavy" && (!Array.isArray(report.rows) || !report.evaluation)) throw new Error("Rapport top-heavy incomplet.");
  if (audit === "complexity" && (!Array.isArray(report.metrics) || !report.result)) throw new Error("Rapport complexity incomplet.");
  if (audit === "cycles" && !report.error && (!Array.isArray(report.cycleObjects) || !report.comparison)) {
    throw new Error("Rapport cycles incomplet.");
  }
  return report;
}

export function readOfflineQualityRun({ root = REPOSITORY_ROOT, auditedSha, runId, fsApi = fs } = {}) {
  assertOfflineIdentity(auditedSha, runId);
  const reports = {};
  const manifests = {};
  const sourceFiles = [];

  for (const audit of QUALITY_INDEX_AUDITS) {
    const paths = createAuditPaths({ root, auditedHead: auditedSha, audit, runId });
    const manifest = validateManifest(readJson(paths.manifest, fsApi), { audit, auditedSha, runId });
    const report = validateReport(audit, readJson(paths.report, fsApi));
    try { fsApi.readFileSync(paths.summary, "utf8"); } catch { throw new Error(`Résumé ${audit} absent ou illisible.`); }
    manifests[audit] = manifest;
    reports[audit] = report;
    sourceFiles.push(paths.manifest, paths.report, paths.summary);
  }

  const allPaths = createAuditPaths({ root, auditedHead: auditedSha, audit: "all", runId });
  const aggregateManifest = validateManifest(readJson(allPaths.manifest, fsApi), { audit: "all", auditedSha, runId });
  const aggregateReport = readJson(allPaths.report, fsApi);
  try { fsApi.readFileSync(allPaths.summary, "utf8"); } catch { throw new Error("Résumé all absent ou illisible."); }
  if (!Array.isArray(aggregateReport?.audits) || aggregateReport.audits.length !== QUALITY_INDEX_AUDITS.length) {
    throw new Error("Rapport all incomplet: les cinq audits ne sont pas présents.");
  }
  const aggregateAudits = new Set(aggregateReport.audits.map((entry) => entry.audit));
  if (QUALITY_INDEX_AUDITS.some((audit) => !aggregateAudits.has(audit))) throw new Error("Rapport all incohérent: audit manquant.");
  sourceFiles.push(allPaths.manifest, allPaths.report, allPaths.summary);

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
      domains: new Set(),
      topHeavy: { measurements: null, findings: new Map(), exceptions: [] },
      complexity: { metrics: [], findings: new Map() },
      deadCode: { findings: new Map(), exceptions: [] },
      duplication: { findings: new Map() },
      cycles: { findings: new Map() },
    });
  }
  return files.get(normalized);
}

function addFinding(file, category, finding, domain, key = stableId(category, finding)) {
  if (!file) return;
  const target = file[category].findings;
  if (!target.has(key)) target.set(key, { id: key, ...finding });
  file.domains.add(domain);
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

function addTopHeavy(report, files, domains) {
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
      const findingId = addFinding(file, "topHeavy", { type: key, ...item }, "top-heavy");
      addDomain(domains, "top-heavy", "seuils, plafonds et ratchets de taille", file, findingId);
    }
  }
  return {
    state: "PRESENT",
    initialVerdict: { status: report.status, evaluation: summarizeEvaluation(evaluation) },
    derivedReevaluation: deriveTopHeavyEvaluation(report),
    measuredFiles: rows.size,
  };
}

function addComplexity(report, files, domains) {
  const measured = new Map();
  for (const metric of report.metrics ?? []) {
    const file = ensureFile(files, metric.path);
    const item = file.complexity;
    item.metrics.push({ metric: metric.metric, value: metric.value, line: metric.line ?? null, endLine: metric.endLine ?? null });
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

function deadCodeKey(finding) {
  return JSON.stringify({ type: finding.type, file: normalizePath(finding.file), name: finding.name ?? null, namespace: finding.namespace ?? null, kind: finding.kind ?? null, specifier: finding.specifier ?? null, symbols: finding.symbols ?? null });
}

function addDeadCode(report, files, domains) {
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

function finalizeFiles(files, reports) {
  const categoryAvailability = {
    topHeavy: reports["top-heavy"]?.error ? "NOT_MEASURED" : "PRESENT",
    complexity: reports.complexity?.error ? "NOT_MEASURED" : "PRESENT",
    deadCode: reports["dead-code"]?.error ? "NOT_MEASURED" : "PRESENT",
    duplication: reports.duplication?.error ? "NOT_MEASURED" : "PRESENT",
    cycles: reports.cycles?.error ? "NOT_MEASURED" : "PRESENT",
  };
  const output = [];
  for (const file of files.values()) {
    const topHeavyFindingItems = [...file.topHeavy.findings.values()];
    const complexityItems = [...file.complexity.findings.values()];
    const functionLengthItems = complexityItems.filter((item) => item.metric === "functionLength");
    const complexityFindingItems = complexityItems.filter((item) => item.metric !== "functionLength");
    const category = (auditKey, findingItems, measured, detail) => {
      if (findingItems.length > 0) return state("PRESENT", `${findingItems.length} finding(s)`, findingItems);
      if (categoryAvailability[auditKey] === "NOT_MEASURED") return state("NOT_MEASURED", detail);
      if (measured) return state("NONE", "aucun finding attribué", []);
      return state("NOT_MEASURED", "le rapport ne fournit pas une couverture négative par fichier", []);
    };
    output.push({
      path: file.path,
      domains: [...file.domains].sort(),
      metrics: {
        topHeavy: file.topHeavy.measurements ? state("PRESENT", "mesure de taille disponible", [file.topHeavy.measurements]) : categoryAvailability.topHeavy === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport top-heavy en échec") : state("NOT_APPLICABLE", "fichier hors roots top-heavy"),
        complexity: file.complexity.metrics.length > 0 ? state("PRESENT", `${file.complexity.metrics.length} fonction(s) mesurée(s)`, file.complexity.metrics) : categoryAvailability.complexity === "NOT_MEASURED" ? state("NOT_MEASURED", "rapport complexity en échec") : state("NOT_APPLICABLE", "aucune fonction mesurée dans ce rapport"),
      },
      findings: {
        topHeavy: category("topHeavy", topHeavyFindingItems, Boolean(file.topHeavy.measurements), "rapport top-heavy en échec"),
        complexity: category("complexity", complexityFindingItems, file.complexity.metrics.some((metric) => metric.metric === "complexity"), "rapport complexity en échec"),
        functionLength: category("complexity", functionLengthItems, file.complexity.metrics.some((metric) => metric.metric === "functionLength"), "rapport complexity en échec"),
        deadCode: category("deadCode", [...file.deadCode.findings.values()], false, "rapport dead-code en échec"),
        duplication: category("duplication", [...file.duplication.findings.values()], false, "rapport duplication en échec"),
        cycles: category("cycles", [...file.cycles.findings.values()], false, "rapport cycles en échec"),
      },
      exceptions: {
        topHeavy: file.topHeavy.exceptions,
        deadCode: file.deadCode.exceptions,
      },
      provenance: {
        topHeavy: reports["top-heavy"]?.readProvenance ?? null,
        complexity: reports.complexity?.readProvenance ?? null,
        deadCode: reports["dead-code"]?.readProvenance ?? null,
        duplication: reports.duplication?.readProvenance ?? null,
        cycles: reports.cycles?.readProvenance ?? null,
      },
    });
  }
  return output.sort((left, right) => left.path.localeCompare(right.path));
}

function finalizeDomains(domains) {
  return [...domains.values()].map((domain) => ({
    id: domain.id,
    responsibility: domain.responsibility,
    files: [...domain.files].sort(),
    findingIds: [...domain.findingIds].sort(),
    candidateGroups: [...domain.candidateGroups].sort(),
  })).sort((left, right) => left.id.localeCompare(right.id));
}

export function buildQualityFileIndex({ run, mode = "OFFLINE", generatedAt = new Date().toISOString() } = {}) {
  if (!run?.reports || !run?.auditedSha || !run?.runId) throw new Error("Run quality absent pour construire l'index.");
  const files = new Map();
  const domains = new Map();
  const candidateGroups = new Map();
  const correlationSignals = createCorrelationSignalsFromAuditResults(run.reports);
  const topHeavy = addTopHeavy(run.reports["top-heavy"], files, domains);
  const complexity = addComplexity(run.reports.complexity, files, domains);
  const deadCode = addDeadCode(run.reports["dead-code"], files, domains);
  const duplication = addDuplication(run.reports.duplication, files, domains, candidateGroups);
  const cycles = addCycles(run.reports.cycles, files, domains, candidateGroups);
  const finalFiles = finalizeFiles(files, run.reports);
  const finalDomains = finalizeDomains(domains);
  const categorySummaries = {
    topHeavy,
    complexity,
    deadCode,
    duplication,
    cycles,
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
      initialStatus: run.aggregateManifest.status,
      attentionRequired: run.aggregateManifest.attentionRequired,
      reproducible: run.aggregateManifest.reproducible,
      sourceReports: QUALITY_INDEX_AUDITS.map((audit) => ({ audit, status: run.manifests[audit].status, readProvenance: run.manifests[audit].readProvenance, resultClass: run.manifests[audit].resultClass })),
    },
    correlation: {
      state: correlationSignals.measured ? "PRESENT" : "NOT_MEASURED",
      detail: correlationSignals.detail,
      source: "scripts/reports/generate-modularity-radar.mjs#createCorrelationSignalsFromAuditResults",
    },
    audits: categorySummaries,
    globalCounts: {
      files: finalFiles.length,
      domains: finalDomains.length,
      candidateGroups: candidateGroups.size,
      findingsByCategory,
      duplicationFingerprintCount: duplication.fingerprints?.length ?? 0,
      duplicationOccurrencePairCount: duplication.scopes?.reduce((sum, scope) => sum + scope.occurrencePairCount, 0) ?? 0,
      cycleCount: cycles.cycles?.length ?? 0,
    },
    files: finalFiles,
    domains: finalDomains,
    candidateGroups: [...candidateGroups.values()].map((group) => ({ ...group, files: [...group.files].sort() })).sort((left, right) => left.id.localeCompare(right.id)),
    limitations: [
      "Les rapports originaux et leur verdict initial ne sont pas modifiés.",
      "La réévaluation top-heavy est dérivée uniquement des lignes et de la baseline contenues dans le rapport historique.",
      "Une catégorie en échec sans mesures exploitables reste NOT_MEASURED.",
      "Les groupes candidats sont fondés uniquement sur les fingerprints de duplication et les participants de cycles ; aucun regroupement par dossier ou score n'est inféré.",
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
    "La projection lit uniquement les cinq rapports du run identifié. Elle ne modifie ni les rapports, ni les manifestes, ni les baselines.",
    "",
    "## États et audits",
    "",
    "| Audit | État | Verdict initial | Provenance |",
    "| --- | --- | --- | --- |",
  ];
  for (const audit of QUALITY_INDEX_AUDITS) {
    const summary = index.audits[audit === "top-heavy" ? "topHeavy" : audit === "dead-code" ? "deadCode" : audit];
    const source = index.source.sourceReports.find((entry) => entry.audit === audit);
    lines.push(`| ${audit} | ${summary.state ?? "PRESENT"} | ${source?.status ?? "NOT_MEASURED"} | ${source?.readProvenance ?? "NOT_MEASURED"} |`);
  }
  lines.push("", "## Top-heavy : verdict initial et réévaluation dérivée", "", "| Vue | État | Statut | Violations ratchet REVIEW |", "| --- | --- | --- | ---: |");
  lines.push(`| Initiale | ${index.audits.topHeavy.initialVerdict.evaluation.state} | ${index.audits.topHeavy.initialVerdict.status} | ${index.audits.topHeavy.initialVerdict.evaluation.counts.reviewRatchetViolations ?? 0} |`);
  lines.push(`| Dérivée | ${index.audits.topHeavy.derivedReevaluation.state} | ${index.audits.topHeavy.derivedReevaluation.status ?? "NOT_MEASURED"} | ${index.audits.topHeavy.derivedReevaluation.counts?.reviewRatchetViolations ?? 0} |`);
  lines.push("", "## FILE INDEX", "", "| Fichier | Domaines | Top-heavy | Complexity | FunctionLength | Dead-code | Duplication | Cycles |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const file of index.files) {
    lines.push(`| \`${escapeMarkdown(file.path)}\` | ${escapeMarkdown(file.domains.join(", ") || "—")} | ${stateLabel(file.findings.topHeavy)} | ${stateLabel(file.findings.complexity)} | ${stateLabel(file.findings.functionLength)} | ${stateLabel(file.findings.deadCode)} | ${stateLabel(file.findings.duplication)} | ${stateLabel(file.findings.cycles)} |`);
  }
  lines.push("", "## DOMAIN INDEX", "", "Les domaines sont des responsabilités de contrôle ou des relations prouvées par les rapports. Aucun regroupement n'est déduit d'une proximité de chemin.", "");
  for (const domain of index.domains) {
    lines.push(`### ${domain.id}`, "", `Responsabilité : ${domain.responsibility}`, "", `- Fichiers : ${domain.files.length}`, `- Findings dédupliqués : ${domain.findingIds.length}`, `- Groupes candidats : ${domain.candidateGroups.length}`, "");
    if (domain.candidateGroups.length > 0) lines.push(`Groupes : ${domain.candidateGroups.map((id) => `\`${id}\``).join(", ")}`, "");
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

export async function generateQualityFileIndex({ root = REPOSITORY_ROOT, auditedSha, runId, mode = "OFFLINE", generatedAt = new Date().toISOString(), includeBundle = false, fsApi = fs } = {}) {
  const run = readOfflineQualityRun({ root, auditedSha, runId, fsApi });
  const index = buildQualityFileIndex({ run, mode, generatedAt });
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
