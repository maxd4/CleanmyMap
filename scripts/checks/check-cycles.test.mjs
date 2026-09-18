import assert from "node:assert/strict";
import test from "node:test";

import { compareCycleBaseline, cycleFingerprint, normalizeCycleReport } from "./check-cycles.mjs";

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
