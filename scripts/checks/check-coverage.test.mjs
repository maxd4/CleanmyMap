import assert from "node:assert/strict";
import { test } from "node:test";

import {
  COVERAGE_METRICS,
  COVERAGE_SCOPE_FINGERPRINT,
  aggregateCoverage,
  compareCoverage,
  validateBaseline,
} from "./coverage-policy.mjs";

function metric(covered, total = 100) {
  return { total, covered, pct: Number(((covered / total) * 100).toFixed(2)) };
}

function summary(overrides = {}) {
  const total = Object.fromEntries(COVERAGE_METRICS.map((name) => [name, metric(80)]));
  const row = () => ({
    statements: metric(80),
    branches: metric(80),
    functions: metric(80),
    lines: metric(80),
  });
  return {
    total: { ...total, ...overrides.total },
    "C:\\repo\\apps\\web\\src\\lib\\auth\\auth.ts": row(),
    "C:\\repo\\apps\\web\\src\\lib\\actions\\actions.ts": row(),
    "C:\\repo\\apps\\web\\src\\app\\api\\actions\\[actionId]\\formalities\\route.ts": row(),
    "C:\\repo\\apps\\web\\src\\lib\\route\\route.ts": row(),
    "C:\\repo\\apps\\web\\src\\lib\\supabase\\client.ts": row(),
  };
}

function baselineFrom(current) {
  return {
    schemaVersion: 1,
    sourceCommit: "a".repeat(40),
    scopeFingerprint: COVERAGE_SCOPE_FINGERPRINT,
    metrics: structuredClone(current.metrics),
    domains: Object.fromEntries(
      Object.entries(current.domains).map(([name, entry]) => [name, {
        patterns: entry.patterns,
        metrics: structuredClone(entry.metrics),
      }]),
    ),
  };
}

test("baseline respected passes", () => {
  const current = aggregateCoverage(summary());
  const baseline = baselineFrom(current);
  assert.deepEqual(compareCoverage(current, baseline), []);
});

test("a lower baseline than the measured coverage passes", () => {
  const current = aggregateCoverage(summary());
  const baseline = baselineFrom(current);
  for (const metricName of COVERAGE_METRICS) {
    baseline.metrics[metricName] = metric(70);
    for (const domain of Object.values(baseline.domains)) domain.metrics[metricName] = metric(70);
  }
  assert.deepEqual(compareCoverage(current, baseline), []);
});

test("a simulated global or domain drop fails", () => {
  const current = aggregateCoverage(summary());
  const baseline = baselineFrom(current);
  baseline.metrics.branches = metric(81);
  baseline.domains["auth-authz"].metrics.lines = metric(81);
  const failures = compareCoverage(current, baseline);
  assert.ok(failures.some((failure) => failure.includes("global branches")));
  assert.ok(failures.some((failure) => failure.includes("auth-authz lines")));
});

test("malformed or stale baseline fails explicitly", () => {
  const current = aggregateCoverage(summary());
  const baseline = baselineFrom(current);
  assert.throws(() => validateBaseline({ ...baseline, schemaVersion: 0 }), /malformed/);
  assert.throws(
    () => validateBaseline({ ...baseline, scopeFingerprint: "stale" }),
    /stale/,
  );
});
