#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gitExecutable } from "../ci/git-executable.mjs";
import { createRepositoryView, parseRepositoryRef } from "../checks/repository-view.mjs";
import { splitSqlStatements } from "../ci/supabase-migration-sql.mjs";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const migrationsDirRelative = "apps/web/supabase/migrations";
const migrationFilePattern = /^apps\/web\/supabase\/migrations\/(\d{14})_(.+)\.sql$/;
const consumerRoots = ["apps/web/src", "apps/mobile"];
const consumerExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"]);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function resolveGitCommitSha(root, ref = "HEAD") {
  return execFileSync(gitExecutable(), ["rev-parse", "--verify", `${ref}^{commit}`], {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

function listMigrationsFromView(view) {
  return view
    .listFiles(migrationsDirRelative)
    .filter((relPath) => migrationFilePattern.test(relPath))
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((relPath) => {
      const name = path.posix.basename(relPath);
      const match = migrationFilePattern.exec(relPath);
      const sql = view.readText(relPath);
      return { name, version: match[1], path: relPath, sql, hash: sha256(sql) };
    });
}

function listConsumerFilesFromView(view) {
  const files = [];
  for (const prefix of consumerRoots) {
    for (const relPath of view.listFiles(prefix)) {
      if (consumerExtensions.has(path.posix.extname(relPath))) {
        files.push(relPath);
      }
    }
  }
  return files.sort((a, b) => a.localeCompare(b, "en"));
}

export function computeMigrationsDigest(migrations) {
  return sha256(migrations.map((m) => `${m.name}:${m.hash}`).join("\n"));
}

export function computeConsumersDigest(view) {
  const files = listConsumerFilesFromView(view);
  const manifest = files.map((relPath) => `${relPath}:${sha256(view.readText(relPath))}`).join("\n");
  return { count: files.length, hash: sha256(manifest) };
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

function splitTopLevelArgs(argList) {
  const args = [];
  let current = "";
  let depth = 0;
  for (const ch of argList) {
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (current.trim()) args.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

function normalizeSingleArgType(rawArg) {
  let s = rawArg.replace(/\s+/g, " ").trim();
  s = s.replace(/\s+(?:default|=)\s+[\s\S]*$/i, "").trim();
  s = s.replace(/^(?:in|out|inout|variadic)\s+/i, "").trim();
  const tokens = s.split(" ");
  if (tokens.length >= 2) {
    const first = tokens[0].toLowerCase();
    const knownMultiWordStarts = new Set(["double", "character", "time", "timestamp", "bit"]);
    if (!knownMultiWordStarts.has(first)) {
      s = tokens.slice(1).join(" ");
    }
  }
  return s.toLowerCase();
}

export function normalizeFunctionSignature(rawName, rawArgs = "") {
  const baseName = normalizeObjectName(rawName);
  if (!baseName) return null;
  const trimmedArgs = String(rawArgs ?? "").trim();
  if (!trimmedArgs) return { identity: `${baseName}()`, baseName };
  const normalizedArgs = splitTopLevelArgs(trimmedArgs).map(normalizeSingleArgType).join(", ");
  return { identity: `${baseName}(${normalizedArgs})`, baseName };
}

function extractBalancedParens(text, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(openIdx + 1, i);
    }
  }
  return null;
}

function ensureEntry(map, key, base) {
  if (!map.has(key)) {
    map.set(key, {
      ...base,
      active: true,
      definedIn: null,
      recreatedIn: [],
      modifiedIn: [],
      droppedIn: [],
      renamedFrom: [],
      renamedTo: null,
      dynamicSqlMentions: [],
      textualOccurrences: [],
    });
  }
  return map.get(key);
}

function recordCreate(entry, migrationName) {
  if (!entry.definedIn) {
    entry.definedIn = migrationName;
    entry.active = true;
  } else if (!entry.active) {
    entry.active = true;
    if (!entry.recreatedIn.includes(migrationName)) entry.recreatedIn.push(migrationName);
  } else if (entry.definedIn !== migrationName && !entry.modifiedIn.includes(migrationName)) {
    entry.modifiedIn.push(migrationName);
  }
}

function recordAlter(entry, migrationName) {
  if (entry.definedIn !== migrationName && !entry.modifiedIn.includes(migrationName)) {
    entry.modifiedIn.push(migrationName);
  }
}

function recordDrop(entry, migrationName) {
  entry.active = false;
  if (!entry.droppedIn.includes(migrationName)) entry.droppedIn.push(migrationName);
}

function recordRename(map, oldId, newId, migrationName, fallbackBase) {
  const prev = map.get(oldId);
  const next = ensureEntry(map, newId, { ...(prev ?? fallbackBase), identity: newId });
  next.active = true;
  if (!next.definedIn) next.definedIn = prev?.definedIn ?? migrationName;
  if (prev) {
    next.modifiedIn = [...new Set([...prev.modifiedIn, migrationName])];
    next.renamedFrom = [...prev.renamedFrom, { from: oldId, migration: migrationName }];
    prev.active = false;
    prev.renamedTo = newId;
  } else {
    next.renamedFrom.push({ from: oldId, migration: migrationName });
  }
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
        if (id) recordCreate(ensureEntry(relations, id, { identity: id, kind }), migration.name);
      } else if ((match = /^\s*create\s+sequence\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id) {
          recordCreate(ensureEntry(sequences, id, { identity: id }), migration.name);
          recordCreate(ensureEntry(relations, id, { identity: id, kind: "S" }), migration.name);
        }
      } else if ((match = /^\s*create\s+(?:type|domain)\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id) recordCreate(ensureEntry(types, id, { identity: id }), migration.name);
      } else if ((match = /^\s*create\s+(?:or\s+replace\s+)?(?:function|procedure)\s+([a-z0-9_."]+)\s*\(/i.exec(trimmed))) {
        const openIdx = trimmed.indexOf("(", match[0].length - 1);
        const rawArgs = openIdx !== -1 ? extractBalancedParens(trimmed, openIdx) : "";
        const sig = normalizeFunctionSignature(match[1], rawArgs ?? "");
        if (sig) recordCreate(ensureEntry(functions, sig.identity, { identity: sig.identity, baseName: sig.baseName }), migration.name);
      } else if ((match = /^\s*create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+([a-z0-9_"]+)\s+[\s\S]*?\bon\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const trigName = match[1].replace(/"/g, "").toLowerCase();
        const tableId = normalizeObjectName(match[2]);
        if (tableId) {
          const id = `${tableId}.${trigName}`;
          recordCreate(ensureEntry(triggers, id, { identity: id, relation: tableId }), migration.name);
        }
      } else if ((match = /^\s*create\s+policy\s+("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const polName = match[1].replace(/"/g, "");
        const tableId = normalizeObjectName(match[2]);
        if (tableId) {
          const id = `${tableId}.${polName}`;
          recordCreate(ensureEntry(policies, id, { identity: id, relation: tableId }), migration.name);
        }
      } else if ((match = /^\s*alter\s+(table|view|materialized\s+view|sequence|type)\s+(?:if\s+exists\s+)?(?:only\s+)?([a-z0-9_."]+)\s+rename\s+to\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const objKind = match[1].toLowerCase();
        const oldId = normalizeObjectName(match[2]);
        const schema = oldId ? oldId.split(".")[0] : "public";
        const newId = normalizeObjectName(match[3], schema);
        if (oldId && newId) {
          if (objKind === "type") recordRename(types, oldId, newId, migration.name, {});
          else if (objKind === "sequence") {
            recordRename(sequences, oldId, newId, migration.name, {});
            recordRename(relations, oldId, newId, migration.name, { kind: "S" });
          } else {
            recordRename(relations, oldId, newId, migration.name, { kind: objKind.startsWith("view") ? "v" : objKind.startsWith("materialized") ? "m" : "r" });
          }
        }
      } else if ((match = /^\s*alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id && relations.has(id)) recordAlter(relations.get(id), migration.name);
      } else if ((match = /^\s*alter\s+(?:function|procedure)\s+([a-z0-9_."]+)\s*\(/i.exec(trimmed))) {
        const openIdx = trimmed.indexOf("(", match[0].length - 1);
        const rawArgs = openIdx !== -1 ? extractBalancedParens(trimmed, openIdx) : "";
        const sig = normalizeFunctionSignature(match[1], rawArgs ?? "");
        if (sig && functions.has(sig.identity)) recordAlter(functions.get(sig.identity), migration.name);
      } else if ((match = /^\s*alter\s+policy\s+("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const polName = match[1].replace(/"/g, "");
        const tableId = normalizeObjectName(match[2]);
        const id = tableId ? `${tableId}.${polName}` : null;
        if (id && policies.has(id)) recordAlter(policies.get(id), migration.name);
      } else if ((match = /^\s*drop\s+(table|view|materialized\s+view|sequence)\s+(?:if\s+exists\s+)?([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[2]);
        if (id && relations.has(id)) recordDrop(relations.get(id), migration.name);
        if (id && sequences.has(id)) recordDrop(sequences.get(id), migration.name);
      } else if ((match = /^\s*drop\s+type\s+(?:if\s+exists\s+)?([a-z0-9_."]+)/i.exec(trimmed))) {
        const id = normalizeObjectName(match[1]);
        if (id && types.has(id)) recordDrop(types.get(id), migration.name);
      } else if ((match = /^\s*drop\s+(?:function|procedure)\s+(?:if\s+exists\s+)?([a-z0-9_."]+)\s*\(/i.exec(trimmed))) {
        const openIdx = trimmed.indexOf("(", match[0].length - 1);
        const rawArgs = openIdx !== -1 ? extractBalancedParens(trimmed, openIdx) : "";
        const sig = normalizeFunctionSignature(match[1], rawArgs ?? "");
        if (sig && functions.has(sig.identity)) recordDrop(functions.get(sig.identity), migration.name);
      } else if ((match = /^\s*drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const polName = match[1].replace(/"/g, "");
        const tableId = normalizeObjectName(match[2]);
        const id = tableId ? `${tableId}.${polName}` : null;
        if (id && policies.has(id)) recordDrop(policies.get(id), migration.name);
      } else if ((match = /^\s*drop\s+trigger\s+(?:if\s+exists\s+)?("[^"]+"|[a-z0-9_]+)\s+on\s+([a-z0-9_."]+)/i.exec(trimmed))) {
        const trigName = match[1].replace(/"/g, "").toLowerCase();
        const tableId = normalizeObjectName(match[2]);
        const id = tableId ? `${tableId}.${trigName}` : null;
        if (id && triggers.has(id)) recordDrop(triggers.get(id), migration.name);
      }
    }

    if (hasDynamicExecute) {
      const lowerSql = migration.sql.toLowerCase();
      for (const map of [relations, functions]) {
        for (const [id, entry] of map) {
          const shortName = (entry.baseName ?? id).split(".")[1];
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

export function scanApplicationConsumersFromView(view) {
  const rpcConsumers = new Map();
  const relationConsumers = new Map();
  const storageConsumers = new Map();

  for (const rel of listConsumerFilesFromView(view)) {
    const content = view.readText(rel);
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

  const mapToObj = (m) => Object.fromEntries(
    [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "en")).map(([k, v]) => [k, [...v].sort()])
  );
  return {
    rpc: mapToObj(rpcConsumers),
    relations: mapToObj(relationConsumers),
    storageBuckets: mapToObj(storageConsumers),
  };
}

export function buildGitSqlCatalog({ root = repoRoot, ref = null, source = "git", view: suppliedView = null } = {}) {
  const useGitSource = source !== "worktree";
  const resolvedSha = useGitSource ? resolveGitCommitSha(root, ref ?? "HEAD") : null;
  const view = suppliedView ?? createRepositoryView({ root, ref: resolvedSha ?? undefined });
  const provenanceVerified = view.mode === "git" && Boolean(resolvedSha);

  const migrations = listMigrationsFromView(view);
  const migrationsHash = computeMigrationsDigest(migrations);
  const consumersDigest = computeConsumersDigest(view);
  const extracted = extractSqlCatalogFromMigrations(migrations);
  const consumers = scanApplicationConsumersFromView(view);

  return {
    schemaVersion: 1,
    report: "sql-catalog-git-static-ddl",
    analysisKind: "STATIC_DDL_ANALYSIS",
    source: useGitSource ? "git-migrations-static-ddl" : "worktree-migrations-static-ddl",
    gitSha: resolvedSha,
    provenance: {
      verified: provenanceVerified,
      measuredSource: view.mode === "git" ? "git" : "worktree",
      gitRef: ref ?? (useGitSource ? "HEAD" : null),
      migrationsCount: migrations.length,
      migrationsHash,
      consumersCount: consumersDigest.count,
      consumersHash: consumersDigest.hash,
    },
    generatedAt: new Date().toISOString(),
    migrations: migrations.map((m) => ({ version: m.version, name: m.name, hash: m.hash })),
    objects: extracted,
    consumers,
    limitations: "Static DDL analysis of apps/web/supabase/migrations/ without live PostgreSQL execution (DB_SEMANTICS_NOT_EXECUTED); distinct from remote-observed catalog and from an ephemeral PostgreSQL replay. Dynamic SQL (EXECUTE) and unrecognized DDL constructs are flagged as mentions rather than established provenance.",
  };
}

const SUPPORTED_CATALOG_REPORTS = new Set([
  "sql-catalog-git-static-ddl",
  "sql-catalog-git-replayed",
  "sql-catalog-remote-observed",
]);

export function checkCatalogFreshness(catalog, { root = repoRoot, expectedSha = null, view: suppliedView = null } = {}) {
  const headSha = expectedSha ?? resolveGitCommitSha(root, "HEAD");
  const errors = [];
  if (!catalog || catalog.schemaVersion !== 1) errors.push("invalid catalog schemaVersion");
  if (!SUPPORTED_CATALOG_REPORTS.has(catalog?.report)) {
    errors.push(`unsupported catalog report type: ${catalog?.report ?? "none"}`);
  }
  if (catalog?.provenance?.verified !== true || catalog?.provenance?.measuredSource !== "git") {
    errors.push("catalog provenance mismatch or unverified source (worktree catalogs cannot prove a SHA)");
  }
  if (catalog?.gitSha !== headSha) errors.push(`stale gitSha: catalog=${catalog?.gitSha ?? "none"} head=${headSha}`);

  if (catalog?.report === "sql-catalog-git-static-ddl" || catalog?.report === "sql-catalog-git-replayed") {
    const view = suppliedView ?? createRepositoryView({ root, ref: headSha });
    const migrations = listMigrationsFromView(view);
    const currentMigrationsHash = computeMigrationsDigest(migrations);
    if (catalog.provenance?.migrationsHash !== currentMigrationsHash) {
      errors.push("stale migrationsHash: migrations tree changed since catalog generation");
    }
    const currentConsumers = computeConsumersDigest(view);
    if (catalog.provenance?.consumersHash !== currentConsumers.hash) {
      errors.push("stale consumersHash: application consumer files changed since catalog generation");
    }
  }
  return { fresh: errors.length === 0, errors };
}

export function compareGitAndRemoteCatalogs(gitCatalog, remoteCatalog) {
  const gitVersions = new Set((gitCatalog.migrations ?? []).map((m) => m.version));
  const remoteVersions = new Set(remoteCatalog.migrations ?? []);
  const onlyInGit = [...gitVersions].filter((v) => !remoteVersions.has(v)).sort();
  const onlyInRemote = [...remoteVersions].filter((v) => !gitVersions.has(v)).sort();

  const isActive = (entry) => (typeof entry.active === "boolean" ? entry.active : (entry.droppedIn ?? []).length === 0);
  const activeGitRelations = new Set((gitCatalog.objects?.relations ?? []).filter(isActive).map((r) => r.identity));
  const remoteRelations = new Set((remoteCatalog.relations ?? []).map((r) => r.identity));
  const activeGitFuncNames = new Set((gitCatalog.objects?.functions ?? []).filter(isActive).map((f) => (f.baseName ?? f.identity.split("(")[0]).toLowerCase()));
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
      gitAstUniqueNames: activeGitFuncNames.size,
      remoteUniqueNames: remoteFuncBaseNames.size,
      inRemoteNotGitAst: [...remoteFuncBaseNames].filter((f) => !activeGitFuncNames.has(f)).sort(),
    },
  };
}

function parseArgs(args) {
  const options = { source: "git", ref: parseRepositoryRef(args), output: null, compareRemote: null, checkFreshness: null };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--source") options.source = args[++i];
    else if (arg === "--ref") options.ref = args[++i];
    else if (arg === "--output") options.output = args[++i];
    else if (arg === "--compare-remote") options.compareRemote = args[++i];
    else if (arg === "--check-freshness") options.checkFreshness = args[++i];
  }
  return options;
}

function main(args) {
  const options = parseArgs(args);
  if (options.checkFreshness) {
    const catalog = JSON.parse(fs.readFileSync(options.checkFreshness, "utf8"));
    const result = checkCatalogFreshness(catalog, { expectedSha: options.ref ? resolveGitCommitSha(repoRoot, options.ref) : null });
    console.log(JSON.stringify(result, null, 2));
    if (!result.fresh) process.exitCode = 1;
    return;
  }

  const catalog = buildGitSqlCatalog({ ref: options.ref, source: options.source });

  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, JSON.stringify(catalog, null, 2) + "\n");
  }

  if (options.compareRemote) {
    const remote = JSON.parse(fs.readFileSync(options.compareRemote, "utf8"));
    const comparison = compareGitAndRemoteCatalogs(catalog, remote);
    process.stdout.write(JSON.stringify(comparison, null, 2) + "\n");
    return;
  }

  if (!options.output) {
    process.stdout.write(JSON.stringify(catalog, null, 2) + "\n");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
