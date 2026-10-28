import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

import {
  acquireFullValidationLock,
  assertCoverageCandidateIdentity,
  createCandidateFingerprint,
  getCandidateSha,
  getWorktreeCandidateFiles,
  removePathWithRetry,
} from "./validation-evidence.mjs";
import { gitExecutable } from "./git-executable.mjs";

const candidateSha = "a".repeat(40);

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-validation-evidence-"));
}

function lockPath(root) {
  return path.join(root, "artifacts", "validation", "full", "running.json");
}

function writeStaleLock(root) {
  fs.mkdirSync(path.dirname(lockPath(root)), { recursive: true });
  fs.writeFileSync(lockPath(root), `${JSON.stringify({
    version: 2,
    executionId: "abandoned-execution",
    pid: Number.MAX_SAFE_INTEGER,
    candidateSha,
    startedAt: "2020-01-01T00:00:00.000Z",
  })}\n`);
}

function git(root, args) {
  return execFileSync(gitExecutable(), args, { cwd: root, encoding: "utf8" }).trim();
}

function runConcurrentOwner(root) {
  const moduleUrl = pathToFileURL(path.resolve("scripts/ci/validation-evidence.mjs")).href;
  const source = `
    import { acquireFullValidationLock } from ${JSON.stringify(moduleUrl)};
    try {
      const release = acquireFullValidationLock({ repositoryRoot: ${JSON.stringify(root)}, candidateSha: ${JSON.stringify(candidateSha)} });
      process.stdout.write("OWNER\\n");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      release();
      process.exit(0);
    } catch (error) {
      process.stderr.write(String(error?.message ?? error));
      process.exit(1);
    }
  `;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", source], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

test("refuses to recover an existing FULL lock that is still uninitialized", () => {
  const root = makeRoot();
  try {
    fs.mkdirSync(path.dirname(lockPath(root)), { recursive: true });
    fs.writeFileSync(lockPath(root), "");

    assert.throws(
      () => acquireFullValidationLock({ repositoryRoot: root, candidateSha }),
      /vide, partiel ou illisible; récupération automatique refusée/,
    );
    assert.equal(fs.readFileSync(lockPath(root), "utf8"), "");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("atomically reclaims a stale FULL lock so concurrent recovery has one owner", async () => {
  const root = makeRoot();
  try {
    writeStaleLock(root);
    const results = await Promise.all([
      runConcurrentOwner(root),
      runConcurrentOwner(root),
    ]);

    assert.equal(results.filter((result) => result.code === 0).length, 1);
    assert.equal(results.filter((result) => result.code === 1).length, 1);
    assert.match(
      results.find((result) => result.code === 1)?.stderr ?? "",
      /Un seul FULL|récupération concurrente|verrou FULL existant/,
    );
    assert.equal(fs.existsSync(lockPath(root)), false);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("uses distinct cryptographic identifiers for sequential FULL lock executions", () => {
  const root = makeRoot();
  try {
    const releaseFirst = acquireFullValidationLock({ repositoryRoot: root, candidateSha });
    const first = JSON.parse(fs.readFileSync(lockPath(root), "utf8"));
    releaseFirst();

    const releaseSecond = acquireFullValidationLock({ repositoryRoot: root, candidateSha });
    const second = JSON.parse(fs.readFileSync(lockPath(root), "utf8"));
    releaseSecond();

    assert.notEqual(first.executionId, second.executionId);
    assert.match(
      second.executionId,
      /^\d+-\d+-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("STAGED candidate fingerprints use the index rather than WORKTREE file lists", () => {
  const root = makeRoot();
  try {
    git(root, ["init", "--quiet"]);
    git(root, ["config", "user.email", "validation-test.local"]);
    git(root, ["config", "user.name", "Validation Evidence Test"]);
    fs.writeFileSync(path.join(root, "candidate.txt"), "committed\n");
    git(root, ["add", "candidate.txt"]);
    git(root, ["commit", "--quiet", "-m", "baseline"]);

    fs.writeFileSync(path.join(root, "candidate.txt"), "staged\n");
    git(root, ["add", "candidate.txt"]);
    fs.writeFileSync(path.join(root, "worktree-only.txt"), "dirty\n");

    const candidateSha = getCandidateSha(root);
    const stagedFingerprint = createCandidateFingerprint({
      repositoryRoot: root,
      candidateScope: "STAGED",
      changedFiles: ["candidate.txt"],
      candidateSha,
    });
    const stagedFingerprintWithWorktreeList = createCandidateFingerprint({
      repositoryRoot: root,
      candidateScope: "STAGED",
      changedFiles: ["candidate.txt", "worktree-only.txt"],
      candidateSha,
    });

    assert.equal(stagedFingerprintWithWorktreeList, stagedFingerprint);
    fs.writeFileSync(path.join(root, "candidate.txt"), "different worktree content\n");
    assert.equal(
      createCandidateFingerprint({
        repositoryRoot: root,
        candidateScope: "STAGED",
        changedFiles: ["candidate.txt", "worktree-only.txt"],
        candidateSha,
      }),
      stagedFingerprint,
    );
    fs.writeFileSync(path.join(root, "worktree-only.txt"), "changed dirty content\n");
    assert.equal(
      createCandidateFingerprint({
        repositoryRoot: root,
        candidateScope: "STAGED",
        changedFiles: ["candidate.txt", "worktree-only.txt"],
        candidateSha,
      }),
      stagedFingerprint,
    );
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("STAGED candidate fingerprints change when the indexed blob changes", () => {
  const root = makeRoot();
  try {
    git(root, ["init", "--quiet"]);
    fs.writeFileSync(path.join(root, "candidate.txt"), "committed\n");
    git(root, ["add", "candidate.txt"]);
    git(root, ["commit", "--quiet", "-m", "baseline"]);

    fs.writeFileSync(path.join(root, "candidate.txt"), "first staged blob\n");
    git(root, ["add", "candidate.txt"]);
    const firstFingerprint = createCandidateFingerprint({
      repositoryRoot: root,
      candidateScope: "STAGED",
      candidateSha: getCandidateSha(root),
    });

    fs.writeFileSync(path.join(root, "candidate.txt"), "second staged blob\n");
    git(root, ["add", "candidate.txt"]);
    fs.writeFileSync(path.join(root, "candidate.txt"), "unrelated WORKTREE content\n");
    const secondFingerprint = createCandidateFingerprint({
      repositoryRoot: root,
      candidateScope: "STAGED",
      candidateSha: getCandidateSha(root),
    });

    assert.notEqual(secondFingerprint, firstFingerprint);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("STAGED candidate fingerprints ignore a WORKTREE symlink replacing an indexed file", (t) => {
  const root = makeRoot();
  try {
    git(root, ["init", "--quiet"]);
    fs.writeFileSync(path.join(root, "candidate.txt"), "committed\n");
    git(root, ["add", "candidate.txt"]);
    git(root, ["commit", "--quiet", "-m", "baseline"]);

    fs.writeFileSync(path.join(root, "candidate.txt"), "staged\n");
    git(root, ["add", "candidate.txt"]);
    const candidateSha = getCandidateSha(root);
    const indexedFingerprint = createCandidateFingerprint({
      repositoryRoot: root,
      candidateScope: "STAGED",
      changedFiles: ["candidate.txt"],
      candidateSha,
    });
    fs.rmSync(path.join(root, "candidate.txt"));
    const target = path.join(root, "worktree-target.txt");
    fs.writeFileSync(target, "worktree target\n");
    try {
      fs.symlinkSync(target, path.join(root, "candidate.txt"), "file");
    } catch (error) {
      t.skip(`symlink fixtures unavailable on this platform: ${error.message}`);
      return;
    }

    const stagedFingerprint = createCandidateFingerprint({
      repositoryRoot: root,
      candidateScope: "STAGED",
      changedFiles: ["candidate.txt"],
      candidateSha,
    });

    assert.equal(stagedFingerprint, indexedFingerprint);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("STAGED candidate fingerprints read a symlink blob without following its WORKTREE target", (t) => {
  const root = makeRoot();
  try {
    git(root, ["init", "--quiet"]);
    fs.writeFileSync(path.join(root, "target.txt"), "target one\n");
    try {
      fs.symlinkSync("target.txt", path.join(root, "candidate-link.txt"), "file");
    } catch (error) {
      t.skip(`symlink fixtures unavailable on this platform: ${error.message}`);
      return;
    }
    git(root, ["add", "candidate-link.txt"]);

    const indexedFingerprint = createCandidateFingerprint({
      repositoryRoot: root,
      candidateScope: "STAGED",
      candidateSha: getCandidateSha(root),
    });
    fs.writeFileSync(path.join(root, "target.txt"), "target two\n");

    assert.equal(
      createCandidateFingerprint({
        repositoryRoot: root,
        candidateScope: "STAGED",
        candidateSha: getCandidateSha(root),
      }),
      indexedFingerprint,
    );
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("WORKTREE_LIVE candidate fingerprints refuse a symlink path", (t) => {
  const root = makeRoot();
  try {
    const target = path.join(root, "outside.txt");
    fs.writeFileSync(target, "outside\n");
    try {
      fs.symlinkSync(target, path.join(root, "candidate.txt"), "file");
    } catch (error) {
      t.skip(`symlink fixtures unavailable on this platform: ${error.message}`);
      return;
    }

    assert.throws(
      () => createCandidateFingerprint({
        repositoryRoot: root,
        candidateScope: "WORKTREE_LIVE",
        changedFiles: ["candidate.txt"],
        candidateSha,
      }),
      /symbolic-link|symlink/i,
    );
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("candidate fingerprints reject traversal and absolute WORKTREE paths", () => {
  const root = makeRoot();
  try {
    for (const changedFile of ["../outside.txt", path.resolve(root, "outside.txt")]) {
      assert.throws(
        () => createCandidateFingerprint({
          repositoryRoot: root,
          candidateScope: "WORKTREE_LIVE",
          changedFiles: [changedFile],
          candidateSha,
        }),
        /escapes its validation candidate root/,
      );
    }
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("STAGED candidate fingerprints fail closed when the index cannot be read", () => {
  const root = makeRoot();
  try {
    assert.throws(
      () => createCandidateFingerprint({ repositoryRoot: root, candidateScope: "STAGED" }),
      /STAGED candidate files could not be read/,
    );
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("STAGED candidate fingerprints fail closed when an indexed object cannot be read", () => {
  const root = makeRoot();
  try {
    git(root, ["init", "--quiet"]);
    fs.writeFileSync(path.join(root, "candidate.txt"), "staged object\n");
    git(root, ["add", "candidate.txt"]);
    const objectId = git(root, ["ls-files", "--stage", "--", "candidate.txt"]).split(/\s+/)[1];
    fs.rmSync(path.join(root, ".git", "objects", objectId.slice(0, 2), objectId.slice(2)));

    assert.throws(
      () => createCandidateFingerprint({ repositoryRoot: root, candidateScope: "STAGED" }),
      /Unable to read staged candidate path candidate\.txt/,
    );
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("exact coverage identity rejects an unreadable Git index instead of treating it as clean", () => {
  const root = makeRoot();
  try {
    git(root, ["init", "--quiet"]);
    git(root, ["config", "user.email", "validation-test.local"]);
    git(root, ["config", "user.name", "Validation Evidence Test"]);
    fs.mkdirSync(path.join(root, "scripts", "ci"), { recursive: true });
    fs.writeFileSync(path.join(root, "scripts", "ci", "producer.mjs"), "export const producer = true;\n");
    git(root, ["add", "."]);
    git(root, ["commit", "--quiet", "-m", "baseline"]);
    const unreadableIndex = path.join(root, "unreadable-index");
    fs.mkdirSync(unreadableIndex);
    const previousIndex = process.env.GIT_INDEX_FILE;
    process.env.GIT_INDEX_FILE = unreadableIndex;
    try {
      assert.throws(
        () => assertCoverageCandidateIdentity({
          repositoryRoot: root,
          candidateSha: getCandidateSha(root),
          candidateScope: "CI_CANDIDATE",
          scope: "node",
        }),
        /Git worktree candidate inventory failed/,
      );
    } finally {
      if (previousIndex === undefined) delete process.env.GIT_INDEX_FILE;
      else process.env.GIT_INDEX_FILE = previousIndex;
    }
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("exact coverage identity rejects a single failed Git inventory command", () => {
  const root = makeRoot();
  try {
    const calls = [];
    assert.throws(
      () => getWorktreeCandidateFiles(root, {
        strict: true,
        readGitLinesFn: (_repositoryRoot, args) => {
          calls.push(args);
          if (args[0] === "ls-files") throw new Error("simulated untracked inventory failure");
          return [];
        },
      }),
      /Git worktree candidate inventory failed while reading untracked files/,
    );
    assert.deepEqual(calls.map((args) => args[0]), ["diff", "diff", "ls-files"]);
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});
