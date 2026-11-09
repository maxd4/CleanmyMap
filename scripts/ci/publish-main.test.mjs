import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  captureWorktreeCandidate,
  commitCandidate,
  publishMain,
} from "./publish-main.mjs";
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
} = {}) {
  const calls = [];
  const state = { local, branch: local, remote };
  const graph = new Map(Object.entries(parents));
  let headReads = 0;
  let branchReads = 0;
  let pushIndex = 0;

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
      if (headReads === 3) {
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
    assert.deepEqual(candidate.worktreeFiles, ["README.md", "apps/web/src/page.tsx", "staged.txt"].sort((left, right) => left.localeCompare(right, "en")));
    const changed = execFileSync("git", ["diff", "--name-only", candidate.baseSha, candidate.candidateTreeSha], {
      cwd: root,
      encoding: "utf8",
    }).trim().split(/\r?\n/).filter(Boolean).sort((left, right) => left.localeCompare(right, "en"));
    assert.deepEqual(changed, candidate.worktreeFiles);
    candidate.cleanup();
  } finally {
    removePathWithRetry(root, { recursive: true });
  }
});

test("blocks foreign and generated files before creating a publication candidate", () => {
  const root = fixtureRepository();
  try {
    fs.writeFileSync(path.join(root, "apps", "web", "src", "page.tsx"), "export default null;\n");
    fs.writeFileSync(path.join(root, "foreign.txt"), "foreign\n");
    assert.throws(
      () => captureWorktreeCandidate({ repositoryRoot: root, candidateFiles: ["apps/web/src/page.tsx"] }),
      /SCOPE_UNRESOLVED.*foreign\.txt/,
    );
    fs.rmSync(path.join(root, "foreign.txt"));
    fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
    fs.writeFileSync(path.join(root, "artifacts", "report.json"), "{}\n");
    assert.throws(
      () => captureWorktreeCandidate({ repositoryRoot: root, candidateFiles: ["apps/web/src/page.tsx", "artifacts/report.json"] }),
      /GENERATED_ARTIFACT/,
    );
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

test("strict publication refuses a remote change before pushing", async () => {
  const fake = fakeGit({ local: "candidate", remote: "other", parents: { candidate: "base", other: "base" } });
  await assert.rejects(
    publishMain({ runGitCommand: fake.runGitCommand, expectedRemoteSha: "base", sleep: async () => {} }),
    /origin\/main changed during DEPLOY publication/,
  );
  assert.equal(pushCalls(fake).length, 0);
});
