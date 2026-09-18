import assert from "node:assert/strict";
import test from "node:test";
import {
  compareMutationReport,
  getMutationScope,
  mutationScopeFingerprint,
  normalizeMutationStatus,
  summarizeMutationReport,
  validateMutationBaseline,
} from "./mutation-policy.mjs";

const config = {
  mutate: ["src/example.ts:1-10"],
  testFiles: ["src/example.test.ts"],
};

function report(statuses) {
  return { files: { "src/example.ts": { mutants: statuses.map((status, index) => ({ id: String(index), status })) } } };
}

test("summarizes killed, survived, no coverage, timeout and error mutants", () => {
  const summary = summarizeMutationReport(report(["Killed", "Survived", "NoCoverage", "Timeout", "RuntimeError"]));
  assert.deepEqual(summary.counts, { Killed: 1, Survived: 1, NoCoverage: 1, Timeout: 1, error: 1 });
  assert.equal(summary.score, 25);
  assert.equal(normalizeMutationStatus("CompileError"), "error");
});

test("a stable baseline passes and a lower score fails", () => {
  const baseline = summarizeMutationReport(report(["Killed", "Killed", "Survived"]));
  assert.deepEqual(compareMutationReport(baseline, { summary: baseline, files: { "src/example.ts": baseline } }), []);
  const lower = summarizeMutationReport(report(["Killed", "Survived", "Survived"]));
  assert.match(compareMutationReport(lower, { summary: baseline, files: { "src/example.ts": baseline } }).join("\n"), /score decreased/);
});

test("new no-coverage, timeout or error status fails the ratchet", () => {
  const baseline = summarizeMutationReport(report(["Killed", "Survived"]));
  const current = summarizeMutationReport(report(["Killed", "Survived", "NoCoverage", "Timeout"]));
  const failures = compareMutationReport(current, { summary: baseline, files: { "src/example.ts": baseline } });
  assert.ok(failures.some((failure) => failure.includes("no coverage increased")));
  assert.ok(failures.some((failure) => failure.includes("timed out")));
});

test("malformed or stale scope baselines fail explicitly", () => {
  assert.deepEqual(getMutationScope(config), config);
  const baseline = {
    schemaVersion: 1,
    tool: "stryker",
    toolVersion: "10.0.0",
    runnerVersion: "10.0.0",
    sourceCommit: "a".repeat(40),
    scopeFingerprint: mutationScopeFingerprint(config),
    summary: summarizeMutationReport(report(["Killed"])),
    files: { "src/example.ts": summarizeMutationReport(report(["Killed"])) },
  };
  assert.doesNotThrow(() => validateMutationBaseline(baseline, config));
  assert.throws(() => validateMutationBaseline({ ...baseline, scopeFingerprint: "stale" }, config), /scope changed/);
  assert.throws(() => validateMutationBaseline({ ...baseline, summary: { ...baseline.summary, total: 2 } }, config), /does not match counts/);
});
