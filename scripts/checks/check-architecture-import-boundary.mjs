#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildArchitectureImportGraph } from "../reports/generate-architecture-import-graph.mjs";
import { parseRepositoryRef } from "./repository-view.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const baselinePath = path.join(repositoryRoot, "scripts/checks/architecture-import-boundary-baseline.json");
export const AUTHORIZED_BOUNDARY_RULES = Object.freeze([
  "UI_TO_INFRASTRUCTURE",
  "DOMAIN_TO_UI",
  "OWN_PUBLIC_FACADE",
]);

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value), null, 2) + "\n";
}

export function violationSignature(rule, edge) {
  return [rule, edge.from, edge.to, edge.kind, edge.sourceKind].join("|");
}

export function violationId(rule, edge) {
  return crypto.createHash("sha256").update(violationSignature(rule, edge)).digest("hex").slice(0, 24);
}

export function collectBoundaryViolations(graph) {
  const violations = [];
  for (const edge of graph.edges) {
    const rules = [];
    if (edge.uiToInfrastructure && edge.sourceKind === "runtime") rules.push("UI_TO_INFRASTRUCTURE");
    if (edge.domainToUi && edge.sourceKind === "runtime") rules.push("DOMAIN_TO_UI");
    if (edge.importsOwnFacade && edge.sourceKind === "runtime") rules.push("OWN_PUBLIC_FACADE");
    for (const rule of rules) {
      violations.push({
        id: violationId(rule, edge),
        signature: violationSignature(rule, edge),
        rule,
        from: edge.from,
        to: edge.to,
        kind: edge.kind,
        sourceKind: edge.sourceKind,
        form: edge.form,
        specifier: edge.specifier,
        line: edge.line,
      });
    }
  }
  return violations.sort((left, right) => left.signature.localeCompare(right.signature));
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function registryIssue(collection, index, exception, code, message) {
  return {
    collection,
    index,
    id: exception?.id ?? null,
    signature: exception?.signature ?? null,
    code,
    message,
  };
}

function validateRegistryEntry(collection, index, exception, authorizedRules) {
  const issues = [];
  if (!isRecord(exception)) {
    return [registryIssue(collection, index, exception, "ENTRY_NOT_OBJECT", "entry must be an object")];
  }
  const { rule, from, to, kind, sourceKind } = exception;
  if (!authorizedRules.includes(rule)) {
    issues.push(registryIssue(collection, index, exception, "UNAUTHORIZED_RULE", `rule ${String(rule)} is not in the authorized contract`));
  }
  if (!from || !to || !["runtime", "type-only"].includes(kind) || !["runtime", "test"].includes(sourceKind)) {
    issues.push(registryIssue(collection, index, exception, "INCOMPLETE_EDGE", "from, to, kind and sourceKind must describe a supported import edge"));
  }
  if (typeof exception.signature !== "string" || typeof exception.id !== "string") {
    issues.push(registryIssue(collection, index, exception, "MISSING_IDENTITY", "signature and id are required"));
    return issues;
  }
  if (!/^[0-9a-f]{24}$/.test(exception.id)) {
    issues.push(registryIssue(collection, index, exception, "ID_FORMAT", "id must be a 24-character lowercase SHA-256 prefix"));
  }
  if (from && to && kind && sourceKind) {
    const expectedSignature = violationSignature(rule, { from, to, kind, sourceKind });
    if (exception.signature !== expectedSignature) {
      issues.push(registryIssue(collection, index, exception, "SIGNATURE_MISMATCH", `signature must be ${expectedSignature}`));
    }
    const expectedId = violationId(rule, { from, to, kind, sourceKind });
    if (exception.id !== expectedId) {
      issues.push(registryIssue(collection, index, exception, "ID_MISMATCH", `id must be the SHA-256 identity ${expectedId}`));
    }
  }
  if (!exception.reason || typeof exception.reason !== "string") {
    issues.push(registryIssue(collection, index, exception, "MISSING_REASON", "reason is required"));
  }
  if (!exception.reviewedRef || typeof exception.reviewedRef !== "string") {
    issues.push(registryIssue(collection, index, exception, "MISSING_REVIEW_REF", "reviewedRef is required"));
  }
  return issues;
}

export function validateExceptionRegistry(baseline) {
  const issues = [];
  if (!isRecord(baseline)) return [registryIssue("baseline", -1, baseline, "BASELINE_NOT_OBJECT", "baseline must be an object")];
  if (baseline.schemaVersion !== 1) issues.push(registryIssue("baseline", -1, baseline, "SCHEMA_VERSION", "schemaVersion must be 1"));
  if (!Array.isArray(baseline.rules)) issues.push(registryIssue("rules", -1, baseline, "RULES_NOT_ARRAY", "rules must be an array"));
  if (!Array.isArray(baseline.exceptions)) issues.push(registryIssue("exceptions", -1, baseline, "EXCEPTIONS_NOT_ARRAY", "exceptions must be an array"));
  if (!Array.isArray(baseline.retired)) issues.push(registryIssue("retired", -1, baseline, "RETIRED_NOT_ARRAY", "retired must be an array"));

  const authorizedRules = Array.isArray(baseline.rules) ? baseline.rules : [];
  const seenRules = new Set();
  for (const [index, rule] of authorizedRules.entries()) {
    if (!AUTHORIZED_BOUNDARY_RULES.includes(rule)) issues.push(registryIssue("rules", index, { id: null, signature: null }, "UNAUTHORIZED_RULE", `rule ${String(rule)} is not in the authorized contract`));
    if (seenRules.has(rule)) issues.push(registryIssue("rules", index, { id: null, signature: null }, "DUPLICATE_RULE", `rule ${String(rule)} is duplicated`));
    seenRules.add(rule);
  }

  const allEntries = [];
  for (const collection of ["exceptions", "retired"]) {
    for (const [index, exception] of (Array.isArray(baseline[collection]) ? baseline[collection] : []).entries()) {
      issues.push(...validateRegistryEntry(collection, index, exception, authorizedRules));
      allEntries.push({ collection, index, exception });
    }
  }
  const seenSignatures = new Map();
  const seenIds = new Map();
  for (const { collection, index, exception } of allEntries) {
    if (!isRecord(exception)) continue;
    for (const [field, seen] of [["signature", seenSignatures], ["id", seenIds]]) {
      const value = exception[field];
      if (!value) continue;
      const previous = seen.get(value);
      if (previous) {
        issues.push(registryIssue(collection, index, exception, `DUPLICATE_${field.toUpperCase()}`, `${field} duplicates ${previous.collection}[${previous.index}]`));
      } else {
        seen.set(value, { collection, index });
      }
    }
  }
  const exceptionSignatures = new Set((baseline.exceptions ?? []).filter(isRecord).map((entry) => entry.signature).filter(Boolean));
  for (const [index, retired] of (baseline.retired ?? []).entries()) {
    if (isRecord(retired) && exceptionSignatures.has(retired.signature)) {
      issues.push(registryIssue("retired", index, retired, "CONTRADICTORY_STATE", "the same signature cannot be both active and retired"));
    }
  }
  return issues.sort((left, right) => [left.collection, left.index, left.code, left.message].join("\0").localeCompare([right.collection, right.index, right.code, right.message].join("\0")));
}

function loadBaseline() {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  if (baseline.schemaVersion !== 1 || !Array.isArray(baseline.exceptions) || !Array.isArray(baseline.retired)) {
    throw new Error("architecture import boundary baseline malformed");
  }
  return baseline;
}

export function evaluateBoundary(graph, baseline) {
  const registryValidation = validateExceptionRegistry(baseline);
  const exceptionEntries = Array.isArray(baseline?.exceptions) ? baseline.exceptions : [];
  const retiredEntries = Array.isArray(baseline?.retired) ? baseline.retired : [];
  const current = collectBoundaryViolations(graph);
  const currentBySignature = new Map(current.map((violation) => [violation.signature, violation]));
  const exceptions = new Map(exceptionEntries.filter(isRecord).map((exception) => [exception.signature, exception]));
  const retired = new Set(retiredEntries.filter(isRecord).map((exception) => exception.signature));
  const newViolations = current.filter((violation) => !exceptions.has(violation.signature) && !retired.has(violation.signature));
  const reintroduced = current.filter((violation) => retired.has(violation.signature));
  const staleExceptions = exceptionEntries.filter((exception) => isRecord(exception) && !currentBySignature.has(exception.signature));
  const invalidExceptions = registryValidation;
  const status = newViolations.length || reintroduced.length || staleExceptions.length || invalidExceptions.length ? "FAIL" : "PASS";
  return {
    schemaVersion: 1,
    report: "architecture-import-boundary",
    gitSha: graph.gitSha,
    source: graph.source,
    provenance: graph.provenance,
    status,
    currentViolations: current,
    historicalExceptions: exceptionEntries,
    newViolations,
    reintroduced,
    staleExceptions,
    invalidExceptions,
    retiredExceptions: retiredEntries,
    registryValidation,
    summary: {
      currentViolations: current.length,
      historicalExceptions: exceptionEntries.length,
      newViolations: newViolations.length,
      reintroduced: reintroduced.length,
      staleExceptions: staleExceptions.length,
      invalidExceptions: invalidExceptions.length,
    },
  };
}

function parseArgs(args) {
  const options = { output: null, ref: parseRepositoryRef(args) };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--output") options.output = args[++index];
    else if (args[index] === "--ref") options.ref = args[++index];
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  try {
    const graph = buildArchitectureImportGraph({ source: options.ref ? "git-ref" : "worktree", ref: options.ref });
    const result = evaluateBoundary(graph, loadBaseline());
    if (options.output) {
      fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
      fs.writeFileSync(options.output, stableJson(result));
    }
    console.log(`ARCHITECTURE_IMPORT_BOUNDARY_STATUS: ${result.status}`);
    console.log(`Architecture import boundary: ${result.summary.currentViolations} current, ${result.summary.newViolations} new, ${result.summary.reintroduced} reintroduced, ${result.summary.staleExceptions} stale exception(s).`);
    if (result.status !== "PASS") {
      for (const violation of result.newViolations) console.error(`NEW_BOUNDARY_VIOLATION: ${violation.rule} ${violation.from} -> ${violation.to}`);
      for (const violation of result.reintroduced) console.error(`REINTRODUCED_BOUNDARY_VIOLATION: ${violation.rule} ${violation.from} -> ${violation.to}`);
      for (const exception of result.staleExceptions) console.error(`STALE_BOUNDARY_EXCEPTION: ${exception.signature}`);
      for (const exception of result.invalidExceptions) console.error(`INVALID_BOUNDARY_EXCEPTION: ${exception.collection}[${exception.index}] ${exception.code} ${exception.message}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`ARCHITECTURE_IMPORT_BOUNDARY_STATUS: MALFORMED_REPORT`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
