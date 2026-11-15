import { readFile } from "node:fs/promises";

const CLASSIFICATIONS = Object.freeze([
  "role_or_privilege",
  "extension_or_feature",
  "schema_conflict",
  "dependency_or_ordering",
  "constraint_or_data",
  "syntax_or_format",
  "connection_or_authentication",
  "unknown",
]);

const patterns = [
  ["connection_or_authentication", /password authentication failed|could not connect|connection refused|no pg_hba|role .* does not exist/i],
  ["role_or_privilege", /permission denied|must be owner|insufficient privilege|role .* cannot|grant|revoke/i],
  ["extension_or_feature", /extension .* does not exist|could not open extension control file|feature .* is not supported/i],
  ["schema_conflict", /already exists|duplicate table|duplicate schema|duplicate type/i],
  ["dependency_or_ordering", /undefined table|undefined column|relation .* does not exist|depends on|cannot drop/i],
  ["constraint_or_data", /violates .* constraint|duplicate key|invalid input syntax|foreign key|not-null|check constraint/i],
  ["syntax_or_format", /syntax error|unterminated|invalid command|invalid byte sequence|malformed/i],
];

export function classifyRestoreFailure(logText) {
  const sqlstate = extractRestoreSqlState(logText);
  if (sqlstate) return classifyRestoreSqlState(sqlstate);
  const text = String(logText ?? "");
  for (const [classification, pattern] of patterns) {
    if (pattern.test(text)) return classification;
  }
  return "unknown";
}

const SQLSTATE_CATEGORIES = Object.freeze([
  ["08", "connection_or_authentication"],
  ["28", "connection_or_authentication"],
  ["42501", "role_or_privilege"],
  ["0A", "extension_or_feature"],
  ["42704", "extension_or_feature"],
  ["42P07", "schema_conflict"],
  ["42P01", "dependency_or_ordering"],
  ["42703", "dependency_or_ordering"],
  ["42883", "dependency_or_ordering"],
  ["3F", "dependency_or_ordering"],
  ["2B", "dependency_or_ordering"],
  ["23505", "constraint_or_data"],
  ["23503", "constraint_or_data"],
  ["23502", "constraint_or_data"],
  ["23514", "constraint_or_data"],
  ["22P02", "constraint_or_data"],
  ["42601", "syntax_or_format"],
  ["22P04", "syntax_or_format"],
  ["22", "syntax_or_format"],
]);

export function extractRestoreSqlState(logText) {
  const text = String(logText ?? "");
  const errorLine = text.match(/^\s*(?:psql:[^:\r\n]+:\d+(?::\d+)?:\s+)?(?:ERROR|FATAL|PANIC):\s+(?:SQLSTATE\s*)?([0-9A-Z]{5})\b/im);
  if (errorLine) return errorLine[1].toUpperCase();
  const explicit = text.match(/^\s*(?:SQLSTATE\s*(?:=|:|\s)\s*)([0-9A-Z]{5})\b/im);
  return explicit?.[1]?.toUpperCase() ?? null;
}

export function classifyRestoreSqlState(sqlstate) {
  const code = String(sqlstate ?? "").toUpperCase();
  const match = SQLSTATE_CATEGORIES.find(([prefix]) => code === prefix || code.startsWith(prefix));
  return match?.[1] ?? "unknown";
}

export function diagnoseRestoreFailure(logText) {
  const sqlstate = extractRestoreSqlState(logText);
  return {
    sqlstate: sqlstate ?? "UNAVAILABLE",
    classification: sqlstate ? classifyRestoreSqlState(sqlstate) : classifyRestoreFailure(logText),
    signal: classifyRestoreSignal(logText, sqlstate),
  };
}

export function classifyRestoreSignal(logText, sqlstate = extractRestoreSqlState(logText)) {
  const text = String(logText ?? "");
  if (/unrecognized configuration parameter|invalid configuration parameter/i.test(text)) return "configuration_parameter";
  if (/role .* does not exist/i.test(text)) return "missing_role";
  if (/extension .* does not exist|could not open extension control file/i.test(text)) return "missing_extension";
  if (/must be owner|must be member of role|permission denied|insufficient privilege/i.test(text)) return "privilege_denied";
  if (sqlstate === "42704") return "undefined_object";
  if (sqlstate === "42501") return "privilege_denied";
  return "unspecified";
}

export function formatRestoreDiagnostic(logText) {
  const diagnostic = diagnoseRestoreFailure(logText);
  return `sqlstate=${diagnostic.sqlstate} classification=${diagnostic.classification} signal=${diagnostic.signal}`;
}

export function isRestoreClassification(value) {
  return CLASSIFICATIONS.includes(value);
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}`) {
  const logIndex = process.argv.indexOf("--log");
  const logPath = logIndex >= 0 ? process.argv[logIndex + 1] : undefined;
  if (!logPath) {
    console.error("Usage: node classify-supabase-restore-failure.mjs --log PATH");
    process.exitCode = 2;
  } else {
    process.stdout.write(`${formatRestoreDiagnostic(await readFile(logPath, "utf8"))}\n`);
  }
}
