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

export const COVERAGE_DOMAINS = Object.freeze({
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

export const COVERAGE_SCOPE = Object.freeze({
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

export const COVERAGE_POLICY_VERSION = 1;
export const COVERAGE_SCOPE_FINGERPRINT = createHash("sha256")
  .update(JSON.stringify({ version: COVERAGE_POLICY_VERSION, scope: COVERAGE_SCOPE, domains: COVERAGE_DOMAINS }))
  .digest("hex");

function metricValue(metric, key, label) {
  const value = metric?.[key];
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid coverage metric ${label}.${key}: expected a non-negative integer.`);
  }
  return value;
}

export function normalizeCoveragePath(file) {
  const normalized = String(file).replaceAll("\\", "/");
  const marker = "/apps/web/";
  const markerIndex = normalized.indexOf(marker);
  if (markerIndex >= 0) return normalized.slice(markerIndex + marker.length);
  if (normalized.startsWith("apps/web/")) return normalized.slice("apps/web/".length);
  return normalized;
}

export function normalizeMetricRecord(metric, label) {
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

export function aggregateCoverage(summary) {
  if (!summary || typeof summary !== "object") throw new Error("Coverage summary must be an object.");
  const files = Object.entries(summary).filter(([file]) => file !== "total");
  const total = Object.fromEntries(
    COVERAGE_METRICS.map((metric) => [metric, normalizeMetricRecord(summary.total?.[metric], metric)]),
  );
  const domains = Object.fromEntries(
    Object.entries(COVERAGE_DOMAINS).map(([domain, prefixes]) => {
      const rows = files
        .filter(([file]) => prefixes.some((prefix) => normalizeCoveragePath(file).startsWith(prefix)))
        .map(([, row]) => row);
      if (rows.length === 0) throw new Error(`Coverage domain has no matching files: ${domain}.`);
      return [domain, { files: rows.length, metrics: aggregateRows(rows), patterns: prefixes }];
    }),
  );
  return { metrics: total, files: files.length, domains };
}

export function loadCoverageSummary(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function loadCoverageBaseline(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function validateBaseline(baseline) {
  if (!baseline || baseline.schemaVersion !== 1) {
    throw new Error("Coverage baseline is malformed: unsupported schemaVersion.");
  }
  if (!baseline.sourceCommit || !/^[0-9a-f]{40}$/i.test(baseline.sourceCommit)) {
    throw new Error("Coverage baseline is malformed: sourceCommit must be a full Git SHA.");
  }
  if (baseline.scopeFingerprint !== COVERAGE_SCOPE_FINGERPRINT) {
    throw new Error("Coverage baseline is stale: its scope fingerprint no longer matches the policy.");
  }
  for (const metric of COVERAGE_METRICS) normalizeMetricRecord(baseline.metrics?.[metric], metric);
  for (const [domain, entry] of Object.entries(baseline.domains ?? {})) {
    if (!Array.isArray(entry.patterns) || entry.patterns.length === 0) {
      throw new Error(`Coverage baseline is malformed: domain ${domain} has no patterns.`);
    }
    for (const metric of COVERAGE_METRICS) normalizeMetricRecord(entry.metrics?.[metric], `${domain}.${metric}`);
  }
  for (const domain of Object.keys(COVERAGE_DOMAINS)) {
    if (!baseline.domains?.[domain]) throw new Error(`Coverage baseline is malformed: missing domain ${domain}.`);
  }
  return baseline;
}

export function assertBaselineFresh(baseline, { currentCommit = null } = {}) {
  validateBaseline(baseline);
  const head = currentCommit ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  try {
    execFileSync("git", ["cat-file", "-e", `${baseline.sourceCommit}^{commit}`], { stdio: "ignore" });
    execFileSync("git", ["merge-base", "--is-ancestor", baseline.sourceCommit, head], { stdio: "ignore" });
  } catch {
    throw new Error(`Coverage baseline is stale: ${baseline.sourceCommit} is not an ancestor of ${head}.`);
  }
  return head;
}

function ratioIsLower(current, baseline) {
  return current.covered * baseline.total < baseline.covered * current.total;
}

function compareMetric(current, baseline, label) {
  return ratioIsLower(current, baseline)
    ? `${label} decreased from ${baseline.pct}% to ${current.pct}%.`
    : null;
}

export function compareCoverage(current, baseline) {
  const failures = [];
  for (const metric of COVERAGE_METRICS) {
    const failure = compareMetric(current.metrics[metric], baseline.metrics[metric], `global ${metric}`);
    if (failure) failures.push(failure);
  }
  for (const [domain, baselineDomain] of Object.entries(baseline.domains)) {
    const currentDomain = current.domains[domain];
    for (const metric of COVERAGE_METRICS) {
      const failure = compareMetric(
        currentDomain.metrics[metric],
        baselineDomain.metrics[metric],
        `${domain} ${metric}`,
      );
      if (failure) failures.push(failure);
    }
  }
  return failures;
}

export function getDefaultCoveragePaths(repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")) {
  return {
    summary: path.join(repositoryRoot, "apps", "web", "coverage", "coverage-summary.json"),
    baseline: path.join(repositoryRoot, "scripts", "checks", "coverage-baseline.json"),
  };
}
