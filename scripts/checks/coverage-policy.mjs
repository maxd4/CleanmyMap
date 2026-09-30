import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const COVERAGE_METRICS = Object.freeze([
  "statements",
  "branches",
  "functions",
  "lines",
]);

export const COVERAGE_GRACE = Object.freeze({
  global: 0.25,
  "auth-authz": 0.25,
  actions: 0.75,
  formalities: 0.75,
  "route-calculs": 0.75,
  persistence: 0.75,
});

const COVERAGE_DOMAINS = Object.freeze({
  "auth-authz": Object.freeze([
    "src/lib/auth/",
    "src/lib/authz",
    "src/proxy",
    "src/app/api/account/",
  ]),
  actions: Object.freeze([
    "src/lib/actions/",
    "src/app/api/actions/",
    "src/components/actions/",
  ]),
  formalities: Object.freeze([
    "src/app/api/actions/[actionId]/formalities/",
    "src/components/actions/action-formalities",
  ]),
  "route-calculs": Object.freeze([
    "src/lib/route/",
    "src/app/api/route/",
    "src/components/actions/action-declaration/operational-route",
    "src/components/actions/action-drawing-map.geometry",
  ]),
  persistence: Object.freeze([
    "src/lib/supabase/",
    "src/lib/storage/",
    "src/app/api/",
  ]),
});

const COVERAGE_SCOPE = Object.freeze({
  include: ["src/**/*.{js,jsx,ts,tsx}"],
  exclude: [
    "src/**/*.test.{js,jsx,ts,tsx}",
    "src/**/__tests__/**",
    "src/**/*.d.ts",
    "src/**/generated/**",
    "src/app/**/{page,layout,loading,error,global-error,not-found,robots,sitemap,template,default}.{js,jsx,ts,tsx}",
    "src/components/actions/action-declaration/types.ts",
    "src/components/actions/map-feed/map-feed.types.ts",
    "src/components/reports/admin-workflow/types.ts",
    "src/components/sections/rubriques/community/types.ts",
    "src/lib/actions/unified-source/types.ts",
    "src/lib/community/engagement.types.ts",
    "src/lib/community/engagement/types.ts",
    "src/lib/environmental-impact-estimator/types.ts",
    "src/lib/events/types.ts",
    "src/lib/gamification/types.ts",
    "src/lib/pilotage/overview.types.ts",
    "src/lib/reports/report-model/types.ts",
    "src/lib/sections-registry/types.ts",
    "src/lib/ui/page-families/types.ts",
    "src/lib/waste/types.ts",
  ],
});

const MOBILE_COVERAGE_SCOPE = Object.freeze({
  include: ["**/*.{js,jsx,ts,tsx}"],
  exclude: [
    "tests/**/*.test.{js,jsx,ts,tsx}",
    "**/*.test.{js,jsx,ts,tsx}",
    "**/__tests__/**",
    "**/*.d.ts",
    "vendor/**",
  ],
});

const COVERAGE_POLICY_VERSION = 1;
export const COVERAGE_SCOPE_FINGERPRINT = createHash("sha256")
  .update(JSON.stringify({ version: COVERAGE_POLICY_VERSION, scope: COVERAGE_SCOPE, domains: COVERAGE_DOMAINS }))
  .digest("hex");
export const MOBILE_COVERAGE_SCOPE_FINGERPRINT = createHash("sha256")
  .update(JSON.stringify({ version: COVERAGE_POLICY_VERSION, scope: MOBILE_COVERAGE_SCOPE, domains: {} }))
  .digest("hex");

const COVERAGE_SCOPES = Object.freeze({
  web: Object.freeze({
    root: "apps/web",
    scope: COVERAGE_SCOPE,
    domains: COVERAGE_DOMAINS,
    fingerprint: COVERAGE_SCOPE_FINGERPRINT,
  }),
  mobile: Object.freeze({
    root: "apps/mobile",
    scope: MOBILE_COVERAGE_SCOPE,
    domains: Object.freeze({}),
    fingerprint: MOBILE_COVERAGE_SCOPE_FINGERPRINT,
  }),
});

function getCoverageScope(scope = "web") {
  const config = COVERAGE_SCOPES[scope];
  if (!config) throw new Error(`Unknown coverage scope: ${scope}.`);
  return config;
}

function metricValue(metric, key, label) {
  const value = metric?.[key];
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid coverage metric ${label}.${key}: expected a non-negative integer.`);
  }
  return value;
}

function normalizeCoveragePath(file, scope = "web") {
  const normalized = String(file).replaceAll("\\", "/");
  const marker = `/${getCoverageScope(scope).root}/`;
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) return normalized.slice(markerIndex + marker.length);
  const rootPrefix = `${getCoverageScope(scope).root}/`;
  if (normalized.startsWith(rootPrefix)) return normalized.slice(rootPrefix.length);
  return normalized;
}

function normalizeMetricRecord(metric, label) {
  const total = metricValue(metric, "total", label);
  const covered = metricValue(metric, "covered", label);
  if (covered > total || total === 0) {
    throw new Error(`Invalid coverage metric ${label}: covered must be <= a positive total.`);
  }
  return { total, covered, pct: Number(((covered / total) * 100).toFixed(2)) };
}

function aggregateRows(rows) {
  return Object.fromEntries(
    COVERAGE_METRICS.map((metric) => {
      const total = rows.reduce((sum, row) => sum + metricValue(row[metric], "total", metric), 0);
      const covered = rows.reduce((sum, row) => sum + metricValue(row[metric], "covered", metric), 0);
      if (total === 0) throw new Error(`Coverage domain has no measurable ${metric}.`);
      return [metric, { total, covered, pct: Number(((covered / total) * 100).toFixed(2)) }];
    }),
  );
}

export function aggregateCoverage(summary, { scope = "web" } = {}) {
  if (!summary || typeof summary !== "object") throw new Error("Coverage summary must be an object.");
  const scopeConfig = getCoverageScope(scope);
  const files = Object.entries(summary).filter(([file]) => file !== "total");
  const total = Object.fromEntries(
    COVERAGE_METRICS.map((metric) => [metric, normalizeMetricRecord(summary.total?.[metric], metric)]),
  );
  const domains = Object.fromEntries(
    Object.entries(scopeConfig.domains).map(([domain, prefixes]) => {
      const rows = files
        .filter(([file]) => prefixes.some((prefix) => normalizeCoveragePath(file, scope).startsWith(prefix)))
        .map(([, row]) => row);
      if (rows.length === 0) throw new Error(`Coverage domain has no matching files: ${domain}.`);
      return [domain, { files: rows.length, metrics: aggregateRows(rows), patterns: prefixes }];
    }),
  );
  return { metrics: total, files: files.length, domains, scope };
}

export function loadCoverageSummary(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function loadCoverageBaseline(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function validateBaseline(baseline, { scope = "web" } = {}) {
  const scopeConfig = getCoverageScope(scope);
  if (!baseline || baseline.schemaVersion !== 1) {
    throw new Error("Coverage baseline is malformed: unsupported schemaVersion.");
  }
  if (!baseline.sourceCommit || !/^[0-9a-f]{40}$/i.test(baseline.sourceCommit)) {
    throw new Error("Coverage baseline is malformed: sourceCommit must be a full Git SHA.");
  }
  if (baseline.scopeFingerprint !== scopeConfig.fingerprint) {
    throw new Error("Coverage baseline is stale: its scope fingerprint no longer matches the policy.");
  }
  for (const metric of COVERAGE_METRICS) normalizeMetricRecord(baseline.metrics?.[metric], metric);
  for (const [domain, entry] of Object.entries(baseline.domains ?? {})) {
    if (!Object.hasOwn(scopeConfig.domains, domain)) {
      throw new Error(`Coverage baseline is malformed: unexpected domain ${domain}.`);
    }
    if (!Array.isArray(entry.patterns) || entry.patterns.length === 0) {
      throw new Error(`Coverage baseline is malformed: domain ${domain} has no patterns.`);
    }
    if (JSON.stringify(entry.patterns) !== JSON.stringify(scopeConfig.domains[domain])) {
      throw new Error(`Coverage baseline is stale: domain ${domain} patterns no longer match the policy.`);
    }
    for (const metric of COVERAGE_METRICS) normalizeMetricRecord(entry.metrics?.[metric], `${domain}.${metric}`);
  }
  for (const domain of Object.keys(scopeConfig.domains)) {
    if (!baseline.domains?.[domain]) throw new Error(`Coverage baseline is malformed: missing domain ${domain}.`);
  }
  return baseline;
}

export function assertBaselineFresh(baseline, { currentCommit = null, scope = "web" } = {}) {
  validateBaseline(baseline, { scope });
  const head = currentCommit ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  try {
    execFileSync("git", ["cat-file", "-e", `${baseline.sourceCommit}^{commit}`], { stdio: "ignore" });
    execFileSync("git", ["merge-base", "--is-ancestor", baseline.sourceCommit, head], { stdio: "ignore" });
  } catch {
    throw new Error(`Coverage baseline is stale: ${baseline.sourceCommit} is not an ancestor of ${head}.`);
  }
  return head;
}

function compareMetric(current, baseline, scope, metric) {
  const currentRatio = current.covered / current.total;
  const baselineRatio = baseline.covered / baseline.total;
  if (currentRatio >= baselineRatio) return null;

  const drop = (baselineRatio - currentRatio) * 100;
  const configuredTolerance = COVERAGE_GRACE[scope];
  const unitPercentage = 100 / baseline.total;
  const allowedDrop = Math.max(configuredTolerance, unitPercentage);
  const result = {
    scope,
    metric,
    baseline: baselineRatio * 100,
    current: currentRatio * 100,
    drop,
    allowed: allowedDrop,
  };

  return drop <= allowedDrop + 1e-9
    ? { kind: "grace", ...result }
    : { kind: "failure", ...result };
}

function compareScope(currentMetrics, baselineMetrics, scope) {
  return COVERAGE_METRICS.flatMap((metric) => {
    const result = compareMetric(currentMetrics[metric], baselineMetrics[metric], scope, metric);
    return result ? [result] : [];
  });
}

export function compareCoverage(current, baseline) {
  for (const metric of COVERAGE_METRICS) {
    if (!current.metrics[metric] || !baseline.metrics[metric]) {
      throw new Error(`Coverage metric is missing: global.${metric}.`);
    }
  }
  const regressions = [...compareScope(current.metrics, baseline.metrics, "global")];
  for (const [domain, baselineDomain] of Object.entries(baseline.domains ?? {})) {
    const currentDomain = current.domains[domain];
    if (!currentDomain) throw new Error(`Coverage domain is missing: ${domain}.`);
    for (const metric of COVERAGE_METRICS) {
      if (!currentDomain.metrics[metric] || !baselineDomain.metrics[metric]) {
        throw new Error(`Coverage metric is missing: ${domain}.${metric}.`);
      }
    }
    regressions.push(...compareScope(currentDomain.metrics, baselineDomain.metrics, domain));
  }
  const grace = regressions.filter(({ kind }) => kind === "grace");
  const failures = regressions.filter(({ kind }) => kind === "failure");
  return {
    status: failures.length > 0 ? "FAIL" : grace.length > 0 ? "PASS_WITH_GRACE" : "PASS",
    failures,
    grace,
  };
}

export function formatCoverageGrace(entry) {
  return [
    `COVERAGE_GRACE ${entry.scope}.${entry.metric}:`,
    `baseline=${entry.baseline.toFixed(2)}`,
    `current=${entry.current.toFixed(2)}`,
    `drop=${entry.drop.toFixed(2)}pp`,
    `allowed=${entry.allowed.toFixed(2)}pp`,
  ].join("\n");
}

export function getDefaultCoveragePaths(repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."), scope = "web") {
  const scopeConfig = getCoverageScope(scope);
  return {
    summary: path.join(repositoryRoot, scopeConfig.root, "coverage", "coverage-summary.json"),
    baseline: path.join(repositoryRoot, "scripts", "checks", scope === "mobile" ? "coverage-mobile-baseline.json" : "coverage-baseline.json"),
  };
}
