import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  captureWorktreeCandidate,
  commitCandidate,
  publishMain as publishMainImpl,
  validatePushBypassAcknowledgement,
} from "./publish-main.mjs";
import { verifyGitHubPushAuthorization } from "./github-push-authorization.mjs";
import { removePathWithRetry } from "./validation-evidence.mjs";

function fixtureRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-publish-candidate-"));
  execFileSync("git", ["init", "--initial-branch=main", "--quiet"], { cwd: root });
  execFileSync("git", ["config", "user.name", "CleanMyMap fixture"], { cwd: root });
  execFileSync("git", ["config", "user.email", "fixture@cleanmymap.local"], { cwd: root });
  fs.mkdirSync(path.join(root, "apps", "web", "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), "baseline\n");
  execFileSync("git", ["add", "--", "."], { cwd: root });
  execFileSync("git", ["commit", "--quiet", "-m", "baseline"], { cwd: root });
  return root;
}

function fakeGit({
  pushResults = [{ status: 0, stdout: "", stderr: "" }],
  local = "candidate",
  remote = "base",
  parents = { candidate: "base" },
  onHeadRead,
  onPush,
  changedFiles = ["AGENTS.md"],
  commitFiles = {},
  pushDestinations = ["https://github.com/maxd4/CleanMyMap.git"],
} = {}) {
  const calls = [];
  const state = { local, branch: local, remote };
  const graph = new Map(Object.entries(parents));
  let headReads = 0;
  let branchReads = 0;
  let pushIndex = 0;
  let pushDestinationReads = 0;

  const isAncestor = (ancestor, descendant) => {
    const visited = new Set();
    let current = descendant;
    while (current && !visited.has(current)) {
      if (current === ancestor) return true;
      visited.add(current);
      current = graph.get(current);
    }
    return false;
  };

  const runGitCommand = (args) => {
    calls.push(args);
    if (args[0] === "branch") return { status: 0, stdout: "main\n", stderr: "" };
    if (args[0] === "remote" && args[1] === "get-url" && args[2] === "--push" && args[3] === "--all" && args[4] === "origin") {
      pushDestinationReads += 1;
      const destinations = typeof pushDestinations === "function" ? pushDestinations(pushDestinationReads) : pushDestinations;
      return { status: 0, stdout: `${destinations.join("\n")}\n`, stderr: "" };
    }
    if (args[0] === "rev-parse" && args[1] === "--verify") return { status: 1, stdout: "", stderr: "" };
    if (args[0] === "fetch") return { status: 0, stdout: "", stderr: "" };
    if (args[0] === "rev-parse" && args[1] === "HEAD") {
      headReads += 1;
      onHeadRead?.({ headReads, state });
      return { status: 0, stdout: `${state.local}\n`, stderr: "" };
    }
    if (args[0] === "rev-parse" && args[1] === "refs/heads/main") {
      branchReads += 1;
      return { status: 0, stdout: `${state.branch}\n`, stderr: "" };
    }
    if (args[0] === "rev-parse" && args[1] === "origin/main") {
      return { status: 0, stdout: `${state.remote}\n`, stderr: "" };
    }
    if (args[0] === "merge-base" && args[1] === "--is-ancestor") {
      return { status: isAncestor(args[2], args[3]) ? 0 : 1, stdout: "", stderr: "" };
    }
    if (args[0] === "rev-list" && args[1] === "--reverse") {
      const [base, tip] = args[2].split("..");
      const commits = [];
      let current = tip;
      while (current && current !== base) {
        commits.unshift(current);
        current = graph.get(current);
      }
      return { status: current === base ? 0 : 1, stdout: `${commits.join("\n")}\n`, stderr: "" };
    }
    if (args[0] === "rev-list" && args[1] === "--parents") {
      const sha = args.at(-1);
      const parent = graph.get(sha);
      return { status: 0, stdout: `${sha}${parent ? ` ${parent}` : ""}\n`, stderr: "" };
    }
    if (args[0] === "diff-tree") {
      const sha = args.at(-2);
      const paths = commitFiles[sha] ?? changedFiles;
      return { status: 0, stdout: `${paths.join("\0")}\0`, stderr: "" };
    }
    if (args[0] === "merge" && args[1] === "--ff-only") {
      state.local = state.remote;
      state.branch = state.remote;
      return { status: 0, stdout: "", stderr: "" };
    }
    if (args[0] === "push") {
      const result = pushResults[pushIndex] ?? pushResults.at(-1);
      pushIndex += 1;
      if (result.status === 0) state.remote = args[2].split(":", 1)[0];
      onPush?.({ pushIndex, state });
      return result;
    }
    throw new Error(`Unexpected fake git call: ${args.join(" ")}`);
  };

  return { calls, state, runGitCommand };
}

function publishMain(options = {}) {
  return publishMainImpl({ attributedCommits: [{ commitSha: "candidate", files: ["AGENTS.md"] }], verifyAuthorization: async () => ({ login: "publisher" }), ...options });
}

function pushCalls(fake) {
  return fake.calls.filter((args) => args[0] === "push");
}

test("publishes exactly the immutable candidate SHA with an explicit refspec", async () => {
  const fake = fakeGit({
    local: "candidate",
    remote: "base",
    parents: { candidate: "base" },
  });

  const published = await publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {}, backoffMs: 1 });

  assert.equal(published, "candidate");
  assert.deepEqual(pushCalls(fake), [["push", "origin", "candidate:refs/heads/main"]]);
  assert.equal(fake.state.local, "candidate");
  assert.equal(fake.state.remote, "candidate");
  assert.equal(fake.calls.some((args) => ["reset", "stash", "clean"].includes(args[0])), false);
});

test("requires explicit attribution for every commit and rejects foreign commit paths before push", async () => {
  const noAllowlist = fakeGit();
  await assert.rejects(publishMainImpl({ runGitCommand: noAllowlist.runGitCommand }), /PUBLISH_ATTRIBUTION_REQUIRED/);
  const foreign = fakeGit({ commitFiles: { candidate: ["AGENTS.md", "foreign.txt"] } });
  await assert.rejects(publishMainImpl({ runGitCommand: foreign.runGitCommand, attributedCommits: [{ commitSha: "candidate", files: ["AGENTS.md"] }] }), /PUBLISH_FOREIGN_COMMIT_PATHS.*foreign.txt/);
  assert.equal(pushCalls(foreign).length, 0);
});

test("authenticates the effective push URL instead of the fetch URL", async () => {
  const fake = fakeGit({ pushDestinations: ["https://github.com/another-owner/another-repo.git"] });
  await assert.rejects(publishMainImpl({
    runGitCommand: fake.runGitCommand,
    attributedCommits: [{ commitSha: "candidate", files: ["AGENTS.md"] }],
    verifyAuthorization: verifyGitHubPushAuthorization,
    sleep: async () => {},
  }), /PUBLISH_AUTH_REMOTE_UNSUPPORTED/);
  assert.ok(fake.calls.some((args) => args.join(" ") === "remote get-url --push --all origin"));
  assert.equal(pushCalls(fake).length, 0);
});

test("blocks if the effective push destination changes during authorization", async () => {
  const fake = fakeGit({
    pushDestinations: (read) => [read === 1
      ? "https://github.com/maxd4/CleanMyMap.git"
      : "https://github.com/another-owner/another-repo.git"],
  });
  await assert.rejects(publishMain({
    runGitCommand: fake.runGitCommand,
  }), /PUBLISH_PUSH_DESTINATION_CHANGED/);
  assert.equal(pushCalls(fake).length, 0);
});

test("refuses multiple effective push destinations before authorization or push", async () => {
  const fake = fakeGit({
    pushDestinations: [
      "https://github.com/maxd4/CleanMyMap.git",
      "https://github.com/mirror/CleanMyMap.git",
    ],
  });
  let authorizationCalls = 0;
  await assert.rejects(publishMain({
    runGitCommand: fake.runGitCommand,
    verifyAuthorization: async () => { authorizationCalls += 1; },
  }), /PUBLISH_PUSH_DESTINATION_AMBIGUOUS/);
  assert.equal(authorizationCalls, 0);
  assert.equal(pushCalls(fake).length, 0);
});

test("publishes validated commits from multiple attributed lots as one push range", async () => {
  const fake = fakeGit({ parents: { first: "base", second: "first", candidate: "second" }, changedFiles: [], commitFiles: { first: ["AGENTS.md"], second: ["CHATGPT.md"], candidate: ["scripts/AGENTS.md"] } });
  const published = await publishMain({
    runGitCommand: fake.runGitCommand,
    attributedCommits: [
      { commitSha: "first", files: ["AGENTS.md"] },
      { commitSha: "second", files: ["CHATGPT.md"] },
      { commitSha: "candidate", files: ["scripts/AGENTS.md"] },
    ],
    sleep: async () => {},
  });

  assert.equal(published, "candidate");
  assert.deepEqual(pushCalls(fake), [["push", "origin", "candidate:refs/heads/main"]]);
  assert.equal(fake.calls.filter((args) => args[0] === "diff-tree").length, 3);
});

test("inspects every real commit so a foreign add-then-delete cannot disappear from the net diff", async () => {
  const root = fixtureRepository();
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-publish-origin-"));
  const origin = path.join(bare, "origin.git");
  const git = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  try {
    execFileSync("git", ["init", "--bare", "--initial-branch=main", "--quiet", origin]);
    git(["remote", "add", "origin", origin]);
    git(["push", "--quiet", "-u", "origin", "main"]);
    const remoteSha = git(["rev-parse", "HEAD"]);
    fs.writeFileSync(path.join(root, "lot-a.md"), "lot a\n");
    git(["add", "--", "lot-a.md"]);
    git(["commit", "--quiet", "-m", "lot A"]);
    const lotASha = git(["rev-parse", "HEAD"]);
    fs.writeFileSync(path.join(root, "foreign.txt"), "temporary foreign change\n");
    git(["add", "--", "foreign.txt"]);
    git(["commit", "--quiet", "-m", "foreign add"]);
    const foreignAddSha = git(["rev-parse", "HEAD"]);
    fs.rmSync(path.join(root, "foreign.txt"));
    fs.writeFileSync(path.join(root, "lot-b.md"), "lot b\n");
    git(["add", "--", "lot-b.md"]);
    git(["add", "-u", "--", "foreign.txt"]);
    git(["commit", "--quiet", "-m", "lot B and foreign revert"]);
    const lotBSha = git(["rev-parse", "HEAD"]);
    assert.equal(git(["diff", "--name-only", `${remoteSha}..${lotBSha}`]).includes("foreign.txt"), false);

    const runGitCommand = (args) => {
      const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
    };
    const incomplete = [
      { commitSha: lotASha, files: ["lot-a.md"] },
      { commitSha: lotBSha, files: ["lot-b.md", "foreign.txt"] },
    ];
    await assert.rejects(publishMainImpl({
      runGitCommand,
      attributedCommits: incomplete,
      verifyAuthorization: async () => ({ login: "publisher" }),
      sleep: async () => {},
    }), new RegExp(`PUBLISH_COMMIT_ATTRIBUTION_REQUIRED.*${foreignAddSha}`));
    assert.equal(git(["rev-parse", "origin/main"]), remoteSha);

    const published = await publishMainImpl({
      runGitCommand,
      attributedCommits: [
        ...incomplete,
        { commitSha: foreignAddSha, files: ["foreign.txt"] },
      ],
      verifyAuthorization: async () => ({ login: "publisher" }),
      sleep: async () => {},
    });
    assert.equal(published, lotBSha);
    assert.equal(git(["rev-parse", "origin/main"]), lotBSha);
  } finally {
    removePathWithRetry(root, { recursive: true });
    removePathWithRetry(bare, { recursive: true });
  }
});

test("records already converged refs without issuing an empty push", async () => {
  const fake = fakeGit({ local: "base", remote: "base", parents: { base: "root" } });
  let authorizationCalls = 0;
  const published = await publishMainImpl({
    runGitCommand: fake.runGitCommand,
    sleep: async () => {},
    expectedRemoteSha: "outdated-reference",
    verifyAuthorization: async () => { authorizationCalls += 1; },
  });

  assert.equal(published, "base");
  assert.equal(pushCalls(fake).length, 0);
  assert.equal(fake.calls.filter((args) => args[0] === "fetch").length, 1);
  assert.equal(authorizationCalls, 0);
});

test("blocks before push when the active coverage proof is absent", async () => {
  const fake = fakeGit({
    local: "candidate",
    remote: "base",
    parents: { candidate: "base" },
  });
  let gateCalls = 0;

  await assert.rejects(
    publishMain({
      runGitCommand: fake.runGitCommand,
      sleep: async () => {},
      coverageGate: ({ candidateSha, baseRef }) => {
        gateCalls += 1;
        assert.equal(candidateSha, "candidate");
        assert.equal(baseRef, "base");
        throw new Error("Coverage proof is missing for enforced web scope.");
      },
    }),
    /Coverage proof is missing for enforced web scope/,
  );
  assert.equal(gateCalls, 1);
  assert.equal(pushCalls(fake).length, 0);
});

test("accepts only the configured main update bypass and still verifies convergence", async () => {
  let authorizationCalls = 0;
  const fake = fakeGit({
    pushResults: [{ status: 0, stdout: "remote: Bypassed rule violations for refs/heads/main:\nremote: - Cannot update this protected ref.", stderr: "" }],
    onPush: () => assert.equal(authorizationCalls, 1, "authorization must be verified before push"),
  });
  const published = await publishMain({
    runGitCommand: fake.runGitCommand,
    sleep: async () => {},
    verifyAuthorization: async ({ pushUrl, targetRef }) => {
      authorizationCalls += 1;
      assert.equal(pushUrl, "https://github.com/maxd4/CleanMyMap.git");
      assert.equal(targetRef, "refs/heads/main");
    },
  });
  assert.equal(published, "candidate");
  assert.equal(fake.state.remote, "candidate");
  assert.equal(authorizationCalls, 1);
});

test("authorization failure blocks before any effective push", async () => {
  const fake = fakeGit();
  await assert.rejects(publishMain({
    runGitCommand: fake.runGitCommand,
    verifyAuthorization: async () => { throw new Error("PUBLISH_AUTH_UPDATE_BYPASS_UNAUTHORIZED:25034548"); },
  }), /PUBLISH_AUTH_UPDATE_BYPASS_UNAUTHORIZED/);
  assert.equal(pushCalls(fake).length, 0);
});

test("rejects bypass acknowledgements for another rule, another ref, or additional violations", () => {
  assert.equal(validatePushBypassAcknowledgement("remote: Bypassed rule violations for refs/heads/main:\nremote: - Cannot update this protected ref."), true);
  assert.throws(() => validatePushBypassAcknowledgement("remote: Bypassed rule violations for refs/heads/main:\nremote: - Cannot delete this branch."), /PUSH_BYPASS_UNEXPECTED_RULES/);
  assert.throws(() => validatePushBypassAcknowledgement("remote: Bypassed rule violations for refs/heads/main:\nremote: - Cannot update this protected ref.\nremote: - Required status check failed."), /PUSH_BYPASS_UNEXPECTED_RULES/);
  assert.throws(() => validatePushBypassAcknowledgement("remote: Bypassed rule violations for refs/heads/other:\nremote: - Cannot update this protected ref."), /PUSH_BYPASS_UNEXPECTED_REF/);
  assert.throws(() => validatePushBypassAcknowledgement("Bypassed rule violations for refs/heads/main"), /PUSH_BYPASS_MALFORMED/);
  assert.throws(() => validatePushBypassAcknowledgement("remote: Bypassed rule violations for refs/heads/main:\nremote: no violation details"), /PUSH_BYPASS_UNEXPECTED_RULES/);
  assert.throws(() => validatePushBypassAcknowledgement("remote: Bypassed rule violations for refs/heads/main:\nremote: - Cannot update this protected ref.\nremote: Bypassed rule violations for refs/heads/main:\nremote: - Cannot update this protected ref."), /PUSH_BYPASS_MALFORMED/);
});

test("blocks a new local commit created between candidate capture and push", async () => {
  const fake = fakeGit({
    parents: { candidate: "base", local2: "candidate" },
    onHeadRead: ({ headReads, state }) => {
      if (headReads === 2) {
        state.local = "local2";
        state.branch = "local2";
      }
    },
  });

  await assert.rejects(
    publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {} }),
    /Local main changed immediately before push.*candidate candidate.*Reconcile/,
  );
  assert.equal(pushCalls(fake).length, 0);
});

test("blocks a new local commit created between push and final verification", async () => {
  const fake = fakeGit({
    parents: { candidate: "base", local2: "candidate" },
    onPush: ({ state }) => {
      state.local = "local2";
      state.branch = "local2";
    },
  });

  await assert.rejects(
    publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {} }),
    /Local main changed after push verification.*candidate candidate.*Reconcile/,
  );
  assert.deepEqual(pushCalls(fake), [["push", "origin", "candidate:refs/heads/main"]]);
});

test("reconciles a compatible remote fast-forward after the candidate push", async () => {
  const fake = fakeGit({
    parents: { candidate: "base", remote2: "candidate" },
    onPush: ({ state }) => {
      state.remote = "remote2";
    },
  });

  const published = await publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {}, backoffMs: 1 });

  assert.equal(published, "remote2");
  assert.equal(fake.state.local, "remote2");
  assert.equal(fake.state.remote, "remote2");
  assert.deepEqual(pushCalls(fake), [["push", "origin", "candidate:refs/heads/main"]]);
  assert.ok(fake.calls.some((args) => args[0] === "merge" && args[1] === "--ff-only"));
});

test("keeps bounded retries for a transient concurrent push rejection", async () => {
  const fake = fakeGit({
    pushResults: [
      { status: 1, stdout: "", stderr: "rejected non-fast-forward" },
      { status: 0, stdout: "", stderr: "" },
    ],
  });

  const published = await publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {}, backoffMs: 1 });

  assert.equal(published, "candidate");
  assert.deepEqual(pushCalls(fake), [
    ["push", "origin", "candidate:refs/heads/main"],
    ["push", "origin", "candidate:refs/heads/main"],
  ]);
  assert.equal(fake.calls.filter((args) => args[0] === "fetch").length, 3);
});

test("does not silently adopt a local commit during a bounded retry", async () => {
  const fake = fakeGit({
    pushResults: [{ status: 1, stdout: "", stderr: "rejected non-fast-forward" }],
    parents: { candidate: "base", local2: "candidate" },
    onHeadRead: ({ headReads, state }) => {
      if (headReads === 4) {
        state.local = "local2";
        state.branch = "local2";
      }
    },
  });

  await assert.rejects(
    publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {}, backoffMs: 1 }),
    /Local main changed after a concurrent push rejection.*candidate candidate.*Reconcile/,
  );
  assert.equal(pushCalls(fake).length, 1);
});

test("does not silently merge a divergent main or force-push it", async () => {
  const fake = fakeGit({
    local: "candidate",
    remote: "diverged",
    parents: { candidate: "base", diverged: "base" },
  });

  await assert.rejects(
    publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {} }),
    /diverged; resolve the non-destructive merge explicitly/,
  );
  assert.equal(pushCalls(fake).length, 0);
  assert.equal(fake.calls.some((args) => args.includes("--force")), false);
});

test("does not retry a permission failure as a Git race", async () => {
  const fake = fakeGit({
    pushResults: [{ status: 1, stdout: "", stderr: "remote: permission denied" }],
  });

  await assert.rejects(
    publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {} }),
    /permission denied/,
  );
  assert.equal(pushCalls(fake).length, 1);
});

test("captures staged, unstaged, and untracked attributed files in one exact tree", () => {
  const root = fixtureRepository();
  try {
    fs.writeFileSync(path.join(root, "staged.txt"), "staged\n");
    execFileSync("git", ["add", "--", "staged.txt"], { cwd: root });
    fs.writeFileSync(path.join(root, "README.md"), "unstaged\n");
    fs.writeFileSync(path.join(root, "apps", "web", "src", "page.tsx"), "export default null;\n");
    const candidate = captureWorktreeCandidate({
      repositoryRoot: root,
      candidateFiles: ["README.md", "staged.txt", "apps/web/src/page.tsx"],
    });
    const changed = execFileSync("git", ["diff", "--name-only", candidate.baseSha, candidate.candidateTreeSha], {
      cwd: root,
      encoding: "utf8",
    }).trim().split(/\r?\n/).filter(Boolean).sort((left, right) => left.localeCompare(right, "en"));
    assert.deepEqual(changed, ["README.md", "apps/web/src/page.tsx", "staged.txt"].sort((left, right) => left.localeCompare(right, "en")));
    candidate.cleanup();
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("excludes staged, unstaged, and untracked foreign files while preserving them", () => {
  const root = fixtureRepository();
  try {
    fs.writeFileSync(path.join(root, "apps", "web", "src", "page.tsx"), "export default null;\n");
    fs.writeFileSync(path.join(root, "README.md"), "foreign unstaged\n");
    fs.writeFileSync(path.join(root, "staged-foreign.txt"), "foreign staged\n");
    execFileSync("git", ["add", "--", "staged-foreign.txt"], { cwd: root });
    fs.writeFileSync(path.join(root, "untracked-foreign.txt"), "foreign untracked\n");
    const candidate = captureWorktreeCandidate({
      repositoryRoot: root,
      candidateFiles: ["apps/web/src/page.tsx"],
    });
    const included = execFileSync("git", ["diff", "--name-only", candidate.baseSha, candidate.candidateTreeSha], {
      cwd: root,
      encoding: "utf8",
    }).trim().split(/\r?\n/).filter(Boolean);
    assert.deepEqual(included, ["apps/web/src/page.tsx"]);
    assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "foreign unstaged\n");
    assert.equal(fs.readFileSync(path.join(root, "staged-foreign.txt"), "utf8"), "foreign staged\n");
    assert.equal(fs.readFileSync(path.join(root, "untracked-foreign.txt"), "utf8"), "foreign untracked\n");
    candidate.cleanup();
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("blocks generated candidate files without blocking unrelated dirty paths", () => {
  const root = fixtureRepository();
  try {
    fs.writeFileSync(path.join(root, "README.md"), "unrelated dirty\n");
    fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
    fs.writeFileSync(path.join(root, "artifacts", "report.json"), "{}\n");
    assert.throws(
      () => captureWorktreeCandidate({ repositoryRoot: root, candidateFiles: ["artifacts/report.json"] }),
      /GENERATED_ARTIFACT/,
    );
    assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "unrelated dirty\n");
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("commits exactly the validated tree and leaves no attributed file uncommitted", () => {
  const root = fixtureRepository();
  try {
    const file = path.join(root, "apps", "web", "src", "page.tsx");
    fs.writeFileSync(file, "export default null;\n");
    const candidate = captureWorktreeCandidate({ repositoryRoot: root, candidateFiles: ["apps/web/src/page.tsx"] });
    const result = commitCandidate({ repositoryRoot: root, candidate, runPreCommit: false });
    assert.equal(execFileSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: root, encoding: "utf8" }).trim(), candidate.candidateTreeSha);
    assert.equal(execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: root, encoding: "utf8" }).trim(), "");
    assert.match(result.commitSha, /^[0-9a-f]{40}$/);
    candidate.cleanup();
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("commits attributed files without consuming another writer's staged changes", () => {
  const root = fixtureRepository();
  try {
    fs.writeFileSync(path.join(root, "apps", "web", "src", "page.tsx"), "export default null;\n");
    fs.writeFileSync(path.join(root, "foreign-staged.txt"), "preserve staged\n");
    execFileSync("git", ["add", "--", "foreign-staged.txt"], { cwd: root });
    fs.writeFileSync(path.join(root, "README.md"), "preserve unstaged\n");
    fs.writeFileSync(path.join(root, "foreign-untracked.txt"), "preserve untracked\n");
    const candidate = captureWorktreeCandidate({ repositoryRoot: root, candidateFiles: ["apps/web/src/page.tsx"] });
    const committed = commitCandidate({ repositoryRoot: root, candidate, runPreCommit: false });

    const committedPaths = execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", committed.commitSha], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/);
    assert.deepEqual(committedPaths, ["apps/web/src/page.tsx"]);
    assert.match(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }), /A  foreign-staged\.txt/);
    assert.match(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }), / M README\.md/);
    assert.match(execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }), /\?\? foreign-untracked\.txt/);
    candidate.cleanup();
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("strict publication refuses a remote change before pushing", async () => {
  const fake = fakeGit({ local: "candidate", remote: "other", parents: { candidate: "base", other: "base" } });
  await assert.rejects(
    publishMain({ runGitCommand: fake.runGitCommand, expectedRemoteSha: "base", sleep: async () => {} }),
    /origin\/main changed during DEPLOY publication/,
  );
  assert.equal(pushCalls(fake).length, 0);
});
