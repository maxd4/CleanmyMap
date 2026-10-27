import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gitExecutable } from "../ci/git-executable.mjs";

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

// Future targets are descriptive policy metadata for now. They are deliberately
// not consumed by compareCoverage(), which remains the historical informative
// ratchet until reliable measurements justify a separate gate.
export const COVERAGE_RISK_FAMILIES = Object.freeze({
  security: Object.freeze({
    minimum: Object.freeze({ statements: 90, lines: 90, branches: 85, functions: 90 }),
    target: Object.freeze({ statements: 90, lines: 90, branches: 85, functions: 90 }),
  }),
  business: Object.freeze({
    minimum: Object.freeze({ statements: 85, lines: 85, branches: 80, functions: 85 }),
    target: Object.freeze({ statements: 85, lines: 85, branches: 80, functions: 85 }),
  }),
  "api-persistence": Object.freeze({
    minimum: Object.freeze({ statements: 85, lines: 85, branches: 80, functions: 85 }),
    target: Object.freeze({ statements: 85, lines: 85, branches: 80, functions: 85 }),
  }),
  "ui-presentational": Object.freeze({
    minimum: Object.freeze({ statements: null, lines: null, branches: null, functions: null }),
    target: Object.freeze({ statements: null, lines: null, branches: null, functions: null }),
  }),
  "new-code-non-critical": Object.freeze({
    minimum: Object.freeze({ lines: 80 }),
    target: Object.freeze({ lines: 90 }),
    otherMetrics: "according-to-risk",
  }),
  unclassified: Object.freeze({
    minimum: Object.freeze({ statements: null, lines: null, branches: null, functions: null }),
    target: Object.freeze({ statements: null, lines: null, branches: null, functions: null }),
    classification: "requires-risk-qualification",
  }),
});

const COVERAGE_ENFORCEMENT_SCHEMA_VERSION = 1;

function observePolicyEntry() {
  return Object.freeze({ state: "OBSERVE", policyVersion: COVERAGE_ENFORCEMENT_SCHEMA_VERSION, activation: null });
}

export const COVERAGE_CHANGED_LINE_POLICY = Object.freeze({
  policyVersion: COVERAGE_ENFORCEMENT_SCHEMA_VERSION,
  state: "OBSERVE",
  targets: Object.freeze({ critical: 90, nonCritical: 80 }),
  uiPresentationalTarget: null,
});

export const COVERAGE_ENFORCEMENT_POLICY = Object.freeze({
  schemaVersion: COVERAGE_ENFORCEMENT_SCHEMA_VERSION,
  policyVersion: COVERAGE_ENFORCEMENT_SCHEMA_VERSION,
  scopes: Object.freeze({
    web: Object.freeze({
      kind: "risk-domains",
      domains: Object.freeze(Object.fromEntries(
        Object.keys(COVERAGE_RISK_FAMILIES).map((domain) => [domain, observePolicyEntry()]),
      )),
      historical: observePolicyEntry(),
      changedLines: COVERAGE_CHANGED_LINE_POLICY,
    }),
    mobile: Object.freeze({ kind: "global-metrics", minimum: null, ...observePolicyEntry() }),
    node: Object.freeze({
      kind: "external-report",
      reportPath: "scripts/coverage/coverage-summary.json",
      reportFormat: "lcov",
      minimum: null,
      ...observePolicyEntry(),
    }),
    python: Object.freeze({
      kind: "external-report",
      reportPath: "maintenance/python/coverage.xml",
      reportFormat: "cobertura",
      minimum: null,
      ...observePolicyEntry(),
    }),
  }),
});

// The first matching rule owns a file. A file may match more than one rule for
// compatibility reasons (for example, an account API route), but risk metrics
// are aggregated through this primary selection exactly once per file.
const COVERAGE_RISK_CLASSIFICATION_RULES = Object.freeze([
  Object.freeze({
    domain: "security",
    patterns: Object.freeze([
      "src/lib/clerk-supabase-token.ts",
      "src/lib/chat/runtime-contracts.ts",
      "src/lib/admin/role-management.ts",
      "src/lib/account/",
      "src/lib/auth/",
      "src/lib/authz",
      "src/lib/security/",
      "src/lib/validation/",
      "src/lib/rate-limit/",
      "src/proxy",
      "src/app/api/account/",
      // P2-A: authenticated conversations, notification ownership and
      // account/admin surfaces have server-side identity or disclosure
      // consequences even when the file is a client-facing component.
      "src/lib/chat/",
      "src/components/chat/",
      "src/lib/notifications/",
      "src/components/notifications/",
      "src/lib/account-setup/",
      "src/lib/clerk-session-config.ts",
      "src/lib/minor-consent",
      "src/lib/user-location-preference.ts",
      "src/lib/server-preferences.ts",
      "src/lib/analytics-consent.ts",
      "src/lib/client-identifier.ts",
      "src/lib/profiles.ts",
      "src/lib/analytics/",
      "src/lib/analytics.server.ts",
      "src/lib/posthog/",
      "src/lib/env.ts",
      "src/lib/errors/",
      "src/lib/observability/",
      "src/lib/feature-flags.ts",
      "src/hooks/use-submission-lock.ts",
      "src/components/auth/",
      "src/components/account/",
      "src/components/admin/",
      "src/components/profil/",
      "src/components/posthog-provider.tsx",
      "src/components/reports/admin-workflow/",
      "src/components/sections/rubriques/feedback/",
      "src/components/partners/",
      "src/app/(app)/admin/",
      "src/app/(app)/profil/",
      "src/lib/admin/access.ts",
      "src/lib/admin/role-management.ts",
      "src/lib/admin/audit/",
      "src/lib/admin/import/",
      "src/lib/admin/promotion-requests-store.ts",
      "src/lib/admin/referral-lineage-export.ts",
      "src/lib/admin/response.ts",
      "src/lib/admin/admin-dashboard",
      "src/lib/admin/vision-training",
      "src/lib/community/creator-inbox",
      "src/lib/community/discussion-rate-limit.ts",
      "src/lib/community/event-notification-targets.ts",
      "src/lib/community/creator-inbox-email.ts",
      "src/lib/community/bug-report-screenshot-validation.ts",
      "src/lib/community/feedback-history-contract.ts",
      "src/components/analytics/",
      "src/lib/logging/",
    ]),
  }),
  Object.freeze({
    domain: "api-persistence",
    patterns: Object.freeze([
      "src/app/api/",
      "src/lib/http/",
      "src/lib/persistence/",
      "src/lib/storage/",
      "src/lib/supabase/",
      // P2-A: server services, external adapters and persistence-backed data
      // modules are API/persistence owners even outside app/api.
      "src/lib/services/",
      "src/lib/data/",
      "src/lib/community/http.ts",
      "src/lib/community/bug-reports-store",
      "src/lib/community/bug-report-screenshot",
      "src/lib/community/creator-inbox-loader.ts",
      "src/lib/community/creator-inbox-pagination.ts",
      "src/lib/community/feedback-export.ts",
      "src/lib/community/event-cache-invalidation.ts",
      "src/lib/partners/",
      "src/lib/contact/",
      "src/lib/media/",
      "src/lib/photo-upload.ts",
      "src/lib/github/",
      "src/lib/email-config.ts",
      "src/lib/funding/",
      "src/lib/public-surface-snapshots",
      "src/lib/public-surface-snapshot-service.ts",
      "src/lib/backpressure/",
      "src/lib/feedback-discovery.ts",
      "src/lib/botid/",
      "src/lib/periodic/",
      "src/lib/dashboard/",
      "src/lib/governance/",
      "src/lib/legal-content-report/",
      "src/lib/weather/",
      "src/lib/community/feedback-screenshot-client.ts",
      "src/types/database.ts",
    ]),
  }),
  Object.freeze({
    domain: "business",
    patterns: Object.freeze([
      "src/lib/admin/moderation/transition.ts",
      "src/lib/actions/",
      "src/lib/environmental-impact-estimator/",
      "src/lib/geo/",
      "src/lib/impact/",
      "src/lib/maps/",
      "src/lib/recycling/",
      "src/lib/route/",
      "src/lib/spogomi/",
      "src/lib/waste/",
      "src/components/environmental-impact-estimator/",
      "src/components/map/",
      "src/components/maps/",
      "src/components/actions/action-declaration/action-drawing-validation",
      "src/components/actions/action-declaration/action-location.model",
      "src/components/actions/action-declaration/operational-route",
      "src/components/actions/action-declaration/payload",
      "src/components/actions/action-drawing-map.geometry",
      "src/components/actions/map/layers/actions-map-geometry",
      // P2-A: these folders are traced to business owners in the feature and
      // route matrices; their UI is part of the domain workflow, not generic
      // presentational chrome.
      "src/components/actions/",
      "src/components/spogomi/",
      "src/components/gamification/",
      "src/lib/gamification/",
      "src/config/gamification.config.ts",
      "src/components/learn/",
      "src/lib/learning/",
      "src/app/learn/",
      "src/lib/community/engagement",
      "src/lib/community/event-ops.ts",
      "src/lib/community/event-rsvp-summaries.ts",
      "src/lib/community/event-links.ts",
      "src/lib/community/event-item.ts",
      "src/lib/community/event-location.ts",
      "src/lib/reports/",
      "src/components/reports/",
      "src/components/pilotage/",
      "src/lib/pilotage/",
      "src/components/dashboard/",
      "src/lib/missions/",
      "src/components/missions/",
      "src/lib/plastic-origins/",
      "src/components/waste/",
      "src/lib/pdf-export/",
      "src/components/sections/rubriques/",
      "src/lib/admin/moderation/",
      "src/app/(app)/actions/",
      "src/app/(app)/reports/",
      "src/app/(app)/signalement/",
      "src/fixtures/public-action.ts",
    ]),
  }),
  Object.freeze({
    domain: "ui-presentational",
    patterns: Object.freeze([
      "src/components/brand/",
      "src/components/layout/",
      "src/components/ui/",
      // P2-A: pure navigation/content/formatting owners with no persistence
      // or authorization responsibility in the traced runtime.
      "src/components/accueil/",
      "src/components/navigation/",
      "src/components/seo/",
      "src/lib/ui/",
      "src/lib/i18n/",
      "src/lib/content/",
      "src/lib/metadata.ts",
      "src/lib/seo/",
      "src/lib/formatters/",
      "src/lib/navigation.ts",
      "src/lib/home-routes.ts",
      "src/lib/accueil/",
      "src/lib/sections/",
      "src/lib/sections-registry/",
      "src/data/content/",
      "src/locales/",
      "src/lib/animations/",
      "src/lib/utils.ts",
      "src/lib/time/",
      "src/lib/time-scopes.ts",
      "src/lib/domain-language.ts",
      "src/lib/browser/",
      "src/lib/swr-config.ts",
      "src/lib/documentation/",
      "src/lib/profiles-cta.ts",
      "src/lib/accueil-pilotage-routes.ts",
      "src/app/docs/",
      "src/app/conditions-generales-utilisation/",
      "src/app/politique-confidentialite/",
    ]),
  }),
  // No path is implicitly non-critical. A future qualification must add an
  // explicit prefix here; every other unmatched instrumented file is
  // classified as `unclassified` and remains visible to the policy.
  Object.freeze({
    domain: "new-code-non-critical",
    patterns: Object.freeze([]),
  }),
]);

// These are deliberately not assigned to a family by filename alone. Their
// consumers span community reporting and similarity/deduplication concerns;
// keep the decision visible until a single canonical owner is ratified.
export const COVERAGE_RISK_CLASSIFICATION_REQUIRED_REASONS = Object.freeze({
  "src/lib/community/report-events.ts": "community event reporting is consumed by more than one workflow owner",
  "src/lib/community/feedback-similarity.ts": "similarity decisions cross feedback and moderation owners",
});

const COVERAGE_RISK_POLICY_VERSION = 2;
export const COVERAGE_UNCLASSIFIED_RISK_DOMAIN = "unclassified";
export const COVERAGE_RISK_POLICY_FINGERPRINT = createHash("sha256")
  .update(JSON.stringify({
    version: COVERAGE_RISK_POLICY_VERSION,
    families: COVERAGE_RISK_FAMILIES,
    rules: COVERAGE_RISK_CLASSIFICATION_RULES,
  }))
  .digest("hex");

export const COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT = createHash("sha256")
  .update(JSON.stringify({
    schemaVersion: COVERAGE_ENFORCEMENT_SCHEMA_VERSION,
    policy: COVERAGE_ENFORCEMENT_POLICY,
    riskPolicyFingerprint: COVERAGE_RISK_POLICY_FINGERPRINT,
  }))
  .digest("hex");

// These domains are historical, informative compatibility views. Some of
// their prefixes overlap by design and they remain tied to the existing
// baseline; risk targets use COVERAGE_RISK_CLASSIFICATION_RULES instead.
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

const TYPE_ONLY_COVERAGE_PATHS = Object.freeze([
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
]);

const COVERAGE_SCOPE = Object.freeze({
  include: ["src/**/*.{js,jsx,ts,tsx}"],
  exclude: [
    "src/**/*.test.{js,jsx,ts,tsx}",
    "src/**/__tests__/**",
    "src/**/*.d.ts",
    "src/**/generated/**",
    "src/app/**/{page,layout,loading,error,global-error,not-found,robots,sitemap,template,default}.{js,jsx,ts,tsx}",
    ...TYPE_ONLY_COVERAGE_PATHS,
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
    riskPolicyFingerprint: COVERAGE_RISK_POLICY_FINGERPRINT,
  }),
  mobile: Object.freeze({
    root: "apps/mobile",
    scope: MOBILE_COVERAGE_SCOPE,
    domains: Object.freeze({}),
    fingerprint: MOBILE_COVERAGE_SCOPE_FINGERPRINT,
    riskPolicyFingerprint: null,
  }),
});

function getCoverageScope(scope = "web") {
  const config = COVERAGE_SCOPES[scope];
  if (!config) throw new Error(`Unknown coverage scope: ${scope}.`);
  return config;
}

function getEnforcementScope(scope, policy) {
  const entry = policy?.scopes?.[scope];
  if (!entry) throw new Error(`Coverage enforcement policy has no scope: ${scope}.`);
  return entry;
}

function validatePolicyEntry(entry, label, { requireActivation = true } = {}) {
  if (!entry || !["OBSERVE", "ENFORCE"].includes(entry.state)) {
    throw new Error(`Coverage enforcement policy is invalid: ${label}.state must be OBSERVE or ENFORCE.`);
  }
  if (!Number.isInteger(entry.policyVersion) || entry.policyVersion < 1) {
    throw new Error(`Coverage enforcement policy is invalid: ${label}.policyVersion is required.`);
  }
  if (entry.state !== "ENFORCE") return entry;
  if (requireActivation && !entry.activation) {
    throw new Error(`Coverage enforcement policy is invalid: ${label} has no explicit activation.`);
  }
  if (entry.activation) {
    if (!Number.isInteger(entry.activation.version) || entry.activation.version < 1) {
      throw new Error(`Coverage enforcement policy is invalid: ${label}.activation.version is required.`);
    }
    if (!/^[0-9a-f]{40}$/i.test(entry.activation.sourceCommit ?? "")) {
      throw new Error(`Coverage enforcement policy is invalid: ${label}.activation.sourceCommit must be a full Git SHA.`);
    }
  }
  return entry;
}

function validateMinimums(minimum, label) {
  if (!minimum || typeof minimum !== "object") {
    throw new Error(`Coverage enforcement policy is invalid: ${label} has no implemented numeric threshold.`);
  }
  const entries = Object.entries(minimum);
  if (entries.length === 0) {
    throw new Error(`Coverage enforcement policy is invalid: ${label} has no implemented numeric threshold.`);
  }
  for (const [metric, threshold] of entries) {
    if (!COVERAGE_METRICS.includes(metric) || !Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
      throw new Error(`Coverage enforcement policy is invalid: ${label}.${metric} must be a percentage between 0 and 100.`);
    }
  }
  return minimum;
}

function validateChangedLineTargets(targets, label) {
  if (!targets || typeof targets !== "object") {
    throw new Error(`Coverage enforcement policy is invalid: ${label} has no implemented numeric threshold.`);
  }
  for (const key of ["critical", "nonCritical"]) {
    if (!Number.isInteger(targets[key]) || targets[key] < 0 || targets[key] > 100) {
      throw new Error(`Coverage enforcement policy is invalid: ${label}.targets.${key} must be a percentage between 0 and 100.`);
    }
  }
  return targets;
}

export function validateCoverageEnforcementPolicy(policy = COVERAGE_ENFORCEMENT_POLICY) {
  if (!policy || policy.schemaVersion !== COVERAGE_ENFORCEMENT_SCHEMA_VERSION) {
    throw new Error("Coverage enforcement policy is malformed: unsupported schemaVersion.");
  }
  if (policy.policyVersion !== COVERAGE_ENFORCEMENT_SCHEMA_VERSION) {
    throw new Error("Coverage enforcement policy is malformed: unsupported policyVersion.");
  }

  const web = getEnforcementScope("web", policy);
  if (web.kind !== "risk-domains" || !web.domains || typeof web.domains !== "object") {
    throw new Error("Coverage enforcement policy is malformed: web risk domains are missing.");
  }
  for (const domain of Object.keys(COVERAGE_RISK_FAMILIES)) {
    const entry = web.domains[domain];
    if (!entry) throw new Error(`Coverage enforcement policy is malformed: missing web domain ${domain}.`);
    const minimums = Object.values(COVERAGE_RISK_FAMILIES[domain].minimum).filter((value) => value !== null);
    validatePolicyEntry(entry, `web.${domain}`);
    if (entry.state === "ENFORCE" && minimums.length === 0) {
      throw new Error(`Coverage enforcement policy is invalid: web.${domain} has no enforceable metric.`);
    }
  }
  validatePolicyEntry(web.historical, "web.historical");
  validatePolicyEntry(web.changedLines, "web.changedLines");
  if (web.historical.state === "ENFORCE") {
    throw new Error("Coverage enforcement policy is invalid: web.historical has no implemented numeric threshold.");
  }
  if (web.changedLines.state === "ENFORCE") {
    validateChangedLineTargets(web.changedLines.targets, "web.changedLines");
  }

  for (const scope of ["mobile", "node", "python"]) {
    const entry = getEnforcementScope(scope, policy);
    validatePolicyEntry(entry, scope);
    if (entry.state === "ENFORCE") {
      if (scope !== "mobile") {
        throw new Error(`Coverage enforcement policy is invalid: ${scope} ENFORCE is not implemented.`);
      }
      validateMinimums(entry.minimum, scope);
    }
  }
  return policy;
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

function riskMatches(normalizedPath) {
  return COVERAGE_RISK_CLASSIFICATION_RULES.flatMap(({ domain, patterns }) => patterns
    .filter((pattern) => normalizedPath.startsWith(pattern))
    .map((pattern) => ({ domain, pattern })));
}

export function classifyCoverageFile(file, { scope = "web" } = {}) {
  const normalizedPath = normalizeCoveragePath(file, scope);
  if (scope !== "web") {
    return {
      scope,
      normalizedPath,
      domain: null,
      attribution: "scope-without-risk-families",
      matches: [],
    };
  }

  const matches = riskMatches(normalizedPath);
  const primary = matches[0] ?? { domain: COVERAGE_UNCLASSIFIED_RISK_DOMAIN, pattern: null };
  return {
    scope,
    normalizedPath,
    domain: primary.domain,
    pattern: primary.pattern,
    attribution: primary.pattern ? "ordered-primary-prefix" : "requires-risk-qualification",
    classificationStatus: primary.pattern ? "QUALIFIED" : "UNCLASSIFIED",
    qualificationReason: primary.pattern
      ? null
      : (COVERAGE_RISK_CLASSIFICATION_REQUIRED_REASONS[normalizedPath]
        ?? "No single canonical owner is proven by the current classification rules."),
    matches,
  };
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

export function aggregateRiskCoverage(summary, { scope = "web" } = {}) {
  if (!summary || typeof summary !== "object") throw new Error("Coverage summary must be an object.");
  if (scope !== "web") return {};

  const rowsByDomain = new Map();
  for (const [file, row] of Object.entries(summary).filter(([file]) => file !== "total")) {
    const { domain } = classifyCoverageFile(file, { scope });
    const rows = rowsByDomain.get(domain) ?? [];
    rows.push(row);
    rowsByDomain.set(domain, rows);
  }

  return Object.fromEntries([...rowsByDomain.entries()].map(([domain, rows]) => {
    const rule = COVERAGE_RISK_CLASSIFICATION_RULES.find((candidate) => candidate.domain === domain);
    return [domain, {
      files: rows.length,
      metrics: aggregateRows(rows),
      patterns: rule?.patterns ?? [],
      policy: COVERAGE_RISK_FAMILIES[domain],
      attribution: "primary-file-owner",
    }];
  }));
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
  return {
    metrics: total,
    files: files.length,
    domains,
    riskDomains: aggregateRiskCoverage(summary, { scope }),
    riskPolicyFingerprint: scopeConfig.riskPolicyFingerprint,
    enforcementPolicyFingerprint: COVERAGE_ENFORCEMENT_POLICY_FINGERPRINT,
    scope,
  };
}

const APP_ROUTER_ENTRYPOINTS = new Set([
  "page",
  "layout",
  "loading",
  "error",
  "global-error",
  "not-found",
  "robots",
  "sitemap",
  "template",
  "default",
]);

function isInstrumentableCoveragePath(file, { scope = "web" } = {}) {
  const normalized = normalizeCoveragePath(file, scope);
  if (!/\.(?:js|jsx|ts|tsx)$/.test(normalized)) return false;
  if (scope === "web") {
    if (!normalized.startsWith("src/")) return false;
    if (/\.test\.(?:js|jsx|ts|tsx)$/.test(normalized) || normalized.includes("/__tests__/")) return false;
    if (/\.d\.ts$/.test(normalized) || normalized.includes("/generated/")) return false;
    const basename = normalized.split("/").at(-1).replace(/\.[^.]+$/, "");
    if (normalized.startsWith("src/app/") && APP_ROUTER_ENTRYPOINTS.has(basename)) return false;
    if (TYPE_ONLY_COVERAGE_PATHS.includes(normalized)) return false;
    return true;
  }
  return !normalized.startsWith("vendor/")
    && !/\.test\.(?:js|jsx|ts|tsx)$/.test(normalized)
    && !normalized.includes("/__tests__/")
    && !/\.d\.ts$/.test(normalized);
}

function stripGitDiffPrefix(value) {
  const normalized = String(value).trim();
  if (normalized === "/dev/null") return null;
  if (normalized.startsWith("a/") || normalized.startsWith("b/")) return normalized.slice(2);
  return normalized;
}

export function parseChangedLinesFromDiff(diffText) {
  const files = new Map();
  let currentPath = null;
  let currentLine = null;
  for (const rawLine of String(diffText ?? "").split(/\r?\n/)) {
    if (rawLine.startsWith("+++ ")) {
      currentPath = stripGitDiffPrefix(rawLine.slice(4));
      currentLine = null;
      continue;
    }
    const hunk = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      currentLine = Number(hunk[1]);
      continue;
    }
    if (!currentPath || !Number.isInteger(currentLine)) continue;
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      const lines = files.get(currentPath) ?? new Set();
      lines.add(currentLine);
      files.set(currentPath, lines);
      currentLine += 1;
    } else if (rawLine.startsWith("-")) {
      continue;
    } else if (!rawLine.startsWith("\\")) {
      currentLine += 1;
    }
  }
  return files;
}

function verifyGitRevision(repositoryRoot, revision, label) {
  if (!revision || typeof revision !== "string") throw new Error(`${label} is required for changed-line coverage.`);
  try {
    return execFileSync(gitExecutable(), ["rev-parse", "--verify", `${revision}^{commit}`], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    throw new Error(`${label} is not a valid Git commit: ${revision}.`);
  }
}

function getChangedLinesFromGit({ repositoryRoot = process.cwd(), baseRef, currentRef = "HEAD", scope = "web" } = {}) {
  const baseCommit = verifyGitRevision(repositoryRoot, baseRef, "baseRef");
  const currentCommit = verifyGitRevision(repositoryRoot, currentRef, "currentRef");
  const scopeRoot = getCoverageScope(scope).root;
  const diffText = execFileSync(gitExecutable(), [
    "diff",
    "--no-ext-diff",
    "--no-renames",
    "--unified=0",
    `${baseCommit}...${currentCommit}`,
    "--",
    `${scopeRoot}/src`,
  ], { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return {
    baseRef: baseCommit,
    currentRef: currentCommit,
    files: parseChangedLinesFromDiff(diffText),
  };
}

function parseLcovLineCoverage(content, { scope = "web" } = {}) {
  const records = new Map();
  let currentPath = null;
  for (const rawLine of String(content ?? "").split(/\r?\n/)) {
    if (rawLine.startsWith("SF:")) {
      currentPath = normalizeCoveragePath(rawLine.slice(3), scope);
      if (!records.has(currentPath)) records.set(currentPath, new Map());
    } else if (rawLine.startsWith("DA:") && currentPath) {
      const [lineValue, hitsValue] = rawLine.slice(3).split(",");
      const line = Number(lineValue);
      const hits = Number(hitsValue);
      if (!Number.isInteger(line) || line < 1 || !Number.isInteger(hits) || hits < 0) {
        throw new Error(`${scope} LCOV line metric is invalid.`);
      }
      records.get(currentPath).set(line, hits);
    } else if (rawLine === "end_of_record") {
      currentPath = null;
    }
  }
  if (records.size === 0) throw new Error(`${scope} LCOV is empty.`);
  return records;
}

export function changedLineTarget(domain, policyEntry = COVERAGE_CHANGED_LINE_POLICY) {
  const targets = policyEntry?.targets ?? COVERAGE_CHANGED_LINE_POLICY.targets;
  if (["security", "business", "api-persistence"].includes(domain)) return targets.critical;
  if (domain === "ui-presentational") return policyEntry?.uiPresentationalTarget ?? null;
  if (domain === "new-code-non-critical") return targets.nonCritical;
  return null;
}

function thresholdReached(covered, total, threshold) {
  return covered * 100 >= threshold * total;
}

function sourceLinesForCandidate({ repositoryRoot, file, currentRef, scope }) {
  const normalized = normalizeCoveragePath(file, scope);
  const repositoryRelativePath = `${getCoverageScope(scope).root}/${normalized}`;
  if (currentRef) {
    try {
      return execFileSync(gitExecutable(), ["show", `${currentRef}:${repositoryRelativePath}`], {
        cwd: repositoryRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).split(/\r?\n/);
    } catch {
      // Manual fixtures and WORKTREE-only callers may not have a Git blob.
    }
  }
  try {
    return readFileSync(path.join(repositoryRoot, ...repositoryRelativePath.split("/")), "utf8").split(/\r?\n/);
  } catch {
    return null;
  }
}

function sourceLineKinds(sourceLines) {
  let inBlockComment = false;
  return sourceLines.map((line) => {
    let remaining = String(line ?? "").trim();
    if (!remaining) return "non-executable";
    while (remaining.startsWith("/*")) {
      const close = remaining.indexOf("*/", 2);
      if (close < 0) {
        inBlockComment = true;
        return "non-executable";
      }
      remaining = remaining.slice(close + 2).trim();
      if (!remaining) return "non-executable";
    }
    if (inBlockComment) {
      const close = remaining.indexOf("*/");
      if (close < 0) return "non-executable";
      inBlockComment = false;
      remaining = remaining.slice(close + 2).trim();
      if (!remaining) return "non-executable";
    }
    if (/^\/\//.test(remaining) || /^\*/.test(remaining) || /^\*\//.test(remaining)) return "non-executable";
    if (/^[{}()[\],;]+$/.test(remaining) || /^[{}()[\],;]+\s*;?$/.test(remaining)) return "non-executable";
    if (/^(?:import\b|export\s+(?:type|interface)\b|type\s+[A-Za-z_$]|interface\s+[A-Za-z_$]|declare\b|namespace\s+[A-Za-z_$])/.test(remaining)) return "non-executable";
    return "executable";
  });
}

function getChangedLineKind(sourceKinds, line) {
  if (!sourceKinds || line > sourceKinds.length) return "unknown";
  return sourceKinds[line - 1];
}

function changedLineEntries(changedLines, scope) {
  const source = changedLines instanceof Map
    ? [...changedLines.entries()]
    : (changedLines ?? []).map((entry) => [entry.path, new Set(entry.lines ?? [])]);
  return source.map(([file, lines]) => ({
    path: normalizeCoveragePath(file, scope),
    lines: [...lines].filter((line) => Number.isInteger(line) && line > 0).sort((left, right) => left - right),
  }));
}

export function measureChangedLineCoverage({
  repositoryRoot = process.cwd(),
  baseRef = null,
  currentRef = "HEAD",
  changedLines = null,
  lcovContent = null,
  lcovPath = null,
  scope = "web",
  policyEntry = COVERAGE_CHANGED_LINE_POLICY,
} = {}) {
  let changed = changedLines;
  let provenance = { baseRef: null, currentRef: null };
  try {
    if (changed === null) {
      if (!baseRef) return { status: "NOT_MEASURED", reason: "BASE_REF_REQUIRED", files: [], lines: null, provenance };
      provenance = getChangedLinesFromGit({ repositoryRoot, baseRef, currentRef, scope });
      changed = provenance.files;
    }
    const entries = changedLineEntries(changed, scope)
      .map((entry) => ({ ...entry, lines: entry.lines.filter(() => isInstrumentableCoveragePath(entry.path, { scope })) }))
      .filter((entry) => entry.lines.length > 0);
    if (entries.length === 0) {
      return { status: "NOT_MEASURED", reason: "NO_INSTRUMENTABLE_LINES", files: [], lines: null, provenance };
    }

    const lcov = lcovContent ?? (lcovPath ? readFileSync(lcovPath, "utf8") : null);
    if (lcov === null) return { status: "NOT_MEASURED", reason: "LCOV_REQUIRED", files: [], lines: null, provenance };
    const records = parseLcovLineCoverage(lcov, { scope });
    const files = [];
    const byDomain = new Map();
    let covered = 0;
    let total = 0;
    const missing = [];
    for (const entry of entries) {
      const record = records.get(entry.path);
      const sourceLines = sourceLinesForCandidate({ repositoryRoot, file: entry.path, currentRef, scope });
      const sourceKinds = sourceLines ? sourceLineKinds(sourceLines) : null;
      const classification = classifyCoverageFile(entry.path, { scope });
      const domain = classification.domain;
      const domainEntry = byDomain.get(domain) ?? {
        domain,
        target: changedLineTarget(domain, policyEntry),
        covered: 0,
        total: 0,
        missing: [],
        nonExecutable: [],
        classificationStatus: classification.classificationStatus,
      };
      let fileCovered = 0;
      let fileMeasured = 0;
      const fileNonExecutable = [];
      const fileMissing = [];
      for (const line of entry.lines) {
        const hits = record?.get(line);
        if (hits === undefined) {
          if (getChangedLineKind(sourceKinds, line) === "non-executable") {
            fileNonExecutable.push(line);
            domainEntry.nonExecutable.push(line);
            continue;
          }
          missing.push({ path: entry.path, line });
          domainEntry.missing.push(line);
          fileMissing.push(line);
          continue;
        }
        if (hits > 0) {
          covered += 1;
          fileCovered += 1;
          domainEntry.covered += 1;
        }
        total += 1;
        fileMeasured += 1;
        domainEntry.total += 1;
      }
      files.push({
        path: entry.path,
        lines: entry.lines.length,
        covered: fileCovered,
        measured: fileMeasured,
        nonExecutable: fileNonExecutable,
        missing: fileMissing,
        target: domainEntry.target,
        domain,
        classificationStatus: classification.classificationStatus,
      });
      byDomain.set(domain, domainEntry);
    }
    if (missing.length > 0) {
      return {
        status: "NOT_MEASURED",
        reason: "LCOV_INCOMPLETE",
        files,
        lines: { covered, total, pct: null },
        missing,
        byDomain: Object.fromEntries([...byDomain].map(([domain, value]) => [domain, value])),
        provenance,
      };
    }
    if (total === 0) {
      return {
        status: "NOT_MEASURED",
        reason: "NO_EXECUTABLE_CHANGED_LINES",
        files,
        lines: null,
        observations: [],
        failures: [],
        byDomain: Object.fromEntries([...byDomain].map(([domain, value]) => [domain, value])),
        provenance,
        policyVersion: policyEntry.policyVersion,
      };
    }
    const unclassified = [...byDomain.values()].filter(({ domain }) => domain === COVERAGE_UNCLASSIFIED_RISK_DOMAIN);
    if (unclassified.length > 0) {
      return {
        status: "NOT_MEASURED",
        reason: "RISK_CLASSIFICATION_REQUIRED",
        files,
        lines: { covered, total, pct: Number(((covered / total) * 100).toFixed(2)) },
        observations: [],
        failures: [],
        unclassified,
        byDomain: Object.fromEntries([...byDomain].map(([domain, value]) => [domain, value])),
        provenance,
        policyVersion: policyEntry.policyVersion,
      };
    }
    const observations = [...byDomain.values()]
      .filter((entry) => entry.target !== null && entry.total > 0)
      .map((entry) => ({
        domain: entry.domain,
        covered: entry.covered,
        total: entry.total,
        pct: Number(((entry.covered / entry.total) * 100).toFixed(2)),
        target: entry.target,
        gapPp: Number((((entry.covered / entry.total) * 100) - entry.target).toFixed(2)),
      }));
    const failures = policyEntry.state === "ENFORCE"
      ? observations.filter((entry) => !thresholdReached(entry.covered, entry.total, entry.target))
      : [];
    return {
      status: failures.length > 0 ? "FAIL" : policyEntry.state === "ENFORCE" ? "PASS" : "OBSERVE",
      measurementStatus: "MEASURED",
      files,
      lines: { covered, total, pct: Number(((covered / total) * 100).toFixed(2)) },
      observations,
      failures,
      byDomain: Object.fromEntries([...byDomain].map(([domain, value]) => [domain, value])),
      provenance,
      policyVersion: policyEntry.policyVersion,
    };
  } catch (error) {
    return { status: "NOT_MEASURED", reason: "MEASUREMENT_FAILED", message: error instanceof Error ? error.message : String(error), files: [], lines: null, provenance };
  }
}

function coverageMetricRatio(metric, label) {
  if (!metric || !Number.isInteger(metric.covered) || !Number.isInteger(metric.total) || metric.total <= 0 || metric.covered < 0 || metric.covered > metric.total) {
    throw new Error(`Coverage metric is incomplete: ${label}.`);
  }
  return metric.covered / metric.total;
}

export function evaluateCoveragePolicy(current, { scope = "web", policy = COVERAGE_ENFORCEMENT_POLICY } = {}) {
  validateCoverageEnforcementPolicy(policy);
  if (current?.scope !== scope) {
    return {
      status: "NOT_MEASURED",
      scope,
      failures: [],
      observations: [],
      assessments: [],
      diagnostics: [`Coverage scope mismatch: expected ${scope}.`],
    };
  }
  if (scope === "web" && current.riskPolicyFingerprint !== COVERAGE_RISK_POLICY_FINGERPRINT) {
    return {
      status: "NOT_MEASURED",
      scope,
      failures: [],
      observations: [],
      assessments: [],
      diagnostics: ["Coverage risk classification fingerprint is incompatible with the current policy."],
    };
  }
  const scopePolicy = getEnforcementScope(scope, policy);
  if (scope !== "web") {
    const metrics = current?.metrics;
    const thresholds = Object.entries(scopePolicy.minimum ?? {});
    const observations = [];
    const failures = [];
    try {
      for (const metric of COVERAGE_METRICS) coverageMetricRatio(metrics?.[metric], `${scope}.${metric}`);
    } catch (error) {
      return { status: "NOT_MEASURED", scope, failures: [], observations: [], assessments: [], diagnostics: [error instanceof Error ? error.message : String(error)] };
    }
    for (const [metric, threshold] of thresholds) {
      const currentMetric = metrics[metric];
      const ratio = coverageMetricRatio(currentMetric, `${scope}.${metric}`);
      const observation = {
        scope,
        metric,
        covered: currentMetric.covered,
        total: currentMetric.total,
        current: ratio * 100,
        target: threshold,
        gapPp: Number(((ratio * 100) - threshold).toFixed(2)),
        state: scopePolicy.state,
      };
      observations.push(observation);
      if (scopePolicy.state === "ENFORCE" && !thresholdReached(currentMetric.covered, currentMetric.total, threshold)) {
        failures.push({ ...observation, code: "ENFORCE_THRESHOLD_NOT_MET" });
      }
    }
    const status = failures.length > 0 ? "FAIL" : scopePolicy.state === "ENFORCE" ? "PASS" : "OBSERVE";
    return { status, scope, failures, observations, assessments: [{ scope, state: scopePolicy.state, status, failures }], diagnostics: [] };
  }

  const assessments = [];
  const failures = [];
  const observations = [];
  const hasEnforcedRiskDomain = Object.entries(scopePolicy.domains)
    .some(([domain, entry]) => domain !== COVERAGE_UNCLASSIFIED_RISK_DOMAIN && entry.state === "ENFORCE");
  let hasUnclassifiedFiles = false;
  for (const [domain, entry] of Object.entries(scopePolicy.domains)) {
    const family = COVERAGE_RISK_FAMILIES[domain];
    const thresholds = Object.entries(family.minimum).filter(([, value]) => value !== null);
    if (thresholds.length === 0) {
      const currentDomain = current?.riskDomains?.[domain];
      if (domain === COVERAGE_UNCLASSIFIED_RISK_DOMAIN) {
        if (!currentDomain || currentDomain.files === 0) {
          assessments.push({ domain, state: entry.state, status: "OBSERVE", reason: "NO_UNCLASSIFIED_FILES" });
          continue;
        }
        hasUnclassifiedFiles = true;
        const unclassified = {
          domain,
          state: entry.state,
          status: "NOT_MEASURED",
          reason: "RISK_CLASSIFICATION_REQUIRED",
          files: currentDomain.files,
        };
        assessments.push(unclassified);
        if (hasEnforcedRiskDomain) {
          failures.push({ ...unclassified, code: "ENFORCE_CLASSIFICATION_UNQUALIFIED" });
        }
        continue;
      }
      assessments.push({ domain, state: entry.state, status: "OBSERVE", reason: "NO_UNIFORM_THRESHOLD" });
      continue;
    }
    const currentDomain = current?.riskDomains?.[domain];
    if (!currentDomain) {
      const missing = { domain, state: entry.state, status: "NOT_MEASURED", reason: "DOMAIN_NOT_IN_REPORT" };
      assessments.push(missing);
      if (entry.state === "ENFORCE") failures.push({ ...missing, code: "ENFORCE_DOMAIN_NOT_MEASURED" });
      continue;
    }
    const domainFailures = [];
    for (const [metric, threshold] of thresholds) {
      try {
        const ratio = coverageMetricRatio(currentDomain.metrics?.[metric], `${domain}.${metric}`);
        const pct = ratio * 100;
        const observation = { domain, metric, covered: currentDomain.metrics[metric].covered, total: currentDomain.metrics[metric].total, current: pct, target: threshold, gapPp: Number((pct - threshold).toFixed(2)), state: entry.state };
        observations.push(observation);
        if (!thresholdReached(currentDomain.metrics[metric].covered, currentDomain.metrics[metric].total, threshold)) domainFailures.push({ ...observation, code: entry.state === "ENFORCE" ? "ENFORCE_THRESHOLD_NOT_MET" : "OBSERVE_THRESHOLD_NOT_MET" });
      } catch (error) {
        domainFailures.push({ domain, metric, state: entry.state, code: entry.state === "ENFORCE" ? "ENFORCE_METRIC_NOT_MEASURED" : "OBSERVE_METRIC_NOT_MEASURED", reason: error instanceof Error ? error.message : String(error) });
      }
    }
    const status = entry.state === "ENFORCE" && domainFailures.length > 0 ? "FAIL" : entry.state === "ENFORCE" ? "PASS" : "OBSERVE";
    assessments.push({ domain, state: entry.state, status, failures: domainFailures });
    if (entry.state === "ENFORCE") failures.push(...domainFailures);
  }
  const enforceAssessments = assessments.filter(({ state }) => state === "ENFORCE");
  const status = failures.length > 0
    ? "FAIL"
    : hasUnclassifiedFiles
      ? "NOT_MEASURED"
    : enforceAssessments.length > 0 && enforceAssessments.every(({ status: domainStatus }) => domainStatus === "PASS")
      ? "PASS"
      : assessments.some(({ status: domainStatus }) => ["OBSERVE", "PASS"].includes(domainStatus))
        ? "OBSERVE"
        : "NOT_MEASURED";
  return { status, scope, failures, observations, assessments, diagnostics: [] };
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
  const head = currentCommit ?? execFileSync(gitExecutable(), ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  try {
    execFileSync(gitExecutable(), ["cat-file", "-e", `${baseline.sourceCommit}^{commit}`], { stdio: "ignore" });
    execFileSync(gitExecutable(), ["merge-base", "--is-ancestor", baseline.sourceCommit, head], { stdio: "ignore" });
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
    status: failures.length > 0
      ? "INFORMATIVE_REGRESSION"
      : grace.length > 0
        ? "PASS_WITH_GRACE"
        : "PASS",
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
    lcov: path.join(repositoryRoot, scopeConfig.root, "coverage", "lcov.info"),
    baseline: path.join(repositoryRoot, "scripts", "checks", scope === "mobile" ? "coverage-mobile-baseline.json" : "coverage-baseline.json"),
  };
}
