import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  COVERAGE_GRACE,
  COVERAGE_ENFORCEMENT_POLICY,
  COVERAGE_METRICS,
  COVERAGE_RISK_FAMILIES,
  COVERAGE_RISK_POLICY_FINGERPRINT,
  COVERAGE_SCOPE_FINGERPRINT,
  COVERAGE_UNCLASSIFIED_RISK_DOMAIN,
  MOBILE_COVERAGE_SCOPE_FINGERPRINT,
  aggregateRiskCoverage,
  aggregateCoverage,
  classifyCoverageFile,
  compareCoverage,
  evaluateCoveragePolicy,
  formatCoverageGrace,
  measureChangedLineCoverage,
  parseChangedLinesFromDiff,
  validateCoverageEnforcementPolicy,
  validateBaseline,
} from "./coverage-policy.mjs";
import { runCoverageCheck } from "./check-coverage.mjs";

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

function enforcedPolicy(domain = "security") {
  const policy = structuredClone(COVERAGE_ENFORCEMENT_POLICY);
  policy.scopes.web.domains[domain] = {
    state: "ENFORCE",
    policyVersion: 1,
    activation: { version: 1, sourceCommit: "a".repeat(40) },
  };
  return policy;
}

function setSummaryRowMetric(summaryValue, file, metricName, covered, total = 100) {
  summaryValue[file][metricName] = metric(covered, total);
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

test("baisse globale au-delà de 0.25 pp => régression informative", () => {
  const current = coverageFixture({ global: { lines: { covered: 797 } } });
  const baseline = coverageFixture();
  const comparison = compareCoverage(current, baseline);
  assert.equal(comparison.status, "INFORMATIVE_REGRESSION");
  assert.ok(comparison.failures.some((failure) => failure.scope === "global" && failure.metric === "lines"));
});

test("petite baisse domaine => PASS_WITH_GRACE", () => {
  const current = coverageFixture({ domains: { actions: { lines: { covered: 799 } } } });
  const comparison = compareCoverage(current, coverageFixture());
  assert.equal(comparison.status, "PASS_WITH_GRACE");
  assert.ok(comparison.grace.some((entry) => entry.scope === "actions" && entry.metric === "lines"));
});

test("baisse domaine au-delà de l'enveloppe => régression informative", () => {
  const current = coverageFixture({ domains: { actions: { lines: { covered: 792 } } } });
  const comparison = compareCoverage(current, coverageFixture());
  assert.equal(comparison.status, "INFORMATIVE_REGRESSION");
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
  assert.equal(comparison.status, "INFORMATIVE_REGRESSION");
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
  assert.equal(comparison.status, "INFORMATIVE_REGRESSION");
  assert.ok(comparison.failures.some((failure) => failure.scope === "auth-authz"));
  for (const scope of ["actions", "formalities", "route-calculs", "persistence"]) {
    assert.ok(comparison.grace.some((entry) => entry.scope === scope));
  }
});

test("la politique de risque expose les cibles futures sans les rendre bloquantes", () => {
  assert.deepEqual(COVERAGE_RISK_FAMILIES.security.minimum, { statements: 90, lines: 90, branches: 85, functions: 90 });
  assert.deepEqual(COVERAGE_RISK_FAMILIES.business.minimum, { statements: 85, lines: 85, branches: 80, functions: 85 });
  assert.deepEqual(COVERAGE_RISK_FAMILIES["api-persistence"].target, { statements: 85, lines: 85, branches: 80, functions: 85 });
  assert.deepEqual(COVERAGE_RISK_FAMILIES["ui-presentational"].minimum, { statements: null, lines: null, branches: null, functions: null });
  assert.deepEqual(COVERAGE_RISK_FAMILIES["new-code-non-critical"].minimum, { lines: 80 });
  assert.deepEqual(COVERAGE_RISK_FAMILIES["new-code-non-critical"].target, { lines: 90 });
  assert.deepEqual(COVERAGE_RISK_FAMILIES[COVERAGE_UNCLASSIFIED_RISK_DOMAIN].minimum, { statements: null, lines: null, branches: null, functions: null });
  assert.equal(COVERAGE_RISK_FAMILIES[COVERAGE_UNCLASSIFIED_RISK_DOMAIN].classification, "requires-risk-qualification");
});

test("la politique versionnée valide ses états OBSERVE et ENFORCE", () => {
  assert.doesNotThrow(() => validateCoverageEnforcementPolicy());
  assert.doesNotThrow(() => validateCoverageEnforcementPolicy(enforcedPolicy()));
  const invalid = enforcedPolicy();
  invalid.scopes.web.domains.security.activation.sourceCommit = "not-a-sha";
  assert.throws(() => validateCoverageEnforcementPolicy(invalid), /full Git SHA/);
  const missingActivation = enforcedPolicy();
  missingActivation.scopes.web.domains.security.activation = null;
  assert.throws(() => validateCoverageEnforcementPolicy(missingActivation), /explicit activation/);
});

test("un seuil exactement atteint est PASS dans le domaine ENFORCE", () => {
  const currentSummary = summary();
  const securityFile = "C:\\repo\\apps\\web\\src\\lib\\auth\\auth.ts";
  for (const metricName of COVERAGE_METRICS) {
    setSummaryRowMetric(currentSummary, securityFile, metricName, metricName === "branches" ? 84 : 90);
  }
  const current = aggregateCoverage(currentSummary);
  const policy = evaluateCoveragePolicy(current, { policy: enforcedPolicy() });
  assert.equal(policy.status, "FAIL");
  const security = policy.assessments.find(({ domain }) => domain === "security");
  assert.equal(security.status, "FAIL");
  assert.ok(security.failures.some(({ metric }) => metric === "branches"));

  setSummaryRowMetric(currentSummary, securityFile, "branches", 85);
  const exact = evaluateCoveragePolicy(aggregateCoverage(currentSummary), { policy: enforcedPolicy() });
  assert.equal(exact.status, "PASS");
  assert.equal(exact.assessments.find(({ domain }) => domain === "security").status, "PASS");
});

test("OBSERVE conserve l'écart chiffré sans annoncer une conformité", () => {
  const current = aggregateCoverage(summary());
  const policy = evaluateCoveragePolicy(current);
  assert.equal(policy.status, "OBSERVE");
  const observation = policy.observations.find(({ domain, metric }) => domain === "security" && metric === "lines");
  assert.equal(observation.current, 80);
  assert.equal(observation.target, 90);
  assert.equal(observation.gapPp, -10);
  assert.equal(policy.assessments.find(({ domain }) => domain === "security").state, "OBSERVE");
});

test("une violation ENFORCE reste FAIL malgré une comparaison historique indisponible", () => {
  withCoverageFixture(({ paths }) => {
    const currentSummary = summary();
    fs.writeFileSync(paths.summary, JSON.stringify(currentSummary));
    const result = runCoverageCheck({
      paths,
      enforcementPolicy: enforcedPolicy(),
      setProcessExitCode: true,
    });
    assert.equal(result.status, "UNAVAILABLE");
    assert.equal(result.policyStatus, "FAIL");
    assert.equal(process.exitCode, 1);
    process.exitCode = undefined;
  });
});

test("un rapport falsifié est NOT_MEASURED par l'agrégateur et n'est pas un succès", () => {
  const invalid = summary();
  invalid.total.lines = { covered: 101, total: 100, pct: 101 };
  assert.throws(() => aggregateCoverage(invalid), /covered must be <=/);
});

test("une empreinte de classification incompatible rend la politique NOT_MEASURED", () => {
  const current = aggregateCoverage(summary());
  const incompatible = { ...current, riskPolicyFingerprint: "stale-classification" };
  const result = evaluateCoveragePolicy(incompatible);
  assert.equal(result.status, "NOT_MEASURED");
  assert.match(result.diagnostics[0], /classification fingerprint/);
});

test("la classification primaire donne priorité à la sécurité sur les routes API", () => {
  const accountRoute = classifyCoverageFile("C:\\repo\\apps\\web\\src\\app\\api\\account\\route.ts");
  assert.equal(accountRoute.domain, "security");
  assert.deepEqual(accountRoute.matches.map(({ domain }) => domain), ["security", "api-persistence"]);
  assert.equal(accountRoute.attribution, "ordered-primary-prefix");

  const apiRoute = classifyCoverageFile("C:\\repo\\apps\\web\\src\\app\\api\\actions\\route.ts");
  assert.equal(apiRoute.domain, "api-persistence");
  assert.equal(classifyCoverageFile("C:\\repo\\apps\\web\\src\\lib\\actions\\actions.ts").domain, "business");
  assert.equal(classifyCoverageFile("C:\\repo\\apps\\web\\src\\components\\ui\\button.tsx").domain, "ui-presentational");
});

test("les propriétaires sensibles connus sont qualifiés par le moteur canonique", () => {
  const securityFiles = [
    "src/lib/clerk-supabase-token.ts",
    "src/lib/chat/runtime-contracts.ts",
    "src/lib/admin/role-management.ts",
  ];
  for (const file of securityFiles) {
    const result = classifyCoverageFile(file);
    assert.equal(result.domain, "security", file);
    assert.equal(result.classificationStatus, "QUALIFIED", file);
  }

  for (const file of ["src/lib/spogomi/preparation-service.ts", "src/lib/admin/moderation/transition.ts"]) {
    assert.equal(classifyCoverageFile(file).domain, "business", file);
  }
});

test("un chemin non reconnu reste visible et ne devient pas non critique par défaut", () => {
  const result = classifyCoverageFile("src/lib/notifications/server.ts");
  assert.equal(result.domain, COVERAGE_UNCLASSIFIED_RISK_DOMAIN);
  assert.equal(result.attribution, "requires-risk-qualification");
  assert.equal(result.classificationStatus, "UNCLASSIFIED");
  assert.deepEqual(result.matches, []);
});

test("le préfixe large des actions ne transforme pas toute l'UI en métier critique", () => {
  assert.equal(classifyCoverageFile("src/components/actions/action-creation-shell.tsx").domain, COVERAGE_UNCLASSIFIED_RISK_DOMAIN);
  assert.equal(classifyCoverageFile("src/components/actions/action-drawing-map.geometry.ts").domain, "business");
  assert.equal(classifyCoverageFile("src/components/ui/button.tsx").domain, "ui-presentational");
});

test("l'agrégation de risque compte chaque fichier instrumenté une seule fois", () => {
  const current = aggregateCoverage(summary());
  const riskFiles = Object.values(current.riskDomains).reduce((total, domain) => total + domain.files, 0);
  assert.equal(riskFiles, current.files);
  assert.equal(current.riskPolicyFingerprint, COVERAGE_RISK_POLICY_FINGERPRINT);
  assert.equal(current.riskDomains["api-persistence"].files, 2);
  assert.equal(current.riskDomains.business.files, 2);
  assert.equal(current.riskDomains.security.files, 1);
  assert.equal(aggregateRiskCoverage(summary())["api-persistence"].attribution, "primary-file-owner");
});

test("l'agrégation conserve les fichiers non qualifiés sans double comptage", () => {
  const currentSummary = summary();
  currentSummary["C:\\repo\\apps\\web\\src\\lib\\notifications\\server.ts"] = currentSummary["C:\\repo\\apps\\web\\src\\lib\\auth\\auth.ts"];
  const current = aggregateCoverage(currentSummary);
  const riskFiles = Object.values(current.riskDomains).reduce((total, domain) => total + domain.files, 0);
  assert.equal(current.files, 6);
  assert.equal(riskFiles, current.files);
  assert.equal(current.riskDomains[COVERAGE_UNCLASSIFIED_RISK_DOMAIN].files, 1);
  assert.equal(current.riskDomains[COVERAGE_UNCLASSIFIED_RISK_DOMAIN].attribution, "primary-file-owner");
});

function withCoverageFixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-coverage-check-"));
  const paths = {
    summary: path.join(root, "coverage-summary.json"),
    baseline: path.join(root, "coverage-baseline.json"),
  };
  try {
    return callback({ root, paths });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("une forte baisse reste réussie au niveau de la commande", () => {
  withCoverageFixture(({ paths }) => {
    const currentSummary = summary({ total: { lines: metric(0) } });
    const baseline = baselineFrom(aggregateCoverage(summary()));
    baseline.sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    fs.writeFileSync(paths.summary, JSON.stringify(currentSummary));
    fs.writeFileSync(paths.baseline, JSON.stringify(baseline));

    const result = runCoverageCheck({ paths, currentCommit: baseline.sourceCommit });
    assert.equal(result.status, "INFORMATIVE_REGRESSION");
    assert.ok(result.failures.some((failure) => failure.scope === "global" && failure.metric === "lines"));
    assert.equal(process.exitCode, undefined);
  });
});

test("une baseline absente rend la comparaison indisponible sans invalider la mesure", () => {
  withCoverageFixture(({ paths }) => {
    fs.writeFileSync(paths.summary, JSON.stringify(summary()));
    const result = runCoverageCheck({ paths });
    assert.equal(result.status, "UNAVAILABLE");
    assert.equal(result.current.metrics.lines.covered, 80);
  });
});

test("une preuve obligatoire invalide reste bloquante", () => {
  withCoverageFixture(({ paths }) => {
    fs.writeFileSync(paths.summary, JSON.stringify(summary()));
    assert.throws(
      () => runCoverageCheck({
        paths,
        fromExistingSummary: true,
        validateEvidence: () => { throw new Error("mandatory coverage evidence is invalid"); },
      }),
      /mandatory coverage evidence is invalid/,
    );
  });
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
  assert.deepEqual(current.riskDomains, {});
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
  assert.equal(evaluateCoveragePolicy(current, { scope: "mobile" }).status, "OBSERVE");
});

test("le diff Git des lignes ajoutées et le LCOV restent bornés au candidat", () => {
  const diff = [
    "diff --git a/apps/web/src/lib/actions/feature.ts b/apps/web/src/lib/actions/feature.ts",
    "--- a/apps/web/src/lib/actions/feature.ts",
    "+++ b/apps/web/src/lib/actions/feature.ts",
    "@@ -1,0 +1,2 @@",
    "+export const first = 1;",
    "+export const second = 2;",
  ].join("\n");
  const changed = parseChangedLinesFromDiff(diff);
  assert.deepEqual([...changed.get("apps/web/src/lib/actions/feature.ts")], [1, 2]);

  const measured = measureChangedLineCoverage({
    changedLines: changed,
    lcovContent: [
      "SF:apps/web/src/lib/actions/feature.ts",
      "DA:1,1",
      "DA:2,0",
      "end_of_record",
    ].join("\n"),
  });
  assert.equal(measured.status, "OBSERVE");
  assert.deepEqual(measured.lines, { covered: 1, total: 2, pct: 50 });
  assert.equal(measured.observations[0].target, 90);
  assert.equal(measured.observations[0].gapPp, -40);
});

test("les lignes ajoutées non instrumentables ou sans LCOV sont NOT_MEASURED, pas 0 %", () => {
  const entrypoint = measureChangedLineCoverage({
    changedLines: [{ path: "apps/web/src/app/demo/page.tsx", lines: [1] }],
    lcovContent: "SF:apps/web/src/app/demo/page.tsx\nDA:1,0\nend_of_record",
  });
  assert.equal(entrypoint.status, "NOT_MEASURED");
  assert.equal(entrypoint.reason, "NO_INSTRUMENTABLE_LINES");

  const missingLcov = measureChangedLineCoverage({
    changedLines: [{ path: "apps/web/src/lib/actions/feature.ts", lines: [1, 2] }],
    lcovContent: "SF:apps/web/src/lib/actions/feature.ts\nDA:1,1\nend_of_record",
  });
  assert.equal(missingLcov.status, "NOT_MEASURED");
  assert.equal(missingLcov.reason, "LCOV_INCOMPLETE");

  const missingBase = measureChangedLineCoverage();
  assert.equal(missingBase.status, "NOT_MEASURED");
  assert.equal(missingBase.reason, "BASE_REF_REQUIRED");
});

test("les lignes d'un fichier non qualifié restent mesurées mais sans seuil non critique", () => {
  const result = measureChangedLineCoverage({
    changedLines: [{ path: "apps/web/src/lib/notifications/server.ts", lines: [1, 2] }],
    lcovContent: [
      "SF:apps/web/src/lib/notifications/server.ts",
      "DA:1,1",
      "DA:2,0",
      "end_of_record",
    ].join("\n"),
  });
  assert.equal(result.status, "NOT_MEASURED");
  assert.equal(result.reason, "RISK_CLASSIFICATION_REQUIRED");
  assert.deepEqual(result.lines, { covered: 1, total: 2, pct: 50 });
  assert.equal(result.files[0].domain, COVERAGE_UNCLASSIFIED_RISK_DOMAIN);
  assert.equal(result.files[0].target, null);
});

test("une classification non qualifiée ne peut pas assouplir un domaine ENFORCE", () => {
  const currentSummary = summary();
  const securityFile = "C:\\repo\\apps\\web\\src\\lib\\auth\\auth.ts";
  for (const metricName of COVERAGE_METRICS) setSummaryRowMetric(currentSummary, securityFile, metricName, 100);
  currentSummary["C:\\repo\\apps\\web\\src\\lib\\notifications\\server.ts"] = currentSummary[securityFile];

  const result = evaluateCoveragePolicy(aggregateCoverage(currentSummary), { policy: enforcedPolicy() });
  assert.equal(result.status, "FAIL");
  assert.ok(result.failures.some(({ code, domain }) => code === "ENFORCE_CLASSIFICATION_UNQUALIFIED" && domain === COVERAGE_UNCLASSIFIED_RISK_DOMAIN));
});
