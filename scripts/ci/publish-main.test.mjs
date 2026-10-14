import assert from "node:assert/strict";
import test from "node:test";

import { publishMain } from "./publish-main.mjs";

function fakeGit({ pushResults, remote = "base", local = "candidate", ancestry = "fast-forward" }) {
  const calls = [];
  let pushIndex = 0;
  let currentRemote = remote;
  let currentLocal = local;

  const runGitCommand = (args) => {
    calls.push(args);
    if (args[0] === "branch") return { status: 0, stdout: "main\n", stderr: "" };
    if (args[0] === "rev-parse" && args[1] === "--verify") return { status: 1, stdout: "", stderr: "" };
    if (args[0] === "fetch") return { status: 0, stdout: "", stderr: "" };
    if (args[0] === "rev-parse" && args[1] === "HEAD") return { status: 0, stdout: `${currentLocal}\n`, stderr: "" };
    if (args[0] === "rev-parse" && args[1] === "origin/main") return { status: 0, stdout: `${currentRemote}\n`, stderr: "" };
    if (args[0] === "merge-base" && args[1] === "--is-ancestor") {
      const [ancestor, descendant] = args.slice(2);
      if (ancestry === "diverged") return { status: 1, stdout: "", stderr: "" };
      if (ancestor === currentRemote && descendant === currentLocal) return { status: currentRemote === "base" ? 0 : 1, stdout: "", stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    }
    if (args[0] === "merge" && args[1] === "--ff-only") {
      currentLocal = currentRemote;
      return { status: 0, stdout: "", stderr: "" };
    }
    if (args[0] === "push") {
      const result = pushResults[pushIndex++] ?? { status: 0, stdout: "", stderr: "" };
      if (result.status === 1 && /non-fast-forward/.test(result.stderr)) currentRemote = "other-3";
      return result;
    }
    throw new Error(`Unexpected fake git call: ${args.join(" ")}`);
  };

  return { calls, runGitCommand };
}

test("retries a concurrent fast-forward push after bounded synchronization", async () => {
  const fake = fakeGit({
    pushResults: [
      { status: 1, stdout: "", stderr: "rejected non-fast-forward" },
      { status: 0, stdout: "", stderr: "" },
    ],
  });

  const published = await publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {}, backoffMs: 1 });

  assert.equal(published, "other-3");
  assert.equal(fake.calls.filter((args) => args[0] === "push").length, 2);
  assert.ok(fake.calls.some((args) => args[0] === "merge" && args[1] === "--ff-only"));
  assert.ok(fake.calls.filter((args) => args[0] === "fetch").length >= 2);
  assert.ok(fake.calls.every((args) => !args.includes("--force")));
});

test("does not silently merge a divergent main or force-push it", async () => {
  const fake = fakeGit({
    ancestry: "diverged",
    pushResults: [{ status: 1, stdout: "", stderr: "rejected non-fast-forward" }],
  });

  await assert.rejects(
    publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {} }),
    /diverged; resolve the non-destructive merge explicitly/,
  );
  assert.equal(fake.calls.some((args) => args[0] === "push"), false);
  assert.equal(fake.calls.some((args) => args.includes("--force")), false);
});

test("does not retry a push failure unrelated to a concurrent race", async () => {
  const fake = fakeGit({
    pushResults: [{ status: 1, stdout: "", stderr: "permission denied" }],
  });

  await assert.rejects(
    publishMain({ runGitCommand: fake.runGitCommand, sleep: async () => {} }),
    /permission denied/,
  );
  assert.equal(fake.calls.filter((args) => args[0] === "push").length, 1);
});
