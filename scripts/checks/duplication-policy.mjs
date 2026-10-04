import crypto from "node:crypto";

export const DUPLICATION_POLICY_VERSION = 2;
export const DUPLICATION_TOOL = "jscpd";
export const DUPLICATION_TOOL_VERSION = "5.3.0";
export const DUPLICATION_MIN_LINES = 5;
export const DUPLICATION_MIN_TOKENS = 50;
export const DUPLICATION_NEW_CLONE_FINGERPRINTS_BLOCKING = true;
const DUPLICATION_JUSTIFICATIONS_SCHEMA_VERSION = 1;

export const DUPLICATION_GRACE = Object.freeze({
  runtime: Object.freeze({
    maxLinePercentagePointIncrease: 0.05,
    maxTokenPercentagePointIncrease: 0.05,
    maxDuplicatedLinesIncrease: 80,
    maxDuplicatedTokensIncrease: 800,
  }),
  tests: Object.freeze({
    maxLinePercentagePointIncrease: 0.15,
    maxTokenPercentagePointIncrease: 0.15,
    maxDuplicatedLinesIncrease: 150,
    maxDuplicatedTokensIncrease: 1500,
  }),
  "fixtures/data": Object.freeze({
    maxLinePercentagePointIncrease: 0,
    maxTokenPercentagePointIncrease: 0,
    maxDuplicatedLinesIncrease: 0,
    maxDuplicatedTokensIncrease: 0,
  }),
});

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
  newCloneFingerprintsBlocking: DUPLICATION_NEW_CLONE_FINGERPRINTS_BLOCKING,
  scopes: DUPLICATION_SCOPES,
  grace: DUPLICATION_GRACE,
};

export const DUPLICATION_POLICY_FINGERPRINT = computeDuplicationPolicyFingerprint(DUPLICATION_POLICY_DESCRIPTOR);

const DUPLICATION_METRICS_BASELINE_SCHEMA_VERSION = 2;

export function buildJscpdArguments(scopeName, baselinePath, outputDirectory, reporters = "json") {
  const scope = DUPLICATION_SCOPES[scopeName];
  if (!scope) throw new Error(`Unknown duplication scope: ${scopeName}`);
  if (typeof reporters !== "string" || reporters.trim().length === 0) {
    throw new Error("Duplication reporters must be a non-empty string.");
  }
  return [
    ...scope.paths,
    "--pattern", scope.pattern,
    "--min-lines", String(DUPLICATION_MIN_LINES),
    "--min-tokens", String(DUPLICATION_MIN_TOKENS),
    "--ignore", scope.ignores.join(","),
    "--baseline", baselinePath,
    "--reporters", reporters,
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

function percentagePointDelta(currentValue, currentTotal, baselineValue, baselineTotal) {
  return (currentValue / currentTotal - baselineValue / baselineTotal) * 100;
}

export function compareDuplicationMetrics(current, baseline, scopeName = "runtime") {
  const grace = DUPLICATION_GRACE[scopeName];
  if (!grace) throw new Error(`Unknown duplication scope: ${scopeName}`);

  const deltas = {
    duplicatedLines: current.duplicatedLines - baseline.duplicatedLines,
    duplicatedTokens: current.duplicatedTokens - baseline.duplicatedTokens,
    linePercentagePoints: percentagePointDelta(
      current.duplicatedLines,
      current.lines,
      baseline.duplicatedLines,
      baseline.lines,
    ),
    tokenPercentagePoints: percentagePointDelta(
      current.duplicatedTokens,
      current.tokens,
      baseline.duplicatedTokens,
      baseline.tokens,
    ),
  };
  const hasRegression = Object.values(deltas).some((delta) => delta > 0);
  const failures = [];
  if (DUPLICATION_NEW_CLONE_FINGERPRINTS_BLOCKING && (current.newClones ?? 0) > 0) {
    failures.push(`new clone fingerprints detected (${current.newClones})`);
  }
  const epsilon = 1e-9;
  const limits = [
    ["duplicatedLines", grace.maxDuplicatedLinesIncrease],
    ["duplicatedTokens", grace.maxDuplicatedTokensIncrease],
    ["linePercentagePoints", grace.maxLinePercentagePointIncrease],
    ["tokenPercentagePoints", grace.maxTokenPercentagePointIncrease],
  ];
  for (const [field, limit] of limits) {
    if (deltas[field] > limit + epsilon) {
      failures.push(`${field} exceeded grace (${deltas[field]} > ${limit})`);
    }
  }

  return {
    status: failures.length > 0 ? "FAIL" : hasRegression ? "PASS_WITH_GRACE" : "PASS",
    failures,
    deltas,
  };
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

export function readJscpdFingerprints(sarifReport) {
  const results = sarifReport?.runs?.[0]?.results;
  if (!Array.isArray(results)) {
    throw new Error("jscpd SARIF report malformed: runs[0].results is required.");
  }

  const fingerprints = new Set();
  for (const result of results) {
    const fingerprint = result?.partialFingerprints?.["jscpdCloneHash/v1"];
    if (typeof fingerprint !== "string" || fingerprint.length === 0) {
      throw new Error("jscpd SARIF report malformed: jscpdCloneHash/v1 is required.");
    }
    fingerprints.add(fingerprint);
  }
  return fingerprints;
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.length > 0) ?? null;
}

function firstInteger(...values) {
  return values.find((value) => Number.isInteger(value)) ?? null;
}

function normalizeOccurrencePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

function readJscpdOccurrence(location) {
  if (!location || typeof location !== "object") return null;
  const sourcePath = firstString(location.name, location.path, location.file, location.fileName, location.uri);
  const startLine = firstInteger(location.start, location.startLine, location.startLoc?.line, location.region?.startLine);
  const endLine = firstInteger(location.end, location.endLine, location.endLoc?.line, location.region?.endLine);
  if (!sourcePath || startLine === null || endLine === null) return null;
  return { path: normalizeOccurrencePath(sourcePath), startLine, endLine };
}

function readSarifOccurrence(result, index) {
  const location = result?.locations?.[index]?.physicalLocation;
  if (!location) return null;
  return readJscpdOccurrence({
    uri: location.artifactLocation?.uri,
    region: location.region,
  });
}

export function readJscpdOccurrences(report, sarifReport, scopeName) {
  if (typeof scopeName !== "string" || scopeName.length === 0) {
    throw new Error("jscpd occurrence projection requires a scope name.");
  }
  const duplicates = report?.duplicates;
  const results = sarifReport?.runs?.[0]?.results;
  if (!Array.isArray(duplicates)) {
    throw new Error("jscpd report malformed: duplicates is required for occurrence projection.");
  }
  if (!Array.isArray(results)) {
    throw new Error("jscpd SARIF report malformed: runs[0].results is required for occurrence projection.");
  }
  if (duplicates.length !== results.length) {
    throw new Error(`jscpd occurrence projection mismatch: ${duplicates.length} JSON clones versus ${results.length} SARIF results.`);
  }

  return duplicates.map((duplicate, index) => {
    const fingerprint = results[index]?.partialFingerprints?.["jscpdCloneHash/v1"];
    if (typeof fingerprint !== "string" || fingerprint.length === 0) {
      throw new Error("jscpd SARIF report malformed: jscpdCloneHash/v1 is required for occurrence projection.");
    }
    const occurrenceA = readJscpdOccurrence(duplicate?.firstFile) ?? readSarifOccurrence(results[index], 0);
    const occurrenceB = readJscpdOccurrence(duplicate?.secondFile) ?? readSarifOccurrence(results[index], 1);
    if (!occurrenceA || !occurrenceB) {
      throw new Error(`jscpd occurrence projection malformed at clone ${index + 1}: two source locations are required.`);
    }
    return {
      scope: scopeName,
      fingerprint,
      occurrenceA,
      occurrenceB,
    };
  });
}

function justificationError(message) {
  throw new Error(`duplication justifications malformed: ${message}`);
}

export function validateDuplicationJustificationsRegistry(
  registry,
  { nativeBaselines = {}, currentFingerprintsByScope = null } = {},
) {
  if (!registry || registry.schemaVersion !== DUPLICATION_JUSTIFICATIONS_SCHEMA_VERSION) {
    justificationError(`schemaVersion ${DUPLICATION_JUSTIFICATIONS_SCHEMA_VERSION} required.`);
  }
  if (!Array.isArray(registry.justifications)) {
    justificationError("justifications array is required.");
  }

  const seen = new Set();
  const counts = Object.fromEntries(Object.keys(DUPLICATION_SCOPES).map((scopeName) => [scopeName, 0]));
  const stale = [];
  for (const [index, justification] of registry.justifications.entries()) {
    if (!justification || typeof justification !== "object") {
      justificationError(`entry ${index} must be an object.`);
    }
    const { scope, fingerprint, classification, reason, evidence, reviewedRef } = justification;
    if (!Object.hasOwn(DUPLICATION_SCOPES, scope)) {
      justificationError(`entry ${index} has an unknown scope.`);
    }
    if (typeof fingerprint !== "string" || !/^[0-9a-f]{16}$/i.test(fingerprint)) {
      justificationError(`entry ${index} has an invalid fingerprint.`);
    }
    const identity = `${scope}:${fingerprint}`;
    if (seen.has(identity)) {
      justificationError(`duplicate entry for ${identity}.`);
    }
    seen.add(identity);
    if (classification !== "KEEP_INTENTIONAL") {
      justificationError(`entry ${index} must use KEEP_INTENTIONAL.`);
    }
    if (typeof reason !== "string" || reason.trim().length === 0) {
      justificationError(`entry ${index} requires a non-empty reason.`);
    }
    if (typeof evidence !== "string" || evidence.trim().length === 0) {
      justificationError(`entry ${index} requires non-empty evidence.`);
    }
    if (typeof reviewedRef !== "string" || !/^[0-9a-f]{40}$/i.test(reviewedRef)) {
      justificationError(`entry ${index} requires a full reviewedRef SHA.`);
    }

    const baseline = nativeBaselines[scope];
    nativeBaselineFingerprintCount(baseline);
    if (!Object.hasOwn(baseline.fingerprints, fingerprint)) {
      justificationError(`entry ${index} targets an unknown native fingerprint.`);
    }

    const currentFingerprints = currentFingerprintsByScope?.[scope];
    if (currentFingerprints && !currentFingerprints.has(fingerprint)) {
      stale.push(identity);
    }
    counts[scope] += 1;
  }

  if (stale.length > 0) {
    throw new Error(`STALE_KEEP_INTENTIONAL: ${stale.join(", ")}`);
  }
  return { counts, stale };
}
