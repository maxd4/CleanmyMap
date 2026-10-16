import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  createIndexRepositoryView,
  createRepositoryView,
  parseRepositoryRef,
} from "../checks/repository-view.mjs";
import { gitExecutable } from "../ci/git-executable.mjs";

const repoRoot = process.cwd();
const canonicalDir = "apps/web/supabase/migrations";
const forbiddenRootDir = "supabase";

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

// These two pending migrations were repaired after their first controlled
// replay exposed executable SQL defects. The exact candidate hashes are
// documented in ADR-006; no other published migration rewrite is accepted.
const APPROVED_PUBLISHED_REWRITE_HASHES = new Map([
  ["20261012000022_spogomi_ticket_roster_and_team_composition.sql", new Set(["c272820f66ff466d42d9c4dab0fdad685b482f54927fe1df9927233d6e7e9cf4"])],
  ["20261013000007_spogomi_post_lock_mutation_guards.sql", new Set(["f4ca930cce616753addfd047badb2b96448ad8aed665b92d68f44079fbe11f1d"])],
]);

function normalizeMigrationContent(content) {
  return Buffer.isBuffer(content) ? content.toString("utf8") : String(content);
}

function readCanonicalMigrations(view) {
  const files = view
    .listFiles(canonicalDir)
    .filter((file) => file.endsWith(".sql"))
    .map((file) => file.slice(`${canonicalDir}/`.length))
    .sort();

  return new Map(
    files.map((name) => {
      const content = normalizeMigrationContent(view.readBinary(`${canonicalDir}/${name}`));
      const sha256 = crypto.createHash("sha256").update(content, "utf8").digest("hex");
      return [name, { content, sha256, size: Buffer.byteLength(content, "utf8") }];
    }),
  );
}

export function findPublishedMigrationRewriteViolations({
  baselineMigrations,
  candidateMigrations,
  historicalContentsByPath = new Map(),
  approvedRewriteHashes = new Map(),
}) {
  const violations = [];
  for (const [name, baseline] of baselineMigrations) {
    const candidate = candidateMigrations.get(name);
    if (!candidate) {
      violations.push(`${name}: published migration deletion is not allowed`);
      continue;
    }
    const baselineContent = normalizeMigrationContent(baseline.content);
    const candidateContent = normalizeMigrationContent(candidate.content);
    if (candidateContent === baselineContent) continue;
    const historicalContents = historicalContentsByPath.get(name) ?? [];
    if (historicalContents.some((content) => normalizeMigrationContent(content) === candidateContent)) continue;
    const candidateHash = crypto.createHash("sha256").update(candidateContent, "utf8").digest("hex");
    if (approvedRewriteHashes.get(name)?.has(candidateHash)) continue;
    violations.push(
      `${name}: published migration content changed without restoring a previously published Git version`,
    );
  }
  return violations;
}

function readHistoricalMigrationContents(repoRoot, baseRef, migrationNames) {
  const contentsByPath = new Map();
  for (const name of migrationNames) {
    const path = `${canonicalDir}/${name}`;
    const commits = execFileSync(gitExecutable(), ["rev-list", baseRef, "--", path], {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((commit) => commit.trim())
      .filter(Boolean);
    contentsByPath.set(
      name,
      commits.map((commit) =>
        normalizeMigrationContent(execFileSync(gitExecutable(), ["show", `${commit}:${path}`], {
          cwd: repoRoot,
          encoding: "utf8",
        })),
      ),
    );
  }
  return contentsByPath;
}

function auditPublishedMigrationRewrites({ repoRoot, baseRef, candidateRef, staged }) {
  const baselineMigrations = readCanonicalMigrations(createRepositoryView({ root: repoRoot, ref: baseRef }));
  const candidateMigrations = staged
    ? readCanonicalMigrations(createIndexRepositoryView(repoRoot))
    : readCanonicalMigrations(createRepositoryView({ root: repoRoot, ref: candidateRef }));
  const changedMigrationNames = [...baselineMigrations.keys()].filter((name) => {
    const baseline = baselineMigrations.get(name);
    const candidate = candidateMigrations.get(name);
    return !candidate || normalizeMigrationContent(candidate.content) !== normalizeMigrationContent(baseline.content);
  });
  const historicalContentsByPath = readHistoricalMigrationContents(
    repoRoot,
    baseRef,
    changedMigrationNames,
  );
  return findPublishedMigrationRewriteViolations({
    baselineMigrations,
    candidateMigrations,
    historicalContentsByPath,
    approvedRewriteHashes: APPROVED_PUBLISHED_REWRITE_HASHES,
  });
}

function stripSqlComments(sql) {
  let output = "";
  let cursor = 0;
  while (cursor < sql.length) {
    const blockStart = sql.indexOf("/*", cursor);
    const lineStart = sql.indexOf("--", cursor);
    const nextStart = blockStart < 0 ? lineStart : lineStart < 0 ? blockStart : Math.min(blockStart, lineStart);
    if (nextStart < 0) {
      output += sql.slice(cursor);
      break;
    }
    output += sql.slice(cursor, nextStart);
    if (nextStart === lineStart) {
      const lineEnd = sql.indexOf("\n", nextStart + 2);
      cursor = lineEnd < 0 ? sql.length : lineEnd;
    } else {
      const blockEnd = sql.indexOf("*/", nextStart + 2);
      cursor = blockEnd < 0 ? sql.length : blockEnd + 2;
    }
  }
  return output;
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

  const reintroducedWritePolicy = normalizedSql.split(";").some((statement) =>
    /\bcreate\s+policy\b/i.test(statement) &&
    /\bon\s+public\.spots\b/i.test(statement) &&
    /\bfor\s+(?:insert|update|all)\b/i.test(statement),
  );
  if (reintroducedWritePolicy) {
    violations.push(
      `${name}: public.spots INSERT/UPDATE policies must not be reintroduced after legacy spots retirement`,
    );
  }

  const alteredPolicyStatements = normalizedSql.split(";").filter((statement) =>
    /\balter\s+policy\b/i.test(statement) && /\bon\s+public\.spots\b/i.test(statement),
  );
  for (const statement of alteredPolicyStatements) {
    const policyName = statement.trim().split(/\s+/)[2]?.replaceAll('"', "").toLowerCase() ?? "";
    if (policyName !== "spots_service_select") {
      violations.push(
        `${name}: public.spots policies other than spots_service_select must not be altered after legacy spots retirement`,
      );
    }
  }

  for (const statement of normalizedSql.split(";")) {
    const trimmedStatement = statement.trim();
    const lowerStatement = trimmedStatement.toLowerCase();
    if (!lowerStatement.startsWith("grant ")) continue;

    const onIndex = lowerStatement.indexOf(" on ", "grant ".length);
    if (onIndex < 0) continue;

    const privileges = trimmedStatement
      .slice("grant ".length, onIndex)
      .split(/\s+/)
      .filter((privilege) => !["privilege", "privileges"].includes(privilege.toLowerCase()))
      .join(" ")
      .split(",")
      .map((privilege) => {
        const trimmedPrivilege = privilege.trim();
        if (!trimmedPrivilege.endsWith(")")) return trimmedPrivilege.toLowerCase();

        const openParenthesis = trimmedPrivilege.lastIndexOf("(");
        const inner = openParenthesis < 0 ? "" : trimmedPrivilege.slice(openParenthesis + 1, -1);
        return openParenthesis >= 0 && !inner.includes(")")
          ? trimmedPrivilege.slice(0, openParenthesis).trim().toLowerCase()
          : trimmedPrivilege.toLowerCase();
      });

    let targetStart = onIndex + " on ".length;
    if (lowerStatement.startsWith("table ", targetStart)) targetStart += "table ".length;
    if (!lowerStatement.startsWith("public.spots", targetStart)) continue;

    const rolesStart = targetStart + "public.spots".length;
    const rolesTail = trimmedStatement.slice(rolesStart).trimStart();
    if (!rolesTail.toLowerCase().startsWith("to ")) continue;
    const roles = rolesTail.slice(2).trimStart().toLowerCase();
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

export function auditMigrationTree(view) {
  if (!view.exists(canonicalDir)) {
    return { status: 1, error: `Supabase migration audit failed: missing ${canonicalDir}` };
  }
  if (view.exists(forbiddenRootDir)) {
    return {
      status: 2,
      error: [
        "Supabase migration audit failed: the deprecated root Supabase namespace exists:",
        `- ${forbiddenRootDir}/`,
        "Remove the root namespace and use apps/web/supabase/migrations/ as the only editable migration source.",
      ].join("\n"),
    };
  }

  const canonical = readCanonicalMigrations(view);
  const duplicateVersions = [];
  const versions = new Map();
  for (const name of canonical.keys()) {
    const version = name.match(/^(\d+)_/)?.[1];
    if (!version) continue;
    const names = versions.get(version) ?? [];
    names.push(name);
    versions.set(version, names);
  }
  for (const [version, names] of versions) {
    if (names.length > 1) duplicateVersions.push(`${version}: ${names.join(", ")}`);
  }

  if (duplicateVersions.length > 0) {
    return { status: 2, canonicalCount: canonical.size, duplicateVersions };
  }

  const migrationGuardViolations = [];
  for (const [name, migration] of canonical) {
    const executableSql = stripSqlComments(migration.content);
    const normalizedSql = executableSql.replace(/\s+/g, " ");
    const hasExtensionOperation = /\b(?:create|drop)\s+extension\b/i.test(executableSql);
    const hasCascadeDrop = /\bdrop\s+extension\b[^;]*\bcascade\b/i.test(executableSql);
    const hasTemporaryMarker = /(?:temp(?:orary)?|benchmark|debug)/i.test(`${name}\n${migration.content}`);

    if (hasCascadeDrop && !EXTENSION_CASCADE_ALLOWLIST.has(name)) {
      migrationGuardViolations.push(`${name}: DROP EXTENSION ... CASCADE is not allowed without a documented allowlist entry`);
    }
    if (hasExtensionOperation && hasTemporaryMarker) {
      migrationGuardViolations.push(`${name}: temporary/benchmark/debug extension operations are not replayable schema migrations`);
    }
    if (HISTORICAL_TEMPORARY_EXTENSION_MIGRATIONS.has(name)) {
      if (executableSql.trim().length > 0) {
        migrationGuardViolations.push(`${name}: historical temporary extension migration must remain a documented no-op`);
      } else if (!/historical no-op/i.test(migration.content)) {
        migrationGuardViolations.push(`${name}: historical no-op must document migration-history alignment`);
      }
    }
    if (!LEGACY_SPOTS_RUNTIME_SURFACE_HISTORICAL_ALLOWLIST.has(name)) {
      migrationGuardViolations.push(...findLegacySpotsRuntimeSurfaceViolations(name, normalizedSql));
    }
  }

  return { status: migrationGuardViolations.length > 0 ? 2 : 0, canonicalCount: canonical.size, migrationGuardViolations };
}

function main() {
  const ref = parseRepositoryRef();
  const staged = process.argv.includes("--staged");
  const baseArgument = process.argv.find((value) => value.startsWith("--base-ref="));
  const baseRef = baseArgument ? baseArgument.slice("--base-ref=".length) : null;
  if (staged && (ref || baseRef)) {
    console.error("Supabase migration audit failed: --staged cannot be combined with Git refs.");
    process.exitCode = 2;
    return;
  }
  const view = staged
    ? createIndexRepositoryView(repoRoot)
    : createRepositoryView({ root: repoRoot, ref });
  const result = auditMigrationTree(view);
  if (result.error) {
    console.error(result.error);
    process.exitCode = result.status;
    return;
  }
  console.log("Supabase migration tree audit");
  console.log(`- canonical files: ${result.canonicalCount}`);
  console.log("- root mirror: absent");
  console.log(`- duplicate versions: ${result.duplicateVersions?.length ?? 0}`);
  if (result.duplicateVersions?.length) {
    console.error("\nDuplicate Supabase migration versions:");
    for (const duplicate of result.duplicateVersions) console.error(`- ${duplicate}`);
    process.exitCode = 2;
    return;
  }
  if (result.migrationGuardViolations.length > 0) {
    console.error("\nSupabase migration governance violations:");
    for (const violation of result.migrationGuardViolations) console.error(`- ${violation}`);
    process.exitCode = 2;
    return;
  }
  if (staged || baseRef) {
    const rewriteViolations = auditPublishedMigrationRewrites({
      repoRoot,
      baseRef: staged ? "HEAD" : baseRef,
      candidateRef: ref,
      staged,
    });
    if (rewriteViolations.length > 0) {
      console.error("\nPublished Supabase migration rewrite violations:");
      for (const violation of rewriteViolations) console.error(`- ${violation}`);
      process.exitCode = 2;
      return;
    }
    console.log(staged ? "- published migration history: staged changes preserve a Git-published version" : "- published migration history: candidate preserves Git-published versions");
  }
  console.log(`\nOnly apps/web/supabase/migrations/ is editable${ref ? ` for ref ${ref}` : ""}.`);
}

if (process.argv[1] && process.argv[1].endsWith("audit-supabase-migration-trees.mjs")) {
  main();
}
