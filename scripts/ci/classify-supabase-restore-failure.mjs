import { readFile } from "node:fs/promises";

const CLASSIFICATIONS = Object.freeze([
  "role_or_privilege",
  "extension_or_feature",
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
  ["dependency_or_ordering", /undefined table|undefined column|relation .* does not exist|depends on|cannot drop/i],
  ["constraint_or_data", /violates .* constraint|duplicate key|invalid input syntax|foreign key|not-null|check constraint/i],
  ["syntax_or_format", /syntax error|unterminated|invalid command|invalid byte sequence|malformed/i],
];

export function classifyRestoreFailure(logText) {
  const text = String(logText ?? "");
  for (const [classification, pattern] of patterns) {
    if (pattern.test(text)) return classification;
  }
  return "unknown";
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
    process.stdout.write(`${classifyRestoreFailure(await readFile(logPath, "utf8"))}\n`);
  }
}
