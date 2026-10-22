#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

import semver from "semver";
import { ESLint } from "eslint";
import tseslint from "typescript-eslint";

import { gitExecutable } from "../ci/git-executable.mjs";
import { listFunctionMetadata } from "./complexity-policy.mjs";

const require = createRequire(import.meta.url);
const TYPESCRIPT_ESLINT_PACKAGE = require("typescript-eslint/package.json");
const TYPESCRIPT_ESLINT_VERSION = TYPESCRIPT_ESLINT_PACKAGE.version;
const TYPESCRIPT_PEER_RANGE = TYPESCRIPT_ESLINT_PACKAGE.peerDependencies?.typescript ?? null;
const ESLINT_VERSION = ESLint.version;

export const SOURCE_ROOTS = Object.freeze(["apps/web/src", "apps/mobile"]);
const SOURCE_EXTENSIONS = /\.(?:ts|tsx|mts|cts)$/;
const EXCLUDED_PATH = /(?:^|\/)(?:node_modules|vendor|\.next|\.expo|coverage|dist|build|out|\.turbo)(?:\/|$)/;

const RULES = Object.freeze({
  "@typescript-eslint/no-floating-promises": Object.freeze({
    family: "ASYNC_SAFETY",
    severity: "warning",
    options: ["warn", { ignoreVoid: false, ignoreIIFE: true }],
    coverage: "typed parser; explicit void is reported unless it has a local fire-and-forget justification",
  }),
  "@typescript-eslint/no-misused-promises": Object.freeze({
    family: "ASYNC_SAFETY",
    severity: "warning",
    options: ["warn", {
      checksConditionals: true,
      checksSpreads: true,
      checksVoidReturn: { arguments: true, attributes: true, properties: true, returns: true, variables: true },
    }],
    coverage: "typed parser; callback, condition, spread and void-return positions",
  }),
  "@typescript-eslint/no-unsafe-assignment": Object.freeze({
    family: "TYPE_SAFETY",
    severity: "warning",
    options: "warn",
    coverage: "typed parser; any/unknown-derived assignment",
  }),
  "@typescript-eslint/no-unsafe-member-access": Object.freeze({
    family: "TYPE_SAFETY",
    severity: "warning",
    options: "warn",
    coverage: "typed parser; member access through any",
  }),
  "@typescript-eslint/no-unsafe-call": Object.freeze({
    family: "TYPE_SAFETY",
    severity: "warning",
    options: "warn",
    coverage: "typed parser; calls through any",
  }),
  "@typescript-eslint/no-unsafe-return": Object.freeze({
    family: "TYPE_SAFETY",
    severity: "warning",
    options: "warn",
    coverage: "typed parser; unsafe values crossing function returns",
  }),
  "@typescript-eslint/no-explicit-any": Object.freeze({
    family: "TYPE_SAFETY",
    severity: "warning",
    options: "warn",
    coverage: "mobile only; Web already emits this exact warning in apps/web/eslint.config.mjs",
  }),
});

const TYPED_RULE_IDS = Object.freeze(Object.keys(RULES).filter((ruleId) => ruleId !== "@typescript-eslint/no-explicit-any"));
const SUPPRESSION_RULES = new Set([...TYPED_RULE_IDS, "@typescript-eslint/no-explicit-any"]);

function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

function workspaceForPath(filePath) {
  const normalized = normalizePath(filePath);
  if (normalized.startsWith("apps/web/")) return "web";
  if (normalized.startsWith("apps/mobile/")) return "mobile";
  return "unknown";
}

function isScannable(filePath) {
  const normalized = normalizePath(filePath);
  return SOURCE_EXTENSIONS.test(normalized) && !EXCLUDED_PATH.test(normalized);
}

function gitLines(root, args) {
  return execFileSync(gitExecutable(), args, { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function sourceFileEntries(root, sourceRoots) {
  const tracked = gitLines(root, ["ls-files", "--", ...sourceRoots]);
  const untracked = gitLines(root, ["ls-files", "--others", "--exclude-standard", "--", ...sourceRoots]);
  const statuses = new Map();
  for (const line of gitLines(root, ["status", "--short", "--untracked-files=all", "--", ...sourceRoots])) {
    const file = normalizePath(line.slice(3).trim());
    if (file) statuses.set(file, line.slice(0, 2).trim() || "?");
  }
  const trackedSet = new Set(tracked.map(normalizePath));
  return [...new Set([...tracked, ...untracked].map(normalizePath))]
    .filter(isScannable)
    .map((file) => ({
      path: file,
      absolutePath: path.join(root, file),
      source: fs.readFileSync(path.join(root, file), "utf8"),
      workspace: workspaceForPath(file),
      tracked: trackedSet.has(file),
      gitStatus: statuses.get(file) ?? "",
    }));
}

function resolveTypescriptVersion(workspaceRoot) {
  try {
    const packagePath = require.resolve("typescript/package.json", { paths: [workspaceRoot] });
    return { version: require(packagePath).version, packagePath };
  } catch (error) {
    return { version: null, packagePath: null, error: error.message };
  }
}

function projectDefinitions(root) {
  return [
    {
      workspace: "web",
      workspaceRoot: path.join(root, "apps/web"),
      tsconfigPath: path.join(root, "apps/web/tsconfig.json"),
      ruleIds: TYPED_RULE_IDS.filter((ruleId) => ruleId !== "@typescript-eslint/no-explicit-any"),
    },
    {
      workspace: "mobile",
      workspaceRoot: path.join(root, "apps/mobile"),
      tsconfigPath: path.join(root, "apps/mobile/tsconfig.json"),
      ruleIds: Object.keys(RULES),
    },
  ];
}

function functionForLine(functions, line) {
  return functions
    .filter((candidate) => candidate.line === line || (candidate.functionStartLine <= line && candidate.functionEndLine >= line))
    .sort((left, right) => (left.functionEndLine - left.functionStartLine) - (right.functionEndLine - right.functionStartLine))[0] ?? null;
}

function findingStatus(file) {
  if (file.fixture) return "FIXTURE";
  if (!file.tracked) return "NEW_CANDIDATE_UNVERIFIED";
  return file.gitStatus ? "NEW_CANDIDATE_UNVERIFIED" : "HISTORICAL";
}

function suppressionReason(text) {
  const normalized = text.trim();
  if (!normalized) return null;
  const marker = normalized.match(/(?:^|\s)(--|:)\s*(.+)$/);
  if (marker) return `${marker[1]} ${marker[2].trim()}`;
  return null;
}

function suppressionFamily(kind, directive) {
  if (kind !== "eslint-suppression") return "TYPE_SAFETY";
  const asyncRules = [...SUPPRESSION_RULES].filter((ruleId) => RULES[ruleId]?.family === "ASYNC_SAFETY");
  const typeRules = [...SUPPRESSION_RULES].filter((ruleId) => RULES[ruleId]?.family === "TYPE_SAFETY");
  const hasAsyncRule = asyncRules.some((ruleId) => directive.includes(ruleId));
  const hasTypeRule = typeRules.some((ruleId) => directive.includes(ruleId));
  return hasAsyncRule && !hasTypeRule ? "ASYNC_SAFETY" : "TYPE_SAFETY";
}

function suppressionFindings(file) {
  const findings = [];
  const exceptions = [];
  const lines = file.source.split(/\r?\n/);
  const patterns = [
    { regex: /@ts-(ignore|nocheck|expect-error)\b([^\n]*)/g, kind: "typescript-suppression" },
    { regex: /eslint-disable(?:-next-line|-line)?\b([^\n]*)/g, kind: "eslint-suppression" },
  ];
  for (const { regex, kind } of patterns) {
    for (const [lineIndex, line] of lines.entries()) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const directive = match[0];
        if (kind === "eslint-suppression" && ![...SUPPRESSION_RULES].some((ruleId) => directive.includes(ruleId))) continue;
        const reasonText = kind === "typescript-suppression" ? match[2] : match[1];
        const reason = suppressionReason(reasonText ?? "");
        const lineNumber = lineIndex + 1;
        const column = match.index + 1;
        const item = {
          family: suppressionFamily(kind, directive),
          category: "suppression",
          ruleId: kind === "typescript-suppression" ? `typescript/${directive.match(/@ts-([\w-]+)/)?.[1] ?? "unknown"}` : "eslint/suppression",
          file: file.path,
          line: lineNumber,
          column,
          message: reason ? `Suppression documentée: ${directive}` : `Suppression sans justification locale: ${directive}`,
          severity: reason ? "informational" : "warning",
          status: findingStatus(file),
          provenance: "textual-suppression-inventory",
          effectiveCoverage: "TEXTUAL_SUPPRESSION_INVENTORY",
          functionIdentity: functionForLine(listFunctionMetadata(file.path, file.source), lineNumber)?.functionIdentity ?? null,
          documentedException: Boolean(reason),
        };
        if (reason) exceptions.push({ ...item, reason });
        else findings.push(item);
      }
    }
  }
  return { findings, exceptions };
}

function ruleConfiguration(project) {
  return Object.fromEntries(project.ruleIds.map((ruleId) => [ruleId, RULES[ruleId].options]));
}

function compatibilityFor(project) {
  const typescript = resolveTypescriptVersion(project.workspaceRoot);
  const supported = Boolean(typescript.version && TYPESCRIPT_PEER_RANGE && semver.satisfies(typescript.version, TYPESCRIPT_PEER_RANGE, { includePrerelease: true }));
  return {
    workspace: project.workspace,
    tsconfig: normalizePath(path.relative(process.cwd(), project.tsconfigPath)),
    typescriptVersion: typescript.version,
    typescriptPackage: typescript.packagePath ? normalizePath(path.relative(process.cwd(), typescript.packagePath)) : null,
    typescriptEslintVersion: TYPESCRIPT_ESLINT_VERSION,
    peerRange: TYPESCRIPT_PEER_RANGE,
    supported,
    reason: supported ? "peer range compatible" : typescript.version ? `TypeScript ${typescript.version} hors de ${TYPESCRIPT_PEER_RANGE}` : typescript.error,
  };
}

function buildFinding(file, message, functions) {
  const functionMetadata = functionForLine(functions, message.line ?? 1);
  const rule = RULES[message.ruleId];
  return {
    family: rule?.family ?? (message.ruleId?.includes("promise") ? "ASYNC_SAFETY" : "TYPE_SAFETY"),
    category: message.ruleId?.includes("promise") ? "promise-misuse" : "unsafe-type-operation",
    ruleId: message.ruleId,
    file: file.path,
    functionIdentity: functionMetadata?.functionIdentity ?? null,
    function: functionMetadata?.name ?? null,
    line: message.line ?? null,
    column: message.column ?? null,
    endLine: message.endLine ?? null,
    endColumn: message.endColumn ?? null,
    functionStartLine: functionMetadata?.functionStartLine ?? null,
    functionEndLine: functionMetadata?.functionEndLine ?? null,
    message: message.message,
    severity: message.severity === 2 ? "error" : "warning",
    status: findingStatus(file),
    provenance: "typescript-eslint-typed-lint",
    effectiveCoverage: "TYPED",
  };
}

function parseSourceAst(file) {
  try {
    return tseslint.parser.parseForESLint(file.source, {
      filePath: file.absolutePath ?? file.path,
      loc: true,
      range: true,
      comment: true,
      jsx: /\.tsx$/i.test(file.path),
    }).ast;
  } catch {
    return null;
  }
}

function positionBeforeOrEqual(left, right) {
  return left.line < right.line || (left.line === right.line && left.column <= right.column);
}

function diagnosticPosition(message, end = false) {
  const line = end ? (message.endLine ?? message.line) : message.line;
  const column = end ? (message.endColumn ?? message.column) : message.column;
  return { line: line ?? 1, column: Math.max(0, (column ?? 1) - 1) };
}

function expressionStatementForDiagnostic(ast, message) {
  if (!ast) return null;
  const start = diagnosticPosition(message);
  const end = diagnosticPosition(message, true);
  let matchingStatement = null;
  const visit = (node) => {
    if (!node || typeof node !== "object" || matchingStatement) return;
    if (node.type === "ExpressionStatement"
      && node.loc?.start
      && node.loc?.end
      && positionBeforeOrEqual(node.loc.start, start)
      && positionBeforeOrEqual(end, node.loc.end)) {
      matchingStatement = node;
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "parent") continue;
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
      } else {
        visit(value);
      }
    }
  };
  visit(ast);
  return matchingStatement;
}

function hasExplicitVoidExpression(ast, message) {
  const statement = expressionStatementForDiagnostic(ast, message);
  return statement?.expression?.type === "UnaryExpression"
    && statement.expression.operator === "void";
}

function documentedFireAndForget(file, message, ast) {
  const line = message.line ?? 1;
  const lines = file.source.split(/\r?\n/);
  const local = [lines[(line ?? 1) - 1] ?? "", lines[(line ?? 1) - 2] ?? ""].join(" ");
  return /fire[- ]and[- ]forget\s*(?:--|:)/i.test(local) && hasExplicitVoidExpression(ast, message);
}

export async function analyzeTypeSafetySources({ root = process.cwd(), files, projects = projectDefinitions(root), eslintFactory = (options) => new ESLint(options) } = {}) {
  const startedAt = performance.now();
  const measuredFiles = files ?? sourceFileEntries(root, SOURCE_ROOTS);
  const findings = [];
  const diagnostics = [];
  const exceptions = [];
  const coverage = [];
  const filesByWorkspace = new Map();
  for (const file of measuredFiles) {
    const values = filesByWorkspace.get(file.workspace) ?? [];
    values.push(file);
    filesByWorkspace.set(file.workspace, values);
    const suppressions = suppressionFindings(file);
    findings.push(...suppressions.findings);
    exceptions.push(...suppressions.exceptions);
  }

  for (const project of projects) {
    const workspaceFiles = filesByWorkspace.get(project.workspace) ?? [];
    if (workspaceFiles.length === 0) continue;
    const compatibility = compatibilityFor(project);
    const entry = {
      ...compatibility,
      filesInScope: workspaceFiles.length,
      scopedFilePaths: workspaceFiles.map((file) => file.path).sort(),
      filesMeasured: 0,
      measuredFilePaths: [],
      filesFailed: 0,
      failedFilePaths: [],
      filesIgnored: 0,
      ignoredFilePaths: [],
      notMeasuredFileReasons: {},
      effectiveCoverage: compatibility.supported ? "TYPED" : "UNSUPPORTED_CONFIGURATION",
    };
    coverage.push(entry);
    if (!compatibility.supported) {
      diagnostics.push({
        code: "UNSUPPORTED_TYPESCRIPT_VERSION",
        file: compatibility.tsconfig,
        line: null,
        column: null,
        message: `${project.workspace}: TypeScript ${compatibility.typescriptVersion ?? "absent"} n'est pas compatible avec typescript-eslint ${TYPESCRIPT_ESLINT_VERSION} (${TYPESCRIPT_PEER_RANGE}).`,
        severity: "error",
        provenance: "package-peer-contract",
      });
      continue;
    }
    const eslint = eslintFactory({
      cwd: project.eslintCwd ?? root,
      overrideConfigFile: true,
      overrideConfig: [
        ...(project.ignorePatterns?.length ? [{ ignores: project.ignorePatterns }] : []),
        {
          files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
          languageOptions: {
            parser: tseslint.parser,
            parserOptions: { project: [project.tsconfigPath], tsconfigRootDir: project.workspaceRoot },
          },
          plugins: { "@typescript-eslint": tseslint.plugin },
          rules: ruleConfiguration(project),
        },
      ],
    });
    for (const file of workspaceFiles) {
      const results = await eslint.lintText(file.source, { filePath: file.absolutePath ?? path.join(root, file.path) });
      const ignored = results.some((result) => result.ignored);
      const notAnalyzed = results.length === 0;
      const fatalMessages = results.flatMap((result) => result.messages ?? []).filter((message) => message.fatal);
      if (ignored || notAnalyzed) {
        const reason = ignored ? "ESLINT_IGNORED" : "ESLINT_NOT_ANALYZED";
        entry.filesIgnored += 1;
        entry.ignoredFilePaths.push(file.path);
        entry.notMeasuredFileReasons[file.path] = reason;
        diagnostics.push({ code: reason, file: file.path, line: null, column: null, message: `Le fichier ${file.path} n'a pas été analysé par ESLint.`, severity: "warning", provenance: "eslint" });
      } else if (fatalMessages.length > 0) {
        entry.filesFailed += 1;
        entry.failedFilePaths.push(file.path);
        entry.notMeasuredFileReasons[file.path] = "PARSER_FAILED";
        for (const message of fatalMessages) {
          diagnostics.push({ code: "PARSER_FAILED", file: file.path, line: message.line ?? null, column: message.column ?? null, message: message.message, severity: "error", provenance: "typescript-eslint-parser" });
        }
      } else {
        entry.filesMeasured += 1;
        entry.measuredFilePaths.push(file.path);
      }
      const functions = listFunctionMetadata(file.path, file.source);
      const ast = parseSourceAst(file);
      for (const result of results) {
        for (const message of result.messages ?? []) {
          if (!message.fatal && RULES[message.ruleId]) {
            const finding = buildFinding(file, message, functions);
            if (message.ruleId === "@typescript-eslint/no-floating-promises" && documentedFireAndForget(file, message, ast)) {
              exceptions.push({ ...finding, category: "documented-fire-and-forget", message: `Exception documentée: ${message.message}`, documentedException: true });
            } else {
              findings.push(finding);
            }
          }
        }
      }
    }
  }

  findings.sort((left, right) => `${left.file}:${left.line ?? 0}:${left.column ?? 0}:${left.ruleId}`.localeCompare(`${right.file}:${right.line ?? 0}:${right.column ?? 0}:${right.ruleId}`));
  const findingsByRule = Object.fromEntries([...new Set(findings.map((finding) => finding.ruleId))].sort().map((ruleId) => [ruleId, findings.filter((finding) => finding.ruleId === ruleId).length]));
  const byFamily = Object.fromEntries(["TYPE_SAFETY", "ASYNC_SAFETY"].map((family) => [family, findings.filter((finding) => finding.family === family).length]));
  const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;
  return {
    schemaVersion: 1,
    kind: "quality-type-safety",
    status: diagnostics.length > 0 ? "FAIL" : "PASS",
    blocking: false,
    measurementStatus: diagnostics.length > 0 ? "MEASUREMENT_FAILED" : "MEASURED_NOT_RATCHETED",
    readProvenance: "WORKTREE_LIVE",
    engine: { name: "typescript-eslint", version: TYPESCRIPT_ESLINT_VERSION, eslint: ESLINT_VERSION, node: process.version, typescriptPeerRange: TYPESCRIPT_PEER_RANGE },
    sourceRoots: SOURCE_ROOTS,
    coverage,
    rules: Object.fromEntries(Object.entries(RULES).map(([ruleId, configuration]) => [ruleId, {
      family: configuration.family,
      severity: configuration.severity,
      enforcement: ruleId === "@typescript-eslint/no-explicit-any" ? "selected only where not already emitted by workspace ESLint" : "informational measurement; no historical baseline or blocking ratchet",
      coverage: configuration.coverage,
    }])),
    excludedRules: {
      "@typescript-eslint/no-explicit-any": "not duplicated on Web because apps/web/eslint.config.mjs already emits the same warning; selected on Mobile because its scoped config disables it",
    },
    findings,
    exceptions,
    diagnostics,
    summary: {
      filesInScope: measuredFiles.length,
      filesMeasured: coverage.reduce((sum, entry) => sum + entry.filesMeasured, 0),
      filesWithTypedCoverage: coverage.filter((entry) => entry.effectiveCoverage === "TYPED").reduce((sum, entry) => sum + entry.filesMeasured, 0),
      filesFailed: coverage.reduce((sum, entry) => sum + entry.filesFailed, 0),
      filesIgnored: coverage.reduce((sum, entry) => sum + entry.filesIgnored, 0),
      measuredFilePaths: coverage.flatMap((entry) => entry.measuredFilePaths ?? []).sort(),
      findings: findings.length,
      findingsByFamily: byFamily,
      findingsByRule,
      historicalFindings: findings.filter((finding) => finding.status === "HISTORICAL").length,
      newCandidateFindings: findings.filter((finding) => finding.status === "NEW_CANDIDATE_UNVERIFIED").length,
      documentedExceptions: exceptions.length,
      elapsedMs,
      filesPerSecond: elapsedMs === 0 ? null : Math.round((measuredFiles.length / (elapsedMs / 1000)) * 100) / 100,
    },
    policy: {
      typeSafety: "TYPE_SAFETY: unsafe assignments, member accesses, calls, returns and scoped any inventory; no-explicit-any is delegated on Web and selected on Mobile.",
      asyncSafety: "ASYNC_SAFETY: floating and misused promises; explicit void is accepted only as a documented fire-and-forget escape hatch.",
      historicalDebt: "Current findings are measured before any ratchet; clean committed files are HISTORICAL, dirty/untracked files are NEW_CANDIDATE_UNVERIFIED, and no permissive baseline is created.",
      exceptions: "A suppression is not accepted as an exception without a local -- or : justification; documented exceptions remain visible in the report.",
      contracts: "This audit is observational and does not alter runtime, public types, auth, authorization or data contracts.",
    },
  };
}

export async function runTypeSafetyAudit({ root = process.cwd() } = {}) {
  return analyzeTypeSafetySources({ root, files: sourceFileEntries(root, SOURCE_ROOTS) });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const report = await runTypeSafetyAudit();
  console.log(`Type safety audit: ${report.summary.filesMeasured}/${report.summary.filesInScope} files typed, ${report.findings.length} findings, ${report.summary.elapsedMs} ms.`);
  if (report.status === "FAIL") process.exitCode = 1;
}
