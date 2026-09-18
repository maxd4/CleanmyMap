import { createHash } from "node:crypto";

export const COMPLEXITY_POLICY_VERSION = 1;

export const COMPLEXITY_THRESHOLDS = Object.freeze({
  "métier/domain pur": Object.freeze({ target: 15, blockAbove: 20 }),
  "runtime/services/orchestration": Object.freeze({ target: 20, blockAbove: 25 }),
  hooks: Object.freeze({ target: 20, blockAbove: 25 }),
  "React/JSX": Object.freeze({ target: 20, blockAbove: 25 }),
  "routes API": Object.freeze({ target: 20, blockAbove: 25 }),
  "parser/adaptateur exceptionnel": Object.freeze({ reviewAbove: 25, maximum: 30 }),
});

export const FUNCTION_LENGTH_THRESHOLDS = Object.freeze({
  "métier/domain pur": Object.freeze({ target: 60, blockAbove: 100 }),
  "runtime/services/orchestration": Object.freeze({ target: 100, blockAbove: 150 }),
  hooks: Object.freeze({ target: 120, blockAbove: 200 }),
  "React/JSX": Object.freeze({ target: 150, blockAbove: 250 }),
  "routes API": Object.freeze({ target: 100, blockAbove: 150 }),
});

export const FILE_LENGTH_THRESHOLDS = Object.freeze({
  runtime: Object.freeze({ reviewAbove: 400, blockNewAbove: 600 }),
  test: Object.freeze({ reviewAbove: 700, blockNewAbove: 1000 }),
  "data/config": Object.freeze({ reviewAbove: 400, signalOnly: true }),
  generated: Object.freeze({ excluded: true }),
  vendor: Object.freeze({ excluded: true }),
});

// These are the four measured ESLint exceptions audited in lot 6A. Keeping
// their ceilings here lets the editor configuration and the ratchet consume
// one source of truth; the versioned baseline still records the per-function
// locations that must not grow.
export const LEGACY_EXCEPTION_CEILINGS = Object.freeze({
  apiAuthorizationContractLines: 911,
  routeCalibrationLines: 928,
  actionUpdatePersistenceComplexity: 122,
  routeCalibrationTestFunctionLines: 570,
});

export const COMPLEXITY_POLICY_FINGERPRINT = createHash("sha256")
  .update(JSON.stringify({
    version: COMPLEXITY_POLICY_VERSION,
    complexity: COMPLEXITY_THRESHOLDS,
    functionLength: FUNCTION_LENGTH_THRESHOLDS,
    fileLength: FILE_LENGTH_THRESHOLDS,
  }))
  .digest("hex");

export function baselineKey(metric, path, line = null) {
  return line === null ? `${metric}:${path}` : `${metric}:${path}:${line}`;
}

export function evaluateNewMetric(metric, category, value, { parserJustified = false } = {}) {
  const thresholds = metric === "complexity"
    ? COMPLEXITY_THRESHOLDS[category]
    : FUNCTION_LENGTH_THRESHOLDS[category];
  if (!thresholds) return { status: "NOT_APPLICABLE", metric, category, value };

  if (metric === "complexity" && category === "parser/adaptateur exceptionnel") {
    if (value > thresholds.maximum) return { status: "FAIL", reason: "parser complexity exceeds exceptional maximum", metric, category, value, limit: thresholds.maximum };
    if (value > thresholds.reviewAbove && !parserJustified) return { status: "FAIL", reason: "parser complexity lacks explicit justification", metric, category, value, limit: thresholds.reviewAbove };
    return { status: value > thresholds.reviewAbove ? "REVIEW" : "PASS", metric, category, value, limit: thresholds.maximum };
  }

  if (value > thresholds.blockAbove) return { status: "FAIL", reason: "new code exceeds blocking threshold", metric, category, value, limit: thresholds.blockAbove };
  // The target is an architectural quality objective, not a blocking gate.
  // The lot 6B contract blocks only values strictly above blockAbove.
  return { status: "PASS", metric, category, value, limit: thresholds.blockAbove };
}

export function compareLegacyValue(current, ceiling) {
  if (current > ceiling) return { status: "FAIL", reason: "legacy ceiling increased", current, ceiling };
  if (current < ceiling) return { status: "IMPROVEMENT", current, ceiling };
  return { status: "PASS", current, ceiling };
}

export function acquireImprovement(entry, current) {
  if (current >= entry.ceiling) return { ...entry };
  return { ...entry, ceiling: current, status: "IMPROVED" };
}

export function evaluateNewFileLength(kind, lines) {
  const thresholds = FILE_LENGTH_THRESHOLDS[kind];
  if (!thresholds || thresholds.excluded) return { status: "NOT_APPLICABLE", kind, lines };
  if (kind === "data/config") return { status: lines > thresholds.reviewAbove ? "REVIEW" : "PASS", kind, lines, limit: thresholds.reviewAbove };
  if (lines > thresholds.blockNewAbove) return { status: "FAIL", kind, lines, limit: thresholds.blockNewAbove };
  return { status: lines > thresholds.reviewAbove ? "REVIEW" : "PASS", kind, lines, limit: thresholds.blockNewAbove };
}

export function validateBaselineShape(baseline) {
  if (!baseline || baseline.schemaVersion !== 1) throw new Error("complexity baseline malformed: schemaVersion 1 required.");
  if (typeof baseline.sourceCommit !== "string" || !/^[0-9a-f]{40}$/i.test(baseline.sourceCommit)) throw new Error("complexity baseline malformed: full sourceCommit required.");
  if (baseline.policyFingerprint !== COMPLEXITY_POLICY_FINGERPRINT) throw new Error("complexity baseline stale: policy fingerprint mismatch.");
  if (!Array.isArray(baseline.entries)) throw new Error("complexity baseline malformed: entries[] required.");

  const keys = new Set();
  for (const [index, entry] of baseline.entries.entries()) {
    if (!entry || typeof entry !== "object" || typeof entry.metric !== "string" || typeof entry.path !== "string") throw new Error(`complexity baseline malformed: entry ${index} is incomplete.`);
    if (!Number.isInteger(entry.ceiling) || entry.ceiling < 0) throw new Error(`complexity baseline malformed: entry ${index} has an invalid ceiling.`);
    const key = baselineKey(entry.metric, entry.path, entry.line ?? null);
    if (keys.has(key)) throw new Error(`complexity baseline malformed: duplicate ${key}.`);
    keys.add(key);
  }
  return baseline;
}

export function policySnapshot() {
  return {
    version: COMPLEXITY_POLICY_VERSION,
    fingerprint: COMPLEXITY_POLICY_FINGERPRINT,
    complexity: COMPLEXITY_THRESHOLDS,
    functionLength: FUNCTION_LENGTH_THRESHOLDS,
    fileLength: FILE_LENGTH_THRESHOLDS,
  };
}

export function classifyFileKind(file) {
  const normalized = file.replaceAll("\\", "/");
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (/(^|\/)(generated|__generated__)(\/|$)|(^|\/)next-env\.d\.ts$|\.generated\./i.test(normalized)) return "generated";
  if (/(^|\/)(__tests__|tests?)(\/|$)|\.(test|spec)\.(ts|tsx)$/i.test(normalized)) return "test";
  if (/(^|\/)(data|config|constants|types)(\/|$)|(^|[-_.])(data|config|constants|types)([-_.]|$)/i.test(base) || /(^|\/)(data|config|constants|types)(\/|$)/i.test(normalized)) return "data/config";
  return "runtime";
}

export function classifyComplexityCategory(file) {
  const normalized = file.replaceAll("\\", "/");
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  const kind = classifyFileKind(normalized);
  if (kind === "test") return "tests";
  if (kind === "data/config") return "data/config";
  if (normalized.startsWith("src/app/api/") || (normalized.startsWith("src/app/") && /\/route\.(ts|tsx)$/.test(normalized))) return "routes API";
  if (normalized.startsWith("src/hooks/") || /(^|[-_])use[-A-Z]/.test(base) || /^use[A-Z]/.test(base)) return "hooks";
  if (normalized.endsWith(".tsx") || normalized.startsWith("src/components/") || normalized.startsWith("src/app/")) return "React/JSX";
  if (normalized === "src/proxy.ts" || /\/(auth|authz|supabase|storage|services|server|api|rate-limit|persistence|repository|repositories|orchestrat|provider|gateway|sync)(\/|[-_.])/i.test(normalized) || /(^|[-_.])(store|service|client|server|http|repository|persistence|orchestrat|provider|gateway|sync)([-_.]|$)/i.test(base)) return "runtime/services/orchestration";
  if (normalized.startsWith("src/lib/")) return "métier/domain pur";
  return "runtime/services/orchestration";
}
