#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  findingId,
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
  createRadarRows,
  extractHumanDecisions,
  loadCorrelationSignals,
  parseHumanDecisions,
} from "../reports/generate-modularity-radar.mjs";

export const AUDIT_MODES = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles", "all"]);
export const QUALITY_AUDIT_ROOT = "artifacts/quality-audits";
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HUMAN_DECISIONS_PATH = "documentation/architecture/monolith-split-plan.md";
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
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

export function captureRepositorySnapshot({ root = REPOSITORY_ROOT, gitRunner = git } = {}) {
  const auditedHead = gitRunner(["rev-parse", "HEAD"], root);
  const originMain = gitRunner(["rev-parse", "origin/main"], root);
  const worktree = gitRunner(["status", "--short"], root);
  return {
    auditedHead,
    originMain,
    worktree,
    worktreeClean: worktree.length === 0,
    baselineStable: worktree.length === 0 && auditedHead === originMain,
  };
}

export function createAuditPaths({ root = REPOSITORY_ROOT, auditedHead, audit }) {
  const shaRoot = path.join(root, QUALITY_AUDIT_ROOT, auditedHead);
  const auditRoot = audit === "all" ? shaRoot : path.join(shaRoot, audit);
  return {
    shaRoot,
    auditRoot,
    manifest: path.join(auditRoot, "manifest.json"),
    report: path.join(auditRoot, "report.json"),
    summary: path.join(auditRoot, "summary.md"),
  };
}

function serialize(value, seen = new WeakSet()) {
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Error) return { name: value.name, message: value.message, code: value.code };
  if (value instanceof Set) return [...value].map((entry) => serialize(entry, seen));
  if (value instanceof Map) return Object.fromEntries([...value.entries()].map(([key, entry]) => [String(key), serialize(entry, seen)]));
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => serialize(entry, seen));
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry, seen)]));
}

function writeJson(filePath, value, fsApi = fs) {
  fsApi.writeFileSync(filePath, `${JSON.stringify(serialize(value), null, 2)}\n`, "utf8");
}

function statusForAudit(audit, result) {
  if (result?.status === "FAIL") return "FAIL";
  if (audit === "dead-code") return hasBlockingDeadCodeFindings(result.comparison) ? "FAIL" : "PASS";
  if (audit === "duplication") {
    const statuses = (result.results ?? []).map((entry) => entry.comparison?.status);
    return statuses.includes("FAIL") ? "FAIL" : statuses.includes("PASS_WITH_GRACE") ? "PASS_WITH_GRACE" : "PASS";
  }
  if (audit === "cycles") return result.gateStatus === "PASS" ? "PASS" : "FAIL";
  return result.status ?? "PASS";
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
    ) || (result.justificationReport?.stale?.length ?? 0) > 0;
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
    `- Status: **${manifest.status}**`,
    `- Attention required: **${manifest.attentionRequired ? "yes" : "no"}**`,
    `- Raw report: \`${path.relative(path.dirname(paths.summary), paths.report).replaceAll("\\", "/")}\``,
    "",
    "This summary is a generated projection of the raw gate result. `attentionRequired: false` means that no new delta requiring analysis was observed; it does not mean that historical debt is absent.",
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
    for (const entry of result.results) lines.splice(6, 0, `- ${entry.scopeName}: ${entry.metrics.clones} clones, ${entry.metrics.duplicatedLines} duplicated lines, ${entry.metrics.duplicatedTokens} duplicated tokens`);
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

async function executeAudit(audit, root) {
  if (audit === "dead-code") {
    const result = runDeadCodePolicy({ report: runKnipReport() });
    return { ...result, status: statusForAudit(audit, result), formatted: formatDeadCodeReport(result) };
  }
  if (audit === "duplication") {
    const result = runDuplicationPolicy();
    return { ...result, status: statusForAudit(audit, result), formatted: formatDuplicationReport(result) };
  }
  if (audit === "top-heavy") {
    const result = runTopHeavyPolicy({ root, args: ["--ref=HEAD", "--enforce"] });
    const view = createRepositoryView({ root, ref: "HEAD" });
    const humanDecisionsByFile = view.isFile(HUMAN_DECISIONS_PATH)
      ? buildHumanDecisionsByFile(view.readText(HUMAN_DECISIONS_PATH))
      : {};
    const evaluation = enrichTopHeavyEvaluation(result.evaluation, humanDecisionsByFile);
    const radarRows = createRadarRows(result.rows, loadCorrelationSignals(view));
    const enrichedResult = { ...result, evaluation, radarProjection: { rows: radarRows } };
    return { ...enrichedResult, status: statusForAudit(audit, enrichedResult) };
  }
  if (audit === "complexity") return runComplexityPolicy();
  if (audit === "cycles") return runCycleGate();
  throw new QualityAuditError(`Unknown audit: ${audit}`, "INVALID_MODE");
}

function sameSnapshot(left, right) {
  return left.auditedHead === right.auditedHead
    && left.originMain === right.originMain
    && left.worktree === right.worktree
    && left.baselineStable === right.baselineStable;
}

export async function runQualityAudit(mode, {
  root = REPOSITORY_ROOT,
  snapshot = () => captureRepositorySnapshot({ root }),
  engine = executeAudit,
  fsApi = fs,
  now = () => new Date().toISOString(),
} = {}) {
  if (!AUDIT_MODES.includes(mode)) throw new QualityAuditError(`Mode d'audit inconnu. ${usage()}`, "INVALID_MODE");
  const audits = mode === "all" ? AUDIT_MODES.slice(0, -1) : [mode];
  const start = snapshot();
  if (!start.baselineStable) {
    throw new QualityAuditError(`BASELINE_STABLE=false: worktree must be clean and HEAD must equal origin/main. ${usage()}`, "BASELINE_UNSTABLE");
  }

  const results = [];
  for (const audit of audits) {
    let raw;
    try {
      raw = await engine(audit, root);
    } catch (error) {
      raw = { status: "FAIL", error: { name: error?.name ?? "Error", message: error?.message ?? String(error), code: error?.code } };
    }
    const status = statusForAudit(audit, raw);
    results.push({ audit, result: raw, status, attentionRequired: attentionRequired(audit, raw) });
  }

  const end = snapshot();
  if (!sameSnapshot(start, end)) {
    throw new QualityAuditError("BASELINE_STABLE=false: repository changed during the audit; no canonical result was published.", "BASELINE_CHANGED");
  }

  const generatedAt = now();
  const manifests = [];
  for (const entry of results) {
    const paths = createAuditPaths({ root, auditedHead: start.auditedHead, audit: entry.audit });
    fsApi.mkdirSync(paths.auditRoot, { recursive: true });
    const manifest = {
      schemaVersion: 1,
      audit: entry.audit,
      auditedHead: start.auditedHead,
      originMain: start.originMain,
      baselineStable: true,
      worktreeClean: true,
      status: entry.status,
      attentionRequired: entry.attentionRequired,
      generatedAt,
    };
    writeJson(paths.report, entry.result, fsApi);
    fsApi.writeFileSync(paths.summary, makeSummary({ audit: entry.audit, manifest, result: entry.result, paths }), "utf8");
    writeJson(paths.manifest, manifest, fsApi);
    manifests.push({ ...entry, paths, manifest });
  }

  const overallStatus = manifests.some((entry) => entry.status === "FAIL")
    ? "FAIL"
    : manifests.some((entry) => entry.status === "PASS_WITH_GRACE")
      ? "PASS_WITH_GRACE"
      : "PASS";
  const overallAttention = manifests.some((entry) => entry.attentionRequired);
  if (mode === "all") {
    const paths = createAuditPaths({ root, auditedHead: start.auditedHead, audit: "all" });
    const manifest = {
      schemaVersion: 1,
      audit: "all",
      auditedHead: start.auditedHead,
      originMain: start.originMain,
      baselineStable: true,
      worktreeClean: true,
      status: overallStatus,
      attentionRequired: overallAttention,
      generatedAt,
    };
    writeJson(paths.report, { status: overallStatus, attentionRequired: overallAttention, audits: manifests.map(({ audit, status, attentionRequired: attention }) => ({ audit, status, attentionRequired: attention })) }, fsApi);
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

  return { mode, status: overallStatus, attentionRequired: overallAttention, auditedHead: start.auditedHead, originMain: start.originMain, results: manifests };
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
