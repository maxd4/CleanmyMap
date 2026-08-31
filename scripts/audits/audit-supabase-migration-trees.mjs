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

// These migrations are the only historical definitions of the legacy spots
// runtime surface. New migrations must not recreate the RPC or public write
// access after the archive-retirement migration.
const LEGACY_SPOTS_RUNTIME_SURFACE_HISTORICAL_ALLOWLIST = new Set([
  "20260402000001_initial_modern_schema.sql",
  "20260420000005_hardened_rls.sql",
  "20260501000023_atomic_operations.sql",
  "20260520200207_apply_remaining_supabase_advisory_hardening.sql",
  "20260605000006_optimize_rls_auth_initplan_and_sql_functions.sql",
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

export function findLegacySpotsRuntimeSurfaceViolations(name, normalizedSql) {
  const violations = [];

  if (
    /\b(?:create|alter)\s+(?:or\s+replace\s+)?function\s+public\.create_spot_with_progression\b/i.test(
      normalizedSql,
    )
  ) {
    violations.push(
      `${name}: create_spot_with_progression must not be reintroduced after legacy spots retirement`,
    );
  }

  if (
    /\bcreate\s+policy\b.*?\bon\s+public\.spots\b.*?\bfor\s+(?:insert|update|all)\b/i.test(
      normalizedSql,
    )
  ) {
    violations.push(
      `${name}: public.spots INSERT/UPDATE policies must not be reintroduced after legacy spots retirement`,
    );
  }

  const alteredPolicyMatches = normalizedSql.matchAll(
    /\balter\s+policy\s+("[^"]+"|[^\s]+)\s+on\s+public\.spots\b[^;]*;/gi,
  );
  for (const match of alteredPolicyMatches) {
    const policyName = match[1].replace(/^"|"$/g, "").toLowerCase();
    if (policyName !== "spots_service_select") {
      violations.push(
        `${name}: public.spots policies other than spots_service_select must not be altered after legacy spots retirement`,
      );
    }
  }

  const writeGrantMatch = normalizedSql.match(
    /\bgrant\s+([^;]+?)\s+on\s+(?:table\s+)?public\.spots\s+to\s+([^;]+)/i,
  );
  if (writeGrantMatch) {
    const privileges = writeGrantMatch[1]
      .replace(/\s+privileges?/gi, "")
      .split(",")
      .map((privilege) => privilege.trim().replace(/\s*\([^)]*\)\s*$/, "").toLowerCase());
    const roles = writeGrantMatch[2].toLowerCase();
    const hasWritePrivilege = privileges.some((privilege) =>
      ["all", "insert", "update", "delete", "truncate", "references", "trigger"].includes(
        privilege,
      ),
    );

    if (hasWritePrivilege && /\banon\b|\bauthenticated\b/.test(roles)) {
      violations.push(
        `${name}: public.spots write grants to anon/authenticated are not allowed after legacy spots retirement`,
      );
    }
  }

  return violations;
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
  const normalizedSql = executableSql.replace(/\s+/g, " ");
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

  if (!LEGACY_SPOTS_RUNTIME_SURFACE_HISTORICAL_ALLOWLIST.has(name)) {
    migrationGuardViolations.push(...findLegacySpotsRuntimeSurfaceViolations(name, normalizedSql));
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
