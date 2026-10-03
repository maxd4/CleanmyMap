import assert from "node:assert/strict";
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

test("a complete clean report passes", () => {
  const result = runCycleGate({
    runAudit: () => ({ status: 0, stdout: JSON.stringify({ status: "clean", enumeration: "complete", cycles: [] }), stderr: "" }),
  });
  assert.deepEqual(result.cycles, []);
  assert.deepEqual(result.comparison, { added: [], stale: [] });
});

test("a new cycle fails with a stable fingerprint and readable files", () => {
  const cycle = { files: ["a.ts", "b.ts", "a.ts"] };
  const result = runCycleGate({
    runAudit: () => ({ status: 1, stdout: JSON.stringify({ status: "cycles_found", enumeration: "complete", cycles: [cycle] }), stderr: "" }),
  });
  assert.deepEqual(result.comparison.added, [cycleFingerprint(cycle)]);
  assert.equal(formatCycleDiagnostic(cycle), "files=a.ts -> b.ts -> a.ts");
});

test("a real tool error fails even without a report", () => {
  assert.throws(
    () => runCycleGate({ runAudit: () => ({ status: 1, stdout: "", stderr: "GitNexus crashed" }) }),
    /no JSON report/,
  );
});

test("a GitNexus host timeout is classified explicitly", () => {
  assert.throws(
    () => runCycleGate({
      runAudit: () => ({
        status: 1,
        stdout: "",
        stderr: "HOST_ENVIRONMENT: GitNexus command timed out",
      }),
    }),
    /HOST_ENVIRONMENT: GitNexus command timed out/,
  );
});
