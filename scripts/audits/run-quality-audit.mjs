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
import { runTopHeavyPolicy } from "../checks/check-top-heavy-files.mjs";
import { createRepositoryView } from "../checks/repository-view.mjs";
import {
  createCorrelationSignalsFromAuditResults,
  createRadarRows,
  extractHumanDecisions,
  parseHumanDecisions,
  readHumanDecisionsFromView,
} from "../reports/generate-modularity-radar.mjs";

export const AUDIT_MODES = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles", "all"]);
export const QUALITY_AUDIT_ROOT = "artifacts/quality-audits";
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

export function createAuditPaths({ root = REPOSITORY_ROOT, auditedHead, audit, runId } = {}) {
  const shaRoot = path.join(root, QUALITY_AUDIT_ROOT, auditedHead);
  if (runId !== undefined && (typeof runId !== "string" || !/^[A-Za-z0-9_-]+$/.test(runId))) {
    throw new QualityAuditError(`Identifiant d'exécution invalide: ${runId}`, "INVALID_RUN_ID");
  }
  const runRoot = runId ? path.join(shaRoot, runId) : shaRoot;
  const auditRoot = audit === "all" ? runRoot : path.join(runRoot, audit);
  return {
    shaRoot,
    runRoot,
    runId: runId ?? null,
    auditRoot,
    manifest: path.join(auditRoot, "manifest.json"),
    report: path.join(auditRoot, "report.json"),
    summary: path.join(auditRoot, "summary.md"),
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

function writeJson(filePath, value, fsApi = fs) {
  fsApi.writeFileSync(filePath, `${JSON.stringify(serialize(value), null, 2)}\n`, "utf8");
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
    "This summary is a generated projection of the raw gate result. `attentionRequired: false` means that no new top-heavy delta or unqualified REVIEW requiring a new analysis was observed; it does not mean that historical large-file debt is absent.",
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
    const result = runTopHeavyPolicy({ root, args: [`--ref=${ref}`, "--enforce"] });
    const view = createRepositoryView({ root, ref });
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
  if (audit === "cycles") {
    const result = await cycleRunner();
    return isCycleResult(result)
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
  fsApi = fs,
  now = () => new Date().toISOString(),
  runId = randomUUID(),
} = {}) {
  if (!AUDIT_MODES.includes(mode)) throw new QualityAuditError(`Mode d'audit inconnu. ${usage()}`, "INVALID_MODE");
  const audits = mode === "all" ? AUDIT_MODES.slice(0, -1) : [mode];
  const start = snapshot();

  const results = [];
  for (const audit of audits) {
    let raw;
    try {
      raw = await engine(audit, root, { auditedHead: start.auditedHead, snapshot: start });
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
    fsApi.mkdirSync(paths.auditRoot, { recursive: true });
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
    writeJson(paths.report, entry.result, fsApi);
    fsApi.writeFileSync(paths.summary, makeSummary({ audit: entry.audit, manifest, result: entry.result, paths }), "utf8");
    writeJson(paths.manifest, manifest, fsApi);
    manifests.push({ ...entry, paths, manifest, ...evidence });
  }

  const overallStatus = manifests.some((entry) => entry.status === "FAIL")
    ? "FAIL"
    : manifests.some((entry) => entry.status === "PASS_WITH_GRACE")
      ? "PASS_WITH_GRACE"
      : "PASS";
  const overallAttention = manifests.some((entry) => entry.attentionRequired);
  if (mode === "all") {
    const paths = createAuditPaths({ root, auditedHead: start.auditedHead, audit: "all", runId });
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
    writeJson(paths.report, {
      status: overallStatus,
      attentionRequired: overallAttention,
      audits: manifests.map(({ audit, status, attentionRequired: attention, readProvenance, reproducible, resultClass }) => ({ audit, status, attentionRequired: attention, readProvenance, reproducible, resultClass })),
    }, fsApi);
    fsApi.writeFileSync(paths.summary, [
      "# Quality audit — all",
      "",
      `- Audited HEAD: \`${start.auditedHead}\``,
      `- Status: **${overallStatus}**`,
      `- Attention required: **${overallAttention ? "yes" : "no"}**`,
      "",
      ...manifests.map((entry) => `- ${entry.audit}: **${entry.status}**, attention **${entry.attentionRequired ? "yes" : "no"}**`),
    ].join("\n") + "\n", "utf8");
    writeJson(paths.manifest, manifest, fsApi);
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
    allPaths: mode === "all" ? createAuditPaths({ root, auditedHead: start.auditedHead, audit: "all", runId }) : null,
    results: manifests,
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const mode = parseAuditMode();
    const result = await runQualityAudit(mode);
    console.log(`QUALITY_AUDIT_STATUS: ${result.status}`);
    console.log(`QUALITY_AUDIT_HEAD: ${result.auditedHead}`);
    for (const entry of result.results) console.log(`${entry.audit}: ${entry.status}; attention=${entry.attentionRequired}`);
    if (result.status === "FAIL") process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
