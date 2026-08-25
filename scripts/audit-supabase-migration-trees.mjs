import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const repoRoot = process.cwd();

const canonicalDir = path.join(repoRoot, "apps", "web", "supabase", "migrations");
const forbiddenMirrorDir = path.join(repoRoot, "supabase", "migrations");

const HISTORICAL_TEMPORARY_EXTENSION_MIGRATIONS = new Set([
  "20260819142956_temp_enable_pg_net_for_benchmark_fetch.sql",
  "20260819143518_temp_disable_pg_net_after_benchmark_fetch.sql",
  "20260819154147_temporary_enable_http_for_benchmark_image_bridge.sql",
  "20260825130153_disable_temporary_http_extension.sql",
]);

// Keep this allowlist empty unless a migration and its documented exception
// have been reviewed together. Temporary benchmark/debug extension actions do
// not belong in the canonical replayable schema history.
const EXTENSION_CASCADE_ALLOWLIST = new Map();

if (!fs.existsSync(canonicalDir)) {
  console.error(
    `Supabase migration audit failed: missing ${path.relative(repoRoot, canonicalDir)}`,
  );
  process.exit(1);
}

if (fs.existsSync(forbiddenMirrorDir)) {
  console.error(
    [
      "Supabase migration audit failed: the deprecated root migration tree exists:",
      `- ${path.relative(repoRoot, forbiddenMirrorDir)}`,
      "Use apps/web/supabase/migrations/ as the only editable migration source.",
    ].join("\n"),
  );
  process.exit(2);
}

function readCanonicalMigrations(dir) {
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  return new Map(
    files.map((name) => {
      const content = fs.readFileSync(path.join(dir, name));
      const sha256 = crypto.createHash("sha256").update(content).digest("hex");
      return [name, { content: content.toString("utf8"), sha256, size: content.length }];
    }),
  );
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\r\n]*/g, "");
}

const canonical = readCanonicalMigrations(canonicalDir);
const duplicateVersions = [];
const versions = new Map();

for (const name of canonical.keys()) {
  const version = name.match(/^(\d+)_/)?.[1];
  if (!version) {
    continue;
  }

  const names = versions.get(version) ?? [];
  names.push(name);
  versions.set(version, names);
}

for (const [version, names] of versions) {
  if (names.length > 1) {
    duplicateVersions.push(`${version}: ${names.join(", ")}`);
  }
}

console.log("Supabase migration tree audit");
console.log(`- canonical files: ${canonical.size}`);
console.log("- root mirror: absent");
console.log(`- duplicate versions: ${duplicateVersions.length}`);

if (duplicateVersions.length > 0) {
  console.error("\nDuplicate Supabase migration versions:");
  for (const duplicate of duplicateVersions) {
    console.error(`- ${duplicate}`);
  }
  process.exit(2);
}

const migrationGuardViolations = [];

for (const [name, migration] of canonical) {
  const executableSql = stripSqlComments(migration.content);
  const hasExtensionOperation = /\b(?:create|drop)\s+extension\b/i.test(executableSql);
  const hasCascadeDrop = /\bdrop\s+extension\b[^;]*\bcascade\b/i.test(executableSql);
  const hasTemporaryMarker = /(?:temp(?:orary)?|benchmark|debug)/i.test(
    `${name}\n${migration.content}`,
  );

  if (hasCascadeDrop && !EXTENSION_CASCADE_ALLOWLIST.has(name)) {
    migrationGuardViolations.push(
      `${name}: DROP EXTENSION ... CASCADE is not allowed without a documented allowlist entry`,
    );
  }

  if (hasExtensionOperation && hasTemporaryMarker) {
    migrationGuardViolations.push(
      `${name}: temporary/benchmark/debug extension operations are not replayable schema migrations`,
    );
  }

  if (HISTORICAL_TEMPORARY_EXTENSION_MIGRATIONS.has(name)) {
    if (executableSql.trim().length > 0) {
      migrationGuardViolations.push(
        `${name}: historical temporary extension migration must remain a documented no-op`,
      );
    } else if (!/historical no-op/i.test(migration.content)) {
      migrationGuardViolations.push(
        `${name}: historical no-op must document migration-history alignment`,
      );
    }
  }
}

if (migrationGuardViolations.length > 0) {
  console.error("\nSupabase migration governance violations:");
  for (const violation of migrationGuardViolations) {
    console.error(`- ${violation}`);
  }
  process.exit(2);
}

console.log("\nOnly apps/web/supabase/migrations/ is editable.");
