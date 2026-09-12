import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const LEGACY_COORDINATION_ROOT = [".artifacts", "coordination"];
export const COORDINATION_ROOT = ["cleanmymap-workspace"];
export const CRITICAL_SCOPES = new Set(["AUTHZ_SECURITY"]);

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const DEFAULT_PUBLICATION_WAIT_MS = 5 * 60 * 1000;
const DEFAULT_LEASE_MS = 30 * 60 * 1000;
const DEFAULT_BACKOFF_MS = [30_000, 60_000, 120_000, 90_000];

function git(repositoryRoot, args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
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

function isStrictlyWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
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

function loadClosedRun(root, runId) {
  const filePath = getClosedRunPath(root, runId);
  const run = readOptionalJson(filePath);
  if (!run) throw workspaceError("UNKNOWN_RUN", `unknown run: ${runId}`);
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

export function verifyWorktreeMatchesTree({ gitCommonDir, worktree, tip }) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-worktree-index-"));
  const indexPath = path.join(temporaryRoot, "index");
  const environment = { ...process.env, GIT_DIR: path.resolve(gitCommonDir), GIT_WORK_TREE: path.resolve(worktree), GIT_INDEX_FILE: indexPath, GIT_OPTIONAL_LOCKS: "0" };
  const runGit = (args) => execFileSync("git", args, { cwd: path.resolve(worktree), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: environment, windowsHide: true }).trim();
  try {
    runGit(["read-tree", tip]);
    try { runGit(["update-index", "--refresh", "--ignore-submodules"]); } catch { /* changed tracked files are reported by diff-files below */ }
    const trackedDelta = runGit(["diff-files", "--name-status", "--", ":(exclude).git"]);
    const untracked = runGit(["ls-files", "--others", "--exclude-standard", "--", ":(exclude).git"]).split(/\r?\n/).filter((item) => item && item !== ".git");
    if (trackedDelta) throw workspaceError("ORPHAN_RUN_WORKTREE_CONTENT_MISMATCH", `worktree ${worktree} differs from ${tip}: ${trackedDelta}`, { worktree, tip, trackedDelta });
    if (untracked.length > 0) throw workspaceError("ORPHAN_RUN_WORKTREE_UNTRACKED", `worktree ${worktree} contains untracked files: ${untracked.join(", ")}`, { worktree, tip, untracked });
  } catch (error) {
    if (error?.code === "ORPHAN_RUN_WORKTREE_CONTENT_MISMATCH" || error?.code === "ORPHAN_RUN_WORKTREE_UNTRACKED") throw error;
    throw workspaceError("ORPHAN_RUN_WORKTREE_CONTENT_UNPROVABLE", `cannot prove worktree ${worktree} matches ${tip}: ${error instanceof Error ? error.message : String(error)}`, { worktree, tip, cause: error instanceof Error ? error.message : String(error) });
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
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
  worktreeTreeChecker = verifyWorktreeMatchesTree,
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

  function bootstrapStatus() {
    try {
      const branch = gitAt(repo, canonicalRoot, ["branch", "--show-current"], gitRunner);
      const dirtyPaths = readDirtyPaths(canonicalRoot, (cwd, args) => gitRunner(cwd, args));
      const stagedPaths = readStagedPaths(canonicalRoot, (cwd, args) => gitRunner(cwd, args));
      if (branch !== "main") return { state: "BOOTSTRAP_BRANCH_INVALID", path: canonicalRoot, branch, dirtyPaths, stagedPaths };
      if (dirtyPaths.length > 0 || stagedPaths.length > 0) return { state: "BOOTSTRAP_DIRTY", path: canonicalRoot, branch, dirtyPaths, stagedPaths };
      return { state: "CLEAN", path: canonicalRoot, branch, dirtyPaths, stagedPaths };
    } catch (error) {
      return { state: "BOOTSTRAP_UNAVAILABLE", path: canonicalRoot, error: error.message };
    }
  }

  function syncBootstrapAfterPublication() {
    const before = bootstrapStatus();
    if (before.state !== "CLEAN") return before;
    try {
      gitAt(repo, canonicalRoot, ["fetch", "origin", "main"], gitRunner);
      gitAt(repo, canonicalRoot, ["merge", "--ff-only", "origin/main"], gitRunner);
      const after = bootstrapStatus();
      if (after.state !== "CLEAN") return { ...after, state: "BOOTSTRAP_SYNC_BLOCKED" };
      return { ...after, state: "SYNCED", headSha: gitAt(repo, canonicalRoot, ["rev-parse", "HEAD"], gitRunner), originMainSha: gitAt(repo, canonicalRoot, ["rev-parse", "origin/main"], gitRunner) };
    } catch (error) {
      return { state: "BOOTSTRAP_SYNC_BLOCKED", path: canonicalRoot, error: error.message };
    }
  }

  function assertRunWorktreeReference(run) {
    const worktree = runWorktree(run);
    const branch = gitAt(repo, worktree, ["branch", "--show-current"], gitRunner);
    const expected = run.branchName ?? `codex/${run.runId}`;
    if (branch !== expected) throw workspaceError("WORKTREE_BRANCH_INVALID", `run worktree is on ${branch || "detached HEAD"}; expected ${expected}`, { branch, expected, worktree });
    return { worktree, branch };
  }

  function assertClosedRunRecoveryReference(run) {
    const worktree = runWorktree(run);
    const expectedBranch = `refs/heads/${run.branchName ?? `codex/${run.runId}`}`;
    const listed = worktreeList(repo, gitRunner).find((item) => path.resolve(item.path) === worktree);
    if (!listed || listed.branch !== expectedBranch || !fs.existsSync(worktree)) {
      throw workspaceError("CLOSED_RUN_RECOVERY_UNSAFE", `closed run ${run.runId} no longer has its recorded branch/worktree`, { runId: run.runId, worktree, expectedBranch });
    }
    return { worktree, branch: expectedBranch.slice("refs/heads/".length) };
  }

  function isAncestor(ancestor, descendant, repositoryRoot = repo) {
    if (!ancestor || !descendant) return false;
    try {
      gitAt(repo, repositoryRoot, ["merge-base", "--is-ancestor", ancestor, descendant], gitRunner);
      return true;
    } catch {
      return false;
    }
  }

  function removeRunClaimsAndLocks(runId, domain) {
    for (const item of readClaims(root)) if (item.claim.runId === runId && fs.existsSync(item.filePath)) fs.unlinkSync(item.filePath);
    const scopeFile = scopeLockPath(root, domain);
    if (readOptionalJson(scopeFile)?.runId === runId) fs.unlinkSync(scopeFile);
    const publicationFile = path.join(root, "publication.lock");
    if (lockOwner()?.runId === runId && fs.existsSync(publicationFile)) fs.unlinkSync(publicationFile);
  }

  function recoverAbandonedLocks() {
    ensureMetadataRoot();
    const recovered = [];
    const lockFile = path.join(root, "publication.lock");
    const lock = readOptionalJson(lockFile);
    if (lock && isLeaseExpired(lock, now, leaseMs)) {
      const owner = readOptionalJson(getRunPath(root, lock.runId));
      if (!owner) {
        fs.unlinkSync(lockFile);
        recovered.push({ kind: "publication", runId: lock.runId, proof: "expired-without-run" });
      } else if (runWorktreeStatus(owner).stagedPaths.length === 0) {
        fs.unlinkSync(lockFile);
        recovered.push({ kind: "publication", runId: lock.runId, proof: "expired-and-no-staged-paths" });
      }
    }
    const locksRoot = path.join(root, "locks");
    if (fs.existsSync(locksRoot)) {
      for (const file of fs.readdirSync(locksRoot).filter((item) => item.startsWith("scope-") && item.endsWith(".json"))) {
        const scopeFile = path.join(locksRoot, file);
        const scopeLock = readOptionalJson(scopeFile);
        if (!scopeLock || !isLeaseExpired(scopeLock, now, leaseMs)) continue;
        const owner = readOptionalJson(getRunPath(root, scopeLock.runId));
        if (!owner || isLeaseExpired(owner, now, leaseMs)) {
          fs.unlinkSync(scopeFile);
          recovered.push({ kind: "critical-scope", runId: scopeLock.runId, scope: scopeLock.scope, proof: owner ? "expired-run-lease" : "expired-without-run" });
        }
      }
    }
    return recovered;
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
          assertRunWorktreeReference(run);
          const intended = normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []);
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
    if (run.publication?.publishedSha) {
      if (isAncestor(run.publication.publishedSha, originMainSha)) return { state: "PUSHED_PENDING_COMPLETE", ...status, headSha, originMainSha, branch };
      if (run.publication.state === "PUSHED_PENDING_COMPLETE") throw workspaceError("PUBLICATION_RESUME_STALE", `published SHA ${run.publication.publishedSha} is not an ancestor of origin/main ${originMainSha}`, { publishedSha: run.publication.publishedSha, originMainSha });
    }
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
    let loaded;
    let closed = false;
    try {
      loaded = loadRunWithLegacyMigration(runId);
    } catch (error) {
      if (error.code !== "UNKNOWN_RUN") throw error;
      loaded = loadClosedRun(root, runId);
      closed = true;
    }
    if (closed) {
      if (loaded.run.publication?.state === "COMPLETE" || loaded.run.publication?.publishedSha) {
        throw workspaceError("CLOSED_RUN_RECOVERY_PUBLISHED", `closed run ${runId} is not an unpublished recovery candidate`);
      }
      assertClosedRunRecoveryReference(loaded.run);
    }
    const { run, filePath } = loaded;
    const migrated = !run.worktreePath;
    const nextRun = { ...run, branchName: run.branchName ?? `codex/${runId}`, worktreePath: run.worktreePath ?? ownPath(runId), intendedPaths: normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []) };
    if (!closed) ensureWorktree({ run: nextRun, migrateDirtyPaths: migrated ? nextRun.intendedPaths : [] });
    const classification = classifyResume(nextRun);
    const heartbeatAt = timestamp();
    const saved = { ...nextRun, state: classification.state, updatedAt: heartbeatAt, heartbeatAt };
    if (closed) {
      const activePath = getRunPath(root, runId);
      metadataWriter(activePath, saved);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      metadataWriter(filePath, saved);
    }
    return { runId, state: classification.state, headSha: classification.headSha, originMainSha: classification.originMainSha, baseSha: saved.baseSha, branchName: saved.branchName, worktreePath: saved.worktreePath, stagedPaths: classification.stagedPaths, candidatePaths: classification.candidatePaths ?? [], publication: saved.publication ?? null, legacyCoordinationState: legacyState() };
  }

  function checkStaged({ runId } = {}) {
    if (!runId) throw workspaceError("RUN_ID_REQUIRED", "run id is required for staged validation");
    const { run } = loadRunWithLegacyMigration(runId);
    const status = runWorktreeStatus(run);
    const intended = normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []);
    const foreign = status.stagedPaths.filter((item) => !intended.some((owned) => pathsOverlap(owned, item)));
    if (foreign.length > 0) throw workspaceError("FOREIGN_STAGED", foreign.join(", "), { foreign });
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
    const currentDirectory = path.resolve(process.cwd());
    const listedPaths = new Set(worktreeList(repo, gitRunner).map((item) => path.resolve(item.path)));
    const canonicalPublishPath = path.resolve(publishPathFor(run.runId));
    const recordedPublishPath = path.resolve(run.publishWorktreePath ?? canonicalPublishPath);
    const canonicalRunPath = path.resolve(ownPath(run.runId));
    const recordedRunPath = path.resolve(run.worktreePath ?? canonicalRunPath);

    function assertOrphanPublicationWorktree(candidate) {
      if (path.resolve(candidate) !== canonicalPublishPath || recordedPublishPath !== canonicalPublishPath) {
        throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree path is not canonical for ${run.runId}`, { runId: run.runId, worktree: candidate, canonicalPublishPath, recordedPublishPath });
      }

      const publishRoot = path.resolve(worktreesRoot, ".publish");
      if (!isStrictlyWithin(publishRoot, path.resolve(candidate)) || path.basename(path.resolve(candidate)) !== run.runId) {
        throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree path is outside the canonical run directory`, { runId: run.runId, worktree: candidate, publishRoot });
      }

      let candidateStat;
      try { candidateStat = fs.lstatSync(candidate); } catch (error) { throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree cannot be inspected: ${error.message}`, { runId: run.runId, worktree: candidate }); }
      if (!candidateStat.isDirectory() || candidateStat.isSymbolicLink()) throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree is not a real directory`, { runId: run.runId, worktree: candidate });

      const gitFile = path.join(candidate, ".git");
      let gitFileStat;
      try { gitFileStat = fs.lstatSync(gitFile); } catch (error) { throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree .git file is unavailable: ${error.message}`, { runId: run.runId, worktree: candidate }); }
      if (!gitFileStat.isFile() || gitFileStat.isSymbolicLink()) throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree .git must be a regular gitdir file`, { runId: run.runId, worktree: candidate });

      const gitFileContents = fs.readFileSync(gitFile, "utf8").trim();
      const gitdirMatch = /^gitdir:[ \t]*(.+)$/u.exec(gitFileContents);
      if (!gitdirMatch) throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree .git has no canonical gitdir pointer`, { runId: run.runId, worktree: candidate });

      const gitCommonDir = path.resolve(getGitCommonDir(repo, gitRunner));
      const administrativeRoot = path.resolve(gitCommonDir, "worktrees");
      const administrativePath = path.resolve(path.dirname(gitFile), gitdirMatch[1]);
      if (!isStrictlyWithin(administrativeRoot, administrativePath)) throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree gitdir points outside the repository worktree metadata`, { runId: run.runId, worktree: candidate, administrativePath, administrativeRoot });

      let administrativeExists = false;
      try { fs.lstatSync(administrativePath); administrativeExists = true; } catch (error) { if (error.code !== "ENOENT") throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree administrative descriptor cannot be checked: ${error.message}`, { runId: run.runId, worktree: candidate, administrativePath }); }
      if (administrativeExists) throw workspaceError("ORPHAN_PUBLICATION_WORKTREE_REFUSED", `publication worktree administrative descriptor still exists`, { runId: run.runId, worktree: candidate, administrativePath });

      const publishedSha = run.publication?.publishedSha;
      const originMain = runGit(["rev-parse", "origin/main"]);
      if (!publishedSha || !isAncestor(publishedSha, originMain)) throw workspaceError("PUBLICATION_NOT_CONVERGED", `published SHA ${publishedSha ?? "none"} is not an ancestor of origin/main ${originMain}`, { runId: run.runId, publishedSha, originMain });

      return { publishedSha, originMain };
    }

    function assertOrphanRunWorktree(candidate) {
      if (run.publication?.state !== "COMPLETE") throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run ${run.runId} is not COMPLETE`, { runId: run.runId, state: run.publication?.state ?? null, worktree: candidate });
      if (path.resolve(candidate) !== canonicalRunPath || recordedRunPath !== canonicalRunPath) throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run worktree path is not canonical for ${run.runId}`, { runId: run.runId, worktree: candidate, canonicalRunPath, recordedRunPath });
      const expectedBranch = `codex/${run.runId}`;
      if ((run.branchName ?? expectedBranch) !== expectedBranch) throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run branch is not canonical for ${run.runId}`, { runId: run.runId, branchName: run.branchName ?? null, expectedBranch });

      let candidateStat;
      try { candidateStat = fs.lstatSync(candidate); } catch (error) { throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run worktree cannot be inspected: ${error.message}`, { runId: run.runId, worktree: candidate }); }
      if (!candidateStat.isDirectory() || candidateStat.isSymbolicLink()) throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run worktree is not a real directory`, { runId: run.runId, worktree: candidate });

      const gitFile = path.join(candidate, ".git");
      let gitFileStat = null;
      try { gitFileStat = fs.lstatSync(gitFile); } catch (error) { if (error.code !== "ENOENT") throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run worktree .git cannot be checked: ${error.message}`, { runId: run.runId, worktree: candidate }); }
      if (gitFileStat) {
        if (!gitFileStat.isFile() || gitFileStat.isSymbolicLink()) throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run worktree .git must be absent or a regular gitdir file`, { runId: run.runId, worktree: candidate });
        const gitFileContents = fs.readFileSync(gitFile, "utf8").trim();
        const gitdirMatch = /^gitdir:[ \t]*(.+)$/u.exec(gitFileContents);
        if (!gitdirMatch) throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run worktree .git has no canonical gitdir pointer`, { runId: run.runId, worktree: candidate });
        const gitCommonDir = path.resolve(getGitCommonDir(repo, gitRunner));
        const administrativeRoot = path.resolve(gitCommonDir, "worktrees");
        const administrativePath = path.resolve(path.dirname(gitFile), gitdirMatch[1]);
        if (!isStrictlyWithin(administrativeRoot, administrativePath)) throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run worktree gitdir points outside the repository worktree metadata`, { runId: run.runId, worktree: candidate, administrativePath, administrativeRoot });
        try { fs.lstatSync(administrativePath); throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run worktree administrative descriptor still exists`, { runId: run.runId, worktree: candidate, administrativePath }); } catch (error) {
          if (error?.code !== "ENOENT") throw error;
        }
      }

      const publishedSha = run.publication?.publishedSha;
      const originMain = runGit(["rev-parse", "origin/main"]);
      if (!publishedSha || !isAncestor(publishedSha, originMain)) throw workspaceError("PUBLICATION_NOT_CONVERGED", `published SHA ${publishedSha ?? "none"} is not an ancestor of origin/main ${originMain}`, { runId: run.runId, publishedSha, originMain });
      const branchRef = `refs/heads/${expectedBranch}`;
      let branchTip;
      try { branchTip = runGit(["rev-parse", "--verify", branchRef]); } catch (error) { throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run branch ${branchRef} does not exist`, { runId: run.runId, branchRef, cause: error instanceof Error ? error.message : String(error) }); }
      if (!isAncestor(branchTip, originMain)) throw workspaceError("ORPHAN_RUN_WORKTREE_REFUSED", `run branch ${branchRef} is not published on origin/main`, { runId: run.runId, branchRef, branchTip, originMain });
      worktreeTreeChecker({ gitCommonDir: getGitCommonDir(repo, gitRunner), worktree: candidate, tip: branchTip });
      return { publishedSha, originMain, branchTip };
    }

    const cleanupPlan = [];
    for (const candidate of [run.publishWorktreePath ?? publishPathFor(run.runId), run.worktreePath ?? ownPath(run.runId)]) {
      if (!fs.existsSync(candidate)) continue;
      if (!listedPaths.has(path.resolve(candidate))) {
        if (path.resolve(candidate) === canonicalPublishPath && recordedPublishPath === canonicalPublishPath) {
          assertOrphanPublicationWorktree(candidate);
          cleanupPlan.push({ kind: "orphan-publication", candidate });
        } else if (path.resolve(candidate) === canonicalRunPath && recordedRunPath === canonicalRunPath) {
          assertOrphanRunWorktree(candidate);
          cleanupPlan.push({ kind: "orphan-run", candidate });
        } else throw workspaceError("WORKTREE_NOT_REGISTERED", `run worktree is not registered by Git: ${candidate}`, { runId: run.runId, worktree: candidate });
        continue;
      }
      const dirty = readDirtyPaths(candidate, (cwd, args) => gitRunner(cwd, args));
      if (dirty.length > 0) throw workspaceError("WORKTREE_DIRTY", `${candidate}: ${dirty.join(", ")}`);
      cleanupPlan.push({ kind: "registered", candidate });
    }

    for (const { kind, candidate } of cleanupPlan) {
      if (kind === "orphan-publication") {
        fs.rmSync(candidate, { recursive: true, force: false });
        continue;
      }
      if (kind === "orphan-run") {
        fs.rmSync(candidate, { recursive: true, force: false });
        continue;
      }
      // The command may itself run from the run worktree. Use the canonical
      // bootstrap as Git's cwd so removing the target cannot fail on Windows.
      if (isWithin(path.resolve(candidate), currentDirectory)) process.chdir(canonicalRoot);
      gitRunner(canonicalRoot, ["worktree", "remove", "--", candidate]);
    }
    for (const branch of [run.publishBranchName ?? `publish/${run.runId}`, run.branchName ?? `codex/${run.runId}`]) if (branchExists(canonicalRoot, branch, gitRunner)) gitRunner(canonicalRoot, ["branch", "-D", branch]);
  }

  function assertRunIsEmptyAndAbandoned(run) {
    const ownStatus = runWorktreeStatus(run);
    if (ownStatus.dirtyPaths.length > 0 || ownStatus.stagedPaths.length > 0) {
      throw workspaceError("WORKTREE_DIRTY", `run worktree is not clean: ${[...new Set([...ownStatus.dirtyPaths, ...ownStatus.stagedPaths])].join(", ")}`);
    }
    const ownHead = gitAt(repo, ownStatus.worktree, ["rev-parse", "HEAD"], gitRunner);
    if (ownHead !== run.baseSha) throw workspaceError("UNPUBLISHED_WORK", `run ${run.runId} contains an unpublished commit ${ownHead}`, { runId: run.runId, headSha: ownHead, baseSha: run.baseSha });

    const publishPath = path.resolve(run.publishWorktreePath ?? publishPathFor(run.runId));
    if (!fs.existsSync(publishPath)) return;
    const publishStatus = { stagedPaths: readStagedPaths(publishPath, (cwd, args) => gitRunner(cwd, args)), dirtyPaths: readDirtyPaths(publishPath, (cwd, args) => gitRunner(cwd, args)) };
    if (publishStatus.dirtyPaths.length > 0 || publishStatus.stagedPaths.length > 0) {
      throw workspaceError("WORKTREE_DIRTY", `publish worktree is not clean: ${[...new Set([...publishStatus.dirtyPaths, ...publishStatus.stagedPaths])].join(", ")}`, { worktree: publishPath });
    }
    const publishHead = gitAt(repo, publishPath, ["rev-parse", "HEAD"], gitRunner);
    const originMain = runGit(["rev-parse", "origin/main"]);
    if (publishHead !== originMain) throw workspaceError("UNPUBLISHED_WORK", `publish worktree ${publishPath} contains ${publishHead}`, { runId: run.runId, publishHead, originMain });
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
    const originMain = gitAt(repo, publishPath, ["rev-parse", "origin/main"], gitRunner);
    if (!isAncestor(originMain, "HEAD", publishPath)) {
      try {
        gitAt(repo, publishPath, ["merge", "--ff-only", "origin/main"], gitRunner);
      } catch {
        try {
          const mergeArgs = ["merge", "--no-ff", "-S", ...(signer ? [`-S${signer}`] : []), "-m", `integrate origin/main before ${runId}`, "origin/main"];
          gitAt(repo, publishPath, mergeArgs, gitRunner);
        } catch (error) {
          try { gitAt(repo, publishPath, ["merge", "--abort"], gitRunner); } catch { /* own publish worktree only */ }
          throw workspaceError("INTEGRATION_CONFLICT", `Git integration conflict for ${runId}`, { cause: error.message });
        }
      }
    }
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
    ensureMetadataRoot();
    const activePath = getRunPath(root, runId);
    const active = readOptionalJson(activePath);
    if (!active) {
      const closed = readOptionalJson(getClosedRunPath(root, runId));
      if (closed?.publication?.state === "COMPLETE") {
        runGit(["fetch", "origin", "main"]);
        const remote = runGit(["rev-parse", "origin/main"]);
        if (!isAncestor(closed.publication.publishedSha, remote)) throw workspaceError("PUBLICATION_NOT_CONVERGED", `origin/main=${remote} published=${closed.publication.publishedSha ?? "none"}`, { remote, publishedSha: closed.publication.publishedSha });
        return { completed: true, idempotent: true, runId, publishedSha: closed.publication.publishedSha, completedAt: closed.publicationCompletedAt ?? closed.closedAt, bootstrapSync: closed.bootstrapSync ?? null };
      }
    }
    const { run, filePath } = active ? { run: active, filePath: activePath } : loadRunWithLegacyMigration(runId);
    if (run.publication?.state !== "COMPLETE" && lockOwner()?.runId !== runId) throw workspaceError("PUBLICATION_LOCK_REQUIRED", `publication lock is not held by ${runId}`);
    runGit(["fetch", "origin", "main"]);
    const remote = runGit(["rev-parse", "origin/main"]);
    const publishedSha = run.publication?.publishedSha;
    if (!publishedSha || !isAncestor(publishedSha, remote)) throw workspaceError("PUBLICATION_NOT_CONVERGED", `origin/main=${remote} published=${publishedSha ?? "none"}`, { remote, publishedSha });
    return finalizeRun({ run, filePath, publishedSha });
  }

  function finalizeRun({ run, filePath, publishedSha }) {
    const completedAt = run.publicationCompletedAt ?? timestamp();
    const next = { ...run, state: "PUBLISHED", publication: { ...run.publication, state: "COMPLETE", publishedSha, completedAt }, publicationCompletedAt: completedAt, updatedAt: completedAt, heartbeatAt: completedAt };
    metadataWriter(filePath, next);
    cleanupOwnWorktrees(next);
    const bootstrapSync = syncBootstrapAfterPublication();
    metadataWriter(getClosedRunPath(root, run.runId), { ...next, bootstrapSync, closedAt: next.closedAt ?? timestamp() });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    removeRunClaimsAndLocks(run.runId, run.domain);
    return { completed: true, runId: run.runId, publishedSha, completedAt, bootstrapSync };
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
    if (!isAncestor(publishedSha, remote)) throw workspaceError("PUBLICATION_NOT_CONVERGED", `published SHA ${publishedSha} is not an ancestor of origin/main ${remote}`, { publishedSha, remote });
    const changed = readCommitPaths(repo, publishedSha, (_cwd, args) => runGit(args)).map((item) => normalizeRepoPath(repo, item));
    const intended = normalizePaths(repo, run.intendedPaths ?? run.ownedPaths ?? []);
    const foreign = changed.filter((item) => !intended.some((owned) => pathsOverlap(owned, item)));
    if (foreign.length > 0) throw workspaceError("PUBLISHED_PATH_NOT_OWNED", foreign.join(", "), { foreign });
    const result = finalizeRun({ run: { ...run, reconciledPublishedSha: publishedSha }, filePath, publishedSha });
    return { ...result, reconciled: true, changedPaths: changed };
  }

  function heartbeat({ runId } = {}) {
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    const heartbeatAt = timestamp();
    const next = { ...run, updatedAt: heartbeatAt, heartbeatAt };
    metadataWriter(filePath, next);
    const lock = lockOwner();
    if (lock?.runId === runId) metadataWriter(path.join(root, "publication.lock"), { ...lock, updatedAt: heartbeatAt, heartbeatAt });
    if (CRITICAL_SCOPES.has(run.domain)) {
      const scopeFile = scopeLockPath(root, run.domain);
      const scope = readOptionalJson(scopeFile);
      if (scope?.runId === runId) metadataWriter(scopeFile, { ...scope, updatedAt: heartbeatAt, heartbeatAt });
    }
    return next;
  }

  function release({ runId } = {}) {
    const activePath = getRunPath(root, runId);
    if (!fs.existsSync(activePath)) return readOptionalJson(getClosedRunPath(root, runId)) ? { released: false, idempotent: true, runId } : loadRunWithLegacyMigration(runId);
    const { run, filePath } = loadRunWithLegacyMigration(runId);
    if (run.publication?.state && run.publication.state !== "COMPLETE") throw workspaceError("PUBLICATION_COMPLETE_REQUIRED", `run ${runId} requires publication completion`);
    if (run.publication?.state === "COMPLETE") return finalizeRun({ run, filePath, publishedSha: run.publication.publishedSha });
    assertRunIsEmptyAndAbandoned(run);
    cleanupOwnWorktrees(run);
    removeRunClaimsAndLocks(runId, run.domain);
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
    const activeRuns = readRuns(root);
    const active = new Map(activeRuns.map((run) => [run.runId, run]));
    const closedRuns = readRuns(root, "closed-runs");
    const publication = lockOwner();
    const staleLocks = [];
    const publicationOrphan = Boolean(publication && (!active.has(publication.runId) || isLeaseExpired(publication, now, leaseMs)));
    if (publicationOrphan) staleLocks.push({ kind: "publication", runId: publication.runId, reason: active.has(publication.runId) ? "expired" : "orphan" });
    const locksRoot = path.join(root, "locks");
    if (fs.existsSync(locksRoot)) for (const file of fs.readdirSync(locksRoot).filter((item) => item.startsWith("scope-") && item.endsWith(".json"))) {
      const scope = readOptionalJson(path.join(locksRoot, file));
      if (!scope) continue;
      const orphan = !active.has(scope.runId);
      const expired = isLeaseExpired(scope, now, leaseMs);
      if (orphan || expired) staleLocks.push({ kind: "critical-scope", scope: scope.scope, runId: scope.runId, reason: orphan ? "orphan" : "expired" });
    }
    const listed = worktreeList(repo, gitRunner);
    const listedPaths = new Set(listed.map((item) => path.resolve(item.path)));
    const bootstrap = bootstrapStatus();
    const missingWorktrees = [];
    for (const run of activeRuns) {
      for (const candidate of [run.worktreePath ?? ownPath(run.runId), ...(run.publishWorktreePath ? [run.publishWorktreePath] : [])]) {
        if (!listedPaths.has(path.resolve(candidate)) || !fs.existsSync(candidate)) missingWorktrees.push({ runId: run.runId, path: candidate });
      }
    }
    const coordinatorWorktrees = listed.filter((item) => isWithin(worktreesRoot, path.resolve(item.path)) && (item.branch?.startsWith("refs/heads/codex/") || item.branch?.startsWith("refs/heads/publish/")));
    const orphanWorktrees = coordinatorWorktrees.filter((item) => {
      const prefix = item.branch.startsWith("refs/heads/codex/") ? "refs/heads/codex/" : "refs/heads/publish/";
      const runId = item.branch.slice(prefix.length);
      return !active.has(runId);
    }).map((item) => ({ path: item.path, branch: item.branch }));
    const coordinatorWorktreeOrphan = orphanWorktrees.length > 0;
    const closedRunWorktrees = [];
    const prematurelyClosedRuns = [];
    const completedRunWorktreesDirty = [];
    const abandonedUnpublishedCommits = [];
    for (const run of closedRuns) {
      const candidates = [
        { kind: "run", path: path.resolve(run.worktreePath ?? ownPath(run.runId)), branchName: run.branchName ?? `codex/${run.runId}` },
        ...(run.publishWorktreePath ? [{ kind: "publish", path: path.resolve(run.publishWorktreePath), branchName: run.publishBranchName ?? `publish/${run.runId}` }] : []),
      ];
      for (const candidate of candidates) {
        const listedWorktree = listed.find((item) => path.resolve(item.path) === candidate.path);
        if (listedWorktree || fs.existsSync(candidate.path)) closedRunWorktrees.push({ runId: run.runId, kind: candidate.kind, path: candidate.path, branch: listedWorktree?.branch ?? null });
        if (!listedWorktree || !fs.existsSync(candidate.path)) continue;
        try {
          const status = { stagedPaths: readStagedPaths(candidate.path, (cwd, args) => gitRunner(cwd, args)), dirtyPaths: readDirtyPaths(candidate.path, (cwd, args) => gitRunner(cwd, args)) };
          const head = gitAt(repo, candidate.path, ["rev-parse", "HEAD"], gitRunner);
          const hasWork = status.dirtyPaths.length > 0 || status.stagedPaths.length > 0 || (candidate.kind === "run" && head !== run.baseSha);
          if (run.publication?.state === "COMPLETE") {
            if (status.dirtyPaths.length > 0 || status.stagedPaths.length > 0) completedRunWorktreesDirty.push({ runId: run.runId, kind: candidate.kind, path: candidate.path, headSha: head, dirtyPaths: status.dirtyPaths, stagedPaths: status.stagedPaths });
          } else if (hasWork) {
            const finding = { runId: run.runId, kind: candidate.kind, path: candidate.path, headSha: head, baseSha: run.baseSha, dirtyPaths: status.dirtyPaths, stagedPaths: status.stagedPaths };
            prematurelyClosedRuns.push(finding);
            if (candidate.kind === "run" && head !== run.baseSha) abandonedUnpublishedCommits.push(finding);
          }
        } catch (error) {
          prematurelyClosedRuns.push({ runId: run.runId, kind: candidate.kind, path: candidate.path, reason: error.code ?? "WORKTREE_INSPECTION_FAILED" });
        }
      }
    }
    const worktreesWithoutActiveMetadata = orphanWorktrees;
    const closedIds = new Set(closedRuns.map((run) => run.runId));
    const worktreesWithoutRun = orphanWorktrees.filter((item) => {
      const prefix = item.branch.startsWith("refs/heads/codex/") ? "refs/heads/codex/" : "refs/heads/publish/";
      return !closedIds.has(item.branch.slice(prefix.length));
    });
    const metadataAcquiredWithoutMutex = activeRuns.filter((run) => run.publication?.state === "ACQUIRED" && publication?.runId !== run.runId).map((run) => ({ runId: run.runId, mutexOwner: publication?.runId ?? null }));
    const lifecycleResidues = bootstrap.state !== "CLEAN" || closedRunWorktrees.length > 0 || worktreesWithoutActiveMetadata.length > 0 || worktreesWithoutRun.length > 0 || prematurelyClosedRuns.length > 0 || completedRunWorktreesDirty.length > 0 || abandonedUnpublishedCommits.length > 0 || metadataAcquiredWithoutMutex.length > 0;
    return {
      ...report,
      bootstrap,
      staleLocks,
      publicationOrphan,
      missingWorktrees,
      orphanWorktrees,
      coordinatorWorktreeOrphan,
      closedRunWorktrees,
      worktreesWithoutActiveMetadata,
      worktreesWithoutRun,
      prematurelyClosedRuns,
      completedRunWorktreesDirty,
      abandonedUnpublishedCommits,
      metadataAcquiredWithoutMutex,
      ok: staleLocks.length === 0 && missingWorktrees.length === 0 && orphanWorktrees.length === 0 && !lifecycleResidues,
    };
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
