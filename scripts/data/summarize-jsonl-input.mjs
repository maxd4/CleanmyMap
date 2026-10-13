import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

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

export {
  DEFAULT_ROOT,
  WINDOW_START,
  WINDOW_END,
  parseArgs,
  safeIso,
  relativeRootPath,
  walkJsonlFiles,
  safeSchemaKeys,
  schemaSignature,
  readJsonlFile,
  inferFileIdentity,
  mergeSessionFiles,
  collectSessionMetadata,
};
