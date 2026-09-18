#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const NA = "NA";
export const TOKEN_FIELDS = [
  "input_tokens",
  "cached_input_tokens",
  "cache_write_input_tokens",
  "output_tokens",
  "reasoning_output_tokens",
  "total_tokens",
];
export const DERIVED_TOKEN_FIELDS = ["uncached_input_tokens"];
export const ALL_TOKEN_FIELDS = [...TOKEN_FIELDS.slice(0, 3), ...DERIVED_TOKEN_FIELDS, ...TOKEN_FIELDS.slice(3)];

const DEFAULT_ROOT = path.join(os.homedir(), ".codex");
const WINDOW_START = "2026-03-18T00:00:00.000Z";
const WINDOW_END = "2026-09-18T23:59:59.000Z";
const CONTENT_KEYS = new Set([
  "aggregated_output", "arguments", "body", "cmd", "command", "content",
  "formatted_output", "input", "message", "output", "prompt", "raw_content",
  "stderr", "stdout", "summary", "summary_text", "text", "unified_diff",
]);

function parseArgs(argv) {
  const options = { root: DEFAULT_ROOT, format: "markdown", outputDir: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--root" && next) {
      options.root = path.resolve(next);
      index += 1;
    } else if (arg === "--format" && next) {
      options.format = next;
      index += 1;
    } else if (arg === "--json") {
      options.format = "json";
    } else if (arg === "--output-dir" && next) {
      options.outputDir = path.resolve(next);
      index += 1;
    } else if (arg === "--current-head" && next) {
      options.currentHead = next;
      index += 1;
    }
  }
  return options;
}

function safeIso(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function relativeRootPath(filePath, rootDir) {
  const relative = path.relative(rootDir, filePath).split(path.sep).join("/");
  return relative ? "~/.codex/" + relative : "~/.codex";
}

function provenanceFor(filePath) {
  const normalized = filePath.split(path.sep).join("/");
  if (normalized.includes("/archived_sessions/")) return "archived";
  if (normalized.includes("/sessions/")) return "active";
  if (normalized.includes("/rollout-backups/")) return "backup";
  return "other";
}

export function walkFiles(rootDir) {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile() && entry.name.startsWith("rollout-") && entry.name.endsWith(".jsonl")) files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function walkJsonlFiles(rootDir) {
  const files = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function safeSchemaKeys(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value).filter((key) => !CONTENT_KEYS.has(key)).sort();
}

function schemaSignature(value) {
  return safeSchemaKeys(value).join(",");
}

function readJsonlFile(filePath, rootDir) {
  let raw;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
  const events = [];
  let invalidJsonLines = 0;
  let lineCount = 0;
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    lineCount += 1;
    try {
      events.push({ event: JSON.parse(line), lineNumber: index + 1 });
    } catch {
      invalidJsonLines += 1;
    }
  }
  return {
    filePath,
    relativePath: relativeRootPath(filePath, rootDir),
    provenance: provenanceFor(filePath),
    events,
    lineCount,
    invalidJsonLines,
  };
}

function metadataFromEvent(event) {
  const payload = event?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const result = {};
  if (typeof payload.session_id === "string") result.sessionId = payload.session_id;
  if (typeof payload.cwd === "string") result.cwd = payload.cwd;
  if (typeof payload.model === "string") result.models = [payload.model];
  if (payload.git && typeof payload.git === "object") {
    result.git = {};
    for (const key of ["repository_url", "branch", "commit_hash"]) {
      if (typeof payload.git[key] === "string") result.git[key] = payload.git[key];
    }
  }
  return result;
}

function filenameIdentity(filePath) {
  const matches = path.basename(filePath).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
  return matches?.[0] ?? null;
}

function inferFileIdentity(file) {
  for (const { event } of file.events) {
    const metadata = metadataFromEvent(event);
    if (metadata.sessionId) return { identity: metadata.sessionId, source: "event.session_id" };
  }
  const filenameId = filenameIdentity(file.filePath);
  if (filenameId) return { identity: filenameId, source: "filename" };
  const basis = file.events.map(({ event }) => {
    const metadata = metadataFromEvent(event);
    return [event.type, event.timestamp, event.ordinal, metadata.cwd, metadata.models?.join(",")].join("|");
  }).slice(0, 5).join("\n");
  return {
    identity: "derived:" + createHash("sha256").update(basis).digest("hex").slice(0, 24),
    source: "metadata-hash",
  };
}

function eventKey(event) {
  if (Number.isFinite(event.ordinal)) return event.type + ":ordinal:" + event.ordinal;
  const payload = event.payload;
  const stableId = payload && typeof payload === "object" ? payload.id ?? payload.call_id ?? payload.response_id : null;
  if (stableId) return event.type + ":id:" + stableId;
  return event.type + ":timestamp:" + (event.timestamp ?? NA) + ":hash:" + createHash("sha256").update(JSON.stringify(event)).digest("hex");
}

function eventScore(event) {
  const payload = event?.payload;
  if (!payload || typeof payload !== "object") return 0;
  let score = 0;
  if (event.type === "session_meta") score += 4;
  if (event.type === "token_usage_record") score += 4;
  if (payload.thread_token_usage) score += 3;
  if (payload.total_token_usage) score += 3;
  if (payload.info?.total_token_usage) score += 3;
  return score + Object.keys(payload).length / 100;
}

function mergeSessionFiles(files) {
  const eventMap = new Map();
  let duplicateEvents = 0;
  for (const file of files) {
    for (const { event } of file.events) {
      const key = eventKey(event);
      const existing = eventMap.get(key);
      if (!existing) eventMap.set(key, event);
      else {
        duplicateEvents += 1;
        if (eventScore(event) > eventScore(existing)) eventMap.set(key, event);
      }
    }
  }
  const events = [...eventMap.values()].sort((a, b) => {
    if (Number.isFinite(a.ordinal) && Number.isFinite(b.ordinal)) return a.ordinal - b.ordinal;
    return String(a.timestamp ?? "").localeCompare(String(b.timestamp ?? ""));
  });
  return { events, duplicateEvents };
}

function collectSessionMetadata(events) {
  const timestamps = events.map((event) => safeIso(event.timestamp)).filter(Boolean).sort();
  const models = new Set();
  const eventTypes = new Set();
  const schemaVariants = new Map();
  let cwd = null;
  let git = {};
  let sessionId = null;
  for (const event of events) {
    eventTypes.add(event.type ?? "<missing>");
    const payload = event.payload;
    if (event.type && payload && typeof payload === "object") {
      const variant = schemaSignature(payload);
      if (!schemaVariants.has(event.type)) schemaVariants.set(event.type, new Map());
      const variants = schemaVariants.get(event.type);
      variants.set(variant, (variants.get(variant) ?? 0) + 1);
    }
    const metadata = metadataFromEvent(event);
    if (metadata.sessionId) sessionId ??= metadata.sessionId;
    if (metadata.cwd && !cwd) cwd = metadata.cwd;
    for (const model of metadata.models ?? []) models.add(model);
    if (metadata.git && Object.keys(metadata.git).length > 0) git = { ...git, ...metadata.git };
  }
  return {
    sessionId,
    start: timestamps[0] ?? null,
    end: timestamps.at(-1) ?? null,
    models: [...models].sort(),
    cwd: cwd ?? NA,
    git: Object.keys(git).length > 0 ? git : NA,
    eventTypes: [...eventTypes].sort(),
    schemaVariants: Object.fromEntries([...schemaVariants].sort().map(([type, variants]) => [type, Object.fromEntries([...variants].sort())])),
  };
}

function emptyCounterStats() {
  return { present: 0, missing: 0, decreases: 0, repeats: 0 };
}

function addContribution(target, field, timestamp, value) {
  if (!Number.isFinite(value)) return;
  target[field] ??= [];
  target[field].push({ timestamp, value });
}

export function reconstructCumulativeSeries(records, sourceKey) {
  const values = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, NA]));
  const contributions = {};
  const stats = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, emptyCounterStats()]));
  const previous = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, null]));
  const totals = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, 0]));
  for (const record of records) {
    const source = record.event?.payload?.[sourceKey];
    if (!source || typeof source !== "object") continue;
    const timestamp = safeIso(record.event.timestamp);
    for (const field of TOKEN_FIELDS) {
      const value = source[field];
      if (!Number.isFinite(value)) {
        stats[field].missing += 1;
        continue;
      }
      stats[field].present += 1;
      const previousValue = previous[field];
      let delta = value;
      if (previousValue !== null) {
        if (value < previousValue) stats[field].decreases += 1;
        else delta = value - previousValue;
        if (value === previousValue) stats[field].repeats += 1;
      }
      totals[field] += delta;
      previous[field] = value;
      if (timestamp) addContribution(contributions, field, timestamp, delta);
    }
  }
  for (const field of TOKEN_FIELDS) {
    if (stats[field].present > 0) values[field] = totals[field];
  }
  return { values, contributions, stats, semantics: "cumulative_counter_with_reset_detection" };
}

function reconstructDirectUsage(records) {
  const values = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, NA]));
  const contributions = {};
  const stats = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, emptyCounterStats()]));
  const totals = Object.fromEntries(TOKEN_FIELDS.map((field) => [field, 0]));
  for (const record of records) {
    const source = record.event?.payload?.usage;
    if (!source || typeof source !== "object") continue;
    const timestamp = safeIso(record.event.timestamp);
    for (const field of TOKEN_FIELDS) {
      const value = source[field];
      if (!Number.isFinite(value)) {
        stats[field].missing += 1;
        continue;
      }
      stats[field].present += 1;
      totals[field] += value;
      if (timestamp) addContribution(contributions, field, timestamp, value);
    }
  }
  for (const field of TOKEN_FIELDS) {
    if (stats[field].present > 0) values[field] = totals[field];
  }
  return { values, contributions, stats, semantics: "per_event_delta" };
}

function validateTotal(records, sourceKey) {
  let checked = 0;
  let inconsistent = 0;
  for (const record of records) {
    const source = record.event?.payload?.[sourceKey];
    if (!source || typeof source !== "object") continue;
    if (["input_tokens", "output_tokens", "total_tokens"].every((field) => Number.isFinite(source[field]))) {
      checked += 1;
      if (source.total_tokens !== source.input_tokens + source.output_tokens) inconsistent += 1;
    }
  }
  return { checked, inconsistent };
}

function deriveUncachedInput(reconstruction) {
  const input = reconstruction.values.input_tokens;
  const cached = reconstruction.values.cached_input_tokens;
  if (typeof input !== "number" || typeof cached !== "number" || input < cached) return;
  reconstruction.values.uncached_input_tokens = input - cached;
  const inputContributions = reconstruction.contributions.input_tokens ?? [];
  const cachedContributions = reconstruction.contributions.cached_input_tokens ?? [];
  reconstruction.contributions.uncached_input_tokens = inputContributions.map((item, index) => ({
    timestamp: item.timestamp,
    value: item.value - (cachedContributions[index]?.value ?? 0),
  })).filter((item) => item.value >= 0);
}

function buildTokenReconstruction(events) {
  const tokenRecords = events.filter((event) => event.type === "token_usage_record");
  const threadRecords = tokenRecords.filter((event) => event.payload?.thread_token_usage).map((event) => ({ event }));
  const infoRecords = events.filter((event) => event.type === "event_msg" && event.payload?.info?.total_token_usage).map((event) => ({
    event: { ...event, payload: { ...event.payload, total_token_usage: event.payload.info.total_token_usage } },
  }));
  const usageRecords = tokenRecords.filter((event) => event.payload?.usage).map((event) => ({ event }));
  let source = "none";
  let records = [];
  let reconstruction = {
    values: Object.fromEntries([...TOKEN_FIELDS, ...DERIVED_TOKEN_FIELDS].map((field) => [field, NA])),
    contributions: {},
    stats: Object.fromEntries(TOKEN_FIELDS.map((field) => [field, emptyCounterStats()])),
    semantics: "unavailable",
  };
  if (threadRecords.length > 0) {
    source = "token_usage_record.thread_token_usage";
    records = threadRecords;
    reconstruction = reconstructCumulativeSeries(records, "thread_token_usage");
  } else if (infoRecords.length > 0) {
    source = "event_msg.info.total_token_usage";
    records = infoRecords;
    reconstruction = reconstructCumulativeSeries(records, "total_token_usage");
  } else if (usageRecords.length > 0) {
    source = "token_usage_record.usage";
    records = usageRecords;
    reconstruction = reconstructDirectUsage(records);
  }
  if (source !== "none") {
    const sourceKey = source.endsWith("thread_token_usage") ? "thread_token_usage" : source.endsWith("total_token_usage") ? "total_token_usage" : "usage";
    const coherence = validateTotal(records, sourceKey);
    reconstruction.totalCoherence = coherence;
    if (coherence.inconsistent > 0) {
      reconstruction.values.total_tokens = NA;
      delete reconstruction.contributions.total_tokens;
    }
    if (reconstruction.values.total_tokens === NA && reconstruction.values.input_tokens !== NA && reconstruction.values.output_tokens !== NA && coherence.checked === 0) {
      reconstruction.values.total_tokens = reconstruction.values.input_tokens + reconstruction.values.output_tokens;
      reconstruction.formula = "input_tokens + output_tokens";
      reconstruction.contributions.total_tokens = (reconstruction.contributions.input_tokens ?? []).map((item, index) => ({
        timestamp: item.timestamp,
        value: item.value + (reconstruction.contributions.output_tokens?.[index]?.value ?? 0),
      }));
    } else {
      reconstruction.formula = "direct total_tokens; reasoning_output_tokens is a sub-detail of output_tokens";
    }
    deriveUncachedInput(reconstruction);
  }
  for (const field of DERIVED_TOKEN_FIELDS) {
    if (reconstruction.values[field] === undefined) reconstruction.values[field] = NA;
  }
  const missingFields = ALL_TOKEN_FIELDS.filter((field) => reconstruction.values[field] === NA);
  let status = "UNUSABLE";
  const reasons = [];
  if (source === "none") {
    reasons.push("no usable token counter or usage event observed");
  } else if (missingFields.length > 0 || reconstruction.totalCoherence?.inconsistent > 0) {
    status = "PARTIAL";
    if (missingFields.length > 0) reasons.push("missing metrics: " + missingFields.join(", "));
    if (reconstruction.totalCoherence?.inconsistent > 0) reasons.push("direct total_tokens was inconsistent with input_tokens + output_tokens");
  } else if (reconstruction.semantics === "cumulative_counter_with_reset_detection") {
    status = "DERIVED_FROM_CUMULATIVE_COUNTER";
  } else {
    status = "EXACT";
  }
  if (reconstruction.stats) {
    const resetCount = TOKEN_FIELDS.reduce((sum, field) => sum + reconstruction.stats[field].decreases, 0);
    if (resetCount > 0) reasons.push(resetCount + " counter decrease(s) handled as reset(s)");
  }
  return { ...reconstruction, source, sourceRecords: records.length, quality: { status, reasons } };
}

function aggregatePeriod(sessions, start, end) {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  const eligible = sessions.filter((session) => {
    if (!session.start || !session.end) return true;
    return Date.parse(session.start) <= endMs && Date.parse(session.end) >= startMs;
  });
  const fields = {};
  for (const field of ALL_TOKEN_FIELDS) {
    let value = 0;
    let availableSessionCount = 0;
    for (const session of eligible) {
      const contributions = session.tokenReconstruction.contributions[field];
      if (session.tokenReconstruction.values[field] === NA) continue;
      availableSessionCount += 1;
      for (const contribution of contributions ?? []) {
        const timestamp = Date.parse(contribution.timestamp);
        if (timestamp >= startMs && timestamp <= endMs) value += contribution.value;
      }
    }
    const missingSessionCount = eligible.length - availableSessionCount;
    fields[field] = {
      value: availableSessionCount > 0 ? value : NA,
      availableSessionCount,
      missingSessionCount,
      status: missingSessionCount > 0 ? "PARTIAL" : availableSessionCount > 0 ? "COMPLETE" : "NA",
    };
  }
  return { start, end, sessionsInWindow: eligible.length, fields };
}

function collectAuxiliaryAudit(rootDir) {
  return walkJsonlFiles(rootDir).filter((filePath) => !path.basename(filePath).startsWith("rollout-")).map((filePath) => {
    let raw = "";
    try {
      raw = readFileSync(filePath, "utf8");
    } catch {
      return { path: relativeRootPath(filePath, rootDir), status: "UNREADABLE" };
    }
    const keyCounts = new Map();
    let valid = 0;
    let invalid = 0;
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        valid += 1;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          for (const key of safeSchemaKeys(parsed)) keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
        }
      } catch {
        invalid += 1;
      }
    }
    const relativePath = relativeRootPath(filePath, rootDir);
    const name = path.basename(filePath);
    const reason = name === "session_index.jsonl"
      ? "metadata index without token counters"
      : name === "history.jsonl" || name === "transcription-history.jsonl"
        ? "content-bearing history excluded from telemetry"
        : "outside rollout source roots";
    return { path: relativePath, lines: valid + invalid, validJsonLines: valid, invalidJsonLines: invalid, keys: Object.fromEntries([...keyCounts].sort()), excludedReason: reason };
  });
}

function buildSchemaAudit(files, sessions, auxiliary) {
  const eventTypes = new Map();
  const schemas = new Map();
  let validJsonLines = 0;
  let invalidJsonLines = 0;
  for (const file of files) {
    validJsonLines += file.events.length;
    invalidJsonLines += file.invalidJsonLines;
    for (const { event } of file.events) {
      const type = event.type ?? "<missing>";
      eventTypes.set(type, (eventTypes.get(type) ?? 0) + 1);
      const signature = schemaSignature(event.payload);
      if (!schemas.has(type)) schemas.set(type, new Map());
      const variants = schemas.get(type);
      variants.set(signature, (variants.get(signature) ?? 0) + 1);
    }
  }
  return {
    source: "rollout-*.jsonl only; no prompt or response content is emitted",
    rawRolloutFiles: files.length,
    validJsonLines,
    invalidJsonLines,
    eventTypes: Object.fromEntries([...eventTypes].sort()),
    schemaVariants: Object.fromEntries([...schemas].sort().map(([type, variants]) => [type, Object.fromEntries([...variants].sort())])),
    tokenFields: TOKEN_FIELDS,
    observedTokenSources: [
      "token_usage_record.usage",
      "token_usage_record.turn_token_usage",
      "token_usage_record.thread_token_usage",
      "event_msg.info.last_token_usage",
      "event_msg.info.total_token_usage",
    ],
    auxiliaryJsonl: auxiliary,
    normalizedSessionCount: sessions.length,
  };
}

function summarizeSession(group) {
  const merged = mergeSessionFiles(group.files);
  const metadata = collectSessionMetadata(merged.events);
  const tokenReconstruction = buildTokenReconstruction(merged.events);
  const provenanceCounts = group.files.reduce((counts, file) => {
    counts[file.provenance] = (counts[file.provenance] ?? 0) + 1;
    return counts;
  }, {});
  return {
    session_id: metadata.sessionId ?? group.identity,
    rollout_identity: group.identity,
    start: metadata.start,
    end: metadata.end,
    models: metadata.models,
    cwd: metadata.cwd,
    git: metadata.git,
    provenance: {
      sources: Object.keys(provenanceCounts).sort(),
      counts: provenanceCounts,
      sourceFiles: group.files.map((file) => file.relativePath).sort(),
      duplicateSessionCopies: Math.max(0, group.files.length - 1),
      duplicateEventsRemoved: merged.duplicateEvents,
    },
    schema: { eventTypes: metadata.eventTypes, variants: metadata.schemaVariants },
    token_counters: tokenReconstruction.values,
    tokenReconstruction,
  };
}

export function analyzeRoot(rootDir = DEFAULT_ROOT, options = {}) {
  const filePaths = walkFiles(rootDir);
  const files = filePaths.map((filePath) => readJsonlFile(filePath, rootDir)).filter(Boolean);
  const groups = new Map();
  for (const file of files) {
    const inferred = inferFileIdentity(file);
    if (!groups.has(inferred.identity)) groups.set(inferred.identity, { identity: inferred.identity, files: [] });
    groups.get(inferred.identity).files.push(file);
  }
  const sessions = [...groups.values()].map(summarizeSession).sort((a, b) => String(a.start ?? "").localeCompare(String(b.start ?? "")) || a.rollout_identity.localeCompare(b.rollout_identity));
  const allTimestamps = sessions.flatMap((session) => [session.start, session.end]).filter(Boolean).sort();
  const first = allTimestamps[0] ?? null;
  const last = allTimestamps.at(-1) ?? null;
  const windowStartMs = Date.parse(WINDOW_START);
  const windowEndMs = Date.parse(WINDOW_END);
  const observedStartMs = first ? Math.max(Date.parse(first), windowStartMs) : null;
  const observedEndMs = last ? Math.min(Date.parse(last), windowEndMs) : null;
  const traceDays = new Set(sessions.flatMap((session) => {
    const days = [];
    if (!session.start || !session.end) return days;
    const start = new Date(session.start);
    const end = new Date(session.end);
    for (let cursor = new Date(start); cursor <= end && days.length < 400; cursor.setUTCDate(cursor.getUTCDate() + 1)) days.push(cursor.toISOString().slice(0, 10));
    return days;
  }));
  const windowSeconds = (windowEndMs - windowStartMs) / 1000 + 1;
  const observedSpanSeconds = observedStartMs !== null && observedEndMs !== null && observedEndMs >= observedStartMs ? (observedEndMs - observedStartMs) / 1000 + 1 : 0;
  const duplicateSessionCopies = files.length - sessions.length;
  const provenanceSessionCounts = sessions.reduce((counts, session) => {
    const sources = new Set(session.provenance.sources);
    if (sources.has("active") && !sources.has("archived")) counts.activeOnly += 1;
    if (sources.has("archived") && !sources.has("active")) counts.archivedOnly += 1;
    if (sources.has("active") && sources.has("archived")) counts.crossSource += 1;
    if (sources.has("backup") && sources.size === 1) counts.backupOnly += 1;
    return counts;
  }, { activeOnly: 0, archivedOnly: 0, crossSource: 0, backupOnly: 0 });
  const fullPeriod = aggregatePeriod(sessions, first ?? WINDOW_START, last ?? WINDOW_END);
  const referencePeriod = aggregatePeriod(sessions, WINDOW_START, WINDOW_END);
  const exactCount = sessions.filter((session) => session.tokenReconstruction.quality.status === "EXACT").length;
  const partialCount = sessions.filter((session) => session.tokenReconstruction.quality.status === "PARTIAL").length;
  const unusableCount = sessions.filter((session) => session.tokenReconstruction.quality.status === "UNUSABLE").length;
  const derivedCount = sessions.filter((session) => session.tokenReconstruction.quality.status === "DERIVED_FROM_CUMULATIVE_COUNTER").length;
  const schemaAudit = buildSchemaAudit(files, sessions, collectAuxiliaryAudit(rootDir));
  return {
    generatedAt: new Date().toISOString(),
    currentHead: options.currentHead ?? NA,
    firstAvailableTrace: first ?? NA,
    lastAvailableTrace: last ?? NA,
    traceSpanDays: first && last ? (Date.parse(last) - Date.parse(first)) / 86400000 : NA,
    sixMonthWindowCoverage: {
      status: first && last && Date.parse(first) <= windowStartMs && Date.parse(last) >= windowEndMs ? "FULL" : first && last ? "PARTIAL" : "NA",
      windowStart: WINDOW_START,
      windowEnd: WINDOW_END,
      observedStart: observedStartMs === null ? NA : new Date(observedStartMs).toISOString(),
      observedEnd: observedEndMs === null ? NA : new Date(observedEndMs).toISOString(),
      observedSpanPercent: Number(((observedSpanSeconds / windowSeconds) * 100).toFixed(3)),
      observedTraceDays: traceDays.size,
      missingLeadingPeriod: first && Date.parse(first) > windowStartMs ? { start: WINDOW_START, end: first } : null,
      missingTrailingPeriod: last && Date.parse(last) < windowEndMs ? { start: last, end: WINDOW_END } : null,
      note: "This is trace coverage, not evidence that uncovered periods had zero usage.",
    },
    deduplication: {
      rawRolloutFiles: files.length,
      uniqueSessions: sessions.length,
      duplicateSessionCopies,
      archivedOnlySessions: provenanceSessionCounts.archivedOnly,
      activeOnlySessions: provenanceSessionCounts.activeOnly,
      crossSourceDuplicateSessions: provenanceSessionCounts.crossSource,
      backupOnlySessions: provenanceSessionCounts.backupOnly,
    },
    schemaVariants: Object.keys(schemaAudit.schemaVariants),
    tokenCoverage: Object.fromEntries(ALL_TOKEN_FIELDS.map((field) => {
      const count = sessions.filter((session) => session.tokenReconstruction.values[field] !== undefined && session.tokenReconstruction.values[field] !== NA).length;
      return [field, { sessionsWithMetric: count, sessionsWithoutMetric: sessions.length - count, percent: Number(((count / sessions.length) * 100).toFixed(2)) }];
    })),
    quality: { exactSessionCount: exactCount, derivedFromCumulativeCounterSessionCount: derivedCount, partialSessionCount: partialCount, unusableSessionCount: unusableCount },
    fullHistoryTotals: fullPeriod,
    sixMonthTotals: referencePeriod,
    sessions,
    schemaAudit,
  };
}

export function escapeCell(value) {
  return String(value ?? "n/a").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(new RegExp(String.fromCharCode(96), "g"), "\\" + String.fromCharCode(96)).replace(/\r?\n/g, " ");
}

export function table(headers, rows) {
  const head = "| " + headers.map(escapeCell).join(" | ") + " |";
  const sep = "| " + headers.map(() => "---").join(" | ") + " |";
  const body = rows.map((row) => "| " + row.map(escapeCell).join(" | ") + " |");
  return [head, sep, ...body].join("\n");
}

function formatPeriodMarkdown(period) {
  return table(["metric", "value", "available sessions", "missing sessions", "status"], Object.entries(period.fields).map(([field, value]) => [field, value.value, value.availableSessionCount, value.missingSessionCount, value.status]));
}

export function printMarkdown(report) {
  const lines = [
    "# Local Codex telemetry",
    "",
    "This report contains metadata and token aggregates only; prompts, responses and file contents are excluded.",
    "",
    "- first available trace: " + report.firstAvailableTrace,
    "- last available trace: " + report.lastAvailableTrace,
    "- trace span days: " + report.traceSpanDays,
    "- six-month coverage: " + report.sixMonthWindowCoverage.status,
    "- raw rollout files: " + report.deduplication.rawRolloutFiles,
    "- unique sessions: " + report.deduplication.uniqueSessions,
    "- duplicate session copies: " + report.deduplication.duplicateSessionCopies,
    "- active-only sessions: " + report.deduplication.activeOnlySessions,
    "- archived-only sessions: " + report.deduplication.archivedOnlySessions,
    "- exact / derived / partial / unusable: " + report.quality.exactSessionCount + " / " + report.quality.derivedFromCumulativeCounterSessionCount + " / " + report.quality.partialSessionCount + " / " + report.quality.unusableSessionCount,
    "",
    "## FULL_LOCAL_HISTORY totals",
    "",
    formatPeriodMarkdown(report.fullHistoryTotals),
    "",
    "## REFERENCE_6_MONTH_WINDOW totals",
    "",
    formatPeriodMarkdown(report.sixMonthTotals),
    "",
    "## Coverage",
    "",
    report.sixMonthWindowCoverage.note,
    "",
    "## Limitations",
    "",
    "Uncovered periods are not interpreted as zero. No CLEANMYMAP, OTHER_PROJECT or AMBIGUOUS classification is performed in this lot.",
  ];
  console.log(lines.join("\n"));
}

export function writeArtifacts(report, outputDir) {
  mkdirSync(outputDir, { recursive: true });
  const normalized = {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    source: "local Codex rollout metadata and token aggregates",
    sessions: report.sessions,
  };
  const summary = { ...report };
  delete summary.sessions;
  delete summary.schemaAudit;
  writeFileSync(path.join(outputDir, "normalized-sessions.json"), JSON.stringify(normalized, null, 2) + "\n", "utf8");
  writeFileSync(path.join(outputDir, "schema-audit.json"), JSON.stringify(report.schemaAudit, null, 2) + "\n", "utf8");
  writeFileSync(path.join(outputDir, "telemetry-summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
  const markdown = [];
  const originalLog = console.log;
  console.log = (value = "") => markdown.push(String(value));
  try { printMarkdown(report); } finally { console.log = originalLog; }
  writeFileSync(path.join(outputDir, "telemetry-summary.md"), markdown.join("\n") + "\n", "utf8");
  return ["normalized-sessions.json", "schema-audit.json", "telemetry-summary.json", "telemetry-summary.md"].map((name) => path.join(outputDir, name));
}

export function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.root)) {
    console.error("Root directory not found: " + options.root);
    process.exitCode = 1;
    return;
  }
  const report = analyzeRoot(options.root, { currentHead: options.currentHead });
  if (options.outputDir) report.artifacts = writeArtifacts(report, options.outputDir);
  if (options.format === "json") console.log(JSON.stringify(report, null, 2));
  else printMarkdown(report);
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) main();
