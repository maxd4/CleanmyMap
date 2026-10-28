import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { nodeCoverageCommands, runNodeCoverage } from "./run-node-coverage.mjs";

test("Node coverage preflight runs before c8 and publication with the canonical command", () => {
  assert.deepEqual(nodeCoverageCommands({ c8Executable: "c8-test", npmExecutable: "npm-test" }), [{
    executable: "c8-test",
    args: [
      "--all",
      "--src", "scripts",
      "--src", "apps/web/scripts",
      "--exclude", "scripts/**/*.test.*",
      "--exclude", "apps/web/scripts/**/*.test.*",
      "--exclude", "scripts/coverage/**",
      "--exclude", "apps/web/scripts/coverage/**",
      "--reporter=lcov",
      "--reporter=json-summary",
      "--reports-dir=scripts/coverage",
      "npm-test",
      "run",
      "test:scripts",
    ],
  }]);
  if (process.platform === "win32") {
    const [defaultCommand] = nodeCoverageCommands();
    assert.equal(defaultCommand.executable, process.execPath);
    assert.equal(defaultCommand.args[0], path.resolve(import.meta.dirname, "../../node_modules/c8/bin/c8.js"));
  }
});

test("Node coverage failure in preflight prevents c8, test:scripts, and publication", () => {
  const calls = [];
  const result = runNodeCoverage({
    spawn: (...args) => {
      calls.push(args);
      return { status: 0 };
    },
    candidateIdentity: () => {
      throw new Error("Git worktree candidate inventory failed");
    },
    c8Executable: "c8-test",
    npmExecutable: "npm-test",
    nodeExecutable: "node-test",
  });
  assert.equal(result, 1);
  assert.equal(calls.length, 0);
});

test("Node coverage carries exact preflight identity through c8 and publication", () => {
  const calls = [];
  const identity = {
    version: 1,
    method: "git-tree-v1",
    candidateSha: "a".repeat(40),
    candidateScope: "CI_CANDIDATE",
    scope: "node",
    sourceTreeSha: "b".repeat(40),
    relevantDirtyFiles: [],
    verified: true,
  };
  const spawn = (executable, args, options) => {
    calls.push({ executable, args, options });
    return { status: 0 };
  };

  assert.equal(runNodeCoverage({
    spawn,
    candidateIdentity: () => identity,
    c8Executable: "c8-test",
    npmExecutable: "npm-test",
    nodeExecutable: "node-test",
  }), 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].executable, "c8-test");
  assert.equal(calls[0].args.at(-2), "run");
  assert.equal(calls[0].args.at(-1), "test:scripts");
  assert.deepEqual(JSON.parse(calls[0].options.env.CMM_COVERAGE_CANDIDATE_IDENTITY), identity);
  assert.deepEqual(calls[1], {
    executable: "node-test",
    args: ["scripts/checks/write-coverage-publication-proof.mjs", "--scope=node"],
    options: calls[0].options,
  });
});

test("Node WORKTREE_LIVE diagnostics run without being promoted to exact proof", () => {
  const calls = [];
  const identity = {
    version: 1,
    method: "git-tree-v1",
    candidateSha: "a".repeat(40),
    candidateScope: "WORKTREE",
    scope: "node",
    sourceTreeSha: "b".repeat(40),
    relevantDirtyFiles: ["scripts/ci/dirty.mjs"],
    verified: false,
  };
  assert.equal(runNodeCoverage({
    spawn: (...args) => {
      calls.push(args);
      return { status: 0 };
    },
    candidateIdentity: () => identity,
    c8Executable: "c8-test",
    npmExecutable: "npm-test",
    nodeExecutable: "node-test",
  }), 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][2].env.CMM_COVERAGE_CANDIDATE_IDENTITY, undefined);
});
