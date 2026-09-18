import crypto from "node:crypto";

export const DUPLICATION_POLICY_VERSION = 1;
export const DUPLICATION_TOOL = "jscpd";
export const DUPLICATION_TOOL_VERSION = "5.3.0";
export const DUPLICATION_MIN_LINES = 5;
export const DUPLICATION_MIN_TOKENS = 50;

const COMMON_IGNORES = [
  "**/node_modules/**",
  "**/.next/**",
  "**/generated/**",
  "**/vendor/**",
  "**/coverage/**",
  "**/*.snap",
  "**/__snapshots__/**",
];

export const DUPLICATION_SCOPES = Object.freeze({
  runtime: Object.freeze({
    paths: ["apps/web/src", "apps/mobile", "scripts"],
    pattern: "**/*.{ts,tsx,js,jsx}",
    ignores: [
      ...COMMON_IGNORES,
      "**/*.test.*",
      "**/*.spec.*",
      "**/__tests__/**",
      "**/tests/**",
      "**/fixtures/**",
      "**/mocks/**",
      "**/snapshots/**",
      "**/data/**",
    ],
  }),
  tests: Object.freeze({
    paths: ["apps/web/src", "apps/mobile", "scripts"],
    pattern: "**/*.{test,spec}.{ts,tsx,js,jsx}",
    ignores: COMMON_IGNORES,
  }),
  "fixtures/data": Object.freeze({
    paths: ["apps/web/src/data", "apps/web/src/lib/data", "scripts/data"],
    pattern: "**/*.{ts,tsx,js,jsx}",
    ignores: [
      "**/node_modules/**",
      "**/generated/**",
      "**/vendor/**",
      "**/coverage/**",
      "**/*.snap",
      "**/__snapshots__/**",
    ],
  }),
});

export function computeDuplicationPolicyFingerprint(policyDescriptor) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(policyDescriptor))
    .digest("hex");
}

const DUPLICATION_POLICY_DESCRIPTOR = {
  version: DUPLICATION_POLICY_VERSION,
  tool: DUPLICATION_TOOL,
  toolVersion: DUPLICATION_TOOL_VERSION,
  minLines: DUPLICATION_MIN_LINES,
  minTokens: DUPLICATION_MIN_TOKENS,
  scopes: DUPLICATION_SCOPES,
};

export const DUPLICATION_POLICY_FINGERPRINT = computeDuplicationPolicyFingerprint(DUPLICATION_POLICY_DESCRIPTOR);

export const DUPLICATION_METRICS_BASELINE_SCHEMA_VERSION = 2;

export function buildJscpdArguments(scopeName, baselinePath, outputDirectory) {
  const scope = DUPLICATION_SCOPES[scopeName];
  if (!scope) throw new Error(`Unknown duplication scope: ${scopeName}`);
  return [
    ...scope.paths,
    "--pattern", scope.pattern,
    "--min-lines", String(DUPLICATION_MIN_LINES),
    "--min-tokens", String(DUPLICATION_MIN_TOKENS),
    "--ignore", scope.ignores.join(","),
    "--baseline", baselinePath,
    "--fail-on-new-clones",
    "--reporters", "json",
    "--output", outputDirectory,
    "--silent",
    "--no-colors",
    "--no-tips",
  ];
}

export function validateDuplicationMetricsBaseline(baseline) {
  if (!baseline || baseline.schemaVersion !== DUPLICATION_METRICS_BASELINE_SCHEMA_VERSION) {
    throw new Error("duplication metrics baseline malformed: schemaVersion 2 required.");
  }
  if (typeof baseline.sourceCommit !== "string" || !/^[0-9a-f]{40}$/i.test(baseline.sourceCommit)) {
    throw new Error("duplication metrics baseline malformed: full sourceCommit required.");
  }
  if (baseline.tool !== DUPLICATION_TOOL || baseline.toolVersion !== DUPLICATION_TOOL_VERSION) {
    throw new Error("duplication metrics baseline stale: tool version mismatch.");
  }
  if (baseline.minLines !== DUPLICATION_MIN_LINES || baseline.minTokens !== DUPLICATION_MIN_TOKENS) {
    throw new Error("duplication metrics baseline stale: detector thresholds mismatch.");
  }
  if (typeof baseline.policyFingerprint !== "string" || !/^[0-9a-f]{64}$/i.test(baseline.policyFingerprint)) {
    throw new Error("duplication metrics baseline malformed: policy fingerprint must be a SHA-256 hex string.");
  }
  if (baseline.policyFingerprint !== DUPLICATION_POLICY_FINGERPRINT) {
    throw new Error("duplication metrics baseline stale: policy fingerprint mismatch.");
  }
  for (const scopeName of Object.keys(DUPLICATION_SCOPES)) {
    const scope = baseline.scopes?.[scopeName];
    if (!scope || !Number.isInteger(scope.files) || !Number.isInteger(scope.lines) || !Number.isInteger(scope.tokens)) {
      throw new Error(`duplication metrics baseline malformed: missing ${scopeName} scope.`);
    }
    for (const field of ["clones", "fingerprints", "duplicatedLines", "duplicatedTokens"]) {
      if (!Number.isInteger(scope[field]) || scope[field] < 0) {
        throw new Error(`duplication metrics baseline malformed: invalid ${scopeName}.${field}.`);
      }
    }
  }
  return baseline;
}

export function compareDuplicationMetrics(current, baseline) {
  const failures = [];
  for (const field of ["clones", "duplicatedLines", "duplicatedTokens"]) {
    if (current[field] > baseline[field]) failures.push(`${field} increased (${current[field]} > ${baseline[field]})`);
  }
  if (current.duplicatedLines * baseline.lines > baseline.duplicatedLines * current.lines) {
    failures.push("duplicated line percentage increased");
  }
  if (current.duplicatedTokens * baseline.tokens > baseline.duplicatedTokens * current.tokens) {
    failures.push("duplicated token percentage increased");
  }
  return failures;
}

export function readJscpdMetrics(report) {
  const total = report?.statistics?.total;
  if (!total || !Number.isInteger(total.sources) || !Number.isInteger(total.lines) || !Number.isInteger(total.tokens)) {
    throw new Error("jscpd report malformed: statistics.total is required.");
  }
  return {
    files: total.sources,
    lines: total.lines,
    tokens: total.tokens,
    clones: total.clones,
    duplicatedLines: total.duplicatedLines,
    duplicatedTokens: total.duplicatedTokens,
    percentage: total.percentage,
    percentageTokens: total.percentageTokens,
    newClones: total.newClones ?? 0,
  };
}

export function nativeBaselineFingerprintCount(baseline) {
  if (!baseline || baseline.version !== 1 || !baseline.fingerprints || typeof baseline.fingerprints !== "object") {
    throw new Error("jscpd baseline malformed: version 1 fingerprints are required.");
  }
  return Object.keys(baseline.fingerprints).length;
}
