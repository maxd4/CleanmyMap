import assert from "node:assert/strict";
import test from "node:test";

import { buildQualityAuditHistoryComparison } from "./quality-index-history-comparison.mjs";

const currentSha = "a".repeat(40);
const previousSha = "b".repeat(40);
const file = "scripts/reports/fixture.mjs";
const engine = { name: "eslint-plugin-sonarjs", version: "3.0.0", eslint: "9.0.0", node: "v24.0.0" };
const rules = { "sonarjs/cognitive-complexity": { thresholdTarget: 15, enforcement: "informational" } };
const policy = { controlFlowStructure: "descriptive" };

function run({ sha, runId, functions = [], measurementStatus = "MEASURED_NOT_RATCHETED", provenance = "COMMITTED_SNAPSHOT", schemaVersion = 1, engineOverride = engine, rulesOverride = rules, policyOverride = policy, sourceRoots = ["scripts"] } = {}) {
  const metrics = [];
  const cognitive = [];
  const profiles = [];
  const findings = [];
  for (const entry of functions) {
    const identity = entry.identity;
    const location = { functionStartLine: entry.startLine ?? 2, functionEndLine: entry.endLine ?? 8, line: entry.startLine ?? 2 };
    metrics.push({ metric: "complexity", path: file, functionIdentity: identity, value: entry.complexity, ...location });
    metrics.push({ metric: "functionLength", path: file, functionIdentity: identity, value: entry.length, ...location });
    cognitive.push({ metric: "cognitiveComplexity", path: file, functionIdentity: identity, function: entry.name, value: entry.cognitive, ...location });
    if (entry.controlFlow !== false) profiles.push({
      status: "PRESENT",
      path: file,
      functionIdentity: identity,
      functionStartLine: entry.startLine ?? 2,
      functionEndLine: entry.endLine ?? 8,
      decisionPoints: entry.decisionPoints ?? 2,
      maxDecisionNestingDepth: entry.maxDepth ?? 1,
      nestedDecisionCount: entry.nestedCount ?? 0,
      busiestSubtree: { decisionPoints: entry.busiest ?? 2 },
      decisionSubtrees: [{ index: 0, kind: "IfStatement", decisionPoints: entry.busiest ?? 2 }],
    });
    for (const ruleId of entry.findings ?? []) findings.push({ file, functionIdentity: identity, ruleId });
  }
  const maintainability = {
    schemaVersion,
    kind: "quality-maintainability",
    status: "PASS",
    measurementStatus,
    readProvenance: provenance,
    engine: engineOverride,
    sourceRoots,
    rules: rulesOverride,
    policy: policyOverride,
    metrics: cognitive,
    findings,
    controlFlowProfiles: profiles,
    maintainabilityStatuses: [{ path: file, status: measurementStatus === "MEASURED_NOT_RATCHETED" ? "PRESENT" : "NOT_MEASURED", reason: measurementStatus === "MEASURED_NOT_RATCHETED" ? null : "PARSER_FAILED" }],
  };
  return {
    auditedSha: sha,
    runId,
    reports: {
      complexity: { metrics },
      maintainability,
    },
    manifests: { maintainability: { readProvenance: provenance, status: "PASS" } },
  };
}

test("compare exactement les fonctions et expose augmentations, diminutions, signaux locaux et structure", () => {
  const previous = run({ sha: previousSha, runId: "old", functions: [{ identity: "named:prepare#1", name: "prepare", complexity: 4, cognitive: 3, length: 8, decisionPoints: 2, findings: ["sonarjs/no-collapsible-if"] }] });
  const current = run({ sha: currentSha, runId: "new", functions: [{ identity: "named:prepare#1", name: "prepare", complexity: 7, cognitive: 1, length: 10, decisionPoints: 4, busiest: 4, maxDepth: 2, nestedCount: 1, findings: ["sonarjs/no-redundant-boolean"] }] });

  const comparison = buildQualityAuditHistoryComparison({ currentRun: current, previousRun: previous, requested: true });
  assert.equal(comparison.state, "PRESENT");
  assert.equal(comparison.comparability, "FULL");
  assert.equal(comparison.summary.functionsChanged, 1);
  const entry = comparison.functions[0];
  assert.deepEqual(entry.metrics.complexity, { state: "PRESENT", previous: 4, current: 7, delta: 3, direction: "INCREASE", metric: "complexity" });
  assert.equal(entry.metrics.cognitiveComplexity.direction, "DECREASE");
  assert.equal(entry.metrics.functionLength.direction, "INCREASE");
  assert.deepEqual(entry.localMaintainability.added, ["sonarjs/no-redundant-boolean"]);
  assert.deepEqual(entry.localMaintainability.removed, ["sonarjs/no-collapsible-if"]);
  assert.equal(entry.controlFlow.metrics.maxDecisionNestingDepth.direction, "INCREASE");
  assert.equal(entry.controlFlow.subtreeDistribution.direction, "CHANGED");
});

test("conserve une fonction inchangée et ne rapproche pas une fonction renommée", () => {
  const previous = run({ sha: previousSha, runId: "old", functions: [
    { identity: "named:same#1", name: "same", complexity: 2, cognitive: 1, length: 4 },
    { identity: "named:oldName#1", name: "oldName", complexity: 3, cognitive: 2, length: 5 },
  ] });
  const current = run({ sha: currentSha, runId: "new", functions: [
    { identity: "named:same#1", name: "same", complexity: 2, cognitive: 1, length: 4 },
    { identity: "named:newName#1", name: "newName", complexity: 3, cognitive: 2, length: 5 },
  ] });

  const comparison = buildQualityAuditHistoryComparison({ currentRun: current, previousRun: previous, requested: true });
  assert.equal(comparison.summary.functionsUnchanged, 1);
  assert.equal(comparison.summary.functionsChanged, 0);
  assert.equal(comparison.summary.functionsNotComparable, 2);
  assert.ok(comparison.unmatchedFunctions.every((entry) => entry.reason === "FUNCTION_IDENTITY_NOT_FOUND"));
});

test("reste NOT_MEASURED lorsque l'ancien run manque ou n'est pas mesurable", () => {
  const current = run({ sha: currentSha, runId: "new", functions: [] });
  const unavailable = buildQualityAuditHistoryComparison({ currentRun: current, previousRunError: new Error("artefact absent"), requested: true });
  assert.equal(unavailable.state, "NOT_MEASURED");
  assert.equal(unavailable.reason, "PREVIOUS_RUN_UNAVAILABLE");
  assert.deepEqual(unavailable.diagnostics, ["artefact absent"]);

  const stale = buildQualityAuditHistoryComparison({ currentRun: current, previousRun: run({ sha: previousSha, runId: "old", measurementStatus: "STALE_EVIDENCE" }), requested: true });
  assert.equal(stale.state, "NOT_MEASURED");
  assert.equal(stale.reason, "PREVIOUS_STALE_EVIDENCE");
});

test("refuse le même SHA, les schémas incompatibles et WORKTREE_LIVE comme preuve immuable", () => {
  const current = run({ sha: currentSha, runId: "new", functions: [{ identity: "named:one#1", name: "one", complexity: 1, cognitive: 1, length: 2 }] });
  assert.equal(buildQualityAuditHistoryComparison({ currentRun: current, previousRun: run({ sha: currentSha, runId: "old", functions: [{ identity: "named:one#1", name: "one", complexity: 1, cognitive: 1, length: 2 }] }), requested: true }).reason, "SAME_SHA");
  assert.equal(buildQualityAuditHistoryComparison({ currentRun: current, previousRun: run({ sha: previousSha, runId: "old", schemaVersion: 2, functions: [{ identity: "named:one#1", name: "one", complexity: 1, cognitive: 1, length: 2 }] }), requested: true }).reason, "SCHEMA_NOT_COMPARABLE");
  assert.equal(buildQualityAuditHistoryComparison({ currentRun: current, previousRun: run({ sha: previousSha, runId: "old", provenance: "WORKTREE_LIVE", functions: [{ identity: "named:one#1", name: "one", complexity: 1, cognitive: 1, length: 2 }] }), requested: true }).reason, "WORKTREE_LIVE_NOT_IMMUTABLE_PROOF");
});

test("canonicalise les clés Unicode indépendamment de leur ordre d'insertion", () => {
  const firstEngine = Object.fromEntries([["é", "same"], ["e\u0301", "same"]]);
  const secondEngine = Object.fromEntries([["e\u0301", "same"], ["é", "same"]]);
  const functions = [{ identity: "named:stable#1", name: "stable", complexity: 1, cognitive: 1, length: 2 }];
  const current = run({ sha: currentSha, runId: "new", engineOverride: firstEngine, functions });
  const previous = run({ sha: previousSha, runId: "old", engineOverride: secondEngine, functions });

  const comparison = buildQualityAuditHistoryComparison({ currentRun: current, previousRun: previous, requested: true });
  assert.equal(comparison.comparability, "FULL");
});

test("conserve les incompatibilités réelles de version et de politique", () => {
  const baseline = run({ sha: previousSha, runId: "old" });
  const engineChanged = run({ sha: currentSha, runId: "new", engineOverride: { ...engine, version: "3.1.0" } });
  const policyChanged = run({ sha: currentSha, runId: "new", policyOverride: { ...policy, controlFlowStructure: "changed" } });

  assert.equal(buildQualityAuditHistoryComparison({ currentRun: engineChanged, previousRun: baseline, requested: true }).reason, "ENGINE_VERSION_NOT_COMPARABLE");
  assert.equal(buildQualityAuditHistoryComparison({ currentRun: policyChanged, previousRun: baseline, requested: true }).reason, "POLICY_DEFINITIONS_NOT_COMPARABLE");
});

test("reste déterministe et conserve NOT_MEASURED pour une mesure partielle", () => {
  const previous = run({ sha: previousSha, runId: "old", functions: [{ identity: "named:one#1", name: "one", complexity: 1, cognitive: 1, length: 2, controlFlow: false }] });
  const current = run({ sha: currentSha, runId: "new", functions: [{ identity: "named:one#1", name: "one", complexity: 1, cognitive: 1, length: 2 }] });
  const first = buildQualityAuditHistoryComparison({ currentRun: current, previousRun: previous, requested: true });
  const second = buildQualityAuditHistoryComparison({ currentRun: current, previousRun: previous, requested: true });
  assert.equal(first.comparability, "PARTIAL");
  assert.equal(first.functions[0].controlFlow.state, "NOT_MEASURED");
  assert.deepEqual(first, second);
  assert.equal(buildQualityAuditHistoryComparison({ currentRun: current, requested: false }).reason, "HISTORICAL_RUN_NOT_REQUESTED");
});
