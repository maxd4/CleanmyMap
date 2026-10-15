import { readFileSync } from "node:fs";
import path from "node:path";

import {
  NA,
  TOKEN_FIELDS,
  ALL_TOKEN_FIELDS,
  DEFAULT_ROOT,
  WINDOW_START,
  WINDOW_END,
  walkFiles,
  walkJsonlFiles,
  readJsonlFile,
  inferFileIdentity,
  relativeRootPath,
  safeSchemaKeys,
  schemaSignature,
  mergeSessionFiles,
  collectSessionMetadata,
} from "./summarize-jsonl-input.mjs";
import { buildTokenReconstruction } from "./summarize-jsonl-tokens.mjs";

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
    return { path: relativePath, lines: valid + invalid, validJsonLines: valid, invalidJsonLines: invalid, keys: Object.fromEntries([...keyCounts].sort(([left], [right]) => left.localeCompare(right, "en"))), excludedReason: reason };
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
    eventTypes: Object.fromEntries([...eventTypes].sort(([left], [right]) => left.localeCompare(right, "en"))),
    schemaVariants: Object.fromEntries([...schemas].sort(([left], [right]) => left.localeCompare(right, "en")).map(([type, variants]) => [type, Object.fromEntries([...variants].sort(([left], [right]) => left.localeCompare(right, "en")))])),
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
      sources: Object.keys(provenanceCounts).sort((left, right) => left.localeCompare(right, "en")),
      counts: provenanceCounts,
      sourceFiles: group.files.map((file) => file.relativePath).sort((left, right) => left.localeCompare(right, "en")),
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
  const allTimestamps = sessions.flatMap((session) => [session.start, session.end]).filter(Boolean).sort((left, right) => left.localeCompare(right, "en"));
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
    let cursor = new Date(start);
    while (cursor.getTime() <= end.getTime() && days.length < 400) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
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
