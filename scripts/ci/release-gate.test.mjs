import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateReleaseGate } from "./release-gate.mjs";

const evidence = {
  candidateSha: "abc",
  mode: "FULL",
  verdict: "PASS",
  releaseReady: true,
  failed: [],
  blocked: [],
  notRun: [],
};

test("release gate requires exact SHA, clean worktree, and disabled main auto-deployment", () => {
  assert.equal(evaluateReleaseGate({
    evidence,
    current: "abc",
    clean: true,
    deploymentEnabled: { sha: "abc", main: false },
  }).ready, true);

  assert.equal(evaluateReleaseGate({
    evidence,
    current: "def",
    clean: true,
    deploymentEnabled: { sha: "def", main: false },
  }).ready, false);

  assert.equal(evaluateReleaseGate({
    evidence,
    current: "abc",
    clean: true,
    deploymentEnabled: { sha: "abc", main: true },
  }).ready, false);
});
