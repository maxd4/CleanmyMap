import { createHash } from "node:crypto";
import ts from "typescript";

export const COMPLEXITY_POLICY_VERSION = 2;

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

// This is the remaining non-file ESLint exception ceiling audited in lot 6A.
// File-size ceilings remain owned exclusively by top-heavy.
export const LEGACY_EXCEPTION_CEILINGS = Object.freeze({
  routeCalibrationTestFunctionLines: 570,
});

export const COMPLEXITY_POLICY_FINGERPRINT = createHash("sha256")
  .update(JSON.stringify({
    version: COMPLEXITY_POLICY_VERSION,
    complexity: COMPLEXITY_THRESHOLDS,
    functionLength: FUNCTION_LENGTH_THRESHOLDS,
  }))
  .digest("hex");

export const FUNCTION_IDENTITY_SCHEME_VERSION = 2;
export const FUNCTION_IDENTITY_SCHEME =
  "v2: path + semantic role with canonical syntax tokens + deterministic occurrence; line is diagnostic metadata only.";

function canonicalSyntaxText(node, sourceFile) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    sourceFile.languageVariant,
    sourceFile.text,
  );
  scanner.setTextPos(node.getStart(sourceFile));
  const tokens = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken && scanner.getTokenPos() < node.end) {
    tokens.push(scanner.getTokenText());
    token = scanner.scan();
  }
  return tokens.join(" ");
}

function isFunctionLike(node) {
  return ts.isFunctionDeclaration(node)
    || ts.isFunctionExpression(node)
    || ts.isArrowFunction(node)
    || ts.isMethodDeclaration(node)
    || ts.isConstructorDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node);
}

function nodeName(node, sourceFile) {
  if (ts.isConstructorDeclaration(node)) return "constructor";
  if ("name" in node && node.name) return canonicalSyntaxText(node.name, sourceFile);
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    const parent = node.parent;
    if (parent && ts.isVariableDeclaration(parent)) return canonicalSyntaxText(parent.name, sourceFile);
    if (parent && ts.isPropertyAssignment(parent)) return canonicalSyntaxText(parent.name, sourceFile);
  }
  return null;
}

function callRole(node, sourceFile) {
  const parent = node.parent;
  if (!parent || !ts.isCallExpression(parent)) return null;
  const argumentIndex = parent.arguments.indexOf(node);
  const callee = canonicalSyntaxText(parent.expression, sourceFile);
  const title = parent.arguments[0] && ts.isStringLiteralLike(parent.arguments[0])
    ? canonicalSyntaxText(parent.arguments[0], sourceFile)
    : "";
  return `callback:${callee}:${argumentIndex}:${title}`;
}

function functionRole(node, sourceFile) {
  const name = nodeName(node, sourceFile);
  if (name) return `${ts.isConstructorDeclaration(node) ? "constructor" : "named"}:${name}`;
  return callRole(node, sourceFile) ?? `anonymous:${node.kind}`;
}

function collectFunctionNodes(sourceFile) {
  const nodes = [];
  const visit = (node) => {
    if (isFunctionLike(node)) nodes.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return nodes;
}

export function createFunctionIdentityResolver(file, source) {
  const scriptKind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKind);
  const nodes = collectFunctionNodes(sourceFile);
  const identityByNode = new Map();
  const occurrenceByRole = new Map();
  const nodesByLine = new Map();
  for (const node of nodes) {
    const role = functionRole(node, sourceFile);
    const occurrence = (occurrenceByRole.get(role) ?? 0) + 1;
    occurrenceByRole.set(role, occurrence);
    identityByNode.set(node, `${role}#${occurrence}`);
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    if (!nodesByLine.has(line)) nodesByLine.set(line, []);
    nodesByLine.get(line).push(node);
  }

  return (line, message = "") => {
    const candidates = nodesByLine.get(line) ?? [];
    const namedMessage = message.match(/(?:function|method) '([^']+)'/i)?.[1];
    const node = (namedMessage
      ? candidates.find((candidate) => nodeName(candidate, sourceFile) === namedMessage)
      : candidates[0]) ?? candidates[0];
    return node ? identityByNode.get(node) : `unresolved:${message || "function"}`;
  };
}

export function deriveFunctionIdentity(file, source, line, message = "") {
  return createFunctionIdentityResolver(file, source)(line, message);
}

export function baselineKey(metric, path, functionIdentity) {
  return `${metric}:${path}:${functionIdentity}`;
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

export function validateBaselineShape(baseline) {
  if (!baseline || baseline.schemaVersion !== 2) throw new Error("complexity baseline malformed: schemaVersion 2 required.");
  if (typeof baseline.sourceCommit !== "string" || !/^[0-9a-f]{40}$/i.test(baseline.sourceCommit)) throw new Error("complexity baseline malformed: full sourceCommit required.");
  if (baseline.functionIdentitySchemeVersion !== FUNCTION_IDENTITY_SCHEME_VERSION) throw new Error("complexity baseline stale: function identity scheme mismatch.");
  if (baseline.policyFingerprint !== COMPLEXITY_POLICY_FINGERPRINT) throw new Error("complexity baseline stale: policy fingerprint mismatch.");
  if (!Array.isArray(baseline.entries)) throw new Error("complexity baseline malformed: entries[] required.");

  const keys = new Set();
  for (const [index, entry] of baseline.entries.entries()) {
    if (!entry || typeof entry !== "object" || typeof entry.metric !== "string" || typeof entry.path !== "string" || typeof entry.functionIdentity !== "string") throw new Error(`complexity baseline malformed: entry ${index} is incomplete.`);
    if (!["complexity", "functionLength"].includes(entry.metric)) throw new Error(`complexity baseline malformed: entry ${index} has an unsupported metric.`);
    if (!Number.isInteger(entry.ceiling) || entry.ceiling < 0) throw new Error(`complexity baseline malformed: entry ${index} has an invalid ceiling.`);
    const key = baselineKey(entry.metric, entry.path, entry.functionIdentity);
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
  };
}

export function classifyFileKind(file) {
  const normalized = file.replaceAll("\\", "/");
  const base = normalized.slice(normalized.lastIndexOf("/") + 1);
  if (/(^|\/)(generated|__generated__)(\/|$)|(^|\/)next-env\.d\.ts$|\.generated\./i.test(normalized)) return "generated";
  if (/(^|\/)(__tests__|tests?)(\/|$)|\.(?:test|spec)(?:\.[^.]+)*\.(?:ts|tsx)$/i.test(normalized)) return "test";
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
