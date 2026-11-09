import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runCoveragePublicationGate } from "./coverage-publication.mjs";
import { gitExecutable } from "./git-executable.mjs";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 1_000;
const GENERATED_CANDIDATE_PATHS = Object.freeze([
  /(^|\/)artifacts\//,
  /(^|\/)coverage\//,
  /(^|\/)\.next(?:-|\/)/,
  /(^|\/)(?:dist|build|playwright-report|test-results)\//,
  /(^|\/)\.vercel\//,
]);

function normalizePath(file) {
  return String(file).replaceAll("\\", "/").replace(/^\.\//, "");
}

function sortedUnique(files = []) {
  return [...new Set(files.map(normalizePath).filter(Boolean))].sort((left, right) => left.localeCompare(right, "en"));
}

function runGitAt(repositoryRoot, args, { env = process.env, allowFailure = false } = {}) {
  const result = spawnSync(gitExecutable(), args, {
    cwd: repositoryRoot,
    env: { ...env, GIT_OPTIONAL_LOCKS: "0" },
    encoding: "utf8",
  });
  const normalized = {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
  if (!allowFailure && normalized.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${(normalized.stderr || normalized.stdout).trim()}`);
  }
  return normalized;
}

function gitTextAt(repositoryRoot, args, options = {}) {
  return runGitAt(repositoryRoot, args, options).stdout.trim();
}

function worktreeGitEnv() {
  const env = { ...process.env };
  delete env.GIT_INDEX_FILE;
  return env;
}

function inventoryWorktree(repositoryRoot) {
  const env = worktreeGitEnv();
  const tracked = gitTextAt(repositoryRoot, ["diff", "--name-only", "HEAD", "--"], { env });
  const staged = gitTextAt(repositoryRoot, ["diff", "--cached", "--name-only", "--"], { env });
  const untracked = gitTextAt(repositoryRoot, ["ls-files", "--others", "--exclude-standard"], { env });
  return sortedUnique(`${tracked}\n${staged}\n${untracked}`.split(/\r?\n/));
}

function inventoryIgnored(repositoryRoot) {
  return sortedUnique(
    gitTextAt(repositoryRoot, ["ls-files", "--others", "--ignored", "--exclude-standard"], { env: worktreeGitEnv() })
      .split(/\r?\n/),
  );
}

function hasGeneratedPath(file) {
  return GENERATED_CANDIDATE_PATHS.some((pattern) => pattern.test(normalizePath(file)));
}

function createTemporaryIndex(repositoryRoot) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-deploy-index-"));
  const indexPath = path.join(directory, "index");
  const env = { ...process.env, GIT_INDEX_FILE: indexPath, GIT_OPTIONAL_LOCKS: "0" };
  try {
    runGitAt(repositoryRoot, ["read-tree", "HEAD"], { env });
    return { directory, indexPath, env };
  } catch (error) {
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

function stageCandidateIntoIndex(repositoryRoot, index, candidateFiles) {
  if (candidateFiles.length === 0) throw new Error("DEPLOY publication requires at least one attributed candidate file.");
  runGitAt(repositoryRoot, ["add", "--", ...candidateFiles], { env: index.env });
  const treeSha = gitTextAt(repositoryRoot, ["write-tree"], { env: index.env });
  return { treeSha, env: index.env };
}

function compareFiles(expected, actual) {
  const left = sortedUnique(expected);
  const right = sortedUnique(actual);
  return left.length === right.length && left.every((file, index) => file === right[index]);
}

function candidateFingerprint(repositoryRoot, candidateFiles) {
  const hash = crypto.createHash("sha256");
  for (const file of sortedUnique(candidateFiles)) {
    const absolute = path.join(repositoryRoot, ...file.split("/"));
    hash.update(file);
    hash.update("\0");
    try {
      hash.update(fs.readFileSync(absolute));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      hash.update("<deleted>");
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function captureWorktreeCandidate({ repositoryRoot = process.cwd(), candidateFiles = [], excludedFiles = [] } = {}) {
  assertMain((args) => runGitAt(repositoryRoot, args));
  assertNoOperationInProgress((args) => runGitAt(repositoryRoot, args, { allowFailure: true }));

  const worktreeFiles = inventoryWorktree(repositoryRoot);
  const attributedFiles = sortedUnique(candidateFiles);
  const excluded = new Set(sortedUnique(excludedFiles.map((file) => path.relative(
    repositoryRoot,
    path.resolve(repositoryRoot, file),
  ))));
  if (attributedFiles.length === 0) {
    throw new Error("DEPLOY_PUBLICATION_ATTRIBUTION_REQUIRED: pass --candidate-file for every worktree change.");
  }
  const foreignFiles = worktreeFiles.filter((file) => !attributedFiles.includes(file) && !excluded.has(file));
  const missingFiles = attributedFiles.filter((file) => !worktreeFiles.includes(file));
  const generatedFiles = attributedFiles.filter(hasGeneratedPath);
  if (foreignFiles.length > 0 || missingFiles.length > 0) {
    throw new Error(
      `DEPLOY_PUBLICATION_SCOPE_UNRESOLVED: foreign=${foreignFiles.join(",") || "none"}; `
        + `missing=${missingFiles.join(",") || "none"}.`,
    );
  }
  if (generatedFiles.length > 0) {
    throw new Error(`DEPLOY_PUBLICATION_GENERATED_ARTIFACT: ${generatedFiles.join(", ")}`);
  }

  const index = createTemporaryIndex(repositoryRoot);
  try {
    const candidate = stageCandidateIntoIndex(repositoryRoot, index, attributedFiles);
    return {
      repositoryRoot,
      baseSha: gitTextAt(repositoryRoot, ["rev-parse", "HEAD"]),
      candidateFiles: attributedFiles,
      worktreeFiles: sortedUnique(worktreeFiles),
      ignoredFiles: inventoryIgnored(repositoryRoot),
      candidateTreeSha: candidate.treeSha,
      worktreeFingerprint: candidateFingerprint(repositoryRoot, attributedFiles),
      indexPath: index.indexPath,
      indexEnv: index.env,
      cleanup: () => fs.rmSync(index.directory, { recursive: true, force: true }),
    };
  } catch (error) {
    fs.rmSync(index.directory, { recursive: true, force: true });
    throw error;
  }
}

export function assertWorktreeCandidateStable(candidate) {
  const currentFiles = inventoryWorktree(candidate.repositoryRoot);
  const currentFingerprint = candidateFingerprint(candidate.repositoryRoot, candidate.candidateFiles);
  const stable = compareFiles(candidate.worktreeFiles, currentFiles)
    && currentFingerprint === candidate.worktreeFingerprint
    && gitTextAt(candidate.repositoryRoot, ["rev-parse", "HEAD"]) === candidate.baseSha;
  if (!stable) {
    throw new Error("DEPLOY_PUBLICATION_CANDIDATE_CHANGED: worktree, attribution or HEAD changed after validation.");
  }
  return true;
}

export function commitCandidate({
  repositoryRoot = process.cwd(),
  candidate,
  commitMessage,
  runPreCommit = true,
  runCommand = (executable, args, env = process.env) => spawnSync(
    process.platform === "win32" && executable === "npm" ? "npm.cmd" : executable,
    args,
    { cwd: repositoryRoot, env, encoding: "utf8", stdio: "inherit" },
  ),
} = {}) {
  if (!candidate?.candidateFiles?.length) throw new Error("DEPLOY_PUBLICATION_CANDIDATE_EMPTY");
  assertWorktreeCandidateStable(candidate);
  const commitEnv = { ...process.env };
  delete commitEnv.GIT_INDEX_FILE;
  runGitAt(repositoryRoot, ["add", "--", ...candidate.candidateFiles], { env: commitEnv });
  const stagedTreeSha = gitTextAt(repositoryRoot, ["write-tree"], { env: commitEnv });
  if (stagedTreeSha !== candidate.candidateTreeSha) {
    throw new Error(`DEPLOY_PUBLICATION_TREE_CHANGED: expected ${candidate.candidateTreeSha}, got ${stagedTreeSha}.`);
  }
  if (runPreCommit) {
    const guard = runCommand("npm", ["run", "precommit:guard"], commitEnv);
    if ((guard.status ?? 1) !== 0) throw new Error("DEPLOY_PUBLICATION_PRECOMMIT_FAILED");
  }
  const commit = runGitAt(repositoryRoot, ["commit", "-m", commitMessage || "chore(deploy): publish validated candidate"], { env: commitEnv });
  const commitSha = gitTextAt(repositoryRoot, ["rev-parse", "HEAD"], { env: commitEnv });
  const committedTreeSha = gitTextAt(repositoryRoot, ["rev-parse", "HEAD^{tree}"], { env: commitEnv });
  if (committedTreeSha !== candidate.candidateTreeSha) {
    throw new Error(`DEPLOY_PUBLICATION_COMMIT_TREE_MISMATCH: expected ${candidate.candidateTreeSha}, got ${committedTreeSha}.`);
  }
  return { commitSha, treeSha: committedTreeSha, output: `${commit.stdout}${commit.stderr}` };
}

function runGit(args) {
  const result = spawnSync(gitExecutable(), args, { encoding: "utf8" });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function gitText(runGitCommand, args) {
  const result = runGitCommand(args);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout.trim();
}

function assertMain(runGitCommand) {
  const branch = gitText(runGitCommand, ["branch", "--show-current"]);
  if (branch !== "main") {
    throw new Error(`MAIN_ONLY_MULTI_WRITER requires branch main; found ${branch || "detached HEAD"}.`);
  }
}

function assertNoOperationInProgress(runGitCommand) {
  for (const ref of ["MERGE_HEAD", "REBASE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD"]) {
    const result = runGitCommand(["rev-parse", "--verify", "--quiet", ref]);
    if (result.status === 0 && result.stdout.trim()) {
      throw new Error(`Git operation in progress (${ref}); resolve it explicitly before publishing.`);
    }
  }
}

function isAncestor(runGitCommand, ancestor, descendant) {
  return runGitCommand(["merge-base", "--is-ancestor", ancestor, descendant]).status === 0;
}

function isRetryablePushRace(result) {
  return /non-fast-forward|fetch first|stale info|remote contains work|tip of your current branch is behind/i.test(
    `${result.stdout}\n${result.stderr}`,
  );
}

function waitMs(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runPublicationCoverageGate({ candidateSha, baseRef, runGitCommand }) {
  const changedFiles = baseRef
    ? gitText(runGitCommand, ["diff", "--name-only", baseRef, candidateSha]).split(/\r?\n/).filter(Boolean)
    : [];
  return runCoveragePublicationGate({
    repositoryRoot: process.cwd(),
    candidateSha,
    baseRef,
    currentRef: candidateSha,
    changedFiles,
  });
}

function readLocalMain(runGitCommand) {
  return {
    head: gitText(runGitCommand, ["rev-parse", "HEAD"]),
    branch: gitText(runGitCommand, ["rev-parse", "refs/heads/main"]),
  };
}

function assertCandidateIsCurrent(runGitCommand, candidateSha, phase) {
  const local = readLocalMain(runGitCommand);
  if (local.head !== candidateSha || local.branch !== candidateSha) {
    throw new Error(
      `Local main changed ${phase}; candidate ${candidateSha} is no longer current `
        + `(HEAD=${local.head}, refs/heads/main=${local.branch}). `
        + "Reconcile the new local commit and its validations before publishing.",
    );
  }
}

function assertLocalMainMatchesCandidate(runGitCommand, phase) {
  const local = readLocalMain(runGitCommand);
  if (local.head !== local.branch) {
    throw new Error(
      `Local main is not aligned ${phase}; HEAD=${local.head}, refs/heads/main=${local.branch}. `
        + "Reconcile local refs explicitly before publishing.",
    );
  }
  return local.head;
}

function reconcileRemoteFastForward(runGitCommand, candidateSha, remoteSha) {
  assertCandidateIsCurrent(runGitCommand, candidateSha, "before remote fast-forward reconciliation");

  const fastForward = runGitCommand(["merge", "--ff-only", "origin/main"]);
  if (fastForward.status !== 0) {
    throw new Error(
      `Cannot fast-forward local main without overwriting local work: ${(fastForward.stderr || fastForward.stdout).trim()}`,
    );
  }

  const reconciledSha = assertLocalMainMatchesCandidate(runGitCommand, "after remote fast-forward reconciliation");
  if (!isAncestor(runGitCommand, candidateSha, reconciledSha) || !isAncestor(runGitCommand, remoteSha, reconciledSha)) {
    throw new Error(
      `Remote fast-forward reconciliation produced an unexpected local SHA ${reconciledSha}; `
        + "resolve the refs explicitly before publishing.",
    );
  }
  return reconciledSha;
}

export async function publishMain({
  runGitCommand = runGit,
  sleep = waitMs,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  backoffMs = DEFAULT_BACKOFF_MS,
  log = console.log,
  coverageGate = null,
  expectedRemoteSha = "",
} = {}) {
  assertMain(runGitCommand);
  assertNoOperationInProgress(runGitCommand);

  let candidateSha = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const fetch = runGitCommand(["fetch", "origin", "main"]);
    if (fetch.status !== 0) {
      throw new Error(`git fetch origin main failed: ${(fetch.stderr || fetch.stdout).trim()}`);
    }

    if (candidateSha === null) {
      candidateSha = assertLocalMainMatchesCandidate(runGitCommand, "when establishing the candidate");
    } else {
      assertCandidateIsCurrent(runGitCommand, candidateSha, "during a bounded retry");
    }

    const remoteSha = gitText(runGitCommand, ["rev-parse", "origin/main"]);
    if (expectedRemoteSha && remoteSha !== expectedRemoteSha) {
      throw new Error(`origin/main changed during DEPLOY publication: expected ${expectedRemoteSha}, found ${remoteSha}.`);
    }
    if (candidateSha === remoteSha) {
      log(`main already converged at candidate ${candidateSha}.`);
      return candidateSha;
    }

    if (!isAncestor(runGitCommand, remoteSha, candidateSha)) {
      if (expectedRemoteSha) {
        throw new Error(`origin/main is not the validated DEPLOY base ${expectedRemoteSha}; publication is blocked.`);
      }
      if (isAncestor(runGitCommand, candidateSha, remoteSha)) {
        candidateSha = reconcileRemoteFastForward(runGitCommand, candidateSha, remoteSha);
        continue;
      } else {
        throw new Error("origin/main and local main diverged; resolve the non-destructive merge explicitly before publishing.");
      }
    }

    assertCandidateIsCurrent(runGitCommand, candidateSha, "immediately before push");
    if (coverageGate) {
      coverageGate({ candidateSha, baseRef: remoteSha, runGitCommand });
      log(`Coverage publication gate passed for candidate ${candidateSha}.`);
    }
    const push = runGitCommand(["push", "origin", `${candidateSha}:refs/heads/main`]);
    if (push.status === 0) {
      const verifyFetch = runGitCommand(["fetch", "origin", "main"]);
      if (verifyFetch.status !== 0) {
        throw new Error(`Post-push fetch failed: ${(verifyFetch.stderr || verifyFetch.stdout).trim()}`);
      }

      assertCandidateIsCurrent(runGitCommand, candidateSha, "after push verification");
      const publishedSha = gitText(runGitCommand, ["rev-parse", "origin/main"]);
      if (publishedSha === candidateSha) {
        log(`Published main at candidate ${candidateSha}.`);
        return candidateSha;
      }

      if (isAncestor(runGitCommand, candidateSha, publishedSha)) {
        candidateSha = reconcileRemoteFastForward(runGitCommand, candidateSha, publishedSha);
        if (candidateSha === publishedSha) {
          log(`Published candidate ${candidateSha}; remote advanced compatibly and was reconciled explicitly.`);
          return candidateSha;
        }
        continue;
      }

      throw new Error("origin/main advanced to an incompatible SHA after push; resolve the divergence explicitly before publishing.");
    }

    if (!isRetryablePushRace(push) || attempt === maxAttempts) {
      throw new Error(`git push candidate ${candidateSha}:refs/heads/main failed: ${(push.stderr || push.stdout).trim()}`);
    }

    assertCandidateIsCurrent(runGitCommand, candidateSha, "after a concurrent push rejection");
    log(`Concurrent push detected; waiting before retry ${attempt + 1}/${maxAttempts}.`);
    await sleep(backoffMs * attempt);
  }

  throw new Error("Publication retries exhausted.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  publishMain({
    maxAttempts: Number(process.env.CMM_PUBLISH_MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS),
    backoffMs: Number(process.env.CMM_PUBLISH_BACKOFF_MS ?? DEFAULT_BACKOFF_MS),
    coverageGate: runPublicationCoverageGate,
  }).catch((error) => {
    console.error(`PUBLISH_MAIN_BLOCKED: ${error.message}`);
    process.exitCode = 1;
  });
}
