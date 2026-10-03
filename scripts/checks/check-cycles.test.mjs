import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

import { compareCycleBaseline, cycleFingerprint, formatCycleDiagnostic, normalizeCycleReport, runCycleGate } from "./check-cycles.mjs";

test("cycle fingerprints are stable regardless of member order", () => {
  assert.equal(cycleFingerprint({ members: ["b", "a"], edges: [{ to: "b", from: "a" }] }), cycleFingerprint({ edges: [{ from: "a", to: "b" }], members: ["a", "b"] }));
});

test("new and stale cycles are both reported", () => {
  const current = normalizeCycleReport({ status: "clean", enumeration: "complete", cycles: [{ members: ["a", "b"] }] });
  const baseline = normalizeCycleReport({ status: "clean", enumeration: "complete", cycles: [{ members: ["legacy", "cycle"] }] });
  const result = compareCycleBaseline(current, baseline);
  assert.equal(result.added.length, 1);
  assert.equal(result.stale.length, 1);
});

test("incomplete GitNexus reports fail closed", () => {
  assert.throws(() => normalizeCycleReport({ status: "clean", enumeration: "partial", cycles: [] }), /malformed or incomplete/);
});

test("a complete clean report passes", async () => {
  const result = await runCycleGate({
    runAudit: () => ({ status: 0, stdout: JSON.stringify({ status: "clean", enumeration: "complete", cycles: [] }), stderr: "" }),
  });
  assert.deepEqual(result.cycles, []);
  assert.deepEqual(result.comparison, { added: [], stale: [] });
  assert.equal(result.gateStatus, "PASS");
});

test("a new cycle fails with a stable fingerprint and readable files", async () => {
  const cycle = { files: ["a.ts", "b.ts", "a.ts"] };
  const result = await runCycleGate({
    runAudit: () => ({ status: 1, stdout: JSON.stringify({ status: "cycles_found", enumeration: "complete", cycles: [cycle] }), stderr: "" }),
  });
  assert.deepEqual(result.comparison.added, [cycleFingerprint(cycle)]);
  assert.equal(formatCycleDiagnostic(cycle), "files=a.ts -> b.ts -> a.ts");
  assert.equal(result.gateStatus, "FAIL_NEW_CYCLE");
});

test("a real tool error is classified as a malformed report", async () => {
  await assert.rejects(
    () => runCycleGate({ runAudit: () => ({ status: 1, stdout: "", stderr: "GitNexus crashed" }) }),
    /no JSON report/,
  );
});

test("a GitNexus host timeout is classified explicitly", async () => {
  await assert.rejects(
    () => runCycleGate({
      runAudit: () => ({
        status: 1,
        stdout: "",
        stderr: "HOST_ENVIRONMENT: GitNexus command timed out",
      }),
    }),
    (error) => error.code === "TIMEOUT" && /HOST_ENVIRONMENT: GitNexus command timed out/.test(error.message),
  );
});

test("a GitNexus runner absence is classified before JSON parsing", async () => {
  await assert.rejects(
    () => runCycleGate({
      runAudit: () => ({
        status: 1,
        stdout: "",
        stderr: "GITNEXUS_PREFLIGHT\nHOST_ENVIRONMENT: GitNexus runner missing",
      }),
    }),
    (error) => error.code === "RUNNER_MISSING" && /HOST_ENVIRONMENT: GitNexus runner missing/.test(error.message),
  );
});

test("a stale baseline is classified separately from a new cycle", async () => {
  const cycle = { members: ["legacy.ts"] };
  const result = await runCycleGate({
    runAudit: () => ({ status: 0, stdout: JSON.stringify({ status: "clean", enumeration: "complete", cycles: [] }), stderr: "" }),
    baseline: {
      schemaVersion: 1,
      tool: "gitnexus",
      toolVersion: "1.6.12",
      sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      cycles: [cycleFingerprint(cycle)],
    },
  });
  assert.equal(result.gateStatus, "FAIL_STALE_BASELINE");
  assert.deepEqual(result.comparison.stale, [cycleFingerprint(cycle)]);
});
