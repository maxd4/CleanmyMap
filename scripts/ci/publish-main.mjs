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
  return /non-fast-forward|fetch first|rejected|failed to push|stale info/i.test(
    `${result.stdout}\n${result.stderr}`,
  );
}

function waitMs(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const fetch = runGitCommand(["fetch", "origin", "main"]);
    if (fetch.status !== 0) {
      throw new Error(`git fetch origin main failed: ${(fetch.stderr || fetch.stdout).trim()}`);
    }

    const localSha = gitText(runGitCommand, ["rev-parse", "HEAD"]);
    const remoteSha = gitText(runGitCommand, ["rev-parse", "origin/main"]);
    if (localSha === remoteSha) {
      log(`main already converged at ${localSha}.`);
      return localSha;
    }

    if (!isAncestor(runGitCommand, remoteSha, localSha)) {
      if (isAncestor(runGitCommand, localSha, remoteSha)) {
        const fastForward = runGitCommand(["merge", "--ff-only", "origin/main"]);
        if (fastForward.status !== 0) {
          throw new Error(`Cannot fast-forward local main without overwriting local work: ${(fastForward.stderr || fastForward.stdout).trim()}`);
        }
      } else {
        throw new Error("origin/main and local main diverged; resolve the non-destructive merge explicitly before publishing.");
      }
    }

    const push = runGitCommand(["push", "origin", "main"]);
    if (push.status === 0) {
      const verifyFetch = runGitCommand(["fetch", "origin", "main"]);
      if (verifyFetch.status !== 0) {
        throw new Error(`Post-push fetch failed: ${(verifyFetch.stderr || verifyFetch.stdout).trim()}`);
      }
      const publishedSha = gitText(runGitCommand, ["rev-parse", "origin/main"]);
      const currentSha = gitText(runGitCommand, ["rev-parse", "HEAD"]);
      if (publishedSha !== currentSha) {
        if (attempt === maxAttempts) {
          throw new Error("origin/main advanced again after push; bounded publication retries exhausted.");
        }
        await sleep(backoffMs * attempt);
        continue;
      }
      log(`Published main at ${currentSha}.`);
      return currentSha;
    }

    if (!isRetryablePushRace(push) || attempt === maxAttempts) {
      throw new Error(`git push origin main failed: ${(push.stderr || push.stdout).trim()}`);
    }

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
