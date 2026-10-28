import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { gitExecutable } from "./git-executable.mjs";
import { resolvePathWithinRoot } from "./safe-paths.mjs";

const VALIDATION_EVIDENCE_VERSION = 2;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const WINDOWS_CLEANUP_RETRIES = 5;
const WINDOWS_CLEANUP_RETRY_DELAY_MS = 50;
const TRANSIENT_CLEANUP_ERRORS = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);
export const VALIDATION_EVIDENCE_RELATIVE_ROOT = path.join(
  "artifacts",
  "validation",
  "mode-evidence",
);
const FULL_VALIDATION_EVIDENCE_RELATIVE_ROOT = path.join(
  "artifacts",
  "validation",
  "full",
);
const FULL_VALIDATION_LOCK_RELATIVE_PATH = path.join(
  FULL_VALIDATION_EVIDENCE_RELATIVE_ROOT,
  "running.json",
);

function normalizePath(file) {
  return String(file).replaceAll("\\", "/").replace(/^\.\//, "");
}

function gitHead(repositoryRoot) {
  try {
    return execFileSync(gitExecutable(), ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "NO_GIT_HEAD";
  }
}

export function getCandidateSha(repositoryRoot = process.cwd()) {
  return gitHead(repositoryRoot);
}

function readStagedFile(repositoryRoot, relativePath) {
  const safeRelativePath = normalizeCandidatePath(repositoryRoot, relativePath);
  try {
    return execFileSync(gitExecutable(), ["show", `:${safeRelativePath}`], {
      cwd: repositoryRoot,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (error) {
    try {
      execFileSync(gitExecutable(), ["ls-files", "--cached", "--error-unmatch", "--", safeRelativePath], {
        cwd: repositoryRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch (indexError) {
      if (indexError?.status === 1) return null;
      throw new Error(`Unable to inspect staged candidate path ${safeRelativePath}: ${indexError instanceof Error ? indexError.message : String(indexError)}`);
    }
    throw new Error(`Unable to read staged candidate path ${safeRelativePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readCandidateFile(repositoryRoot, relativePath, candidateScope) {
  const safeRelativePath = normalizeCandidatePath(repositoryRoot, relativePath);
  if (candidateScope === "STAGED") return readStagedFile(repositoryRoot, safeRelativePath);
  const absolutePath = resolvePathWithinRoot(repositoryRoot, safeRelativePath, { label: "validation candidate" });
  try {
    return fs.readFileSync(absolutePath);
  } catch {
    return null;
  }
}

function normalizeCandidatePath(repositoryRoot, relativePath) {
  const normalized = normalizePath(relativePath);
  return path.relative(
    path.resolve(repositoryRoot),
    resolvePathWithinRoot(repositoryRoot, normalized, { label: "validation candidate" }),
  ).replaceAll("\\", "/");
}

function readGitLines(repositoryRoot, args, { allowFailure = true } = {}) {
  try {
    return execFileSync(gitExecutable(), args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    if (!allowFailure) throw error;
    return [];
  }
}

export function getWorktreeCandidateFiles(repositoryRoot = process.cwd()) {
  return [...new Set([
    ...readGitLines(repositoryRoot, ["diff", "--name-only", "HEAD", "--"]),
    ...readGitLines(repositoryRoot, ["diff", "--cached", "--name-only", "--"]),
    ...readGitLines(repositoryRoot, ["ls-files", "--others", "--exclude-standard"]),
  ].map(normalizePath))].sort((left, right) => left.localeCompare(right, "en"));
}

function getStagedCandidateFiles(repositoryRoot = process.cwd()) {
  try {
    return [...new Set(
      readGitLines(repositoryRoot, ["diff", "--cached", "--name-only", "--"], { allowFailure: false }).map(normalizePath),
    )].sort((left, right) => left.localeCompare(right, "en"));
  } catch (error) {
    throw new Error(`STAGED candidate files could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const COVERAGE_IDENTITY_VERSION = 1;
const COVERAGE_CONTROL_PATHS = Object.freeze([
  "scripts/ci/",
  "scripts/checks/coverage-",
  "scripts/checks/check-coverage",
  "scripts/checks/write-coverage",
]);
const NODE_COVERAGE_PATHS = Object.freeze([
  "scripts/",
  "apps/web/scripts/",
  "package.json",
  "package-lock.json",
  "apps/web/package.json",
  "apps/web/package-lock.json",
]);
const PYTHON_COVERAGE_PATHS = Object.freeze([
  "maintenance/python/src/",
  "maintenance/python/scripts/",
  "maintenance/python/tests/",
  "maintenance/python/pyproject.toml",
  "maintenance/python/setup.cfg",
  "maintenance/python/pytest.ini",
  "maintenance/python/tox.ini",
  "maintenance/python/requirements",
  ...COVERAGE_CONTROL_PATHS,
]);

function isCoveragePathForScope(file, scope) {
  const normalized = normalizePath(file);
  const prefixes = scope === "node" ? NODE_COVERAGE_PATHS : scope === "python" ? PYTHON_COVERAGE_PATHS : [];
  return prefixes.some((prefix) => normalized === prefix || normalized.startsWith(prefix));
}

function gitTreeSha(repositoryRoot, candidateSha) {
  try {
    return execFileSync(gitExecutable(), ["rev-parse", `${candidateSha}^{tree}`], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export function getCoverageCandidateTreeSha(repositoryRoot = process.cwd(), candidateSha) {
  return gitTreeSha(repositoryRoot, candidateSha);
}

export function assertCoverageCandidateIdentity({
  repositoryRoot = process.cwd(),
  candidateSha,
  candidateScope,
  scope,
  expectedIdentity = null,
} = {}) {
  const normalizedScope = String(scope ?? "").toLowerCase();
  if (!["node", "python"].includes(normalizedScope)) {
    throw new Error(`Coverage candidate identity is unsupported for scope: ${scope ?? "<missing>"}.`);
  }
  const normalizedCandidateScope = String(candidateScope ?? "").toUpperCase();
  if (!["WORKTREE", "DYNAMIC_CANDIDATE", "CI_CANDIDATE"].includes(normalizedCandidateScope)) {
    throw new Error(`Coverage candidate identity has an unsupported candidate scope: ${candidateScope ?? "<missing>"}.`);
  }
  const currentSha = getCandidateSha(repositoryRoot);
  const treeSha = gitTreeSha(repositoryRoot, candidateSha);
  if (!COMMIT_SHA_PATTERN.test(String(candidateSha ?? "")) || currentSha !== candidateSha || !/^[0-9a-f]{40}$/i.test(treeSha)) {
    throw new Error(`Coverage candidate identity is not attached to the declared Git SHA: ${candidateSha ?? "<missing>"}.`);
  }

  const relevantDirtyFiles = getWorktreeCandidateFiles(repositoryRoot)
    .filter((file) => isCoveragePathForScope(file, normalizedScope));
  const identity = {
    version: COVERAGE_IDENTITY_VERSION,
    method: "git-tree-v1",
    candidateSha,
    candidateScope: normalizedCandidateScope,
    scope: normalizedScope,
    sourceTreeSha: treeSha,
    relevantDirtyFiles,
    verified: normalizedCandidateScope !== "WORKTREE" && relevantDirtyFiles.length === 0,
  };

  if (normalizedCandidateScope !== "WORKTREE" && relevantDirtyFiles.length > 0) {
    throw new Error(
      `Coverage candidate identity is not exact for ${normalizedScope}/${candidateSha}; dirty relevant files: ${relevantDirtyFiles.join(", ")}.`,
    );
  }
  if (expectedIdentity !== null) {
    const expected = typeof expectedIdentity === "string" ? JSON.parse(expectedIdentity) : expectedIdentity;
    if (
      expected?.version !== identity.version
      || expected?.method !== identity.method
      || expected?.candidateSha !== identity.candidateSha
      || expected?.candidateScope !== identity.candidateScope
      || expected?.scope !== identity.scope
      || expected?.sourceTreeSha !== identity.sourceTreeSha
    ) {
      throw new Error(`Coverage candidate identity changed during ${normalizedScope} execution.`);
    }
  }
  return identity;
}

export function createCandidateFingerprint({
  repositoryRoot = process.cwd(),
  candidateScope = "WORKTREE",
  changedFiles = [],
  candidateSha,
} = {}) {
  const scope = String(candidateScope).toUpperCase();
  const candidateFiles = scope === "STAGED"
    ? getStagedCandidateFiles(repositoryRoot)
    : changedFiles;
  const files = [...new Set(candidateFiles.map((file) => normalizeCandidatePath(repositoryRoot, file)))].sort((left, right) => left.localeCompare(right, "en"));
  const hash = createHash("sha256");
  hash.update(JSON.stringify({
    version: VALIDATION_EVIDENCE_VERSION,
    repositoryRoot: path.resolve(repositoryRoot),
    candidateScope: scope,
    gitHead: candidateSha ?? gitHead(repositoryRoot),
    files,
  }));
  for (const file of files) {
    const contents = readCandidateFile(repositoryRoot, file, scope);
    hash.update(`\nFILE:${file}\n`);
    hash.update(contents === null ? "MISSING\n" : contents);
  }
  return hash.digest("hex");
}

function commandKey(command) {
  return {
    executable: command.executable,
    args: command.args ?? [],
  };
}

export function createValidationEvidenceKey({
  candidateFingerprint,
  check,
  candidateScope,
  configuration = {},
} = {}) {
  const payload = {
    version: VALIDATION_EVIDENCE_VERSION,
    candidateFingerprint,
    checkId: check.id,
    command: commandKey(check.command),
    candidateScope,
    configuration,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      environment: Object.fromEntries(
        ["CI", "NODE_ENV", "TZ", "LANG", "LC_ALL", "NODE_OPTIONS", "VITEST_POOL_SIZE", "VITEST_MAX_THREADS", "VITEST_MIN_THREADS"]
          .filter((key) => process.env[key] !== undefined)
          .map((key) => [key, createHash("sha256").update(String(process.env[key])).digest("hex")]),
      ),
    },
    scheduler: {
      timeoutPolicy: "process-tree-v1",
    },
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function evidenceRoot(repositoryRoot) {
  return resolvePathWithinRoot(repositoryRoot, VALIDATION_EVIDENCE_RELATIVE_ROOT, { label: "validation evidence" });
}

function evidencePath(repositoryRoot, candidateFingerprint) {
  if (!SHA256_PATTERN.test(String(candidateFingerprint ?? ""))) throw new Error(`Invalid validation evidence fingerprint: ${candidateFingerprint ?? "<missing>"}`);
  return path.join(evidenceRoot(repositoryRoot), `${candidateFingerprint}.json`);
}

function fullEvidencePath(repositoryRoot, candidateSha) {
  if (!COMMIT_SHA_PATTERN.test(String(candidateSha ?? ""))) throw new Error(`Invalid validation evidence candidate SHA: ${candidateSha ?? "<missing>"}`);
  return resolvePathWithinRoot(repositoryRoot, `${FULL_VALIDATION_EVIDENCE_RELATIVE_ROOT}/${candidateSha}.json`, { label: "full validation evidence" });
}

function fullValidationLockPath(repositoryRoot) {
  return resolvePathWithinRoot(repositoryRoot, FULL_VALIDATION_LOCK_RELATIVE_PATH, { label: "full validation lock" });
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function readFullValidationLock(lockPath) {
  try {
    const document = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (
      !document
      || document.version !== VALIDATION_EVIDENCE_VERSION
      || typeof document.executionId !== "string"
      || document.executionId.length === 0
      || !Number.isSafeInteger(document.pid)
      || document.pid <= 0
      || typeof document.candidateSha !== "string"
      || document.candidateSha.length === 0
      || typeof document.startedAt !== "string"
      || !Number.isFinite(Date.parse(document.startedAt))
    ) {
      return null;
    }
    return document;
  } catch {
    return null;
  }
}

function fullValidationRecoveryPath(lockPath) {
  return `${lockPath}.${process.pid}-${Date.now()}-${randomUUID()}.recovery`;
}

function reclaimStaleFullValidationLock(lockPath, expected) {
  const recoveryPath = fullValidationRecoveryPath(lockPath);
  try {
    fs.renameSync(lockPath, recoveryPath);
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw new Error(`Impossible de réclamer atomiquement le verrou FULL existant: ${error?.message ?? String(error)}`);
  }

  const claimed = readFullValidationLock(recoveryPath);
  if (
    !claimed
    || claimed.executionId !== expected.executionId
    || claimed.pid !== expected.pid
    || claimed.candidateSha !== expected.candidateSha
  ) {
    throw new Error("Verrou FULL déplacé avec une identité incertaine; récupération refusée.");
  }
  if (isProcessAlive(claimed.pid)) {
    throw new Error("Le propriétaire du verrou FULL est redevenu actif; récupération refusée.");
  }

  removePathWithRetry(recoveryPath);
  return true;
}

export function acquireFullValidationLock({
  repositoryRoot = process.cwd(),
  candidateSha,
} = {}) {
  const lockPath = fullValidationLockPath(repositoryRoot);
  const root = path.dirname(lockPath);
  fs.mkdirSync(root, { recursive: true });
  const executionId = `${process.pid}-${Date.now()}-${randomUUID()}`;
  const document = {
    version: VALIDATION_EVIDENCE_VERSION,
    executionId,
    pid: process.pid,
    candidateSha,
    startedAt: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const descriptor = fs.openSync(lockPath, "wx");
      try {
        fs.writeFileSync(descriptor, `${JSON.stringify(document, null, 2)}\n`, "utf8");
      } finally {
        fs.closeSync(descriptor);
      }
      return () => {
        const current = readFullValidationLock(lockPath);
        if (current?.executionId === executionId && current.pid === process.pid) removePathWithRetry(lockPath);
      };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const current = readFullValidationLock(lockPath);
      if (!current) {
        if (!fs.existsSync(lockPath)) continue;
        throw new Error("Verrou FULL existant mais vide, partiel ou illisible; récupération automatique refusée.");
      }
      if (isProcessAlive(Number(current?.pid))) {
        throw new Error(
          `Un seul FULL est autorisé par exécution : un FULL est déjà actif (candidate=${current?.candidateSha ?? "unknown"}, pid=${current.pid}).`,
        );
      }
      reclaimStaleFullValidationLock(lockPath, current);
    }
  }

  throw new Error("Impossible d'acquérir le verrou FULL après une récupération concurrente.");
}

export function writeFullValidationEvidence({
  repositoryRoot = process.cwd(),
  candidateSha,
  completionSha,
  completionFingerprint,
  candidateFingerprint,
  plan,
  passed = [],
  failed = [],
  blocked = [],
  notRun = [],
  reused = [],
  preexisting = [],
  verdict,
} = {}) {
  if (!candidateSha || candidateSha === "NO_GIT_HEAD") return;
  const root = path.join(repositoryRoot, FULL_VALIDATION_EVIDENCE_RELATIVE_ROOT);
  fs.mkdirSync(root, { recursive: true });
  const checkoutStable = completionSha === candidateSha && completionFingerprint === candidateFingerprint;
  fs.writeFileSync(
    fullEvidencePath(repositoryRoot, candidateSha),
    `${JSON.stringify({
      version: VALIDATION_EVIDENCE_VERSION,
      candidateSha,
      completionSha,
      completionFingerprint,
      candidateFingerprint,
      checkoutStable,
      attestationStatus: checkoutStable ? "ATTESTED_CANDIDATE" : "NOT_ATTESTED_CHECKOUT_CHANGED",
      generatedAt: new Date().toISOString(),
      mode: plan?.mode,
      candidateScope: plan?.candidateScope,
      passed,
      failed,
      blocked,
      notRun,
      reused,
      preexisting,
      verdict,
      releaseReady: checkoutStable
        && verdict === "PASS"
        && failed.length === 0
        && blocked.length === 0
        && notRun.length === 0,
    }, null, 2)}\n`,
    "utf8",
  );
}

function sleepSync(milliseconds) {
  const signal = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(signal, 0, 0, milliseconds);
}

export function removePathWithRetry(
  target,
  {
    recursive = false,
    force = true,
    maxRetries = process.platform === "win32" ? WINDOWS_CLEANUP_RETRIES : 0,
    retryDelayMs = WINDOWS_CLEANUP_RETRY_DELAY_MS,
    remove = fs.rmSync,
    sleep = sleepSync,
  } = {},
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      remove(target, { recursive, force });
      return;
    } catch (error) {
      const code = error && typeof error === "object" ? error.code : undefined;
      if (!TRANSIENT_CLEANUP_ERRORS.has(code) || attempt >= maxRetries) throw error;
      sleep(retryDelayMs * (2 ** attempt));
    }
  }
}

export function readFastValidationEvidence({
  repositoryRoot = process.cwd(),
  candidateFingerprint,
} = {}) {
  if (!candidateFingerprint) return new Map();
  try {
    const document = JSON.parse(fs.readFileSync(evidencePath(repositoryRoot, candidateFingerprint), "utf8"));
    if (document.version !== VALIDATION_EVIDENCE_VERSION) return new Map();
    return new Map(Object.entries(document.entries ?? {}));
  } catch {
    return new Map();
  }
}

export function writeFastValidationEvidence({
  repositoryRoot = process.cwd(),
  candidateFingerprint,
  entries = new Map(),
} = {}) {
  const root = evidenceRoot(repositoryRoot);
  fs.mkdirSync(root, { recursive: true });
  const serialized = entries instanceof Map ? Object.fromEntries(entries) : entries;
  fs.writeFileSync(
    evidencePath(repositoryRoot, candidateFingerprint),
    `${JSON.stringify({
      version: VALIDATION_EVIDENCE_VERSION,
      candidateFingerprint,
      createdAt: new Date().toISOString(),
      entries: serialized,
    }, null, 2)}\n`,
    "utf8",
  );
}

export function cleanupValidationEvidence({
  repositoryRoot = process.cwd(),
  candidateFingerprint,
} = {}) {
  if (!candidateFingerprint) return;
  const target = evidencePath(repositoryRoot, candidateFingerprint);
  removePathWithRetry(target);
  const root = evidenceRoot(repositoryRoot);
  if (fs.existsSync(root) && fs.readdirSync(root).length === 0) {
    removePathWithRetry(root, { recursive: true });
    const validationRoot = path.dirname(root);
    if (fs.existsSync(validationRoot) && fs.readdirSync(validationRoot).length === 0) {
      removePathWithRetry(validationRoot, { recursive: true });
    }
  }
}
