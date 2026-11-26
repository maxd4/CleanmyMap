#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gitExecutable } from "../ci/git-executable.mjs";
import { splitSqlStatements } from "../ci/supabase-migration-sql.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const migrationsDirRelative = "apps/web/supabase/migrations";
const migrationPattern = /^(\d{14})_(.+)\.sql$/;

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function readGitHead(root = repoRoot) {
  return execFileSync(gitExecutable(), ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function listMigrations(root = repoRoot) {
  const dir = path.join(root, migrationsDirRelative);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => migrationPattern.test(name))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((name) => {
      const relPath = `${migrationsDirRelative}/${name}`;
      const sql = fs.readFileSync(path.join(dir, name), "utf8");
      const match = migrationPattern.exec(name);
      return { name, version: match[1], path: relPath, sql, hash: sha256(sql) };
    });
}

export function computeMigrationsDigest(migrations) {
  const manifest = migrations.map((m) => `${m.name}:${m.hash}`).join("\n");
  return sha256(manifest);
}

function normalizeObjectName(rawName, defaultSchema = "public") {
  const cleaned = String(rawName ?? "").replace(/"/g, "").trim();
  if (!cleaned) return null;
  if (cleaned.includes(".")) {
    const [schema, ...rest] = cleaned.split(".");
    return `${schema.toLowerCase()}.${rest.join(".").toLowerCase()}`;
  }
  return `${defaultSchema}.${cleaned.toLowerCase()}`;
}

function ensureEntry(map, key, base) {
  if (!map.has(key)) {
    map.set(key, {
      ...base,
      definedIn: null,
      modifiedIn: [],
      droppedIn: [],
      renamedFrom: [],
      dynamicSqlMentions: [],
      textualOccurrences: [],
    });
  }
  return map.get(key);
}

function recordDdlEvent(entry, migrationName, isCreate) {
  if (isCreate && !entry.definedIn) {
    entry.definedIn = migrationName;
  } else if (entry.definedIn !== migrationName && !entry.modifiedIn.includes(migrationName)) {
    entry.modifiedIn.push(migrationName);
  }
}

function stripLeadingSqlComments(stmt) {
  let s = stmt.trimStart();
  while (s.startsWith("--") || s.startsWith("/*")) {
    if (s.startsWith("--")) {
      const nl = s.indexOf("\n");
      s = nl === -1 ? "" : s.slice(nl + 1).trimStart();
    } else {
      const end = s.indexOf("*/");
      s = end === -1 ? "" : s.slice(end + 2).trimStart();
    }
  }
  return s;
}

export function extractSqlCatalogFromMigrations(migrations) {
  const relations = new Map();
  const sequences = new Map();
  const types = new Map();
  const functions = new Map();
  const triggers = new Map();
  const policies = new Map();

  for (const migration of migrations) {
    const statements = splitSqlStatements(migration.sql);
    const hasDynamicExecute = /\bexecute\b/i.test(migration.sql);

    for (const stmt of statements) {
      const trimmed = stripLeadingSqlComments(stmt);
      if (!trimmed) continue;

      let match;
      if ((match = /^\s*create\s+(?:or\s+replace\s+)?(?:temp\s+|temporary\s+|unlogged\s+)?(table|view|materialized\s+view|foreign\s+table)\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)/i.exec(trimmed))) {
        const kind = match[1].toLowerCase().startsWith("materialized") ? "m"
          : match[1].toLowerCase().startsWith("view") ? "v"
          : match[1].toLowerCase().startsWith("foreign") ? "f" : "r";
        const id = normalizeObjectName(match[2]);
        if (id) recordDdlEvent(ensureEntry(relations, id, { identity: id, kind }), migration.name, true);
      } else if ((match = /^\s*create\s+sequence\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id) {
          recordDdlEvent(ensureEntry(sequences, id, { identity: id }), migration.name, true);
          recordDdlEvent(ensureEntry(relations, id, { identity: id, kind: "S" }), migration.name, true);
        }
      } else if ((match = /^\s*create\s+type\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id) recordDdlEvent(ensureEntry(types, id, { identity: id }), migration.name, true);
      } else if ((match = /^\s*create\s+domain\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id) recordDdlEvent(ensureEntry(types, id, { identity: id }), migration.name, true);
      } else if ((match = /^\s*create\s+(?:or\s+replace\s+)?(?:function|procedure)\s+([a-z0-9_."]+)\s*\(/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id) recordDdlEvent(ensureEntry(functions, id, { identity: id }), migration.name, true);
      } else if ((match = /^\s*create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+([a-z0-9_"]+)\s+[\s\S]*?\bon\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const trigName = match[1].replace(/"/g, "").toLowerCase();
        const tableId = normalizeObjectName(match[2]);
        if (tableId) {
          const id = `${tableId}.${trigName}`;
          recordDdlEvent(ensureEntry(triggers, id, { identity: id, relation: tableId }), migration.name, true);
        }
      } else if ((match = /^\s*create\s+policy\s+("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const polName = match[1].replace(/"/g, "");
        const tableId = normalizeObjectName(match[2]);
        if (tableId) {
          const id = `${tableId}.${polName}`;
          recordDdlEvent(ensureEntry(policies, id, { identity: id, relation: tableId }), migration.name, true);
        }
      } else if ((match = /^\s*alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id && relations.has(id)) recordDdlEvent(relations.get(id), migration.name, false);
      } else if ((match = /^\s*alter\s+(?:function|procedure)\s+([a-z0-9_."]+)\s*\(/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id && functions.has(id)) recordDdlEvent(functions.get(id), migration.name, false);
      } else if ((match = /^\s*alter\s+policy\s+("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const polName = match[1].replace(/"/g, "");
        const tableId = normalizeObjectName(match[2]);
        const id = tableId ? `${tableId}.${polName}` : null;
        if (id && policies.has(id)) recordDdlEvent(policies.get(id), migration.name, false);
      } else if ((match = /^\s*drop\s+(table|view|materialized\s+view)\s+(?:if\s+exists\s+)?([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[2]);
        if (id && relations.has(id)) relations.get(id).droppedIn.push(migration.name);
      } else if ((match = /^\s*drop\s+(?:function|procedure)\s+(?:if\s+exists\s+)?([a-z0-9_."]+)\s*\(/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id && functions.has(id)) functions.get(id).droppedIn.push(migration.name);
      } else if ((match = /^\s*drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const polName = match[1].replace(/"/g, "");
        const tableId = normalizeObjectName(match[2]);
        const id = tableId ? `${tableId}.${polName}` : null;
        if (id && policies.has(id)) policies.get(id).droppedIn.push(migration.name);
      } else if ((match = /^\s*drop\s+trigger\s+(?:if\s+exists\s+)?("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const trigName = match[1].replace(/"/g, "").toLowerCase();
        const tableId = normalizeObjectName(match[2]);
        const id = tableId ? `${tableId}.${trigName}` : null;
        if (id && triggers.has(id)) triggers.get(id).droppedIn.push(migration.name);
      }
    }

    if (hasDynamicExecute) {
      const lowerSql = migration.sql.toLowerCase();
      for (const map of [relations, functions]) {
        for (const [id, entry] of map) {
          const shortName = id.split(".")[1];
          if (shortName && lowerSql.includes(shortName) && entry.definedIn !== migration.name && !entry.modifiedIn.includes(migration.name)) {
            entry.dynamicSqlMentions.push(migration.name);
          }
        }
      }
    }
  }

  const toSortedArray = (map) => [...map.values()].sort((a, b) => a.identity.localeCompare(b.identity, "en"));
  return {
    relations: toSortedArray(relations),
    sequences: toSortedArray(sequences),
    types: toSortedArray(types),
    functions: toSortedArray(functions),
    triggers: toSortedArray(triggers),
    policies: toSortedArray(policies),
  };
}

export function scanApplicationConsumers(root = repoRoot) {
  const rpcConsumers = new Map();
  const relationConsumers = new Map();
  const storageConsumers = new Map();
  const scanRoots = ["apps/web/src", "apps/mobile"];
  const codeExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"]);

  function walkDir(relDir) {
    const absDir = path.join(root, relDir);
    if (!fs.existsSync(absDir)) return;
    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".expo") continue;
      const rel = `${relDir}/${entry.name}`;
      if (entry.isDirectory()) {
        walkDir(rel);
      } else if (codeExts.has(path.extname(entry.name))) {
        const content = fs.readFileSync(path.join(root, rel), "utf8");
        for (const m of content.matchAll(/\.rpc\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g)) {
          const key = `public.${m[1].toLowerCase()}`;
          if (!rpcConsumers.has(key)) rpcConsumers.set(key, new Set());
          rpcConsumers.get(key).add(rel);
        }
        for (const m of content.matchAll(/\.storage\s*\.\s*from\(\s*["'`]([a-zA-Z0-9_-]+)["'`]/g)) {
          const key = m[1];
          if (!storageConsumers.has(key)) storageConsumers.set(key, new Set());
          storageConsumers.get(key).add(rel);
        }
        for (const m of content.matchAll(/(?<!\.storage\s*)\.from\(\s*["'`]([a-zA-Z0-9_]+)["'`]/g)) {
          const key = `public.${m[1].toLowerCase()}`;
          if (!relationConsumers.has(key)) relationConsumers.set(key, new Set());
          relationConsumers.get(key).add(rel);
        }
      }
    }
  }

  for (const r of scanRoots) walkDir(r);

  const mapToObj = (m) => Object.fromEntries(
    [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "en")).map(([k, v]) => [k, [...v].sort()])
  );
  return {
    rpc: mapToObj(rpcConsumers),
    relations: mapToObj(relationConsumers),
    storageBuckets: mapToObj(storageConsumers),
  };
}

export function buildGitSqlCatalog({ root = repoRoot, ref = null } = {}) {
  const gitSha = ref ?? readGitHead(root);
  const migrations = listMigrations(root);
  const migrationsHash = computeMigrationsDigest(migrations);
  const extracted = extractSqlCatalogFromMigrations(migrations);
  const consumers = scanApplicationConsumers(root);

  return {
    schemaVersion: 1,
    report: "sql-catalog-git-replayed",
    source: "git-migrations-ast-replay",
    gitSha,
    provenance: {
      verified: true,
      measuredSource: "git-worktree-migrations",
      migrationsCount: migrations.length,
      migrationsHash,
    },
    generatedAt: new Date().toISOString(),
    migrations: migrations.map((m) => ({ version: m.version, name: m.name, hash: m.hash })),
    objects: extracted,
    consumers,
    limitations: "DDL replay from apps/web/supabase/migrations/ without live PostgreSQL execution (DB_SEMANTICS_NOT_EXECUTED); dynamic SQL (EXECUTE) and overloaded signatures are tracked as mentions/base names.",
  };
}

export function checkCatalogFreshness(catalog, { root = repoRoot, expectedSha = null } = {}) {
  const headSha = expectedSha ?? readGitHead(root);
  const errors = [];
  if (!catalog || catalog.schemaVersion !== 1) errors.push("invalid catalog schemaVersion");
  if (!catalog?.provenance?.verified) errors.push("catalog provenance not verified");
  if (catalog?.gitSha !== headSha) errors.push(`stale gitSha: catalog=${catalog?.gitSha ?? "none"} head=${headSha}`);
  if (catalog?.report === "sql-catalog-git-replayed") {
    const migrations = listMigrations(root);
    const currentHash = computeMigrationsDigest(migrations);
    if (catalog.provenance?.migrationsHash !== currentHash) {
      errors.push("stale migrationsHash: migrations directory changed since catalog generation");
    }
  }
  return { fresh: errors.length === 0, errors };
}

export function compareGitAndRemoteCatalogs(gitCatalog, remoteCatalog) {
  const gitVersions = new Set((gitCatalog.migrations ?? []).map((m) => m.version));
  const remoteVersions = new Set(remoteCatalog.migrations ?? []);
  const onlyInGit = [...gitVersions].filter((v) => !remoteVersions.has(v)).sort();
  const onlyInRemote = [...remoteVersions].filter((v) => !gitVersions.has(v)).sort();

  const activeGitRelations = new Set((gitCatalog.objects?.relations ?? []).filter((r) => r.droppedIn.length === 0).map((r) => r.identity));
  const remoteRelations = new Set((remoteCatalog.relations ?? []).map((r) => r.identity));
  const activeGitFuncs = new Set((gitCatalog.objects?.functions ?? []).filter((f) => f.droppedIn.length === 0).map((f) => f.identity));
  const remoteFuncBaseNames = new Set((remoteCatalog.functions ?? []).map((f) => f.identity.split("(")[0].toLowerCase()));

  return {
    gitSha: gitCatalog.gitSha,
    remoteSha: remoteCatalog.gitSha,
    migrations: {
      gitCount: gitVersions.size,
      remoteCount: remoteVersions.size,
      onlyInGit,
      onlyInRemote,
      aligned: onlyInGit.length === 0 && onlyInRemote.length === 0,
    },
    relations: {
      gitAstCount: activeGitRelations.size,
      remoteCount: remoteRelations.size,
      inRemoteNotGitAst: [...remoteRelations].filter((r) => !activeGitRelations.has(r)).sort(),
    },
    functions: {
      gitAstUniqueNames: activeGitFuncs.size,
      remoteUniqueNames: remoteFuncBaseNames.size,
      inRemoteNotGitAst: [...remoteFuncBaseNames].filter((f) => !activeGitFuncs.has(f)).sort(),
    },
  };
}

function main(args) {
  const checkIdx = args.indexOf("--check-freshness");
  if (checkIdx !== -1) {
    const targetPath = args[checkIdx + 1];
    if (!targetPath) throw new Error("Usage: --check-freshness CATALOG_JSON");
    const catalog = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    const result = checkCatalogFreshness(catalog);
    console.log(JSON.stringify(result, null, 2));
    if (!result.fresh) process.exitCode = 1;
    return;
  }

  const compareIdx = args.indexOf("--compare-remote");
  const outIdx = args.indexOf("--output");
  const catalog = buildGitSqlCatalog();

  if (outIdx !== -1 && args[outIdx + 1]) {
    const outPath = args[outIdx + 1];
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(catalog, null, 2) + "\n");
  }

  if (compareIdx !== -1 && args[compareIdx + 1]) {
    const remote = JSON.parse(fs.readFileSync(args[compareIdx + 1], "utf8"));
    const comparison = compareGitAndRemoteCatalogs(catalog, remote);
    process.stdout.write(JSON.stringify(comparison, null, 2) + "\n");
    return;
  }

  if (outIdx === -1) {
    process.stdout.write(JSON.stringify(catalog, null, 2) + "\n");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
