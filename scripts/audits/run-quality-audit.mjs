#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import { gitExecutable } from "../ci/git-executable.mjs";
import {
  formatDeadCodeReport,
  hasBlockingDeadCodeFindings,
  runDeadCodePolicy,
  runKnipReport,
} from "../checks/dead-code-policy.mjs";
import { formatDuplicationReport, runDuplicationPolicy } from "../checks/check-duplication.mjs";
import { runCycleGate } from "../checks/check-cycles.mjs";
import { runComplexityPolicy } from "../checks/check-complexity-policy.mjs";
import { runMaintainabilityAudit } from "../checks/check-maintainability.mjs";
import { runTypeSafetyAudit } from "../checks/check-type-safety.mjs";
import { runTopHeavyPolicy } from "../checks/check-top-heavy-files.mjs";
import { createRepositoryView } from "../checks/repository-view.mjs";
import {
  createCorrelationSignalsFromAuditResults,
  createRadarRows,
  extractHumanDecisions,
  parseHumanDecisions,
  readHumanDecisionsFromView,
} from "../reports/generate-modularity-radar.mjs";
import { buildArchitectureCouplingFromRepository, buildArchitectureCouplingProjection, generateQualityFileIndex } from "../reports/quality-file-index.mjs";
import { buildQualityHotspotsReport, buildQualityTestabilityReport } from "../reports/quality-audit-signals.mjs";
import { buildDocumentationMaintainabilityReport, buildDocumentationNotMeasured } from "./documentation-maintainability.mjs";
import {
  QUALITY_AUDIT_ROOT,
  beginActiveAudit,
  createAuditPaths,
  endActiveAudit,
  retainQualityAuditArtifacts,
  writeAuditArtifactFiles,
} from "./quality-audit-storage.mjs";

export const QUALITY_GATE_AUDITS = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles"]);
export const AUXILIARY_AUDITS = Object.freeze(["maintainability", "type-safety", "hotspots", "testability"]);
export const AUDIT_MODES = Object.freeze([...QUALITY_GATE_AUDITS, ...AUXILIARY_AUDITS, "all"]);
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ACQUIRED_ARCHITECTURE_DECISIONS = new Set([
  "PROACTIVE_SPLIT",
  "COHESIVE_SINGLE_FILE",
  "ALREADY_MODULARIZED",
  "DEFERRED_SPLIT",
]);

export class QualityAuditError extends Error {
  constructor(message, code = "QUALITY_AUDIT_FAILED") {
    super(message);
    this.name = "QualityAuditError";
    this.code = code;
  }
}

export { QUALITY_AUDIT_ROOT, createAuditPaths };

export function usage() {
  return `Usage: npm run audit:quality -- <${AUDIT_MODES.join("|")}>`;
}

export function parseAuditMode(argv = process.argv.slice(2)) {
  if (argv.length !== 1 || !AUDIT_MODES.includes(argv[0])) {
    throw new QualityAuditError(`Mode d'audit inconnu ou manquant. ${usage()}`, "INVALID_MODE");
  }
  return argv[0];
}

function git(args, root) {
  return execFileSync(gitExecutable(), args, { cwd: root, encoding: "utf8" }).trim();
}

export function captureRepositorySnapshot({ root = REPOSITORY_ROOT, gitRunner = git } = {}) {
  const auditedHead = gitRunner(["rev-parse", "HEAD"], root);
  let originMain = null;
  try {
    originMain = gitRunner(["rev-parse", "origin/main"], root);
  } catch {
    // A missing or temporarily unavailable tracking ref is evidence that the
    // baseline is not canonical, not a reason to discard the local audit.
  }
  const worktree = gitRunner(["status", "--short"], root);
  return {
    auditedHead,
    originMain,
    worktree,
    worktreeClean: worktree.length === 0,
    baselineStable: worktree.length === 0 && auditedHead === originMain,
  };
}

export function serialize(value, active = new WeakSet()) {
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) return { name: value.name, message: value.message, code: value.code };
  if (value instanceof Set) {
    if (active.has(value)) return "[Circular]";
    active.add(value);
    try {
      return [...value].map((entry) => serialize(entry, active));
    } finally {
      active.delete(value);
    }
  }
  if (value instanceof Map) {
    if (active.has(value)) return "[Circular]";
    active.add(value);
    try {
      return Object.fromEntries([...value.entries()].map(([key, entry]) => [String(key), serialize(entry, active)]));
    } finally {
      active.delete(value);
    }
  }
  if (typeof value !== "object") return String(value);
  if (active.has(value)) return "[Circular]";
  active.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry) => serialize(entry, active));
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry, active)]));
  } finally {
    active.delete(value);
  }
}

function statusForAudit(audit, result) {
  if (result?.status === "FAIL") return "FAIL";
  if (audit === "dead-code") return hasBlockingDeadCodeFindings(result.comparison) ? "FAIL" : "PASS";
  if (audit === "duplication") {
    const statuses = (result.results ?? []).map((entry) => entry.comparison?.status);
    return statuses.includes("FAIL") || (result.justificationReport?.stale?.length ?? 0) > 0
      ? "FAIL"
      : statuses.includes("PASS_WITH_GRACE") ? "PASS_WITH_GRACE" : "PASS";
  }
  if (audit === "cycles") return result.gateStatus === "PASS" ? "PASS" : "FAIL";
  return result.status ?? "PASS";
}

function isComplexityResult(result) {
  return Boolean(result)
    && (result.status === "PASS" || result.status === "FAIL")
    && Array.isArray(result.metrics)
    && Array.isArray(result.result?.failures)
    && Array.isArray(result.result?.reviews)
    && Array.isArray(result.result?.improvements)
    && Array.isArray(result.result?.stale);
}

function isCycleResult(result) {
  return Boolean(result)
    && typeof result.gateStatus === "string"
    && result.baseline
    && result.report
    && Array.isArray(result.cycles)
    && Array.isArray(result.cycleObjects)
    && Array.isArray(result.comparison?.added)
    && Array.isArray(result.comparison?.stale);
}

function isMaintainabilityResult(result) {
  return Boolean(result)
    && (result.status === "PASS" || result.status === "FAIL")
    && result.kind === "quality-maintainability"
    && result.summary
    && Array.isArray(result.metrics)
    && Array.isArray(result.findings)
    && Array.isArray(result.diagnostics);
}

function isTypeSafetyResult(result) {
  return Boolean(result)
    && (result.status === "PASS" || result.status === "FAIL")
    && result.kind === "quality-type-safety"
    && result.summary
    && Array.isArray(result.findings)
    && Array.isArray(result.diagnostics)
    && Array.isArray(result.coverage);
}

function isHotspotsResult(result) {
  return Boolean(result)
    && result.kind === "quality-hotspots"
    && (result.status === "PASS" || result.status === "FAIL")
    && Array.isArray(result.files)
    && result.methodology
    && result.summary;
}

function isTestabilityResult(result) {
  return Boolean(result)
    && result.kind === "quality-testability"
    && (result.status === "PASS" || result.status === "FAIL")
    && Array.isArray(result.domains)
    && Array.isArray(result.diagnostics)
    && result.summary;
}

function preserveMalformedAsyncResult(audit, result) {
  return {
    ...(result && typeof result === "object" ? result : {}),
    status: "FAIL",
    error: {
      name: "QualityAuditError",
      message: `Résultat ${audit} absent ou malformé.`,
      code: "MALFORMED_RESULT",
    },
    readProvenance: "WORKTREE_LIVE",
  };
}

export function attentionRequired(audit, result) {
  if (!result || result.error) return true;
  if (audit === "dead-code") {
    const comparison = result.comparison;
    return !comparison
      || comparison.newFindings.length > 0
      || comparison.resolvedFindings.length > 0
      || comparison.historicalActionableFindings.length > 0
      || comparison.staleKeepJustifications.length > 0
      || comparison.baselineFresh === false;
  }
  if (audit === "duplication") {
    return (result.results ?? []).some((entry) =>
      (entry.metrics?.newClones ?? 0) > 0
      || entry.comparison?.failures?.length > 0
      || entry.comparison?.status === "PASS_WITH_GRACE"
    ) || (result.justificationReport?.staleKeepIntentional?.length ?? 0) > 0
      || (result.justificationReport?.staleNoActionNoise?.length ?? 0) > 0;
  }
  if (audit === "top-heavy") {
    const evaluation = result.evaluation;
    return !evaluation
      || evaluation.blockingFindings.length > 0
      || (evaluation.reviewWarningsRequiringDecision ?? []).length > 0
      || evaluation.reviewImprovements.length > 0
      || evaluation.staleReviewBaselineEntries.length > 0
      || evaluation.staleBaselineEntries.length > 0;
  }
  if (audit === "complexity") {
    const resultSet = result.result;
    return !resultSet
      || resultSet.failures.length > 0
      || resultSet.stale.length > 0
      || resultSet.improvements.length > 0
      || resultSet.reviews.length > 0;
  }
  if (audit === "cycles") {
    return result.gateStatus !== "PASS"
      || result.comparison?.added?.length > 0
      || result.comparison?.stale?.length > 0;
  }
  if (audit === "maintainability") {
    return result.measurementStatus !== "MEASURED_NOT_RATCHETED"
      || (result.findings?.length ?? 0) > 0
      || (result.summary?.cognitiveComplexityAboveTarget ?? 0) > 0;
  }
  if (audit === "type-safety") {
    return result.measurementStatus !== "MEASURED_NOT_RATCHETED"
      || (result.findings?.length ?? 0) > 0
      || (result.summary?.newCandidateFindings ?? 0) > 0;
  }
  if (audit === "hotspots" || audit === "testability") return false;
  return false;
}

export function buildHumanDecisionsByFile(markdown = "") {
  return Object.fromEntries(parseHumanDecisions(extractHumanDecisions(markdown)).map((entry) => {
    const architectureDecision = entry.ARCHITECTURE_DECISION || null;
    return [entry.file, {
      file: entry.file,
      architectureDecision,
      priority: entry.PRIORITY || null,
      dependencyOrBlocker: entry.DEPENDENCY_OR_BLOCKER || null,
      nextTrigger: entry.NEXT_TRIGGER || null,
      decisionAcquired: architectureDecision !== null && ACQUIRED_ARCHITECTURE_DECISIONS.has(architectureDecision),
    }];
  }));
}

export function enrichTopHeavyEvaluation(evaluation, humanDecisionsByFile) {
  const reviewWarningsWithDecision = evaluation.reviewWarnings.map((row) => ({
    ...row,
    ...(humanDecisionsByFile[row.file] ?? {
      file: row.file,
      architectureDecision: null,
      priority: null,
      dependencyOrBlocker: null,
      nextTrigger: null,
      decisionAcquired: false,
    }),
  })).filter((row) => row.architectureDecision !== null);
  const reviewWarningsRequiringDecision = evaluation.reviewWarnings.map((row) => ({
    ...row,
    ...(humanDecisionsByFile[row.file] ?? {
      file: row.file,
      architectureDecision: null,
      priority: null,
      dependencyOrBlocker: null,
      nextTrigger: null,
      decisionAcquired: false,
    }),
  })).filter((row) => !row.decisionAcquired);
  return {
    ...evaluation,
    humanDecisions: Object.values(humanDecisionsByFile),
    humanDecisionsByFile,
    reviewWarningsWithDecision,
    reviewWarningsRequiringDecision,
  };
}

function makeSummary({ audit, manifest, result, paths }) {
  const lines = [
    `# Quality audit — ${audit}`,
    "",
    `- Audited HEAD: \`${manifest.auditedHead}\``,
    `- origin/main: \`${manifest.originMain}\``,
    `- Baseline stable: **${manifest.baselineStable ? "yes" : "no"}**`,
    `- Worktree clean: **${manifest.worktreeClean ? "yes" : "no"}**`,
    `- Read provenance: **${manifest.readProvenance}**`,
    `- Reproducible: **${manifest.reproducible ? "yes" : "no"}**`,
    `- Result class: **${manifest.resultClass}**`,
    `- Worktree changed during run: **${manifest.worktreeChanged ? "yes" : "no"}**`,
    `- Status: **${manifest.status}**`,
    `- Attention required: **${manifest.attentionRequired ? "yes" : "no"}**`,
    `- Raw report: \`${path.relative(path.dirname(paths.summary), paths.report).replaceAll("\\", "/")}\``,
    "",
    audit === "maintainability"
      ? "This summary is a generated projection of the raw auxiliary result. `attentionRequired: false` means that no measurement failure, selected local finding, or cognitive function above the informative target was observed; it does not define or waive a historical ratchet."
      : "This summary is a generated projection of the raw gate result. `attentionRequired: false` means that no new top-heavy delta or unqualified REVIEW requiring a new analysis was observed; it does not mean that historical large-file debt is absent.",
  ];
  if (audit === "dead-code" && result?.comparison) {
    lines.splice(6, 0,
      `- Current findings: ${result.comparison.currentCount}`,
      `- New findings: ${result.comparison.newFindings.length}`,
      `- Historical actionable: ${result.comparison.historicalActionableFindings.length}`,
      `- KEEP_JUSTIFIED: ${result.comparison.keepJustifiedFindings.length}`,
      `- Stale justifications: ${result.comparison.staleKeepJustifications.length}`,
    );
  }
  if (audit === "duplication" && result?.results) {
    for (const entry of result.results) lines.splice(6, 0, `- ${entry.scopeName}: ${entry.metrics.clones} clones, ${entry.metrics.duplicatedLines} duplicated lines, ${entry.metrics.duplicatedTokens} duplicated tokens, ${entry.occurrences?.length ?? 0} occurrence pairs projected`);
    lines.splice(6, 0,
      `- KEEP_INTENTIONAL: ${result.justificationReport?.keepIntentional ?? 0}`,
      `- NO_ACTION_NOISE: ${result.justificationReport?.noActionNoise ?? 0}`,
      `- STALE_KEEP_INTENTIONAL: ${result.justificationReport?.staleKeepIntentional?.length ?? 0}`,
      `- STALE_NO_ACTION_NOISE: ${result.justificationReport?.staleNoActionNoise?.length ?? 0}`,
    );
  }
  if (audit === "top-heavy" && result?.rows) {
    lines.splice(6, 0,
      `- Current REVIEW: ${result.evaluation?.reviewWarnings?.length ?? 0}`,
      `- REVIEW with acquired decision: ${result.evaluation?.reviewWarningsWithDecision?.filter((row) => row.decisionAcquired).length ?? 0}`,
      `- REVIEW requiring decision: ${result.evaluation?.reviewWarningsRequiringDecision?.length ?? 0}`,
      `- Review improvements: ${result.evaluation?.reviewImprovements?.length ?? 0}`,
      `- Proximity candidates below REVIEW: ${result.proximityRows.length}`,
      `- Measured files: ${result.rows.length}`,
      `- Radar projection: ${result.radarProjection?.rows?.length ?? 0} rows`,
    );
  }
  if (audit === "complexity" && result?.result) {
    lines.splice(6, 0, `- Measured functions: ${result.metrics.length}`, `- Violations: ${result.result.failures.length}`, `- Improvements: ${result.result.improvements.length}`, `- Review signals: ${result.result.reviews.length}`);
  }
  if (audit === "maintainability" && result?.summary) {
    lines.splice(6, 0,
      `- Measured files/functions: ${result.summary.filesMeasured}/${result.summary.functionsMeasured}`,
      `- Cognitive complexity functions: ${result.summary.cognitiveComplexityFunctions}`,
      `- Cognitive complexity above target ${result.rules?.["sonarjs/cognitive-complexity"]?.thresholdTarget ?? "—"}: ${result.summary.cognitiveComplexityAboveTarget}`,
      `- Local maintainability findings: ${result.summary.localMaintainabilityFindings}`,
      `- Elapsed: ${result.summary.elapsedMs} ms`,
    );
  }
  if (audit === "type-safety" && result?.summary) {
    lines.splice(6, 0,
      `- Files in scope/measured: ${result.summary.filesInScope}/${result.summary.filesMeasured}`,
      `- Typed coverage: ${result.summary.filesWithTypedCoverage}`,
      `- TYPE_SAFETY findings: ${result.summary.findingsByFamily?.TYPE_SAFETY ?? 0}`,
      `- ASYNC_SAFETY findings: ${result.summary.findingsByFamily?.ASYNC_SAFETY ?? 0}`,
      `- Measurement diagnostics: ${result.diagnostics?.length ?? 0}`,
      `- Elapsed: ${result.summary.elapsedMs} ms`,
    );
  }
  if (audit === "hotspots" && result?.summary) {
    lines.splice(6, 0,
      `- Window: ${result.methodology?.historyWindowDays ?? "—"} days`,
      `- Files measured: ${result.summary.filesMeasured ?? 0}`,
      `- High activity: ${result.summary.highActivityFiles ?? 0}`,
      `- Hotspot candidates: ${result.summary.hotspotCandidates ?? 0}`,
      `- Regression recurrence: ${result.summary.regressionRecurrence ?? "NOT_MEASURED"}`,
    );
  }
  if (audit === "testability" && result?.summary) {
    lines.splice(6, 0,
      `- Domains measured: ${result.summary.domainsMeasured ?? 0}`,
      `- Critical domains without sufficient evidence: ${result.summary.criticalDomainsWithoutSufficientEvidence ?? "NOT_MEASURED"}`,
      `- Diagnostics: ${result.diagnostics?.length ?? 0}`,
      "- Coverage, test presence and mutation are reported only when attributable; no test runner is launched by this audit.",
    );
  }
  if (audit === "cycles" && result?.comparison) {
    lines.splice(6, 0, `- Current cycles: ${result.cycles.length}`, `- New cycles: ${result.comparison.added.length}`, `- Stale baseline entries: ${result.comparison.stale.length}`);
  }
  if (result?.error) lines.splice(6, 0, `- Error: ${result.error.message}`);
  return `${lines.join("\n")}\n`;
}

export async function executeAudit(
  audit,
  root,
  {
    auditedHead,
    complexityRunner = runComplexityPolicy,
    cycleRunner = runCycleGate,
    maintainabilityRunner = runMaintainabilityAudit,
    typeSafetyRunner = runTypeSafetyAudit,
    hotspotsRunner = buildQualityHotspotsReport,
    testabilityRunner = buildQualityTestabilityReport,
    complexityResult = null,
    previousResults = {},
    topHeavyRunner = runTopHeavyPolicy,
    repositoryViewFactory = createRepositoryView,
  } = {},
) {
  if (audit === "dead-code") {
    const result = runDeadCodePolicy({ report: runKnipReport() });
    return { ...result, status: statusForAudit(audit, result), formatted: formatDeadCodeReport(result), readProvenance: "WORKTREE_LIVE" };
  }
  if (audit === "duplication") {
    const result = runDuplicationPolicy();
    return { ...result, status: statusForAudit(audit, result), formatted: formatDuplicationReport(result), readProvenance: "WORKTREE_LIVE" };
  }
  if (audit === "top-heavy") {
    const ref = auditedHead || "HEAD";
    const result = topHeavyRunner({ root, args: [`--ref=${ref}`, "--enforce"] });
    const view = repositoryViewFactory({ root, ref });
    const humanDecisions = readHumanDecisionsFromView(view);
    const humanDecisionsByFile = buildHumanDecisionsByFile(humanDecisions.markdown);
    const evaluation = enrichTopHeavyEvaluation(result.evaluation, humanDecisionsByFile);
    const enrichedResult = { ...result, evaluation };
    return { ...enrichedResult, status: statusForAudit(audit, enrichedResult), readProvenance: "COMMITTED_SNAPSHOT" };
  }
  if (audit === "complexity") {
    const result = await complexityRunner();
    return isComplexityResult(result)
      ? { ...result, readProvenance: "WORKTREE_LIVE" }
      : preserveMalformedAsyncResult(audit, result);
  }
  if (audit === "type-safety") {
    const result = await typeSafetyRunner({ root });
    return isTypeSafetyResult(result)
      ? { ...result, readProvenance: "WORKTREE_LIVE" }
      : preserveMalformedAsyncResult(audit, result);
  }
  if (audit === "hotspots") {
    const result = hotspotsRunner({ root, auditedSha, reports: previousResults });
    return isHotspotsResult(result)
      ? { ...result, readProvenance: "COMMITTED_SNAPSHOT" }
      : preserveMalformedAsyncResult(audit, result);
  }
  if (audit === "testability") {
    const result = testabilityRunner({ root, auditedSha });
    return isTestabilityResult(result)
      ? { ...result, readProvenance: "MIXED" }
      : preserveMalformedAsyncResult(audit, result);
  }
  if (audit === "cycles") {
    const result = await cycleRunner();
    return isCycleResult(result)
      ? { ...result, readProvenance: "WORKTREE_LIVE" }
      : preserveMalformedAsyncResult(audit, result);
  }
  if (audit === "maintainability") {
    const result = await maintainabilityRunner({ root, complexityReport: complexityResult ?? null });
    return isMaintainabilityResult(result)
      ? { ...result, readProvenance: "WORKTREE_LIVE" }
      : preserveMalformedAsyncResult(audit, result);
  }
  throw new QualityAuditError(`Unknown audit: ${audit}`, "INVALID_MODE");
}

function snapshotChanged(left, right) {
  return left.auditedHead !== right.auditedHead
    || left.originMain !== right.originMain
    || left.worktree !== right.worktree
    || left.worktreeClean !== right.worktreeClean;
}

export function isAuditBaselineStable(snapshot) {
  return Boolean(snapshot.worktreeClean && snapshot.originMain && snapshot.auditedHead === snapshot.originMain);
}

function classifyEvidence({ readProvenance, start, worktreeChanged, status }) {
  const reproducible = readProvenance === "COMMITTED_SNAPSHOT"
    ? Boolean(start.auditedHead)
    : start.worktreeClean && !worktreeChanged;
  return {
    readProvenance,
    worktreeChanged,
    reproducible,
    resultClass: status === "FAIL" ? "FAILURE" : reproducible ? "REPRODUCIBLE" : "INFORMATIVE",
  };
}

export async function runQualityAudit(mode, {
  root = REPOSITORY_ROOT,
  snapshot = () => captureRepositorySnapshot({ root }),
  engine = executeAudit,
  architectureBuilder = buildArchitectureCouplingFromRepository,
  documentationRunner = buildDocumentationMaintainabilityReport,
  fsApi = fs,
  now = () => new Date().toISOString(),
  runId = randomUUID(),
} = {}) {
  if (!AUDIT_MODES.includes(mode)) throw new QualityAuditError(`Mode d'audit inconnu. ${usage()}`, "INVALID_MODE");
  const audits = mode === "all" ? [...QUALITY_GATE_AUDITS, ...AUXILIARY_AUDITS] : [mode];
  const start = snapshot();
  const activeMarker = await beginActiveAudit({ root, auditedHead: start.auditedHead, runId, fsApi });

  try {
    const results = [];
    for (const audit of audits) {
      let raw;
      try {
        raw = await engine(audit, root, {
          auditedHead: start.auditedHead,
          snapshot: start,
          complexityResult: results.find((entry) => entry.audit === "complexity")?.result ?? null,
          previousResults: Object.fromEntries(results.map((entry) => [entry.audit, entry.result])),
        });
      } catch (error) {
        raw = { status: "FAIL", error: { name: error?.name ?? "Error", message: error?.message ?? String(error), code: error?.code } };
      }
      const status = statusForAudit(audit, raw);
      results.push({ audit, result: raw, status, attentionRequired: attentionRequired(audit, raw) });
    }

    if (mode === "all") {
      const resultsByAudit = Object.fromEntries(results.map(({ audit, result }) => [audit, result]));
      const topHeavy = results.find((entry) => entry.audit === "top-heavy");
      if (topHeavy?.result?.rows) {
        const correlations = createCorrelationSignalsFromAuditResults(resultsByAudit);
        topHeavy.result = {
          ...topHeavy.result,
          radarProjection: {
            rows: createRadarRows(topHeavy.result.rows, correlations),
            evidence: {
              measured: correlations.measured,
              detail: correlations.detail,
            },
          },
        };
      }
    }

    const end = snapshot();
    const worktreeChanged = snapshotChanged(start, end);

    const generatedAt = now();
    const manifests = [];
    for (const entry of results) {
      const readProvenance = entry.result?.readProvenance ?? "WORKTREE_LIVE";
      const evidence = classifyEvidence({ readProvenance, start, worktreeChanged, status: entry.status });
      const paths = createAuditPaths({ root, auditedHead: start.auditedHead, audit: entry.audit, runId });
      const manifest = {
        schemaVersion: 1,
        audit: entry.audit,
        runId,
        auditedHead: start.auditedHead,
        originMain: start.originMain,
        baselineStable: start.baselineStable,
        worktreeClean: start.worktreeClean,
        initialWorktreeClean: start.worktreeClean,
        ...evidence,
        status: entry.status,
        attentionRequired: entry.attentionRequired,
        generatedAt,
      };
      writeAuditArtifactFiles({
        paths,
        report: serialize(entry.result),
        manifest: serialize(manifest),
        summary: makeSummary({ audit: entry.audit, manifest, result: entry.result, paths }),
        fsApi,
      });
      manifests.push({ ...entry, paths, manifest, ...evidence });
    }

    const evaluatedManifests = mode === "all" ? manifests.filter((entry) => QUALITY_GATE_AUDITS.includes(entry.audit)) : manifests;
    const overallStatus = evaluatedManifests.some((entry) => entry.status === "FAIL")
      ? "FAIL"
      : evaluatedManifests.some((entry) => entry.status === "PASS_WITH_GRACE")
        ? "PASS_WITH_GRACE"
        : "PASS";
    const overallAttention = manifests.some((entry) => entry.attentionRequired);
    let allPaths = null;
    let projectionPaths = null;
    let projectionStatus = mode === "all" ? "NOT_MEASURED" : null;
    let documentation = null;
    if (mode === "all") {
      try {
        documentation = await documentationRunner({ root, auditedSha: start.auditedHead, runId });
      } catch (error) {
        documentation = buildDocumentationNotMeasured({ auditedHead: start.auditedHead, runId, error, reason: "MEASUREMENT_FAILED" });
      }
      let architecture;
      try {
        architecture = architectureBuilder({ root, auditedSha: start.auditedHead });
      } catch (error) {
        architecture = buildArchitectureCouplingProjection({ error });
      }
      allPaths = createAuditPaths({ root, auditedHead: start.auditedHead, audit: "all", runId });
      const aggregateEvidence = {
        readProvenance: manifests.every((entry) => entry.readProvenance === "COMMITTED_SNAPSHOT")
          ? "COMMITTED_SNAPSHOT"
          : "MIXED",
        worktreeChanged,
        reproducible: manifests.every((entry) => entry.reproducible),
        resultClass: overallStatus === "FAIL"
          ? "FAILURE"
          : manifests.every((entry) => entry.reproducible) ? "REPRODUCIBLE" : "INFORMATIVE",
      };
      const manifest = {
        schemaVersion: 1,
        audit: "all",
        runId,
        auditedHead: start.auditedHead,
        originMain: start.originMain,
        baselineStable: start.baselineStable,
        worktreeClean: start.worktreeClean,
        initialWorktreeClean: start.worktreeClean,
        ...aggregateEvidence,
        status: overallStatus,
        attentionRequired: overallAttention,
        generatedAt,
      };
      writeAuditArtifactFiles({
        paths: allPaths,
        report: serialize({
          status: overallStatus,
          attentionRequired: overallAttention,
          audits: manifests.map(({ audit, status, attentionRequired: attention, readProvenance, reproducible, resultClass }) => ({ audit, status, attentionRequired: attention, readProvenance, reproducible, resultClass })),
          documentation,
        }),
        manifest: serialize(manifest),
        summary: [
          "# Quality audit — all",
          "",
          `- Audited HEAD: \`${start.auditedHead}\``,
          `- Status: **${overallStatus}**`,
          `- Attention required: **${overallAttention ? "yes" : "no"}**`,
          "",
          ...manifests.map((entry) => `- ${entry.audit}: **${entry.status}**, attention **${entry.attentionRequired ? "yes" : "no"}**`),
          `- documentation-maintainability: **${documentation.status}**, attention **${documentation.attentionRequired ? "yes" : "no"}**`,
        ].join("\n") + "\n",
        fsApi,
      });
      try {
        const projection = await generateQualityFileIndex({
          root,
          auditedSha: start.auditedHead,
          runId,
          mode: "ALL",
          generatedAt,
          includeBundle: true,
          architecture,
          fsApi,
        });
        projectionPaths = projection.paths;
        projectionStatus = "PASS";
      } catch (error) {
        projectionPaths = { error: error.message };
        projectionStatus = "FAIL";
      }
    }

    let retention;
    try {
      retention = await retainQualityAuditArtifacts({ root, now, fsApi });
    } catch (error) {
      retention = { status: "FAIL", diagnostics: [`${error?.code ?? "RETENTION_FAILED"}: ${error?.message ?? String(error)}`], retainedSha: [], removedSha: [], migrated: [] };
    }
    return {
      mode,
      runId,
      status: overallStatus,
      attentionRequired: overallAttention,
      auditedHead: start.auditedHead,
      originMain: start.originMain,
      baselineStable: start.baselineStable,
      worktreeClean: start.worktreeClean,
      worktreeChanged,
      allPaths,
      projectionPaths,
      projectionStatus,
      documentation,
      retention,
      results: manifests,
    };
  } finally {
    endActiveAudit(activeMarker, fsApi);
  }
}

export function formatQualityAuditCliResult(result) {
  const lines = [
    `QUALITY_AUDIT_STATUS: ${result.status}`,
    `QUALITY_AUDIT_HEAD: ${result.auditedHead}`,
  ];
  for (const entry of result.results) lines.push(`${entry.audit}: ${entry.status}; attention=${entry.attentionRequired}`);
  if (result.projectionStatus) lines.push(`QUALITY_AUDIT_PROJECTION_STATUS: ${result.projectionStatus}`);
  if (result.documentation) lines.push(`QUALITY_AUDIT_DOCUMENTATION: ${result.documentation.status}; attention=${result.documentation.attentionRequired}`);
  if (result.projectionPaths?.error) lines.push(`QUALITY_AUDIT_PROJECTION_ERROR: ${result.projectionPaths.error}`);
  if (result.retention?.diagnostics?.length) lines.push(`QUALITY_AUDIT_RETENTION: ${result.retention.status}; ${result.retention.diagnostics.join(", ")}`);
  return lines;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const mode = parseAuditMode();
    const result = await runQualityAudit(mode);
    const lines = formatQualityAuditCliResult(result);
    for (const line of lines) {
      if (line.startsWith("QUALITY_AUDIT_PROJECTION_ERROR:") || line.startsWith("QUALITY_AUDIT_RETENTION:")) console.error(line);
      else console.log(line);
    }
    if (result.status === "FAIL" || result.projectionStatus === "FAIL") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
