import assert from "node:assert/strict";
import { test } from "node:test";

import {
  COVERAGE_GRACE,
  COVERAGE_METRICS,
  COVERAGE_SCOPE_FINGERPRINT,
  MOBILE_COVERAGE_SCOPE_FINGERPRINT,
  aggregateCoverage,
  compareCoverage,
  formatCoverageGrace,
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

function coverageFixture({ global = {}, domains = {} } = {}) {
  const makeMetrics = (overrides) => Object.fromEntries(
    COVERAGE_METRICS.map((name) => {
      const override = overrides[name] ?? {};
      return [name, metric(override.covered ?? 800, override.total ?? 1000)];
    }),
  );
  return {
    metrics: makeMetrics(global),
    domains: Object.fromEntries(
      Object.keys(COVERAGE_GRACE)
        .filter((scope) => scope !== "global")
        .map((scope) => [scope, { metrics: makeMetrics(domains[scope] ?? {}) }]),
    ),
  };
}

test("baseline exacte => PASS", () => {
  const current = aggregateCoverage(summary());
  const baseline = baselineFrom(current);
  assert.deepEqual(compareCoverage(current, baseline), { status: "PASS", failures: [], grace: [] });
});

test("amélioration => PASS", () => {
  const current = coverageFixture();
  const baseline = coverageFixture({ global: { lines: { covered: 799 } } });
  assert.equal(compareCoverage(current, baseline).status, "PASS");
});

test("baisse globale de 0.10 pp => PASS_WITH_GRACE et reporting explicite", () => {
  const current = coverageFixture({ global: { lines: { covered: 799 } } });
  const baseline = coverageFixture();
  const comparison = compareCoverage(current, baseline);
  assert.equal(comparison.status, "PASS_WITH_GRACE");
  assert.deepEqual(comparison.failures, []);
  assert.match(formatCoverageGrace(comparison.grace[0]), /COVERAGE_GRACE global\.lines:/);
  assert.match(formatCoverageGrace(comparison.grace[0]), /drop=0\.10pp/);
  assert.match(formatCoverageGrace(comparison.grace[0]), /allowed=0\.25pp/);
});

test("baisse globale au-delà de 0.25 pp => FAIL", () => {
  const current = coverageFixture({ global: { lines: { covered: 797 } } });
  const baseline = coverageFixture();
  const comparison = compareCoverage(current, baseline);
  assert.equal(comparison.status, "FAIL");
  assert.ok(comparison.failures.some((failure) => failure.scope === "global" && failure.metric === "lines"));
});

test("petite baisse domaine => PASS_WITH_GRACE", () => {
  const current = coverageFixture({ domains: { actions: { lines: { covered: 799 } } } });
  const comparison = compareCoverage(current, coverageFixture());
  assert.equal(comparison.status, "PASS_WITH_GRACE");
  assert.ok(comparison.grace.some((entry) => entry.scope === "actions" && entry.metric === "lines"));
});

test("baisse domaine au-delà de l'enveloppe => FAIL", () => {
  const current = coverageFixture({ domains: { actions: { lines: { covered: 792 } } } });
  const comparison = compareCoverage(current, coverageFixture());
  assert.equal(comparison.status, "FAIL");
  assert.ok(comparison.failures.some((failure) => failure.scope === "actions" && failure.metric === "lines"));
});

test("un petit domaine tolère une unité mesurée", () => {
  const baseline = coverageFixture({ domains: { persistence: { lines: { covered: 80, total: 100 } } } });
  const current = coverageFixture({ domains: { persistence: { lines: { covered: 79, total: 100 } } } });
  const comparison = compareCoverage(current, baseline);
  assert.equal(comparison.status, "PASS_WITH_GRACE");
  const grace = comparison.grace.find((entry) => entry.scope === "persistence" && entry.metric === "lines");
  assert.equal(grace.allowed, 1);
});

test("plusieurs unités mesurées dépassent la limite d'un petit domaine", () => {
  const baseline = coverageFixture({ domains: { persistence: { lines: { covered: 80, total: 100 } } } });
  const current = coverageFixture({ domains: { persistence: { lines: { covered: 78, total: 100 } } } });
  const comparison = compareCoverage(current, baseline);
  assert.equal(comparison.status, "FAIL");
});

test("les tolérances auth-authz et des autres domaines restent distinctes", () => {
  assert.equal(COVERAGE_GRACE["auth-authz"], 0.25);
  for (const scope of ["actions", "formalities", "route-calculs", "persistence"]) {
    assert.equal(COVERAGE_GRACE[scope], 0.75);
  }
  const baseline = coverageFixture();
  const current = coverageFixture({
    domains: {
      "auth-authz": { lines: { covered: 795 } },
      actions: { lines: { covered: 795 } },
      formalities: { lines: { covered: 795 } },
      "route-calculs": { lines: { covered: 795 } },
      persistence: { lines: { covered: 795 } },
    },
  });
  const comparison = compareCoverage(current, baseline);
  assert.ok(comparison.failures.some((failure) => failure.scope === "auth-authz"));
  for (const scope of ["actions", "formalities", "route-calculs", "persistence"]) {
    assert.ok(comparison.grace.some((entry) => entry.scope === scope));
  }
});

test("malformed or stale baseline fails explicitly", () => {
  const current = aggregateCoverage(summary());
  const baseline = baselineFrom(current);
  assert.throws(() => validateBaseline({ ...baseline, schemaVersion: 0 }), /malformed/);
  const missingDomain = structuredClone(baseline);
  delete missingDomain.domains.persistence;
  assert.throws(() => validateBaseline(missingDomain), /missing domain persistence/);
  assert.throws(
    () => validateBaseline({ ...baseline, scopeFingerprint: "stale" }),
    /stale/,
  );
});

test("la couverture mobile reste un scope indépendant sans domaines web", () => {
  const mobileSummary = {
    total: Object.fromEntries(COVERAGE_METRICS.map((name) => [name, metric(30, 100)])),
    "C:\\repo\\apps\\mobile\\lib\\tracking-service.ts": {
      statements: metric(30, 100),
      branches: metric(30, 100),
      functions: metric(30, 100),
      lines: metric(30, 100),
    },
  };
  const current = aggregateCoverage(mobileSummary, { scope: "mobile" });
  assert.deepEqual(current.domains, {});
  const baseline = {
    schemaVersion: 1,
    sourceCommit: "a".repeat(40),
    scopeFingerprint: MOBILE_COVERAGE_SCOPE_FINGERPRINT,
    metrics: structuredClone(current.metrics),
    domains: {},
  };
  assert.doesNotThrow(() => validateBaseline(baseline, { scope: "mobile" }));
  assert.deepEqual(compareCoverage(current, baseline), { status: "PASS", failures: [], grace: [] });
  assert.throws(() => validateBaseline({ ...baseline, scopeFingerprint: COVERAGE_SCOPE_FINGERPRINT }, { scope: "mobile" }), /stale/);
});
