import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const COORDINATION_ROOT = [".artifacts", "coordination"];
export const CRITICAL_SCOPES = new Set(["AUTHZ_SECURITY"]);

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function git(repositoryRoot, args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  }).trim();
}

function assertSafeSegment(value, label) {
  if (!SAFE_SEGMENT.test(value)) {
    throw new Error(`${label} must be a safe single path segment.`);
  }
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function getCoordinationRoot(repositoryRoot) {
  return path.join(path.resolve(repositoryRoot), ...COORDINATION_ROOT);
}

function getMigrationPath(root) {
  return path.join(root, "migration-state.json");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function jsonPayload(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writePayload(filePath, payload) {
  const descriptor = fs.openSync(filePath, "w");
  try {
    fs.writeFileSync(descriptor, payload, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function temporaryMetadataPath(filePath) {
  return `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = temporaryMetadataPath(filePath);
  try {
    writePayload(temporaryPath, jsonPayload(value));
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function writeExclusiveMetadata(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = temporaryMetadataPath(filePath);
  try {
    writePayload(temporaryPath, jsonPayload(value));
    // A hard-link create is atomic and fails with EEXIST without replacing an
    // existing metadata file, including on Windows where rename may replace.
    fs.linkSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

function writeExclusive(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, "wx");
    fs.writeFileSync(descriptor, jsonPayload(value), "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function readOptionalJson(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : null;
}

function normalizeRepoPath(repositoryRoot, input) {
  const raw = String(input ?? "").trim().replaceAll("\\", "/");
  if (!raw || raw.startsWith("/") || /^[A-Za-z]:\//.test(raw)) {
    throw new Error(`Repository path is invalid: ${input}`);
  }
  const normalized = path.posix.normalize(raw);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`Path traversal is forbidden: ${input}`);
  }
  const absolute = path.resolve(repositoryRoot, ...normalized.split("/"));
  if (!isWithin(path.resolve(repositoryRoot), absolute)) {
    throw new Error(`Path traversal is forbidden: ${input}`);
  }
  return normalized;
}

function parseStatusPaths(output) {
  const paths = new Set();
  for (const line of output.split(/\r?\n/)) {
    if (!line || line.length < 3) continue;
    const status = line.slice(0, 2);
    const payload = line.slice(3);
    if (status === "??") {
      paths.add(payload);
      continue;
    }
    const renameParts = payload.split(" -> ");
    for (const candidate of renameParts) paths.add(candidate);
  }
  return [...paths].sort();
}

function readDirtyPaths(repositoryRoot, gitRunner = git) {
  return parseStatusPaths(gitRunner(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all"]));
}

function readStagedPaths(repositoryRoot, gitRunner = git) {
  return gitRunner(repositoryRoot, ["diff", "--cached", "--name-only", "-z"])
    .split("\0")
    .filter(Boolean);
}

function pathLockName(repoPath) {
  return `path-${crypto.createHash("sha256").update(repoPath).digest("hex")}.json`;
}

function getRunPath(root, runId) {
  assertSafeSegment(runId, "run id");
  return path.join(root, "active-runs", `${runId}.json`);
}

function loadRun(root, runId) {
  const runPath = getRunPath(root, runId);
  const run = readOptionalJson(runPath);
  if (!run) throw new Error(`Unknown active run: ${runId}`);
  return { run, runPath };
}

function loadMigration(root) {
  return readOptionalJson(getMigrationPath(root));
}

function normalizeMigration(migration) {
  if (!migration) return null;
  return {
    ...migration,
    adoptedLegacyPaths: [...new Set(migration.adoptedLegacyPaths ?? [])].sort(),
  };
}

function saveMigration(root, migration, metadataWriter = writeJsonAtomic) {
  metadataWriter(getMigrationPath(root), {
    ...migration,
    version: Math.max(migration.version ?? 1, 2),
    adoptedLegacyPaths: [...new Set(migration.adoptedLegacyPaths ?? [])].sort(),
  });
}

function readPathLocks(root) {
  const locksRoot = path.join(root, "locks");
  if (!fs.existsSync(locksRoot)) return [];
  return fs.readdirSync(locksRoot)
    .filter((entry) => entry.startsWith("path-") && entry.endsWith(".json"))
    .map((entry) => ({ filePath: path.join(locksRoot, entry), lock: readJson(path.join(locksRoot, entry)) }));
}

function removeOwnedPathLock(root, repoPath, runId) {
  const filePath = path.join(root, "locks", pathLockName(repoPath));
  const lock = readOptionalJson(filePath);
  if (!lock) return;
  if (lock.runId !== runId || lock.path !== repoPath) {
    throw new Error(`Refusing to release a lock owned by ${lock.runId}: ${repoPath}`);
  }
  fs.unlinkSync(filePath);
}

function readRunPathLocks(root, runId) {
  return readPathLocks(root).filter(({ lock }) => lock.runId === runId);
}

function getRemoteChangedPaths(repositoryRoot, baseSha, ownedPaths, gitRunner = git) {
  if (ownedPaths.length === 0) return [];
  const args = ["diff", "--name-only", `${baseSha}..origin/main`, "--", ...ownedPaths];
  return gitRunner(repositoryRoot, args).split(/\r?\n/).filter(Boolean).sort();
}

export function createWorkspaceCoordinator({ repositoryRoot, gitRunner = git, metadataWriter = writeJsonAtomic } = {}) {
  const repo = path.resolve(repositoryRoot ?? process.cwd());
  const root = getCoordinationRoot(repo);
  const runGit = (args) => gitRunner(repo, args);

  function init() {
    fs.mkdirSync(path.join(root, "active-runs"), { recursive: true });
    fs.mkdirSync(path.join(root, "locks"), { recursive: true });
    const migrationPath = getMigrationPath(root);
    const existing = readOptionalJson(migrationPath);
    if (existing) return normalizeMigration(existing);
    const migration = {
      version: 2,
      initializedAt: new Date().toISOString(),
      mode: "LEGACY_UNOWNED",
      legacyUnowned: readDirtyPaths(repo, (_repositoryRoot, args) => runGit(args)).map((item) => normalizeRepoPath(repo, item)),
      adoptedLegacyPaths: [],
    };
    writeExclusiveMetadata(migrationPath, migration);
    return migration;
  }

  function start({ runId, domain, baseSha } = {}) {
    assertSafeSegment(runId, "run id");
    assertSafeSegment(domain, "domain");
    const resolvedBaseSha = baseSha ?? runGit(["rev-parse", "origin/main"]);
    const run = {
      version: 2,
      runId,
      domain,
      baseSha: resolvedBaseSha,
      startedAt: new Date().toISOString(),
      ownedPaths: [],
      adoptedLegacyPaths: [],
    };
    writeExclusiveMetadata(getRunPath(root, runId), run);
    return run;
  }

  function claim({ runId, paths = [], adoptLegacy = false } = {}) {
    const { run, runPath } = loadRun(root, runId);
    const normalizedPaths = [...new Set(paths.map((item) => normalizeRepoPath(repo, item)))].sort();
    if (normalizedPaths.length === 0) throw new Error("At least one path is required.");
    const migration = loadMigration(root);
    const legacy = new Set(migration?.legacyUnowned ?? []);
    const legacyConflicts = normalizedPaths.filter((item) => legacy.has(item));
    if (legacyConflicts.length > 0 && !adoptLegacy) {
      throw new Error(`LEGACY_UNOWNED requires explicit adoption: ${legacyConflicts.join(", ")}`);
    }

    const existingLocks = readPathLocks(root);
    for (const repoPath of normalizedPaths) {
      const existing = existingLocks.find(({ lock }) => lock.path === repoPath && lock.runId !== runId);
      if (existing) throw new Error(`COORDINATION_CONFLICT: ${repoPath} is owned by ${existing.lock.runId}.`);
    }

    const scopePath = path.join(root, "locks", `scope-${run.domain}.json`);
    const scopeNeeded = CRITICAL_SCOPES.has(run.domain);
    if (scopeNeeded) {
      const scope = readOptionalJson(scopePath);
      if (scope && scope.runId !== runId) {
        throw new Error(`COORDINATION_CONFLICT: scope ${run.domain} is owned by ${scope.runId}.`);
      }
    }

    const created = [];
    try {
      for (const repoPath of normalizedPaths) {
        const lockPath = path.join(root, "locks", pathLockName(repoPath));
        if (fs.existsSync(lockPath)) continue;
        const lock = { version: 1, kind: "path", path: repoPath, runId, acquiredAt: new Date().toISOString() };
        writeExclusive(lockPath, lock);
        created.push({ repoPath, lockPath });
      }
      if (scopeNeeded && !fs.existsSync(scopePath)) {
        writeExclusive(scopePath, { version: 1, kind: "scope", scope: run.domain, runId, acquiredAt: new Date().toISOString() });
        created.push({ lockPath: scopePath });
      }
    } catch (error) {
      for (const item of created.reverse()) {
        if (item.lockPath && fs.existsSync(item.lockPath)) fs.unlinkSync(item.lockPath);
      }
      throw error;
    }

    const ownedPaths = [...new Set([...(run.ownedPaths ?? []), ...normalizedPaths])].sort();
    const adoptedLegacyPaths = [...new Set([
      ...(run.adoptedLegacyPaths ?? []),
      ...(adoptLegacy ? legacyConflicts : []),
    ])].sort();
    metadataWriter(runPath, { ...run, ownedPaths, adoptedLegacyPaths });
    if (adoptLegacy && migration) {
      saveMigration(root, {
        ...migration,
        legacyUnowned: [...legacy].filter((item) => !legacyConflicts.includes(item)).sort(),
        adoptedLegacyPaths: [...new Set([...(migration.adoptedLegacyPaths ?? []), ...legacyConflicts])].sort(),
        mode: legacy.size - legacyConflicts.length === 0 ? "STRICT" : migration.mode,
      }, metadataWriter);
    }
    return { ...run, ownedPaths };
  }

  function unclaim({ runId, paths = [], returnLegacy = false } = {}) {
    const { run, runPath } = loadRun(root, runId);
    const normalizedPaths = [...new Set(paths.map((item) => normalizeRepoPath(repo, item)))].sort();
    if (normalizedPaths.length === 0) throw new Error("At least one path is required.");

    const owned = new Set(run.ownedPaths ?? []);
    const existingLocks = readPathLocks(root);
    for (const repoPath of normalizedPaths) {
      const lock = existingLocks.find(({ lock: candidate }) => candidate.path === repoPath);
      if (lock && lock.lock.runId !== runId) {
        throw new Error(`COORDINATION_CONFLICT: ${repoPath} is owned by ${lock.lock.runId}.`);
      }
      if (!owned.has(repoPath) || !lock) {
        throw new Error(`UNCLAIM_NOT_OWNED: ${repoPath} is not owned by ${runId}.`);
      }
    }

    const publication = readOptionalJson(path.join(root, "publication.lock"));
    if (publication) {
      const staged = new Set(readStagedPaths(repo, (_repositoryRoot, args) => runGit(args)));
      const stagedPaths = normalizedPaths.filter((repoPath) => staged.has(repoPath));
      if (stagedPaths.length > 0) {
        throw new Error(`UNCLAIM_STAGED: ${stagedPaths.join(", ")}`);
      }
    }

    const migration = loadMigration(root);
    if (returnLegacy && !migration) throw new Error("COORDINATION_NOT_INITIALIZED: migration state is required.");
    const nextRun = {
      ...run,
      ownedPaths: (run.ownedPaths ?? []).filter((repoPath) => !normalizedPaths.includes(repoPath)).sort(),
      adoptedLegacyPaths: (run.adoptedLegacyPaths ?? []).filter((repoPath) => !normalizedPaths.includes(repoPath)).sort(),
    };

    if (returnLegacy) {
      const legacy = new Set(migration.legacyUnowned ?? []);
      const adopted = new Set(migration.adoptedLegacyPaths ?? []);
      for (const repoPath of normalizedPaths) {
        legacy.add(repoPath);
        adopted.delete(repoPath);
      }
      // Return to legacy first: if the run metadata write fails, the path stays
      // conservatively owned and is still represented as non-orphan dirty work.
      saveMigration(root, { ...migration, legacyUnowned: [...legacy].sort(), adoptedLegacyPaths: [...adopted].sort() }, metadataWriter);
    }

    metadataWriter(runPath, nextRun);
    for (const repoPath of normalizedPaths) removeOwnedPathLock(root, repoPath, runId);
    return nextRun;
  }

  function staleCheck({ runId, fetch = true } = {}) {
    const { run } = loadRun(root, runId);
    if (fetch) runGit(["fetch", "origin", "main"]);
    const changedPaths = getRemoteChangedPaths(repo, run.baseSha, run.ownedPaths ?? [], (_repositoryRoot, args) => runGit(args));
    return { runId, baseSha: run.baseSha, staleScope: changedPaths.length === 0 ? "PASS" : "FAIL", changedPaths };
  }

  function publicationAcquire({ runId } = {}) {
    loadRun(root, runId);
    const lockPath = path.join(root, "publication.lock");
    const lock = { version: 1, kind: "publication", runId, acquiredAt: new Date().toISOString() };
    try {
      writeExclusive(lockPath, lock);
    } catch (error) {
      if (error?.code === "EEXIST") {
        const owner = readOptionalJson(lockPath)?.runId ?? "unknown";
        throw new Error(`COORDINATION_CONFLICT: publication lock is owned by ${owner}.`);
      }
      throw error;
    }
    return lock;
  }

  function publicationRelease({ runId } = {}) {
    const lockPath = path.join(root, "publication.lock");
    const lock = readOptionalJson(lockPath);
    if (!lock) return { released: false };
    if (lock.runId !== runId) throw new Error(`Refusing to release publication lock owned by ${lock.runId}.`);
    fs.unlinkSync(lockPath);
    return { released: true };
  }

  function release({ runId } = {}) {
    const { run, runPath } = loadRun(root, runId);
    const adopted = new Set(run.adoptedLegacyPaths ?? []);
    const dirty = new Set(readDirtyPaths(repo, (_repositoryRoot, args) => runGit(args)));
    const dirtyAdopted = [...adopted].filter((repoPath) => dirty.has(repoPath)).sort();
    if (dirtyAdopted.length > 0) {
      const migration = loadMigration(root) ?? { version: 2, mode: "LEGACY_UNOWNED", legacyUnowned: [], adoptedLegacyPaths: [] };
      const legacy = new Set(migration.legacyUnowned ?? []);
      const adoptedMigration = new Set(migration.adoptedLegacyPaths ?? []);
      for (const repoPath of dirtyAdopted) {
        legacy.add(repoPath);
        adoptedMigration.delete(repoPath);
      }
      // Persist the safety net before removing this run's locks.
      saveMigration(root, { ...migration, legacyUnowned: [...legacy].sort(), adoptedLegacyPaths: [...adoptedMigration].sort() }, metadataWriter);
    }
    for (const { lock } of readRunPathLocks(root, runId)) removeOwnedPathLock(root, lock.path, runId);
    const scopePath = path.join(root, "locks", `scope-${run.domain}.json`);
    const scope = readOptionalJson(scopePath);
    if (scope?.runId === runId) fs.unlinkSync(scopePath);
    const publicationPath = path.join(root, "publication.lock");
    const publication = readOptionalJson(publicationPath);
    if (publication?.runId === runId) fs.unlinkSync(publicationPath);
    fs.unlinkSync(runPath);
    return { released: true, runId };
  }

  function status({ runId } = {}) {
    const migration = loadMigration(root);
    const activeRuns = fs.existsSync(path.join(root, "active-runs"))
      ? fs.readdirSync(path.join(root, "active-runs")).filter((entry) => entry.endsWith(".json")).map((entry) => readJson(path.join(root, "active-runs", entry)))
      : [];
    const pathLocks = readPathLocks(root);
    const pathsByOwner = new Map();
    for (const { lock } of pathLocks) {
      const owners = pathsByOwner.get(lock.path) ?? new Set();
      owners.add(lock.runId);
      pathsByOwner.set(lock.path, owners);
    }
    const overlaps = [...pathsByOwner.entries()].filter(([, owners]) => owners.size > 1).map(([item, owners]) => ({ path: item, owners: [...owners].sort() }));
    const ownedPaths = [...new Set(pathLocks.map(({ lock }) => lock.path))].sort();
    const legacyUnowned = migration?.legacyUnowned ?? [];
    const dirtyPaths = runId ? [] : readDirtyPaths(repo, (_repositoryRoot, args) => runGit(args)).map((item) => normalizeRepoPath(repo, item));
    const ownedSet = new Set(ownedPaths);
    const legacySet = new Set(legacyUnowned);
    const orphanDirty = dirtyPaths.filter((item) => !ownedSet.has(item) && !legacySet.has(item));
    const result = {
      activeRuns: activeRuns.map((run) => ({
        runId: run.runId,
        domain: run.domain,
        baseSha: run.baseSha,
        ownedPaths: run.ownedPaths ?? [],
        adoptedLegacyPaths: run.adoptedLegacyPaths ?? [],
      })),
      ownedFiles: ownedPaths.length,
      legacyUnowned: legacyUnowned.length,
      overlaps,
      publicationOwner: readOptionalJson(path.join(root, "publication.lock"))?.runId ?? null,
      orphanDirty,
    };
    if (runId) {
      const run = activeRuns.find((item) => item.runId === runId);
      if (!run) throw new Error(`Unknown active run: ${runId}`);
      result.run = {
        runId,
        domain: run.domain,
        baseSha: run.baseSha,
        ownedPaths: run.ownedPaths ?? [],
        adoptedLegacyPaths: run.adoptedLegacyPaths ?? [],
        remoteChangedPaths: getRemoteChangedPaths(repo, run.baseSha, run.ownedPaths ?? [], (_repositoryRoot, args) => runGit(args)),
      };
    }
    return result;
  }

  function checkStaged({ runId } = {}) {
    const stagedPaths = readStagedPaths(repo, (_repositoryRoot, args) => runGit(args)).map((item) => normalizeRepoPath(repo, item));
    if (stagedPaths.length === 0) return { ok: true, stagedPaths, reason: "no staged paths" };
    if (!runId) throw new Error("FOREIGN_STAGED: CMM_WORKSPACE_RUN_ID is required when paths are staged.");
    const { run } = loadRun(root, runId);
    const publication = readOptionalJson(path.join(root, "publication.lock"));
    if (!publication || publication.runId !== runId) throw new Error(`FOREIGN_STAGED: publication lock is not held by ${runId}.`);
    const owned = new Set(run.ownedPaths ?? []);
    const foreign = stagedPaths.filter((item) => !owned.has(item));
    if (foreign.length > 0) throw new Error(`FOREIGN_STAGED: ${foreign.join(", ")}`);
    return { ok: true, stagedPaths, reason: "all staged paths belong to publication owner" };
  }

  function doctor() {
    const report = status();
    const activeIds = new Set(report.activeRuns.map((run) => run.runId));
    const staleLocks = readPathLocks(root).filter(({ lock }) => !activeIds.has(lock.runId)).map(({ lock }) => lock.path);
    const publication = readOptionalJson(path.join(root, "publication.lock"));
    const publicationOrphan = Boolean(publication && !activeIds.has(publication.runId));
    return { ...report, staleLocks, publicationOrphan, ok: report.overlaps.length === 0 && staleLocks.length === 0 && !publicationOrphan };
  }

  return { init, start, claim, unclaim, staleCheck, publicationAcquire, publicationRelease, release, status, checkStaged, doctor };
}

function parseArgs(argv) {
  const options = { paths: [] };
  let pathMode = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") {
      pathMode = true;
      continue;
    }
    if (pathMode) {
      options.paths.push(argument);
      continue;
    }
    if (argument === "--json") options.json = true;
    else if (argument === "--compact") options.compact = true;
    else if (argument === "--adopt-legacy") options.adoptLegacy = true;
    else if (argument === "--return-legacy") options.returnLegacy = true;
    else if (argument.startsWith("--")) {
      const [key, inlineValue] = argument.slice(2).split("=", 2);
      const value = inlineValue ?? argv[++index];
      options[key.replaceAll("-", "_")] = value;
    }
  }
  return options;
}

function printResult(result, { compact = false, json = false } = {}) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (compact && result.activeRuns) {
    console.log(`ACTIVE_RUNS=${result.activeRuns.length}`);
    console.log(`OWNED_FILES=${result.ownedFiles}`);
    console.log(`LEGACY_UNOWNED=${result.legacyUnowned}`);
    console.log(`OVERLAPS=${result.overlaps.length}`);
    console.log(`PUBLICATION_OWNER=${result.publicationOwner ?? "none"}`);
    console.log(`ORPHAN_DIRTY=${result.orphanDirty.length}`);
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

function main() {
  const [command = "status", ...argv] = process.argv.slice(2);
  const options = parseArgs(argv);
  const coordinator = createWorkspaceCoordinator({ repositoryRoot: process.cwd() });
  let result;
  if (command === "init") result = coordinator.init();
  else if (command === "start") result = coordinator.start({ runId: options.run_id, domain: options.domain, baseSha: options.base_sha });
  else if (command === "claim") result = coordinator.claim({ runId: options.run_id, paths: options.paths, adoptLegacy: options.adoptLegacy });
  else if (command === "unclaim") result = coordinator.unclaim({ runId: options.run_id, paths: options.paths, returnLegacy: options.returnLegacy });
  else if (command === "status") result = coordinator.status({ runId: options.run_id });
  else if (command === "stale-check") result = coordinator.staleCheck({ runId: options.run_id });
  else if (command === "publication-acquire") result = coordinator.publicationAcquire({ runId: options.run_id });
  else if (command === "publication-release") result = coordinator.publicationRelease({ runId: options.run_id });
  else if (command === "release") result = coordinator.release({ runId: options.run_id });
  else if (command === "check-staged") result = coordinator.checkStaged({ runId: options.run_id });
  else if (command === "doctor") result = coordinator.doctor();
  else throw new Error(`Unknown workspace coordination command: ${command}`);
  printResult(result, options);
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(`WORKSPACE_COORDINATION_FAILED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
