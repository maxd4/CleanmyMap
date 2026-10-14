import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { gitExecutable } from "./git-executable.mjs";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 1_000;

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
    if (candidateSha === remoteSha) {
      log(`main already converged at candidate ${candidateSha}.`);
      return candidateSha;
    }

    if (!isAncestor(runGitCommand, remoteSha, candidateSha)) {
      if (isAncestor(runGitCommand, candidateSha, remoteSha)) {
        candidateSha = reconcileRemoteFastForward(runGitCommand, candidateSha, remoteSha);
        continue;
      } else {
        throw new Error("origin/main and local main diverged; resolve the non-destructive merge explicitly before publishing.");
      }
    }

    assertCandidateIsCurrent(runGitCommand, candidateSha, "immediately before push");
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
  }).catch((error) => {
    console.error(`PUBLISH_MAIN_BLOCKED: ${error.message}`);
    process.exitCode = 1;
  });
}
