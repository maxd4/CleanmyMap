import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { gitExecutable } from "../ci/git-executable.mjs";

export const HOTSPOT_HISTORY_WINDOW_DAYS = 180;
export const HOTSPOT_SUBSTANTIVE_LINE_THRESHOLD = 20;
export const HOTSPOT_HIGH_ACTIVITY_COMMIT_THRESHOLD = 5;
export const QUALITY_TESTABILITY_SCHEMA_VERSION = 1;
const GIT_HISTORY_MAX_BUFFER_BYTES = 32 * 1024 * 1024;

const SOURCE_ROOTS = ["apps/web/src", "apps/mobile", "scripts"];
const CRITICAL_DOMAINS = new Set(["auth-authz", "api", "actions", "account", "maps-location", "payments", "import-export", "mobile/security", "mobile/services"]);
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

function normalize(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function git(root, args) {
  return execFileSync(gitExecutable(), args, { cwd: root, encoding: "utf8", maxBuffer: GIT_HISTORY_MAX_BUFFER_BYTES }).trim();
}

function readJson(root, relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
  } catch {
    return null;
  }
}

function dateMinusDays(iso, days) {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function listTrackedFiles(root, auditedSha) {
  return git(root, ["ls-tree", "-r", "--name-only", auditedSha, "--", ...SOURCE_ROOTS])
    .split(/\r?\n/)
    .map(normalize)
    .filter(Boolean);
}

function readHistory(root, auditedSha, windowDays) {
  const auditedAt = git(root, ["show", "-s", "--format=%cI", auditedSha]);
  const windowStart = dateMinusDays(auditedAt, windowDays);
  const output = git(root, [
    "log", auditedSha, `--since=${windowStart}`, `--format=commit%x00%H%x00%cI`,
    "--numstat", "--", ...SOURCE_ROOTS,
  ]);
  const commits = [];
  let current = null;
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith("commit\0")) {
      const [, sha, committedAt] = line.split("\0");
      current = { sha, committedAt, files: [] };
      commits.push(current);
      continue;
    }
    if (!current || !line.trim()) continue;
    const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!match) continue;
    const added = match[1] === "-" ? 0 : Number(match[1]);
    const deleted = match[2] === "-" ? 0 : Number(match[2]);
    const rawPath = match[3].includes(" => ") ? match[3].replace(/^.*\{(.+) => (.+)\}.*$/, "$2") : match[3];
    current.files.push({ path: normalize(rawPath), added, deleted, substantive: added + deleted >= HOTSPOT_SUBSTANTIVE_LINE_THRESHOLD });
  }
  return { auditedAt, windowStart, windowEnd: auditedAt, commits };
}

function sourceFilesFromResults(reports) {
  const signals = new Map();
  const add = (file, category) => {
    const normalized = normalize(file);
    if (!normalized) return;
    const entry = signals.get(normalized) ?? new Set();
    entry.add(category);
    signals.set(normalized, entry);
  };
  const addItems = (category, items = []) => {
    for (const item of items) add(item?.path ?? item?.file, category);
  };
  addItems("complexity", reports.complexity?.result?.failures);
  addItems("complexity", reports.complexity?.result?.reviews);
  addItems("function-length", (reports.complexity?.metrics ?? []).filter((item) => item.metric === "functionLength" && item.category && item.category !== "NONE"));
  addItems("cognitive-complexity", (reports.maintainability?.findings ?? []).filter((item) => item.category === "cognitive-complexity"));
  addItems("local-maintainability", (reports.maintainability?.findings ?? []).filter((item) => item.category !== "cognitive-complexity"));
  addItems("type-safety", reports["type-safety"]?.findings);
  for (const key of ["hardOffenders", "newHardOffenders", "ratchetViolations", "reviewWarnings", "newReviewOffenders", "reviewRatchetViolations"]) addItems("top-heavy", reports["top-heavy"]?.evaluation?.[key]);
  addItems("dead-code", reports["dead-code"]?.comparison?.newFindings);
  addItems("dead-code", reports["dead-code"]?.comparison?.historicalActionableFindings);
  for (const entry of reports.duplication?.results ?? []) addItems("duplication", entry.occurrences?.flatMap((occurrence) => [occurrence.occurrenceA, occurrence.occurrenceB]));
  for (const cycle of reports.cycles?.cycleObjects ?? []) for (const file of cycle.files ?? cycle.paths ?? []) add(file, "cycles");
  return signals;
}

export function buildQualityHotspotsReport({ root = process.cwd(), auditedSha, reports = {}, windowDays = HOTSPOT_HISTORY_WINDOW_DAYS, gitRunner = git } = {}) {
  if (!SHA_PATTERN.test(auditedSha ?? "")) throw new Error(`SHA hotspot invalide: ${auditedSha}`);
  const history = readHistoryWithRunner(root, auditedSha, windowDays, gitRunner);
  const tracked = new Set(listTrackedFilesWithRunner(root, auditedSha, gitRunner));
  const byFile = new Map([...tracked].map((file) => [file, { file, commits: new Set(), substantiveChanges: 0, addedLines: 0, deletedLines: 0 }]));
  for (const commit of history.commits) {
    for (const change of commit.files) {
      const entry = byFile.get(change.path);
      if (!entry) continue;
      entry.commits.add(commit.sha);
      entry.substantiveChanges += change.substantive ? 1 : 0;
      entry.addedLines += change.added;
      entry.deletedLines += change.deleted;
    }
  }
  const debtSignals = sourceFilesFromResults(reports);
  const files = [...byFile.values()].map((entry) => {
    const commitCount = entry.commits.size;
    const signals = [...(debtSignals.get(entry.file) ?? [])].sort();
    const highActivity = commitCount >= HOTSPOT_HIGH_ACTIVITY_COMMIT_THRESHOLD;
    return {
      file: entry.file,
      position: null,
      activity: { commits: commitCount, substantiveChanges: entry.substantiveChanges, addedLines: entry.addedLines, deletedLines: entry.deletedLines, highActivity },
      structuralDebt: { state: signals.length > 0 ? "PRESENT" : "NONE", signals, signalCount: signals.length },
      hotspotCandidate: highActivity && signals.length > 0,
      severity: highActivity && signals.length > 0 ? "informational" : null,
      provenance: { history: "COMMITTED_SNAPSHOT", debt: signals.length > 0 ? "QUALITY_AUDIT_RESULTS" : "NONE" },
      regressionRecurrence: { state: "NOT_MEASURED", reason: "NO_MULTI_RUN_REGRESSION_SERIES" },
    };
  }).filter((entry) => entry.activity.commits > 0 || entry.structuralDebt.signals.length > 0)
    .sort((left, right) => right.activity.commits - left.activity.commits || left.file.localeCompare(right.file));
  return {
    schemaVersion: 1,
    kind: "quality-hotspots",
    status: "PASS",
    blocking: false,
    measurementStatus: "MEASURED",
    auditedSha,
    methodology: {
      historyWindowDays: windowDays,
      windowStart: history.windowStart,
      windowEnd: history.windowEnd,
      substantiveChangeMinimumLines: HOTSPOT_SUBSTANTIVE_LINE_THRESHOLD,
      highActivityDescriptiveMinimumCommits: HOTSPOT_HIGH_ACTIVITY_COMMIT_THRESHOLD,
      note: "Les seuils décrivent une observation et ne constituent ni un ratchet ni un verdict bloquant. L'activité n'est pas un défaut en soi.",
    },
    summary: {
      filesMeasured: files.length,
      highActivityFiles: files.filter((entry) => entry.activity.highActivity).length,
      hotspotCandidates: files.filter((entry) => entry.hotspotCandidate).length,
      structuralDebtFiles: files.filter((entry) => entry.structuralDebt.signals.length > 0).length,
      regressionRecurrence: "NOT_MEASURED",
    },
    files,
    diagnostics: [],
  };
}

function readHistoryWithRunner(root, auditedSha, windowDays, gitRunner) {
  if (gitRunner === git) return readHistory(root, auditedSha, windowDays);
  const auditedAt = gitRunner(["show", "-s", "--format=%cI", auditedSha], root);
  const windowStart = dateMinusDays(auditedAt, windowDays);
  const output = gitRunner(["log", auditedSha, `--since=${windowStart}`, `--format=commit%x00%H%x00%cI`, "--numstat", "--", ...SOURCE_ROOTS], root);
  return parseHistory(output, auditedAt, windowStart);
}

function parseHistory(output, auditedAt, windowStart) {
  const commits = [];
  let current = null;
  for (const line of String(output).split(/\r?\n/)) {
    if (line.startsWith("commit\0")) { const [, sha, committedAt] = line.split("\0"); current = { sha, committedAt, files: [] }; commits.push(current); continue; }
    if (!current || !line.trim()) continue;
    const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!match) continue;
    const added = match[1] === "-" ? 0 : Number(match[1]);
    const deleted = match[2] === "-" ? 0 : Number(match[2]);
    current.files.push({ path: normalize(match[3]), added, deleted, substantive: added + deleted >= HOTSPOT_SUBSTANTIVE_LINE_THRESHOLD });
  }
  return { auditedAt, windowStart, windowEnd: auditedAt, commits };
}

function listTrackedFilesWithRunner(root, auditedSha, gitRunner) {
  if (gitRunner === git) return listTrackedFiles(root, auditedSha);
  return gitRunner(["ls-tree", "-r", "--name-only", auditedSha, "--", ...SOURCE_ROOTS]).split(/\r?\n/).map(normalize).filter(Boolean);
}

function metricOrNotMeasured(reason) {
  return { state: "NOT_MEASURED", reason };
}

function validModuleMetrics(metrics, auditedSha) {
  return Boolean(metrics && metrics.schemaVersion >= 1 && metrics.sourceSha === auditedSha && metrics.domains && typeof metrics.domains === "object");
}

function mutationEvidence(root, auditedSha) {
  const report = readJson(root, "artifacts/quality-hardening/mutation/stryker-report.json");
  const sourceSha = report?.candidateSha ?? report?.sourceSha ?? null;
  if (!report) return metricOrNotMeasured("MUTATION_REPORT_MISSING");
  if (sourceSha !== auditedSha) return metricOrNotMeasured("MUTATION_REPORT_NOT_ATTRIBUTABLE_TO_AUDITED_SHA");
  return { state: "PRESENT", sourceSha, reportPath: "artifacts/quality-hardening/mutation/stryker-report.json", summary: report.summary ?? null };
}

export function buildQualityTestabilityReport({ root = process.cwd(), auditedSha, moduleMetrics = readJson(root, "documentation/operations/audits/module-test-metrics.json") } = {}) {
  const moduleState = validModuleMetrics(moduleMetrics, auditedSha)
    ? { state: "PRESENT", sourceSha: moduleMetrics.sourceSha, provenance: "EXACT_SHA_MODULE_TEST_METRICS" }
    : metricOrNotMeasured(moduleMetrics ? "MODULE_TEST_METRICS_STALE_OR_UNATTRIBUTABLE" : "MODULE_TEST_METRICS_MISSING");
  const mutation = mutationEvidence(root, auditedSha);
  const domains = [];
  if (moduleState.state === "PRESENT") {
    for (const [domain, value] of Object.entries(moduleMetrics.domains)) {
      const critical = CRITICAL_DOMAINS.has(domain);
      const coverage = value.coverage?.status === "AVAILABLE" && value.coverage.metrics
        ? { state: "PRESENT", status: value.coverage.status, files: value.coverage.files, metrics: value.coverage.metrics }
        : metricOrNotMeasured(value.coverage?.status ?? "COVERAGE_NOT_MEASURED");
      domains.push({
        domain,
        module: domain,
        runtimeFiles: value.runtimeFiles,
        testFiles: value.testFiles,
        testPresence: { state: "PRESENT", directlyAssociatedRuntimeFiles: value.runtimeFilesWithDirectTest, runtimeFilesWithoutDirectAssociation: value.runtimeFilesWithoutDirectTest, method: "DIRECT_ASSOCIATION_ONLY; absence is not a coverage claim" },
        coverage,
        mutation: critical ? mutation : { state: "NOT_APPLICABLE", reason: "MUTATION_SCOPE_IS_EXPLICITLY_BOUNDED" },
        criticalEvidence: critical && (coverage.state === "NOT_MEASURED" || mutation.state === "NOT_MEASURED") ? "NOT_MEASURED" : critical ? "PRESENT" : "NOT_APPLICABLE",
      });
    }
  }
  const diagnostics = [];
  if (moduleState.state === "NOT_MEASURED") diagnostics.push({ code: moduleState.reason, message: "Les métriques de modules ne sont pas valides pour le SHA audité." });
  if (mutation.state === "NOT_MEASURED") diagnostics.push({ code: mutation.reason, message: "La mutation n'est pas attribuable au SHA audité ; aucun score n'est déduit." });
  return {
    schemaVersion: QUALITY_TESTABILITY_SCHEMA_VERSION,
    kind: "quality-testability",
    status: "PASS",
    blocking: false,
    measurementStatus: moduleState.state === "PRESENT" ? "MEASURED" : "NOT_MEASURED",
    auditedSha,
    methodology: { noTestInferenceFromAbsence: true, noFunctionTestMappingInvented: true, noTestRerun: true, evidenceRule: "missing, stale or unattributable evidence is NOT_MEASURED" },
    sources: { moduleTestMetrics: moduleState, mutation },
    summary: { domainsMeasured: domains.length, criticalDomains: domains.filter((entry) => entry.criticalEvidence !== "NOT_APPLICABLE").length, criticalDomainsWithoutSufficientEvidence: domains.filter((entry) => entry.criticalEvidence === "NOT_MEASURED").length },
    domains,
    findings: [],
    diagnostics,
  };
}
