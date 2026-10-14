import assert from "node:assert/strict";
import test from "node:test";

import { publishMain } from "./publish-main.mjs";

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
