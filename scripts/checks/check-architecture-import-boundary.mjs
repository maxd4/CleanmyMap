#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildArchitectureImportGraph } from "../reports/generate-architecture-import-graph.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const baselinePath = path.join(repositoryRoot, "scripts/checks/architecture-import-boundary-baseline.json");

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

function loadBaseline() {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  if (baseline.schemaVersion !== 1 || !Array.isArray(baseline.exceptions) || !Array.isArray(baseline.retired)) {
    throw new Error("architecture import boundary baseline malformed");
  }
  return baseline;
}

export function evaluateBoundary(graph, baseline) {
  const current = collectBoundaryViolations(graph);
  const currentBySignature = new Map(current.map((violation) => [violation.signature, violation]));
  const exceptions = new Map(baseline.exceptions.map((exception) => [exception.signature, exception]));
  const retired = new Set(baseline.retired.map((exception) => exception.signature));
  const newViolations = current.filter((violation) => !exceptions.has(violation.signature) && !retired.has(violation.signature));
  const reintroduced = current.filter((violation) => retired.has(violation.signature));
  const staleExceptions = baseline.exceptions.filter((exception) => !currentBySignature.has(exception.signature));
  const invalidExceptions = baseline.exceptions.filter((exception) => !exception.reviewedRef || !exception.reason || !exception.id || !exception.signature);
  const status = newViolations.length || reintroduced.length || staleExceptions.length || invalidExceptions.length ? "FAIL" : "PASS";
  return {
    schemaVersion: 1,
    report: "architecture-import-boundary",
    gitSha: graph.gitSha,
    source: graph.source,
    status,
    currentViolations: current,
    historicalExceptions: baseline.exceptions,
    newViolations,
    reintroduced,
    staleExceptions,
    invalidExceptions,
    retiredExceptions: baseline.retired,
    summary: {
      currentViolations: current.length,
      historicalExceptions: baseline.exceptions.length,
      newViolations: newViolations.length,
      reintroduced: reintroduced.length,
      staleExceptions: staleExceptions.length,
      invalidExceptions: invalidExceptions.length,
    },
  };
}

function parseArgs(args) {
  const options = { output: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--output") options.output = args[++index];
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  try {
    const graph = buildArchitectureImportGraph({ source: "worktree" });
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
      for (const exception of result.invalidExceptions) console.error(`INVALID_BOUNDARY_EXCEPTION: ${exception.signature ?? "unknown"}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`ARCHITECTURE_IMPORT_BOUNDARY_STATUS: MALFORMED_REPORT`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) main();
