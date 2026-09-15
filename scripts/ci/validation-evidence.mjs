import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VALIDATION_EVIDENCE_VERSION = 1;
export const VALIDATION_EVIDENCE_RELATIVE_ROOT = path.join(
  ".artifacts",
  "validation",
  "mode-evidence",
);

function normalizePath(file) {
  return String(file).replaceAll("\\", "/").replace(/^\.\//, "");
}

function gitHead(repositoryRoot) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "NO_GIT_HEAD";
  }
}

function readStagedFile(repositoryRoot, relativePath) {
  try {
    return execFileSync("git", ["show", `:${relativePath}`], {
      cwd: repositoryRoot,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return null;
  }
}

function readCandidateFile(repositoryRoot, relativePath, candidateScope) {
  if (candidateScope === "STAGED") return readStagedFile(repositoryRoot, relativePath);
  const absolutePath = path.join(repositoryRoot, ...relativePath.split("/"));
  try {
    return fs.readFileSync(absolutePath);
  } catch {
    return null;
  }
}

export function createCandidateFingerprint({
  repositoryRoot = process.cwd(),
  candidateScope = "WORKTREE",
  changedFiles = [],
} = {}) {
  const scope = String(candidateScope).toUpperCase();
  const files = [...new Set(changedFiles.map(normalizePath))].sort();
  const hash = createHash("sha256");
  hash.update(JSON.stringify({
    version: VALIDATION_EVIDENCE_VERSION,
    repositoryRoot: path.resolve(repositoryRoot),
    candidateScope: scope,
    gitHead: gitHead(repositoryRoot),
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
} = {}) {
  const payload = {
    version: VALIDATION_EVIDENCE_VERSION,
    candidateFingerprint,
    checkId: check.id,
    command: commandKey(check.command),
    candidateScope,
    scheduler: {
      timeoutPolicy: "process-tree-v1",
    },
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function evidenceRoot(repositoryRoot) {
  return path.join(repositoryRoot, VALIDATION_EVIDENCE_RELATIVE_ROOT);
}

function evidencePath(repositoryRoot, candidateFingerprint) {
  return path.join(evidenceRoot(repositoryRoot), `${candidateFingerprint}.json`);
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
  fs.rmSync(target, { force: true });
  const root = evidenceRoot(repositoryRoot);
  if (fs.existsSync(root) && fs.readdirSync(root).length === 0) {
    fs.rmdirSync(root);
    const validationRoot = path.dirname(root);
    if (fs.existsSync(validationRoot) && fs.readdirSync(validationRoot).length === 0) {
      fs.rmdirSync(validationRoot);
    }
  }
}
