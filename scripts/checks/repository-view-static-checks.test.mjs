import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { createGitRepositoryView } from "./repository-view.mjs";

const STATIC_CHECK_TIMEOUT_MS = 60_000;
const baseRef = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

function createIndexCandidate(parentRef) {
  const tree = execFileSync("git", ["write-tree"], { encoding: "utf8" }).trim();
  return execFileSync(
    "git",
    ["commit-tree", tree, "-p", parentRef, "-m", "static-check candidate"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "CleanMyMap static-check test",
        GIT_AUTHOR_EMAIL: "codex-static-check.invalid",
        GIT_COMMITTER_NAME: "CleanMyMap static-check test",
        GIT_COMMITTER_EMAIL: "codex-static-check.invalid",
      },
    },
  ).trim();
}

// Static checks must see the exact staged candidate during local validation.
// The temporary commit is deliberately left unreachable: no branch or ref is
// changed, while repository-view can inspect the index tree as a Git commit.
const ref = createIndexCandidate(baseRef);
const checks = [
  "scripts/checks/check-env-contract.mjs",
  "scripts/checks/check-root-file-hygiene.mjs",
  "scripts/checks/check-gitnexus-hygiene.mjs",
  "scripts/checks/check-documentation-governance.mjs",
  "scripts/checks/check-agent-governance.mjs",
  "scripts/checks/check-agent-skill-mirrors.mjs",
  "scripts/checks/check-stack-doc-drift.mjs",
  "scripts/checks/check-github-actions-security.mjs",
  "scripts/checks/check-9c-public-facades.mjs",
  "scripts/checks/check-doc-visuals.mjs",
  "scripts/checks/check-lockfile-policy.mjs",
  "scripts/audits/audit-supabase-migration-trees.mjs",
  "scripts/audits/audit-vercel-ci.mjs",
  "scripts/checks/check-top-heavy-files.mjs",
];

function runStaticChecker(script) {
  const extraArgs = script.endsWith("check-top-heavy-files.mjs") ? ["--enforce"] : [];
  const startedAt = performance.now();
  try {
    execFileSync(process.execPath, [script, ...extraArgs, `--ref=${ref}`], {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      timeout: STATIC_CHECK_TIMEOUT_MS,
      windowsHide: true,
    });
    return { status: 0, output: "" };
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    const timedOut = error?.code === "ETIMEDOUT" || error?.signal === "SIGTERM";
    const reason = timedOut
      ? `timed out after ${durationMs}ms (limit ${STATIC_CHECK_TIMEOUT_MS}ms)`
      : `failed after ${durationMs}ms with ${error?.code ?? `exit ${error?.status ?? "unknown"}`}`;
    return {
      status: error?.status ?? 1,
      output: `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`,
      reason: `${script} ${reason} for exact Git ref ${ref}`,
    };
  }
}

test("static checks read an exact Git ref without treating historical findings as blob errors", () => {
  const view = createGitRepositoryView(ref);
  assert.equal(
    view.readText("AGENTS.md"),
    execFileSync("git", ["show", `${ref}:AGENTS.md`], { encoding: "utf8" }),
    "repository-view must read the candidate blob at the requested ref",
  );

  for (const script of checks) {
    const result = runStaticChecker(script);
    if (result.status === 0) continue;

    assert.doesNotMatch(
      result.output,
      /Git repository view|Git (?:tree|blob)|cat-file|bad object|invalid object/i,
      `${script} failed because the exact ref could not be read`,
    );
    assert.match(
      result.output,
      /(?:check failed|REVIEW_REQUIRED|\bFAIL\b|issue\(s\)|violation|finding|must\b)/i,
      `${script} failed without reporting a policy finding for exact Git ref ${ref}`,
    );
  }
});
