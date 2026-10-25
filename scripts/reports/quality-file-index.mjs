#!/usr/bin/env node

/**
 * Projection des cinq rapports de gate et du rapport auxiliaire de maintenabilité d'un même run.
 *
 * Ce module ne scanne jamais le dépôt. Il lit uniquement les rapports et les
 * manifestes déjà écrits par run-quality-audit.mjs. La vue "derived" du
 * top-heavy réévalue seulement les lignes présentes dans le rapport, afin de
 * rendre visible une correction de ratchet sans réécrire le verdict initial.
 */

import fs from "node:fs";

import { evaluatePolicy } from "../checks/check-top-heavy-files.mjs";
import { FILE_KIND_POLICY, isAboveHard, isAboveReview } from "../checks/top-heavy-policy.mjs";
import { createCorrelationSignalsFromAuditResults } from "./generate-modularity-radar.mjs";
import { buildArchitectureCouplingProjection, buildArchitectureCouplingFromRepository } from "./quality-index-architecture.mjs";
import { buildQualityFileIndexTriage } from "./quality-index-triage.mjs";

export { buildArchitectureCouplingProjection, buildArchitectureCouplingFromRepository };

export {
  QUALITY_INDEX_SCHEMA_VERSION,
  QUALITY_INDEX_AUDITS,
  QUALITY_GATE_INDEX_AUDITS,
  QUALITY_INDEX_PREFIX,
  QUALITY_ARCHITECTURE_DOMAIN_PREFIX,
} from "./quality-index-primitives.mjs";
import {
  QUALITY_INDEX_SCHEMA_VERSION,
  QUALITY_INDEX_AUDITS,
  QUALITY_GATE_INDEX_AUDITS,
  QUALITY_INDEX_PREFIX,
  QUALITY_ARCHITECTURE_DOMAIN_PREFIX,
  REPOSITORY_ROOT,
  normalizePath,
  stableId,
  state,
} from "./quality-index-primitives.mjs";
import { readOfflineQualityRun } from "./quality-index-offline.mjs";
import { buildQualityFileIndexMarkdown } from "./quality-index-markdown.mjs";
import { writeQualityIndexOutputs } from "./quality-index-output.mjs";
import { runQualityFileIndexCli } from "./quality-index-cli.mjs";
import { complexityFindingCategory, finalizeFiles } from "./quality-index-file-finalization.mjs";

export {
  readOfflineQualityRun,
  buildQualityFileIndexMarkdown,
  buildQualityFileIndexTriage,
};

const QUALITY_MANIFEST_PROJECTION_FIELDS = Object.freeze([
  "schemaVersion",
  "audit",
  "runId",
  "auditedHead",
  "originMain",
  "readProvenance",
  "resultClass",
  "status",
  "attentionRequired",
  "generatedAt",
]);

function projectManifest(manifest) {
  return Object.fromEntries(QUALITY_MANIFEST_PROJECTION_FIELDS
    .filter((field) => manifest[field] !== undefined)
    .map((field) => [field, manifest[field]]));
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
      maintainability: { cognitiveMetrics: [], controlFlowProfiles: [], controlFlowStatus: null, measurementStatus: null, findings: new Map() },
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

function buildMetricRelationIndex(metrics) {
  const byFunction = new Map();
  const byPath = new Map();
  for (const metric of metrics) {
    const functionKey = `${metric.path}\u0000${metric.functionIdentity}`;
    const functionMetrics = byFunction.get(functionKey) ?? [];
    functionMetrics.push(metric);
    byFunction.set(functionKey, functionMetrics);
    const pathMetrics = byPath.get(metric.path) ?? [];
    pathMetrics.push(metric);
    byPath.set(metric.path, pathMetrics);
  }
  return { byFunction, byPath };
}

function metricRelation(item, relationIndex) {
  const sameFunction = relationIndex.byFunction.get(`${item.path}\u0000${item.functionIdentity}`) ?? [];
  const sameRange = (relationIndex.byPath.get(item.path) ?? []).filter((metric) =>
    typeof metric.functionStartLine === "number"
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
}

function addMaintainability(report, files, domains, complexityReport) {
  if (!report || report.error) return { state: "NOT_MEASURED", status: report?.error ? "FAIL" : "NOT_MEASURED", error: report?.error ?? null, measuredFunctions: 0, measuredFiles: 0, findingCounts: {} };
  const complexityMetrics = complexityReport?.metrics ?? [];
  const complexityIndex = buildMetricRelationIndex(complexityMetrics);
  const cognitiveMetrics = report.metrics ?? [];
  const cognitiveByFunction = new Map(cognitiveMetrics.map((metric) => [`${metric.path}\u0000${metric.functionIdentity}`, metric]));
  const related = (item) => item.relation ?? metricRelation(item, complexityIndex);
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
  for (const profile of report.controlFlowProfiles ?? []) {
    const file = ensureFile(files, profile.path);
    const cognitive = cognitiveByFunction.get(`${profile.path}\u0000${profile.functionIdentity}`);
    const relation = {
      ...related(profile),
      cognitiveComplexity: profile.relation?.cognitiveComplexity ?? (cognitive ? {
        value: cognitive.value,
        line: cognitive.line ?? null,
        thresholdTarget: cognitive.thresholdTarget ?? null,
      } : null),
    };
    if (file) file.maintainability.controlFlowProfiles.push({ ...profile, relation });
  }
  for (const status of report.controlFlowStatuses ?? []) {
    const file = ensureFile(files, status.path);
    if (file) file.maintainability.controlFlowStatus = { status: status.status, reason: status.reason ?? null };
  }
  for (const status of report.maintainabilityStatuses ?? []) {
    const file = ensureFile(files, status.path);
    if (file) file.maintainability.measurementStatus = { status: status.status, reason: status.reason ?? null };
  }
  for (const finding of report.findings ?? []) {
    const file = ensureFile(files, finding.file);
    const domain = finding.category === "cognitive-complexity" ? "cognitive-complexity" : "local-maintainability";
    const findingId = addFinding(file, "maintainability", { ...finding, relation: related(finding) }, domain, stableId(`maintainability:${finding.ruleId}`, finding));
    addDomain(domains, domain, domain === "cognitive-complexity" ? "complexité cognitive des fonctions" : "défauts locaux de maintenabilité sélectionnés", file, findingId);
  }
  const controlFlowProfiles = report.controlFlowProfiles ?? [];
  const maintainabilityStatuses = report.maintainabilityStatuses ?? [];
  const measuredFiles = maintainabilityStatuses.length > 0
    ? maintainabilityStatuses.filter((entry) => entry.status === "PRESENT").length
    : new Set([...cognitiveMetrics, ...controlFlowProfiles].map((metric) => metric.path)).size;
  return {
    state: "PRESENT",
    status: report.status,
    measurementStatus: report.measurementStatus ?? "MEASURED_NOT_RATCHETED",
    measuredFunctions: cognitiveMetrics.length,
    measuredFiles,
    filesNotMeasured: maintainabilityStatuses.filter((entry) => entry.status === "NOT_MEASURED").length,
    controlFlowFunctions: controlFlowProfiles.length,
    controlFlowDecisionPoints: controlFlowProfiles.reduce((sum, profile) => sum + (profile.decisionPoints ?? 0), 0),
    controlFlowNestedDecisionFunctions: controlFlowProfiles.filter((profile) => (profile.nestedDecisionCount ?? 0) > 0).length,
    controlFlowFilesNotMeasured: (report.controlFlowStatuses ?? []).filter((entry) => entry.status === "NOT_MEASURED").length,
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
  if (!report || report.error) return { state: "NOT_MEASURED", status: "FAIL", error: report?.error ?? { code: "DEAD_CODE_REPORT_ABSENT", message: "Rapport dead-code absent." }, currentCount: null, findingCounts: {}, justifications: [] };
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
      if (file && (finding.classification === "KEEP_JUSTIFIED" || key === "keepJustified")) file.deadCode.exceptions.push({ ...finding });
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
  if (report.status === "SKIPPED_BY_POLICY") {
    return { state: "SKIPPED_BY_POLICY", status: report.status, reason: report.reason ?? "contrôle suspendu par la politique du dépôt", cycles: [] };
  }
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

function attachArchitectureFile(architectureFile, domainIdsByName, files) {
  const file = ensureFile(files, architectureFile.path);
  file.architecture = architectureFile;
  file.functionalDomains.add(domainIdsByName.get(architectureFile.domain) ?? `${QUALITY_ARCHITECTURE_DOMAIN_PREFIX}${architectureFile.domain}`);
}

function mergeArchitectureDomain(architectureDomain, domains) {
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

function addArchitecture(architecture, files, domains) {
  if (architecture?.state !== "PRESENT") return;
  const domainIdsByName = new Map((architecture.domains ?? []).map((domain) => [domain.domain, domain.id]));
  for (const architectureFile of architecture.files) attachArchitectureFile(architectureFile, domainIdsByName, files);
  for (const architectureDomain of architecture.domains) mergeArchitectureDomain(architectureDomain, domains);
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

function buildCategorySummaries(values) {
  return {
    topHeavy: values.topHeavy,
    complexity: values.complexity,
    maintainability: values.maintainability,
    typeSafety: values.typeSafety,
    hotspots: values.hotspots,
    testability: values.testability,
    coverage: values.coverage,
    deadCode: values.deadCode,
    duplication: values.duplication,
    cycles: values.cycles,
    documentation: values.documentation,
  };
}

function buildSourceProjection(run) {
  const documentation = run.documentation
    ? { status: run.documentation.status, readProvenance: run.documentation.provenance, reason: run.documentation.reason ?? null, error: run.documentation.error ?? null, attentionRequired: run.documentation.attentionRequired }
    : { status: "NOT_MEASURED", readProvenance: "NOT_MEASURED", reason: "HISTORICAL_ABSENCE", error: null, attentionRequired: false };
  return {
    auditedHead: run.auditedSha,
    runId: run.runId,
    provenance: run.provenance,
    aggregateManifest: projectManifest(run.aggregateManifest),
    auditManifests: Object.fromEntries(Object.entries(run.manifests).map(([audit, manifest]) => [audit, projectManifest(manifest)])),
    documentation,
    initialStatus: run.aggregateManifest.status,
    attentionRequired: run.aggregateManifest.attentionRequired,
    sourceReports: QUALITY_INDEX_AUDITS.filter((audit) => run.manifests[audit]).map((audit) => ({ audit, status: run.manifests[audit].status, readProvenance: run.manifests[audit].readProvenance, resultClass: run.manifests[audit].resultClass })),
  };
}

function projectCandidateGroups(candidateGroups) {
  return [...candidateGroups.values()]
    .map((group) => ({ ...group, files: [...group.files].sort() }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function buildGlobalCounts({ finalFiles, finalAuditCategories, finalFunctionalDomains, candidateGroups, findingsByCategory, duplication, cycles, architecture, documentation, typeSafety, hotspots, testability }) {
  return {
    files: finalFiles.length,
    auditCategories: finalAuditCategories.length,
    functionalDomains: finalFunctionalDomains.items.length,
    candidateGroups: candidateGroups.size,
    findingsByCategory,
    duplicationFingerprintCount: duplication.fingerprints?.length ?? 0,
    duplicationOccurrencePairCount: duplication.scopes?.reduce((sum, scope) => sum + scope.occurrencePairCount, 0) ?? 0,
    cycleCount: cycles.cycles?.length ?? 0,
    architectureFiles: architecture.files?.length ?? 0,
    architectureBlockingBoundaryCount: architecture.boundary?.blocking?.length ?? 0,
    architectureUnresolvedInternalCount: architecture.graphSummary?.unresolvedInternalImports ?? 0,
    documentationFiles: documentation.summary?.trackedDocuments ?? 0,
    documentationInvalidReferences: documentation.summary?.invalidReferences ?? 0,
    documentationUnverifiedReferences: documentation.summary?.unverifiedReferences ?? 0,
    typeSafetyFindings: typeSafety.findingCounts?.typeSafety ?? 0,
    asyncSafetyFindings: typeSafety.findingCounts?.asyncSafety ?? 0,
    hotspotCandidates: hotspots.findingCounts?.hotspotCandidates ?? 0,
    testabilityDomains: testability.measuredDomains ?? 0,
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
  const categorySummaries = buildCategorySummaries({ topHeavy, complexity, maintainability, typeSafety, hotspots, testability, coverage, deadCode, duplication, cycles, documentation });
  const findingsByCategory = Object.fromEntries(Object.entries(categorySummaries).map(([key, value]) => [key, value.findingCounts ?? value.counts ?? {}]));
  const source = buildSourceProjection(run);
  const projectedCandidateGroups = projectCandidateGroups(candidateGroups);
  const triage = buildQualityFileIndexTriage({ files: finalFiles, audits: categorySummaries, source, candidateGroups: projectedCandidateGroups });
  return {
    schemaVersion: QUALITY_INDEX_SCHEMA_VERSION,
    kind: "quality-file-index",
    mode,
    generatedAt,
    auditedHead: run.auditedSha,
    runId: run.runId,
    source,
    correlation: {
      state: correlationSignals.measured ? "PRESENT" : "NOT_MEASURED",
      detail: correlationSignals.detail,
      source: "scripts/reports/generate-modularity-radar.mjs#createCorrelationSignalsFromAuditResults",
    },
    audits: categorySummaries,
    architecture: architectureProjection,
    globalCounts: buildGlobalCounts({ finalFiles, finalAuditCategories, finalFunctionalDomains, candidateGroups, findingsByCategory, duplication, cycles, architecture: architectureProjection, documentation, typeSafety, hotspots, testability }),
    files: finalFiles,
    triage,
    auditCategories: finalAuditCategories,
    functionalDomains: finalFunctionalDomains,
    documentationDomains: finalDocumentationDomains,
    candidateGroups: projectedCandidateGroups,
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

export async function generateQualityFileIndex({ root = REPOSITORY_ROOT, auditedSha, runId, mode = "OFFLINE", generatedAt = new Date().toISOString(), includeBundle = false, architecture = null, fsApi = fs } = {}) {
  const run = readOfflineQualityRun({ root, auditedSha, runId, fsApi });
  const index = buildQualityFileIndex({ run, mode, generatedAt, architecture });
  const markdown = buildQualityFileIndexMarkdown(index);
  const output = writeQualityIndexOutputs({ run, index, markdown, root, auditedSha, runId, includeBundle, fsApi });
  return { run, index, markdown, ...output };
}

export async function main(args = process.argv.slice(2)) {
  return runQualityFileIndexCli({ args, generate: generateQualityFileIndex });
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/scripts/reports/quality-file-index.mjs")) await main();
