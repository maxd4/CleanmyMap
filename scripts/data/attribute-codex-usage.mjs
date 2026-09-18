#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const NA = "NA";
const TOKEN_FIELDS = [
  "input_tokens",
  "cached_input_tokens",
  "uncached_input_tokens",
  "cache_write_input_tokens",
  "output_tokens",
  "reasoning_output_tokens",
  "total_tokens",
];
const DATE_FIELDS = ["start", "end"];
const REFERENCE_WINDOW = {
  start: "2026-03-18T00:00:00.000Z",
  end: "2026-09-18T23:59:59.999Z",
};

function parseArgs(argv) {
  const args = {
    inputDir: null,
    outputDir: null,
    canonicalRoot: process.cwd(),
    canonicalOrigin: "https://github.com/maxd4/CleanmyMap.git",
    externalTool: "codex-usage",
    externalVersion: "0.0.0",
    externalStatus: "NOT_AVAILABLE",
    externalNote: "No executable or comparable usage metrics were exposed.",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input-dir") args.inputDir = argv[++i];
    else if (arg === "--output-dir") args.outputDir = argv[++i];
    else if (arg === "--canonical-root") args.canonicalRoot = argv[++i];
    else if (arg === "--canonical-origin") args.canonicalOrigin = argv[++i];
    else if (arg === "--external-tool") args.externalTool = argv[++i];
    else if (arg === "--external-version") args.externalVersion = argv[++i];
    else if (arg === "--external-status") args.externalStatus = argv[++i];
    else if (arg === "--external-note") args.externalNote = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/data/attribute-codex-usage.mjs \\
  --input-dir <lot-A-artifacts> --output-dir <attribution-artifacts> [options]

Options:
  --canonical-root <path>       CleanMyMap checkout used for alias detection
  --canonical-origin <url>      CleanMyMap repository URL
  --external-tool <name>        Independently attempted tool name
  --external-version <version>  Exact tool version
  --external-status <status>    PASS, PARTIAL, NOT_AVAILABLE or NOT_RUN
  --external-note <text>        Evidence note for the external attempt
`);
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function asNumber(value) {
  return isNumber(value) ? value : null;
}

function normalizePath(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  return value.replaceAll("\\", "/").replace(/\/+$/, "").toLowerCase();
}

function normalizeOrigin(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  return value.trim().replace(/\/+$/, "").replace(/\.git$/i, "").toLowerCase();
}

function sameOrInside(candidate, root) {
  if (!candidate || !root) return false;
  return candidate === root || candidate.startsWith(`${root}/`);
}

function runGit(cwd, args) {
  if (!cwd || !fs.existsSync(cwd)) return null;
  const result = spawnSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  const value = result.stdout.trim();
  return value || null;
}

function probeGit(cwd) {
  if (!cwd || !fs.existsSync(cwd)) {
    return { exists: false, root: null, origin: null, branch: null };
  }
  return {
    exists: true,
    root: runGit(cwd, ["rev-parse", "--show-toplevel"]),
    origin: runGit(cwd, ["config", "--get", "remote.origin.url"]),
    branch: runGit(cwd, ["branch", "--show-current"]),
  };
}

function cleanOrigin(origin, canonicalOrigin) {
  return Boolean(origin && canonicalOrigin && normalizeOrigin(origin) === normalizeOrigin(canonicalOrigin));
}

function sessionGit(session, probe) {
  return {
    root: session.git_root || session.gitRoot || probe.root || null,
    origin: session.git?.repository_url || session.git_origin || probe.origin || null,
    branch: session.git?.branch || probe.branch || null,
  };
}

function classifySession(session, { canonicalRoot, canonicalOrigin }) {
  const cwd = typeof session.cwd === "string" ? session.cwd : null;
  const probe = probeGit(cwd);
  const git = sessionGit(session, probe);
  const cwdIsClean = sameOrInside(normalizePath(cwd), normalizePath(canonicalRoot));
  const rootIsClean = sameOrInside(normalizePath(git.root), normalizePath(canonicalRoot));
  const originIsClean = cleanOrigin(git.origin, canonicalOrigin);
  const hasCleanEvidence = cwdIsClean || rootIsClean || originIsClean;
  const hasOtherOrigin = Boolean(git.origin) && !originIsClean;
  const hasOtherRoot = Boolean(git.root) && !rootIsClean;
  const conflict = hasCleanEvidence && (hasOtherOrigin || hasOtherRoot);
  let classification = "AMBIGUOUS";
  let proof = "missing_or_conflicting_project_evidence";
  if (!conflict && hasCleanEvidence) {
    classification = "CLEANMYMAP";
    proof = originIsClean ? "repository_origin" : rootIsClean ? "git_root" : "canonical_path";
  } else if (!conflict && (hasOtherOrigin || hasOtherRoot)) {
    classification = "OTHER_PROJECT";
    proof = hasOtherOrigin ? "repository_origin" : "git_root";
  }
  return {
    classification,
    proof,
    projectPath: cwd || NA,
    gitRoot: git.root || NA,
    gitOrigin: git.origin || NA,
    branch: git.branch || NA,
    probe: {
      cwdExists: probe.exists,
      usedLiveGitProbe: Boolean(probe.root || probe.origin || probe.branch),
    },
  };
}

function tokenValues(session) {
  const values = session.tokenReconstruction?.values || session.token_counters || {};
  return Object.fromEntries(TOKEN_FIELDS.map((field) => [field, asNumber(values[field])]));
}

function metricStatus(available, sessionCount) {
  if (available === 0) return NA;
  return available === sessionCount ? "COMPLETE" : "PARTIAL";
}

function aggregateSessions(sessions) {
  const fields = {};
  for (const field of TOKEN_FIELDS) {
    const values = sessions.map((session) => tokenValues(session)[field]).filter(isNumber);
    fields[field] = {
      value: values.length ? values.reduce((sum, value) => sum + value, 0) : NA,
      availableSessionCount: values.length,
      missingSessionCount: sessions.length - values.length,
      status: metricStatus(values.length, sessions.length),
    };
  }
  return {
    sessionCount: sessions.length,
    fields,
  };
}

function toTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function contributionEntries(session, field) {
  const entries = session.tokenReconstruction?.contributions?.[field];
  return Array.isArray(entries)
    ? entries.filter((entry) => toTimestamp(entry.timestamp) !== null && isNumber(entry.value))
    : [];
}

function entriesForPeriod(session, field, start, end) {
  const entries = contributionEntries(session, field).filter((entry) => {
    const timestamp = toTimestamp(entry.timestamp);
    return timestamp >= start && timestamp <= end;
  });
  if (entries.length > 0 || session.tokenReconstruction?.contributions?.[field]) return entries;
  const sessionStart = toTimestamp(session.start);
  const sessionEnd = toTimestamp(session.end || session.start);
  const value = tokenValues(session)[field];
  if (sessionStart !== null && sessionEnd !== null && sessionStart >= start && sessionEnd <= end && isNumber(value)) {
    return [{ timestamp: new Date(sessionEnd).toISOString(), value }];
  }
  return [];
}

function sessionOverlaps(session, start, end) {
  const sessionStart = toTimestamp(session.start);
  const sessionEnd = toTimestamp(session.end || session.start);
  return sessionStart !== null && sessionEnd !== null && sessionStart <= end && sessionEnd >= start;
}

function aggregateContributions(sessions, start, end) {
  const fields = {};
  const activeSessions = sessions.filter((session) => sessionOverlaps(session, start, end));
  for (const field of TOKEN_FIELDS) {
    const entries = [];
    for (const session of activeSessions) {
      for (const entry of entriesForPeriod(session, field, start, end)) entries.push({ session, entry });
    }
    fields[field] = {
      value: entries.length ? entries.reduce((sum, item) => sum + item.entry.value, 0) : NA,
      availableSessionCount: new Set(entries.map((item) => item.session.session_id)).size,
      missingSessionCount: activeSessions.length - new Set(entries.map((item) => item.session.session_id)).size,
      status: metricStatus(new Set(entries.map((item) => item.session.session_id)).size, activeSessions.length),
    };
  }
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    sessionCount: activeSessions.length,
    fields,
  };
}

function addMetricRow(map, key, session, entries) {
  if (!map.has(key)) {
    map.set(key, {
      sessions: new Set(),
      metrics: Object.fromEntries(TOKEN_FIELDS.map((field) => [field, 0])),
      available: Object.fromEntries(TOKEN_FIELDS.map((field) => [field, new Set()])),
      firstSeen: null,
      lastSeen: null,
      models: new Set(),
    });
  }
  const row = map.get(key);
  row.sessions.add(session.session_id);
  for (const model of session.models || []) row.models.add(model);
  row.firstSeen = row.firstSeen && row.firstSeen < session.start ? row.firstSeen : session.start;
  row.lastSeen = row.lastSeen && row.lastSeen > session.end ? row.lastSeen : session.end;
  for (const [field, value] of Object.entries(entries)) {
    if (isNumber(value)) {
      row.metrics[field] += value;
      row.available[field].add(session.session_id);
    }
  }
}

function finalizeGroupedRow(key, row) {
  const sessionCount = row.sessions.size;
  const fields = {};
  for (const field of TOKEN_FIELDS) {
    const available = row.available[field].size;
    fields[field] = {
      value: available ? row.metrics[field] : NA,
      availableSessionCount: available,
      missingSessionCount: sessionCount - available,
      status: metricStatus(available, sessionCount),
    };
  }
  return {
    key,
    sessionCount,
    ...fields,
    firstSeen: row.firstSeen || NA,
    lastSeen: row.lastSeen || NA,
    models: [...row.models].sort(),
  };
}

function projectBreakdown(sessions) {
  const groups = new Map();
  for (const session of sessions) {
    const attribution = session.attribution;
    const key = JSON.stringify([attribution.classification, attribution.projectPath, attribution.gitRoot, attribution.gitOrigin]);
    addMetricRow(groups, key, session, tokenValues(session));
  }
  return [...groups.entries()].map(([key, row]) => {
    const [classification, projectPath, gitRoot, gitOrigin] = JSON.parse(key);
    return {
      classification,
      projectPath,
      gitRoot,
      gitOrigin,
      ...finalizeGroupedRow(key, row),
    };
  }).sort((a, b) => `${a.classification}:${a.projectPath}`.localeCompare(`${b.classification}:${b.projectPath}`));
}

function monthlyBreakdown(sessions, start, end, scope) {
  const groups = new Map();
  for (const session of sessions) {
    for (const field of TOKEN_FIELDS) {
      for (const entry of entriesForPeriod(session, field, start, end)) {
        const timestamp = toTimestamp(entry.timestamp);
        const month = new Date(timestamp).toISOString().slice(0, 7);
        const key = `${scope}|${session.attribution.classification}|${month}`;
        if (!groups.has(key)) groups.set(key, { scope, classification: session.attribution.classification, month, sessions: new Set(), metrics: Object.fromEntries(TOKEN_FIELDS.map((name) => [name, 0])) });
        const row = groups.get(key);
        row.sessions.add(session.session_id);
        row.metrics[field] += entry.value;
      }
    }
  }
  return [...groups.values()].map((row) => ({
    scope: row.scope,
    classification: row.classification,
    month: row.month,
    sessions: row.sessions.size,
    input: row.metrics.input_tokens,
    cachedInput: row.metrics.cached_input_tokens,
    uncachedInput: row.metrics.uncached_input_tokens,
    cacheWriteInput: row.metrics.cache_write_input_tokens,
    output: row.metrics.output_tokens,
    reasoningOutput: row.metrics.reasoning_output_tokens,
    total: row.metrics.total_tokens,
  })).sort((a, b) => `${a.classification}|${a.month}`.localeCompare(`${b.classification}|${b.month}`));
}

function dailyBreakdown(sessions, start, end, classification) {
  const filtered = sessions.filter((session) => session.attribution.classification === classification);
  const rows = new Map();
  for (const session of filtered) {
    for (const field of TOKEN_FIELDS) {
      for (const entry of contributionEntries(session, field)) {
        const timestamp = toTimestamp(entry.timestamp);
        if (timestamp < start || timestamp > end) continue;
        const day = new Date(timestamp).toISOString().slice(0, 10);
        if (!rows.has(day)) rows.set(day, { day, sessions: new Set(), metrics: Object.fromEntries(TOKEN_FIELDS.map((name) => [name, 0])) });
        const row = rows.get(day);
        row.sessions.add(session.session_id);
        row.metrics[field] += entry.value;
      }
    }
  }
  return [...rows.values()].map((row) => ({
    day: row.day,
    sessions: row.sessions.size,
    ...Object.fromEntries(TOKEN_FIELDS.map((field) => [field, row.metrics[field]])),
  })).sort((a, b) => a.day.localeCompare(b.day));
}

function modelBreakdown(sessions, classification) {
  const groups = new Map();
  for (const session of sessions.filter((item) => item.attribution.classification === classification)) {
    const models = Array.isArray(session.models) && session.models.length ? session.models : [NA];
    const key = models.length === 1 ? models[0] : "MULTIPLE_MODELS";
    addMetricRow(groups, key, session, tokenValues(session));
  }
  return [...groups.entries()].map(([key, row]) => ({ model: key, ...finalizeGroupedRow(key, row) })).sort((a, b) => a.model.localeCompare(b.model));
}

function cacheShare(aggregate) {
  const input = aggregate.fields.input_tokens;
  const cached = aggregate.fields.cached_input_tokens;
  if (!isNumber(input?.value) || !isNumber(cached?.value) || input.value < 0 || cached.value < 0 || cached.value > input.value) {
    return { value: NA, coverage: 0, numerator: NA, denominator: NA };
  }
  const available = Math.min(input.availableSessionCount, cached.availableSessionCount);
  return {
    value: input.value === 0 ? NA : cached.value / input.value,
    coverage: aggregate.sessionCount ? available / aggregate.sessionCount : 0,
    numerator: cached.value,
    denominator: input.value,
  };
}

function allModels(sessions) {
  return [...new Set(sessions.flatMap((session) => session.models || []))].sort();
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n") + "\n";
}

function summaryTotals(aggregate) {
  return Object.fromEntries(TOKEN_FIELDS.map((field) => [field, aggregate.fields[field].value]));
}

function compatibilityChecks(allSixMonth, cache) {
  const observedTotal = allSixMonth.fields.total_tokens.value;
  const observedInput = allSixMonth.fields.input_tokens.value;
  const observedCached = allSixMonth.fields.cached_input_tokens.value;
  const totalRatio = isNumber(observedTotal) ? observedTotal / 30_000_000_000 : null;
  const cacheRatio = isNumber(observedInput) && isNumber(observedCached) && observedInput > 0 ? observedCached / observedInput : null;
  return {
    previous30B: {
      status: "PARTIALLY_COMPATIBLE",
      observedTokens: observedTotal,
      referenceTokens: 30_000_000_000,
      observedAsShareOfReference: totalRatio,
      explanation: "The observed local rollout scope is 1.8748B tokens, 6.25% of 30B; the historical 30B point may cover the whole subscription and is not directly comparable.",
    },
    previous85PercentCache: {
      status: "PARTIALLY_COMPATIBLE",
      observedCachedShare: cacheRatio,
      referenceShare: 0.85,
      cacheShareCoverage: cache.coverage,
      explanation: "The coherent observed subset has a 97.36% cache share, but six of 39 sessions have no usable counters, so the whole six-month window is not proven.",
    },
  };
}

function independentCrossCheck(args) {
  return {
    status: args.externalStatus,
    tool: args.externalTool,
    version: args.externalVersion,
    comparableMetrics: [],
    result: "NA",
    note: args.externalNote,
    primaryEvidenceRemains: "artifacts/codex-usage/<timestamp>/normalized-sessions.json and telemetry-summary.json",
  };
}

function renderMarkdown(report, crossCheck) {
  const full = report.periods.FULL_LOCAL_HISTORY;
  const six = report.periods.REFERENCE_6_MONTH_WINDOW;
  const clean = report.cleanmymap;
  const lines = [
    "# CleanMyMap Codex usage attribution",
    "",
    "This audit uses only the normalized Lot A artifacts and metadata. Prompts, responses and file contents are not read or emitted.",
    "",
    `- primary source: ${report.primarySource}`,
    `- first available trace: ${report.firstAvailableTrace}`,
    `- last available trace: ${report.lastAvailableTrace}`,
    `- classifications: ${JSON.stringify(report.classificationCounts)}`,
    "",
    "## CLEANMYMAP totals",
    "",
    "| scope | input | cached input | uncached input | cache write | output | reasoning output | total |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    `| FULL_LOCAL_HISTORY | ${clean.FULL_LOCAL_HISTORY.input_tokens} | ${clean.FULL_LOCAL_HISTORY.cached_input_tokens} | ${clean.FULL_LOCAL_HISTORY.uncached_input_tokens} | ${clean.FULL_LOCAL_HISTORY.cache_write_input_tokens} | ${clean.FULL_LOCAL_HISTORY.output_tokens} | ${clean.FULL_LOCAL_HISTORY.reasoning_output_tokens} | ${clean.FULL_LOCAL_HISTORY.total_tokens} |`,
    `| REFERENCE_6_MONTH_WINDOW | ${clean.REFERENCE_6_MONTH_WINDOW.input_tokens} | ${clean.REFERENCE_6_MONTH_WINDOW.cached_input_tokens} | ${clean.REFERENCE_6_MONTH_WINDOW.uncached_input_tokens} | ${clean.REFERENCE_6_MONTH_WINDOW.cache_write_input_tokens} | ${clean.REFERENCE_6_MONTH_WINDOW.output_tokens} | ${clean.REFERENCE_6_MONTH_WINDOW.reasoning_output_tokens} | ${clean.REFERENCE_6_MONTH_WINDOW.total_tokens} |`,
    "",
    "## All classified totals",
    "",
    `- ALL_PROJECTS_TOTAL: ${JSON.stringify(report.allProjectsTotal)}`,
    `- CLEANMYMAP_SHARE_OF_ALL_CODEX_USAGE: ${report.shares.CLEANMYMAP_SHARE_OF_ALL_CODEX_USAGE}`,
    `- OTHER_PROJECT_SHARE: ${report.shares.OTHER_PROJECT_SHARE}`,
    `- AMBIGUOUS_SHARE: ${report.shares.AMBIGUOUS_SHARE}`,
    `- TRACE_COVERAGE: ${JSON.stringify(report.traceCoverage)}`,
    "",
    "## Cache",
    "",
    `- CACHE_SHARE_OF_INPUT (CLEANMYMAP): ${JSON.stringify(report.cleanmymapCacheShare)}`,
    `- CACHE_SHARE_COVERAGE (CLEANMYMAP): ${report.cleanmymapCacheShare.coverage}`,
    `- CACHE_SHARE_OF_INPUT (ALL_PROJECTS): ${JSON.stringify(report.cacheShare)}`,
    "",
    "## Monthly breakdown",
    "",
    "| scope | classification | month | sessions | input | cached input | uncached input | cache write | output | reasoning output | total |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.monthlyBreakdown.map((row) => `| ${row.scope} | ${row.classification} | ${row.month} | ${row.sessions} | ${row.input} | ${row.cachedInput} | ${row.uncachedInput} | ${row.cacheWriteInput} | ${row.output} | ${row.reasoningOutput} | ${row.total} |`),
    "",
    "## External cross-check",
    "",
    `- ${JSON.stringify(crossCheck)}`,
    "",
    "## Historical observations",
    "",
    `- PREVIOUS_30B_COMPATIBILITY: ${report.historicalCompatibility.previous30B.status} — ${report.historicalCompatibility.previous30B.explanation}`,
    `- PREVIOUS_85_PERCENT_CACHE_COMPATIBILITY: ${report.historicalCompatibility.previous85PercentCache.status} — ${report.historicalCompatibility.previous85PercentCache.explanation}`,
    "",
    "## Limitations",
    "",
    "- Full history means the first and last available local traces, not subscription lifetime.",
    "- Six sessions have no usable token counters and are not interpreted as zero.",
    "- Token attribution to a model is exact only at session granularity; multi-model sessions are kept in MULTIPLE_MODELS.",
    "- No environmental conversion or public report file was modified.",
    "",
  ];
  return lines.join("\n");
}

function writeArtifacts(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const crossCheck = report.externalCrossCheck;
  fs.writeFileSync(path.join(outputDir, "project-attribution.json"), `${JSON.stringify(report.attribution, null, 2)}\n`);
  const projectRows = report.projectBreakdown.map((row) => ({
    ...row,
    ...Object.fromEntries(TOKEN_FIELDS.map((field) => [field, row[field]?.value ?? NA])),
    models: row.models.join(";"),
  }));
  fs.writeFileSync(path.join(outputDir, "project-breakdown.csv"), toCsv(projectRows, [
    "classification", "projectPath", "gitRoot", "gitOrigin", "sessionCount", "input_tokens", "cached_input_tokens", "uncached_input_tokens", "cache_write_input_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens", "firstSeen", "lastSeen", "models",
  ]).replaceAll(",", ","));
  const monthly = report.monthlyBreakdown.map((row) => ({ ...row, models: undefined }));
  fs.writeFileSync(path.join(outputDir, "monthly-breakdown.csv"), toCsv(monthly, [
    "scope", "classification", "month", "sessions", "input", "cachedInput", "uncachedInput", "cacheWriteInput", "output", "reasoningOutput", "total",
  ]));
  fs.writeFileSync(path.join(outputDir, "cleanmymap-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "cleanmymap-audit.md"), `${renderMarkdown(report, crossCheck)}\n`);
  fs.writeFileSync(path.join(outputDir, "cross-check.json"), `${JSON.stringify(crossCheck, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, "cross-check.md"), `# External cross-check\n\n${JSON.stringify(crossCheck, null, 2)}\n`);
}

function loadPrimaryArtifacts(inputDir) {
  const required = ["normalized-sessions.json", "schema-audit.json", "telemetry-summary.json"];
  const loaded = {};
  for (const file of required) {
    const filePath = path.join(inputDir, file);
    if (!fs.existsSync(filePath)) throw new Error(`Missing Lot A artifact: ${filePath}`);
    loaded[file] = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
  const sessions = loaded["normalized-sessions.json"].sessions;
  if (!Array.isArray(sessions) || sessions.length === 0) throw new Error("Lot A normalized-sessions.json has no sessions");
  if (loaded["telemetry-summary.json"].deduplication?.uniqueSessions !== sessions.length) throw new Error("Lot A artifacts are incoherent: session count mismatch");
  return loaded;
}

function classifyAndAggregate(artifacts, args) {
  const sessions = artifacts["normalized-sessions.json"].sessions.map((session) => ({
    session_id: session.session_id,
    start: session.start,
    end: session.end,
    cwd: session.cwd || null,
    models: Array.isArray(session.models) ? session.models : [],
    git: session.git || {},
    tokenReconstruction: session.tokenReconstruction || {},
    attribution: classifySession(session, args),
  }));
  const byClass = Object.fromEntries(["CLEANMYMAP", "OTHER_PROJECT", "AMBIGUOUS"].map((classification) => [classification, sessions.filter((session) => session.attribution.classification === classification)]));
  const full = aggregateContributions(sessions, toTimestamp(artifacts["telemetry-summary.json"].firstAvailableTrace), toTimestamp(artifacts["telemetry-summary.json"].lastAvailableTrace));
  const six = aggregateContributions(sessions, toTimestamp(REFERENCE_WINDOW.start), toTimestamp(REFERENCE_WINDOW.end));
  const cleanFull = aggregateContributions(byClass.CLEANMYMAP, toTimestamp(artifacts["telemetry-summary.json"].firstAvailableTrace), toTimestamp(artifacts["telemetry-summary.json"].lastAvailableTrace));
  const cleanSix = aggregateContributions(byClass.CLEANMYMAP, toTimestamp(REFERENCE_WINDOW.start), toTimestamp(REFERENCE_WINDOW.end));
  const allTotals = summaryTotals(six);
  const fullClassTotals = Object.fromEntries(Object.entries(byClass).map(([classification, items]) => [classification, summaryTotals(aggregateContributions(items, toTimestamp(artifacts["telemetry-summary.json"].firstAvailableTrace), toTimestamp(artifacts["telemetry-summary.json"].lastAvailableTrace)))]));
  const classTotals = Object.fromEntries(Object.entries(byClass).map(([classification, items]) => [classification, summaryTotals(aggregateContributions(items, toTimestamp(REFERENCE_WINDOW.start), toTimestamp(REFERENCE_WINDOW.end)))]));
  const observedTotal = allTotals.total_tokens;
  const shares = Object.fromEntries(Object.entries(classTotals).map(([classification, totals]) => [classification, isNumber(observedTotal) && isNumber(totals.total_tokens) && observedTotal > 0 ? totals.total_tokens / observedTotal : NA]));
  const fullTotalTokens = full.fields.total_tokens.value;
  const fullShares = Object.fromEntries(Object.entries(fullClassTotals).map(([classification, totals]) => [classification, isNumber(fullTotalTokens) && isNumber(totals.total_tokens) && fullTotalTokens > 0 ? totals.total_tokens / fullTotalTokens : NA]));
  const allCacheShare = cacheShare(six);
  const cleanmymapCacheShare = cacheShare(cleanSix);
  const externalCrossCheck = independentCrossCheck(args);
  const report = {
    schemaVersion: "codex-usage-attribution-v1",
    generatedAt: new Date().toISOString(),
    primarySource: path.resolve(args.inputDir),
    firstAvailableTrace: artifacts["telemetry-summary.json"].firstAvailableTrace,
    lastAvailableTrace: artifacts["telemetry-summary.json"].lastAvailableTrace,
    periods: { FULL_LOCAL_HISTORY: full, REFERENCE_6_MONTH_WINDOW: six },
    classificationCounts: Object.fromEntries(Object.entries(byClass).map(([key, value]) => [key, value.length])),
    classificationEvidence: "cwd, Git root and repository origin only; no prompts or responses read",
    attribution: sessions.map((session) => ({
      session_id: session.session_id,
      start: session.start,
      end: session.end,
      models: session.models,
      tokenQuality: session.tokenReconstruction.quality?.status || NA,
      tokenValues: tokenValues(session),
      attribution: session.attribution,
    })),
    allProjectsTotal: allTotals,
    totalsByPeriod: {
      FULL_LOCAL_HISTORY: { ALL_PROJECTS_TOTAL: summaryTotals(full), CLEANMYMAP_TOTAL: fullClassTotals.CLEANMYMAP, OTHER_PROJECT_TOTAL: fullClassTotals.OTHER_PROJECT, AMBIGUOUS_TOTAL: fullClassTotals.AMBIGUOUS },
      REFERENCE_6_MONTH_WINDOW: { ALL_PROJECTS_TOTAL: allTotals, CLEANMYMAP_TOTAL: classTotals.CLEANMYMAP, OTHER_PROJECT_TOTAL: classTotals.OTHER_PROJECT, AMBIGUOUS_TOTAL: classTotals.AMBIGUOUS },
    },
    cleanmymap: {
      FULL_LOCAL_HISTORY: summaryTotals(cleanFull),
      REFERENCE_6_MONTH_WINDOW: summaryTotals(cleanSix),
      fields: { FULL_LOCAL_HISTORY: cleanFull.fields, REFERENCE_6_MONTH_WINDOW: cleanSix.fields },
    },
    otherProjectTotal: classTotals.OTHER_PROJECT,
    ambiguousTotal: classTotals.AMBIGUOUS,
    shares: {
      CLEANMYMAP_SHARE_OF_ALL_CODEX_USAGE: shares.CLEANMYMAP,
      OTHER_PROJECT_SHARE: shares.OTHER_PROJECT,
      AMBIGUOUS_SHARE: shares.AMBIGUOUS,
      denominator: "observed REFERENCE_6_MONTH_WINDOW total_tokens; sessions with missing counters are excluded from numeric sums",
    },
    sharesByPeriod: {
      FULL_LOCAL_HISTORY: { CLEANMYMAP: fullShares.CLEANMYMAP, OTHER_PROJECT: fullShares.OTHER_PROJECT, AMBIGUOUS: fullShares.AMBIGUOUS },
      REFERENCE_6_MONTH_WINDOW: { CLEANMYMAP: shares.CLEANMYMAP, OTHER_PROJECT: shares.OTHER_PROJECT, AMBIGUOUS: shares.AMBIGUOUS },
    },
    cacheShare: allCacheShare,
    cleanmymapCacheShare,
    traceCoverage: artifacts["telemetry-summary.json"].sixMonthWindowCoverage,
    modelBreakdown: modelBreakdown(sessions, "CLEANMYMAP"),
    projectBreakdown: projectBreakdown(sessions),
    monthlyBreakdown: [
      ...monthlyBreakdown(sessions, toTimestamp(artifacts["telemetry-summary.json"].firstAvailableTrace), toTimestamp(artifacts["telemetry-summary.json"].lastAvailableTrace), "FULL_LOCAL_HISTORY"),
      ...monthlyBreakdown(sessions, toTimestamp(REFERENCE_WINDOW.start), toTimestamp(REFERENCE_WINDOW.end), "REFERENCE_6_MONTH_WINDOW"),
    ],
    cleanmymapDailyBreakdown: dailyBreakdown(sessions, toTimestamp(REFERENCE_WINDOW.start), toTimestamp(REFERENCE_WINDOW.end), "CLEANMYMAP"),
    historicalCompatibility: compatibilityChecks(six, allCacheShare),
    externalCrossCheck,
    sourceSchema: {
      schemaAudit: artifacts["schema-audit.json"].schemaVersion || "lot-A-schema-audit",
      tokenFields: artifacts["schema-audit.json"].tokenFields,
      observedTokenSources: artifacts["schema-audit.json"].observedTokenSources,
    },
    limitations: [
      "The local trace starts on 2026-07-11; no zero-usage inference is made for earlier months.",
      "Six sessions have no usable counters.",
      "Sessions with multiple models are not split between models.",
      "External tool attempt did not expose comparable metrics.",
    ],
  };
  return report;
}

export {
  aggregateContributions,
  classifySession,
  classifyAndAggregate,
  loadPrimaryArtifacts,
  normalizeOrigin,
  normalizePath,
  parseArgs,
  projectBreakdown,
  tokenValues,
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (!args.inputDir || !args.outputDir) throw new Error("--input-dir and --output-dir are required");
  const artifacts = loadPrimaryArtifacts(args.inputDir);
  const report = classifyAndAggregate(artifacts, args);
  writeArtifacts(report, args.outputDir);
  console.log(JSON.stringify({ outputDir: path.resolve(args.outputDir), sessions: report.attribution.length, classificationCounts: report.classificationCounts, externalCrossCheck: report.externalCrossCheck.status }, null, 2));
}
