import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const LEGACY_COORDINATION_ROOT = [".artifacts", "coordination"];
export const COORDINATION_ROOT = ["cleanmymap-workspace"];
export const CRITICAL_SCOPES = new Set(["AUTHZ_SECURITY"]);

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DEFAULT_PUBLICATION_WAIT_MS = 5 * 60 * 1000;
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const DEFAULT_BACKOFF_MS = [30_000, 60_000, 120_000, 90_000];

function git(repositoryRoot, args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: [args[0] === "push" ? "inherit" : "ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    windowsHide: true,
  }).trim();
}

function gitWithInput(repositoryRoot, args, input) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    windowsHide: true,
  }).trim();
}

function gitRaw(repositoryRoot, args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    windowsHide: true,
  });
}

function assertSafeSegment(value, label) {
  if (!SAFE_SEGMENT.test(String(value ?? ""))) throw new Error(`${label} must be a safe single path segment.`);
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function readOptionalJson(filePath) { return fs.existsSync(filePath) ? readJson(filePath) : null; }
function jsonPayload(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function temporaryMetadataPath(filePath) { return `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`; }

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = temporaryMetadataPath(filePath);
  try {
    fs.writeFileSync(temporaryPath, jsonPayload(value), "utf8");
    fs.renameSync(temporaryPath, filePath);
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

function normalizeRepoPath(repositoryRoot, input) {
  const raw = String(input ?? "").trim().replaceAll("\\", "/");
  if (!raw || raw.startsWith("/") || /^[A-Za-z]:\//.test(raw)) throw new Error(`Repository path is invalid: ${input}`);
  const normalized = path.posix.normalize(raw);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) throw new Error(`Path traversal is forbidden: ${input}`);
  if (!isWithin(path.resolve(repositoryRoot), path.resolve(repositoryRoot, ...normalized.split("/")))) throw new Error(`Path traversal is forbidden: ${input}`);
  return normalized;
}

function normalizePaths(repositoryRoot, paths) { return [...new Set(paths.map((item) => normalizeRepoPath(repositoryRoot, item)))].sort(); }
function pathHash(repoPath) { return crypto.createHash("sha256").update(repoPath).digest("hex"); }
function pathsOverlap(left, right) { return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`); }

function workspaceError(code, message, details = {}) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function parseStatusPaths(output) {
  const paths = new Set();
  for (const line of String(output ?? "").split(/\r?\n/)) {
    if (!line || line.length < 3) continue;
    const payload = line.slice(3);
    if (line.slice(0, 2) === "??") paths.add(payload);
    else payload.split(" -> ").forEach((item) => paths.add(item));
  }
  return [...paths].sort();
}

function readDirtyPaths(repositoryRoot, gitRunner = git) {
  return parseStatusPaths(gitRunner(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all"]));
}

function readStagedPaths(repositoryRoot, gitRunner = git) {
  return String(gitRunner(repositoryRoot, ["diff", "--cached", "--name-only", "-z"])).split("\0").filter(Boolean);
}

function readChangedPaths(repositoryRoot, leftSha, rightSha, gitRunner = git) {
  return String(gitRunner(repositoryRoot, ["diff", "--name-only", `${leftSha}..${rightSha}`])).split(/\r?\n/).filter(Boolean).sort();
}

function readCommitPaths(repositoryRoot, sha, gitRunner = git) {
  return String(gitRunner(repositoryRoot, ["diff-tree", "--root", "--no-commit-id", "--name-only", "-r", sha])).split(/\r?\n/).filter(Boolean).sort();
}

function getGitCommonDir(repositoryRoot, gitRunner = git) {
  return path.resolve(repositoryRoot, String(gitRunner(repositoryRoot, ["rev-parse", "--git-common-dir"]) || ".git").trim());
}

export function getCoordinationRoot(repositoryRoot, gitRunner = git) {
  return path.join(getGitCommonDir(path.resolve(repositoryRoot), gitRunner), ...COORDINATION_ROOT);
}

function getLegacyRoot(repositoryRoot) { return path.join(path.resolve(repositoryRoot), ...LEGACY_COORDINATION_ROOT); }
function getRunPath(root, runId) { assertSafeSegment(runId, "run id"); return path.join(root, "runs", `${runId}.json`); }
function getClosedRunPath(root, runId) { return path.join(root, "closed-runs", `${runId}.json`); }

function loadRun(root, runId) {
  const filePath = getRunPath(root, runId);
  const run = readOptionalJson(filePath);
  if (!run) throw workspaceError("UNKNOWN_RUN", `unknown active run: ${runId}`);
  return { run, filePath };
}

function worktreeParent(repositoryRoot) { return path.join(path.dirname(path.resolve(repositoryRoot)), "CleanMyMap-worktrees"); }
function ownWorktreePath(repositoryRoot, runId) { return path.join(worktreeParent(repositoryRoot), runId); }
function publishWorktreePath(repositoryRoot, runId) { return path.join(worktreeParent(repositoryRoot), ".publish", runId); }

function worktreeList(repositoryRoot, gitRunner = git) {
  const entries = [];
  let current = null;
  for (const line of String(gitRunner(repositoryRoot, ["worktree", "list", "--porcelain"])).split(/\r?\n/)) {
    if (line.startsWith("worktree ")) { if (current) entries.push(current); current = { path: line.slice(9) }; }
    else if (current && line.startsWith("branch ")) current.branch = line.slice(7);
    else if (current && line === "bare") current.bare = true;
  }
  if (current) entries.push(current);
  return entries;
}

function branchExists(repositoryRoot, branchName, gitRunner = git) {
  try { gitRunner(repositoryRoot, ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`]); return true; } catch { return false; }
}

function gitAt(repositoryRoot, worktree, args, gitRunner = git) { return gitRunner(worktree ?? repositoryRoot, args); }
function scopeLockPath(root, domain) { return path.join(root, "locks", `scope-${domain}.json`); }
function claimPath(root, repoPath) { return path.join(root, "claims", `${pathHash(repoPath)}.json`); }

function readClaims(root) {
  const claimsRoot = path.join(root, "claims");
  if (!fs.existsSync(claimsRoot)) return [];
  return fs.readdirSync(claimsRoot).filter((item) => item.endsWith(".json")).map((item) => ({ filePath: path.join(claimsRoot, item), claim: readJson(path.join(claimsRoot, item)) }));
}

function readRuns(root, folder = "runs") {
  const runsRoot = path.join(root, folder);
  if (!fs.existsSync(runsRoot)) return [];
  return fs.readdirSync(runsRoot).filter((item) => item.endsWith(".json")).map((item) => readJson(path.join(runsRoot, item)));
}

function currentRefs(repositoryRoot, gitRunner = git) {
  return { headSha: gitRunner(repositoryRoot, ["rev-parse", "HEAD"]), originMainSha: gitRunner(repositoryRoot, ["rev-parse", "origin/main"]) };
}

function assertMainReference(repositoryRoot, gitRunner = git) {
  const branch = gitRunner(repositoryRoot, ["branch", "--show-current"]);
  if (branch !== "main") throw workspaceError("WORKTREE_BRANCH_INVALID", `current branch is ${branch || "detached HEAD"}; expected main`, { branch });
  return currentRefs(repositoryRoot, gitRunner);
}

function isLeaseExpired(metadata, now, leaseMs) {
  const heartbeat = Date.parse(metadata?.heartbeatAt ?? metadata?.updatedAt ?? metadata?.acquiredAt ?? metadata?.startedAt ?? "");
  return !Number.isFinite(heartbeat) || now() - heartbeat > leaseMs;
}

function readLegacyRun(repositoryRoot, runId) { return readOptionalJson(path.join(getLegacyRoot(repositoryRoot), "active-runs", `${runId}.json`)); }

export function createWorkspaceCoordinator({
  repositoryRoot,
  gitRunner = git,
  gitPatchRunner = gitRaw,
  gitInputRunner = gitWithInput,
  metadataWriter = writeJsonAtomic,
  now = () => Date.now(),
  sleep = (milliseconds) => { const blocker = new Int32Array(new SharedArrayBuffer(4)); Atomics.wait(blocker, 0, 0, milliseconds); },
  leaseMs = DEFAULT_LEASE_MS,
  publicationWaitMs = DEFAULT_PUBLICATION_WAIT_MS,
  backoffMs = DEFAULT_BACKOFF_MS,
  onPublicationWait = ({ owner, waitMs }) => console.error(`PUBLICATION_WAIT owner=${owner} retry_in_ms=${waitMs}`),
} = {}) {
  const repo = path.resolve(repositoryRoot ?? process.cwd());
  const runGit = (args) => gitRunner(repo, args);
  const commonDir = getGitCommonDir(repo, gitRunner);
  const root = path.join(commonDir, ...COORDINATION_ROOT);
  const canonicalRoot = path.dirname(commonDir);
  const worktreesRoot = path.join(path.dirname(canonicalRoot), "CleanMyMap-worktrees");
  const ownPath = (runId) => path.join(worktreesRoot, runId);
  const publishPathFor = (runId) => path.join(worktreesRoot, ".publish", runId);
  const legacyRoot = getLegacyRoot(repo);
  const timestamp = () => new Date(now()).toISOString();

  function ensureMetadataRoot() {
    for (const folder of ["runs", "closed-runs", "claims", "locks"]) fs.mkdirSync(path.join(root, folder), { recursive: true });
  }

  function legacyState() { return { detected: fs.existsSync(legacyRoot), path: legacyRoot, status: fs.existsSync(legacyRoot) ? "LEGACY_COORDINATION_STATE" : null }; }

  function loadMigration() { return readOptionalJson(path.join(root, "migration.json")); }

  function init() {
    ensureMetadataRoot();
    const existing = loadMigration();
    if (existing) return { ...existing, legacyCoordinationState: legacyState() };
    const migration = { version: 3, initializedAt: timestamp(), mode: "LEGACY_UNOWNED", legacyUnowned: readDirtyPaths(repo, (_cwd, args) => runGit(args)).map((item) => normalizeRepoPath(repo, item)), legacyCoordinationState: legacyState() };
    metadataWriter(path.join(root, "migration.json"), migration);
    return migration;
  }

  function runWorktree(run) {
    const candidate = path.resolve(run.worktreePath ?? ownPath(run.runId));
    const parent = path.resolve(worktreesRoot);
    if (!isWithin(parent, candidate) || path.basename(candidate) !== run.runId) throw workspaceError("WORKTREE_PATH_INVALID", `run worktree is outside ${parent}: ${candidate}`);
    return candidate;
  }

  function ensureWorktree({ run, baseRef = "origin/main", migrateDirtyPaths = [] }) {
    const worktree = runWorktree(run);
    const branch = run.branchName ?? `codex/${run.runId}`;
    const listed = worktreeList(repo, gitRunner);
    const existing = listed.find((item) => path.resolve(item.path) === worktree);
    if (!existing) {
      fs.mkdirSync(path.dirname(worktree), { recursive: true });
      if (branchExists(repo, branch, gitRunner)) runGit(["worktree", "add", worktree, branch]);
      else runGit(["worktree", "add", "-b", branch, worktree, baseRef]);
    } else if (existing.branch && existing.branch !== `refs/heads/${branch}`) {
      throw workspaceError("WORKTREE_BRANCH_MISMATCH", `${worktree} is attached to ${existing.branch}`, { worktree, branch });
    }

    if (migrateDirtyPaths.length > 0) {
      const dirty = readDirtyPaths(repo, (_cwd, args) => runGit(args));
      const paths = normalizePaths(repo, migrateDirtyPaths);
      const tracked = paths.filter((item) => dirty.includes(item) && (() => { try { runGit(["ls-files", "--error-unmatch", "--", item]); return true; } catch { return false; } })());
      for (const item of tracked) {
        const patch = gitPatchRunner(repo, ["diff", "HEAD", "--binary", "--", item]);
        if (patch) gitInputRunner(worktree, ["apply", "--whitespace=nowarn", "-"], patch);
      }
      const untracked = dirty.filter((item) => paths.includes(item) && !(() => { try { runGit(["ls-files", "--error-unmatch", "--", item]); return true; } catch { return false; } })());
      for (const item of untracked) {
        const source = path.join(repo, item);
        const destination = path.join(worktree, item);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.cpSync(source, destination, { recursive: true, force: false });
      }
    }
    return worktree;
  }

  function loadRunWithLegacyMigration(runId) {
    ensureMetadataRoot();
    try { return loadRun(root, runId); } catch (error) {
      if (error.code !== "UNKNOWN_RUN") throw error;
      const legacy = readLegacyRun(repo, runId);
      if (!legacy) throw error;
      const intendedPaths = normalizePaths(repo, legacy.intendedPaths ?? legacy.ownedPaths ?? []);
      const refs = currentRefs(repo, gitRunner);
      const migrated = { version: 3, runId, domain: legacy.domain ?? "UNKNOWN", baseSha: refs.originMainSha, legacyBaseSha: legacy.baseSha ?? null, branchName: `codex/${runId}`, worktreePath: ownPath(runId), intendedPaths, startedAt: legacy.startedAt ?? timestamp(), updatedAt: timestamp(), heartbeatAt: timestamp(), state: "WORK", migratedFrom: "LEGACY_COORDINATION_STATE", publication: null };
      ensureWorktree({ run: migrated, migrateDirtyPaths: intendedPaths });
      metadataWriter(getRunPath(root, runId), migrated);
      return { run: migrated, filePath: getRunPath(root, runId) };
    }
  }

  function start({ runId, domain } = {}) {
    assertSafeSegment(runId, "run id");
    assertSafeSegment(domain, "domain");
    ensureMetadataRoot();
    if (readOptionalJson(getRunPath(root, runId))) throw workspaceError("RUN_EXISTS", `run ${runId} already exists`);
    runGit(["fetch", "origin", "main"]);
    const refs = assertMainReference(repo, gitRunner);
    const run = { version: 3, runId, domain, baseSha: refs.originMainSha, branchName: `codex/${runId}`, worktreePath: ownPath(runId), intendedPaths: [], startedAt: timestamp(), updatedAt: timestamp(), heartbeatAt: timestamp(), state: "WORK", publication: null };
    ensureWorktree({ run });
    metadataWriter(getRunPath(root, runId), run);
    return { ...run, legacyCoordinationState: legacyState() };
  }

  function claim({ runId, paths = [], adoptLegacy = false } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    const normalized = normalizePaths(repo, paths);
    if (normalized.length === 0) throw new Error("At least one path is required.");
    const intendedPaths = normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []);
    const migration = loadMigration() ?? init();
    const legacy = new Set(migration.legacyUnowned ?? []);
    const worktree = runWorktree({ ...run, worktreePath: run.worktreePath ?? ownPath(runId) });
    const dirty = new Set(readDirtyPaths(worktree, (cwd, args) => gitRunner(cwd, args)));
    const orphanDirty = normalized.filter((item) => dirty.has(item) && !intendedPaths.includes(item) && !legacy.has(item));
    if (orphanDirty.length > 0 && !adoptLegacy) throw workspaceError("ORPHAN_DIRTY", `dirty paths require explicit adoption: ${orphanDirty.join(", ")}`, { orphanDirty });

    if (CRITICAL_SCOPES.has(run.domain)) {
      const scopePath = scopeLockPath(root, run.domain);
      const current = readOptionalJson(scopePath);
      if (current && current.runId !== runId) throw workspaceError("CRITICAL_SCOPE_CONFLICT", `scope ${run.domain} is owned by ${current.runId}`, { owner: current.runId });
      if (!current) writeExclusive(scopePath, { version: 3, kind: "critical-scope", scope: run.domain, runId, heartbeatAt: timestamp() });
    }
    for (const repoPath of normalized) {
      const claim = { version: 3, kind: "advisory-claim", runId, intendedPath: repoPath, updatedAt: timestamp() };
      const existing = readOptionalJson(claimPath(root, repoPath));
      if (!existing || existing.runId === runId) metadataWriter(claimPath(root, repoPath), claim);
    }
    const next = { ...run, intendedPaths: normalizePaths(repo, [...intendedPaths, ...normalized]), updatedAt: timestamp(), heartbeatAt: timestamp(), adoptedLegacyPaths: adoptLegacy ? normalizePaths(repo, [...(run.adoptedLegacyPaths ?? []), ...orphanDirty]) : (run.adoptedLegacyPaths ?? []) };
    metadataWriter(filePath, next);
    return { ...next, ownedPaths: next.intendedPaths };
  }

  function unclaim({ runId, paths = [], returnLegacy = false } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    const normalized = normalizePaths(repo, paths);
    const intended = new Set(normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []));
    for (const item of normalized) if (!intended.has(item)) throw workspaceError("UNCLAIM_NOT_OWNED", `${item} is not intended by ${runId}`);
    const next = { ...run, intendedPaths: [...intended].filter((item) => !normalized.includes(item)).sort(), updatedAt: timestamp(), heartbeatAt: timestamp() };
    for (const item of normalized) if (readOptionalJson(claimPath(root, item))?.runId === runId) fs.unlinkSync(claimPath(root, item));
    if (returnLegacy) {
      const migration = loadMigration() ?? init();
      const legacy = new Set(migration.legacyUnowned ?? []);
      normalized.forEach((item) => legacy.add(item));
      metadataWriter(path.join(root, "migration.json"), { ...migration, legacyUnowned: [...legacy].sort() });
    }
    metadataWriter(filePath, next);
    return { ...next, ownedPaths: next.intendedPaths };
  }

  function staleCheck({ runId, fetch = true } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    if (fetch) runGit(["fetch", "origin", "main"]);
    const intended = normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []);
    const changedPaths = readChangedPaths(repo, run.baseSha, runGit(["rev-parse", "origin/main"]), (_cwd, args) => runGit(args)).filter((item) => intended.some((owned) => pathsOverlap(owned, normalizeRepoPath(repo, item))));
    const heartbeatAt = timestamp();
    metadataWriter(filePath, { ...run, updatedAt: heartbeatAt, heartbeatAt });
    return { runId, baseSha: run.baseSha, staleScope: changedPaths.length === 0 ? "PASS" : "FAIL", changedPaths };
  }

  function lockOwner() { return readOptionalJson(path.join(root, "publication.lock")); }

  function runWorktreeStatus(run) {
    const worktree = runWorktree(run);
    return { worktree, stagedPaths: readStagedPaths(worktree, (cwd, args) => gitRunner(cwd, args)).map((item) => normalizeRepoPath(repo, item)), dirtyPaths: readDirtyPaths(worktree, (cwd, args) => gitRunner(cwd, args)).map((item) => normalizeRepoPath(repo, item)) };
  }

  function recoverAbandonedLocks() {
    ensureMetadataRoot();
    const lockFile = path.join(root, "publication.lock");
    const lock = readOptionalJson(lockFile);
    if (!lock || !isLeaseExpired(lock, now, leaseMs)) return [];
    const owner = readOptionalJson(getRunPath(root, lock.runId));
    if (!owner) { fs.unlinkSync(lockFile); return [{ kind: "publication", runId: lock.runId, proof: "expired-without-run" }]; }
    if (runWorktreeStatus(owner).stagedPaths.length > 0) return [];
    fs.unlinkSync(lockFile);
    return [{ kind: "publication", runId: lock.runId, proof: "expired-and-no-staged-paths" }];
  }

  function publicationAcquire({ runId } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    ensureMetadataRoot();
    const lockFile = path.join(root, "publication.lock");
    const existing = lockOwner();
    if (existing?.runId === runId) {
      const heartbeatAt = timestamp();
      const nextLock = { ...existing, updatedAt: heartbeatAt, heartbeatAt };
      metadataWriter(lockFile, nextLock);
      metadataWriter(filePath, { ...run, publication: { ...(run.publication ?? {}), state: "ACQUIRED", lockAt: existing.acquiredAt }, updatedAt: heartbeatAt, heartbeatAt });
      return nextLock;
    }
    const started = now();
    let attempt = 0;
    while (true) {
      try {
        const acquiredAt = timestamp();
        const lock = { version: 3, kind: "global-publication", runId, acquiredAt, updatedAt: acquiredAt, heartbeatAt: acquiredAt };
        writeExclusive(lockFile, lock);
        try {
          runGit(["fetch", "origin", "main"]);
          const refs = assertMainReference(repo, gitRunner);
          const intended = normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []);
          const remoteChanged = readChangedPaths(repo, run.baseSha, refs.originMainSha, (_cwd, args) => runGit(args)).filter((item) => intended.some((owned) => pathsOverlap(owned, normalizeRepoPath(repo, item))));
          if (remoteChanged.length > 0) throw workspaceError("WORKSPACE_STALE", `intended paths changed since ${run.baseSha}: ${remoteChanged.join(", ")}`, { changedPaths: remoteChanged });
          metadataWriter(filePath, { ...run, intendedPaths: intended, publication: { state: "ACQUIRED", acquiredAt }, updatedAt: timestamp(), heartbeatAt: timestamp() });
          return lock;
        } catch (error) {
          if (lockOwner()?.runId === runId) fs.unlinkSync(lockFile);
          throw error;
        }
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        if (recoverAbandonedLocks().length > 0) continue;
        const owner = lockOwner()?.runId ?? "unknown";
        const remaining = publicationWaitMs - (now() - started);
        if (remaining <= 0) throw workspaceError("PUBLICATION_WAIT_TIMEOUT", `publication lock is owned by ${owner}`, { owner });
        const waitMs = Math.min(backoffMs[Math.min(attempt, backoffMs.length - 1)] ?? 1_000, remaining);
        onPublicationWait({ owner, waitMs, attempt: attempt + 1 });
        sleep(waitMs);
        attempt += 1;
      }
    }
  }

  function classifyResume(run) {
    const status = runWorktreeStatus(run);
    const branch = run.branchName ?? `codex/${run.runId}`;
    const headSha = gitAt(repo, run.worktreePath, ["rev-parse", "HEAD"], gitRunner);
    const originMainSha = runGit(["rev-parse", "origin/main"]);
    const intended = normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []);
    const foreignStaged = status.stagedPaths.filter((item) => !intended.some((owned) => pathsOverlap(owned, item)));
    if (foreignStaged.length > 0) throw workspaceError("PUBLICATION_RESUME_FOREIGN_STAGED", foreignStaged.join(", "), { foreignStaged });
    if (run.publication?.publishedSha && run.publication.publishedSha === originMainSha) return { state: "PUSHED_PENDING_COMPLETE", ...status, headSha, originMainSha, branch };
    if (status.stagedPaths.length > 0) return { state: "STAGED_PENDING", ...status, headSha, originMainSha, branch };
    if (headSha !== run.baseSha) {
      const candidatePaths = readChangedPaths(run.worktreePath, run.baseSha, headSha, (cwd, args) => gitRunner(cwd, args)).map((item) => normalizeRepoPath(repo, item));
      const foreign = candidatePaths.filter((item) => !intended.some((owned) => pathsOverlap(owned, item)));
      if (foreign.length > 0) throw workspaceError("PUBLICATION_RESUME_FOREIGN_COMMIT", foreign.join(", "), { foreign });
      return { state: "COMMITTED_PENDING", ...status, candidatePaths, headSha, originMainSha, branch };
    }
    return { state: "WORK", ...status, headSha, originMainSha, branch };
  }

  function resume({ runId } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    const migrated = !run.worktreePath;
    const nextRun = { ...run, branchName: run.branchName ?? `codex/${runId}`, worktreePath: run.worktreePath ?? ownPath(runId), intendedPaths: normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []) };
    ensureWorktree({ run: nextRun, migrateDirtyPaths: migrated ? nextRun.intendedPaths : [] });
    const classification = classifyResume(nextRun);
    const heartbeatAt = timestamp();
    const saved = { ...nextRun, state: classification.state, updatedAt: heartbeatAt, heartbeatAt };
    metadataWriter(filePath, saved);
    return { runId, state: classification.state, headSha: classification.headSha, originMainSha: classification.originMainSha, baseSha: saved.baseSha, branchName: saved.branchName, worktreePath: saved.worktreePath, stagedPaths: classification.stagedPaths, candidatePaths: classification.candidatePaths ?? [], publication: saved.publication ?? null, legacyCoordinationState: legacyState() };
  }

  function checkStaged({ runId } = {}) {
    if (!runId) throw workspaceError("RUN_ID_REQUIRED", "run id is required for staged validation");
    const { run } = loadRunWithLegacyMigration(runId);
    const status = runWorktreeStatus(run);
    const intended = normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []);
    const foreign = status.stagedPaths.filter((item) => !intended.some((owned) => pathsOverlap(owned, item)));
    if (foreign.length > 0) throw workspaceError("FOREIGN_STAGED", foreign.join(", "), { foreign });
    const lock = lockOwner();
    if (status.stagedPaths.length > 0 && lock?.runId !== runId) throw workspaceError("FOREIGN_STAGED", `publication lock is not held by ${runId}`);
    return { ok: true, stagedPaths: status.stagedPaths, worktreePath: status.worktree };
  }

  function ensurePublishWorktree(run) {
    const publishPath = path.resolve(run.publishWorktreePath ?? publishPathFor(run.runId));
    const branch = run.publishBranchName ?? `publish/${run.runId}`;
    const existing = worktreeList(repo, gitRunner).find((item) => path.resolve(item.path) === publishPath);
    if (!existing) {
      fs.mkdirSync(path.dirname(publishPath), { recursive: true });
      if (branchExists(repo, branch, gitRunner)) runGit(["worktree", "add", publishPath, branch]);
      else runGit(["worktree", "add", "-b", branch, publishPath, "origin/main"]);
    }
    return { publishPath, branch };
  }

  function cleanupOwnWorktrees(run) {
    for (const candidate of [run.publishWorktreePath ?? publishPathFor(run.runId), run.worktreePath ?? ownPath(run.runId)]) {
      if (!fs.existsSync(candidate)) continue;
      const dirty = readDirtyPaths(candidate, (cwd, args) => gitRunner(cwd, args));
      if (dirty.length > 0) throw workspaceError("WORKTREE_DIRTY", `${candidate}: ${dirty.join(", ")}`);
      runGit(["worktree", "remove", "--", candidate]);
    }
    for (const branch of [run.publishBranchName ?? `publish/${run.runId}`, run.branchName ?? `codex/${run.runId}`]) if (branchExists(repo, branch, gitRunner)) runGit(["branch", "-D", branch]);
  }

  function publicationIntegrate({ runId, push = true, signer = null } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    if (lockOwner()?.runId !== runId) throw workspaceError("PUBLICATION_LOCK_REQUIRED", `publication lock is not held by ${runId}`);
    const status = runWorktreeStatus(run);
    if (status.dirtyPaths.length > 0) throw workspaceError("WORKTREE_DIRTY", `run worktree is not committed: ${status.dirtyPaths.join(", ")}`);
    runGit(["fetch", "origin", "main"]);
    const { publishPath, branch } = ensurePublishWorktree(run);
    const runBranch = run.branchName ?? `codex/${runId}`;
    let fastForward = true;
    try { gitAt(repo, publishPath, ["merge-base", "--is-ancestor", "HEAD", runBranch], gitRunner); } catch { fastForward = false; }
    try {
      if (fastForward) gitAt(repo, publishPath, ["merge", "--ff-only", runBranch], gitRunner);
      else {
        const mergeArgs = ["merge", "--no-ff", "-S", ...(signer ? [`-S${signer}`] : []), "-m", `integrate ${runId} onto main`, runBranch];
        gitAt(repo, publishPath, mergeArgs, gitRunner);
      }
    } catch (error) {
      try { gitAt(repo, publishPath, ["merge", "--abort"], gitRunner); } catch { /* own publish worktree only */ }
      throw workspaceError("INTEGRATION_CONFLICT", `Git integration conflict for ${runId}`, { cause: error.message });
    }
    const publishedSha = gitAt(repo, publishPath, ["rev-parse", "HEAD"], gitRunner);
    if (push) gitAt(repo, publishPath, ["push", "origin", "HEAD:refs/heads/main"], gitRunner);
    const heartbeatAt = timestamp();
    metadataWriter(filePath, { ...run, publishWorktreePath: publishPath, publishBranchName: branch, publication: { ...(run.publication ?? {}), state: push ? "PUSHED_PENDING_COMPLETE" : "INTEGRATED_PENDING_PUSH", publishedSha, fastForward }, updatedAt: heartbeatAt, heartbeatAt });
    return { runId, publishedSha, fastForward, publishPath, publishBranchName: branch, pushed: push };
  }

  function publicationComplete({ runId } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    if (lockOwner()?.runId !== runId) throw workspaceError("PUBLICATION_LOCK_REQUIRED", `publication lock is not held by ${runId}`);
    runGit(["fetch", "origin", "main"]);
    const remote = runGit(["rev-parse", "origin/main"]);
    const publishedSha = run.publication?.publishedSha;
    if (!publishedSha || publishedSha !== remote) throw workspaceError("PUBLICATION_NOT_CONVERGED", `origin/main=${remote} published=${publishedSha ?? "none"}`, { remote, publishedSha });
    const completedAt = timestamp();
    const next = { ...run, state: "PUBLISHED", publication: { ...run.publication, state: "COMPLETE", completedAt }, publicationCompletedAt: completedAt, updatedAt: completedAt, heartbeatAt: completedAt };
    cleanupOwnWorktrees(next);
    metadataWriter(filePath, next);
    if (lockOwner()?.runId === runId) fs.unlinkSync(path.join(root, "publication.lock"));
    return { completed: true, runId, publishedSha, completedAt };
  }

  function publicationRelease({ runId } = {}) {
    const lock = lockOwner();
    if (!lock) return { released: false };
    if (lock.runId !== runId) throw workspaceError("PUBLICATION_LOCK_FOREIGN", `publication lock is owned by ${lock.runId}`);
    const { run } = loadRunWithLegacyMigration(runId);
    if (run.publication?.state !== "COMPLETE") throw workspaceError("PUBLICATION_COMPLETE_REQUIRED", `run ${runId} is not complete`);
    fs.unlinkSync(path.join(root, "publication.lock"));
    return { released: true, runId };
  }

  function publicationReconcile({ runId, publishedSha } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    if (lockOwner() && lockOwner().runId !== runId) throw workspaceError("PUBLICATION_LOCK_FOREIGN", `publication lock is owned by ${lockOwner().runId}`);
    runGit(["fetch", "origin", "main"]);
    const remote = runGit(["rev-parse", "origin/main"]);
    runGit(["merge-base", "--is-ancestor", publishedSha, remote]);
    const changed = readCommitPaths(repo, publishedSha, (_cwd, args) => runGit(args)).map((item) => normalizeRepoPath(repo, item));
    const intended = normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []);
    const foreign = changed.filter((item) => !intended.some((owned) => pathsOverlap(owned, item)));
    if (foreign.length > 0) throw workspaceError("PUBLISHED_PATH_NOT_OWNED", foreign.join(", "), { foreign });
    const completedAt = timestamp();
    metadataWriter(filePath, { ...run, state: "PUBLISHED", publication: { ...(run.publication ?? {}), state: "COMPLETE", publishedSha, completedAt }, publicationCompletedAt: completedAt, reconciledPublishedSha: publishedSha, updatedAt: completedAt, heartbeatAt: completedAt });
    return { reconciled: true, runId, publishedSha, changedPaths: changed, completedAt };
  }

  function heartbeat({ runId } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    const heartbeatAt = timestamp();
    const next = { ...run, updatedAt: heartbeatAt, heartbeatAt };
    metadataWriter(filePath, next);
    const lock = lockOwner();
    if (lock?.runId === runId) metadataWriter(path.join(root, "publication.lock"), { ...lock, updatedAt: heartbeatAt, heartbeatAt });
    return next;
  }

  function release({ runId } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    if (run.publication?.state && run.publication.state !== "COMPLETE") throw workspaceError("PUBLICATION_COMPLETE_REQUIRED", `run ${runId} requires publication completion`);
    for (const item of readClaims(root)) if (item.claim.runId === runId) fs.unlinkSync(item.filePath);
    if (readOptionalJson(scopeLockPath(root, run.domain))?.runId === runId) fs.unlinkSync(scopeLockPath(root, run.domain));
    if (lockOwner()?.runId === runId) fs.unlinkSync(path.join(root, "publication.lock"));
    fs.mkdirSync(path.dirname(getClosedRunPath(root, runId)), { recursive: true });
    metadataWriter(getClosedRunPath(root, runId), { ...run, closedAt: timestamp() });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { released: true, runId };
  }

  function status({ runId } = {}) {
    ensureMetadataRoot();
    const activeRuns = readRuns(root);
    const claims = readClaims(root);
    const migration = loadMigration();
    const result = { activeRuns: activeRuns.map((run) => ({ runId: run.runId, domain: run.domain, baseSha: run.baseSha, branchName: run.branchName, worktreePath: run.worktreePath, intendedPaths: run.intendedPaths ?? run.ownedPaths ?? [], ownedPaths: run.intendedPaths ?? run.ownedPaths ?? [], publication: run.publication ?? null })), ownedFiles: claims.length, advisoryClaims: claims.length, legacyUnowned: migration?.legacyUnowned?.length ?? 0, overlaps: [], publicationOwner: lockOwner()?.runId ?? null, orphanDirty: [], legacyCoordinationState: legacyState() };
    if (runId) {
      const { run } = loadRunWithLegacyMigration(runId);
      result.run = { runId, domain: run.domain, baseSha: run.baseSha, branchName: run.branchName, worktreePath: run.worktreePath, intendedPaths: run.intendedPaths ?? run.ownedPaths ?? [], ownedPaths: run.intendedPaths ?? run.ownedPaths ?? [], remoteChangedPaths: [] };
    }
    return result;
  }

  function doctor() {
    const report = status();
    const active = new Set(report.activeRuns.map((run) => run.runId));
    const publication = lockOwner();
    const publicationOrphan = Boolean(publication && !active.has(publication.runId));
    return { ...report, staleLocks: [], publicationOrphan, ok: !publicationOrphan };
  }

  return { init, start, claim, unclaim, staleCheck, resume, publicationAcquire, publicationIntegrate, publicationRelease, publicationComplete, publicationReconcile, heartbeat, recoverAbandonedLocks, release, status, checkStaged, doctor };
}

function parseArgs(argv) {
  const options = { paths: [] };
  let pathMode = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") { pathMode = true; continue; }
    if (pathMode) { options.paths.push(argument); continue; }
    if (argument === "--json") options.json = true;
    else if (argument === "--compact") options.compact = true;
    else if (argument === "--adopt-legacy") options.adoptLegacy = true;
    else if (argument === "--return-legacy") options.returnLegacy = true;
    else if (argument.startsWith("--")) { const [key, inlineValue] = argument.slice(2).split("=", 2); options[key.replaceAll("-", "_")] = inlineValue ?? argv[++index]; }
  }
  return options;
}

function printResult(result, { compact = false, json = false } = {}) {
  if (json || !compact || !result.activeRuns) { console.log(JSON.stringify(result, null, 2)); return; }
  console.log(`ACTIVE_RUNS=${result.activeRuns.length}`);
  console.log(`OWNED_FILES=${result.ownedFiles}`);
  console.log(`LEGACY_UNOWNED=${result.legacyUnowned}`);
  console.log(`OVERLAPS=${result.overlaps.length}`);
  console.log(`PUBLICATION_OWNER=${result.publicationOwner ?? "none"}`);
  console.log(`LEGACY_COORDINATION_STATE=${result.legacyCoordinationState?.status ?? "none"}`);
}

function main() {
  const [command = "status", ...argv] = process.argv.slice(2);
  const options = parseArgs(argv);
  const coordinator = createWorkspaceCoordinator({ repositoryRoot: process.cwd() });
  let result;
  if (command === "init") result = coordinator.init();
  else if (command === "start") result = coordinator.start({ runId: options.run_id, domain: options.domain });
  else if (command === "claim") result = coordinator.claim({ runId: options.run_id, paths: options.paths, adoptLegacy: options.adoptLegacy });
  else if (command === "unclaim") result = coordinator.unclaim({ runId: options.run_id, paths: options.paths, returnLegacy: options.returnLegacy });
  else if (command === "status") result = coordinator.status({ runId: options.run_id });
  else if (command === "stale-check") result = coordinator.staleCheck({ runId: options.run_id });
  else if (command === "resume") result = coordinator.resume({ runId: options.run_id });
  else if (command === "publication-acquire") result = coordinator.publicationAcquire({ runId: options.run_id });
  else if (command === "publication-integrate") result = coordinator.publicationIntegrate({ runId: options.run_id, push: options.push !== "false" });
  else if (command === "publication-complete") result = coordinator.publicationComplete({ runId: options.run_id });
  else if (command === "publication-reconcile") result = coordinator.publicationReconcile({ runId: options.run_id, publishedSha: options.published_sha });
  else if (command === "publication-release") result = coordinator.publicationRelease({ runId: options.run_id });
  else if (command === "heartbeat") result = coordinator.heartbeat({ runId: options.run_id });
  else if (command === "recover-abandoned") result = coordinator.recoverAbandonedLocks();
  else if (command === "release") result = coordinator.release({ runId: options.run_id });
  else if (command === "check-staged") result = coordinator.checkStaged({ runId: options.run_id });
  else if (command === "doctor") result = coordinator.doctor();
  else throw new Error(`Unknown workspace coordination command: ${command}`);
  printResult(result, options);
}

if (process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  try { main(); } catch (error) { console.error(`WORKSPACE_COORDINATION_FAILED: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
}
