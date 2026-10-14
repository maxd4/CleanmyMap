import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { buildArchitectureImportGraph } from "../reports/generate-architecture-import-graph.mjs";
import { collectBoundaryViolations, evaluateBoundary } from "./check-architecture-import-boundary.mjs";

const fixtureRoot = path.join(import.meta.dirname, "fixtures/architecture-import-boundary");
const fixtureSurface = {
  id: "web",
  root: path.join(fixtureRoot, "web/src"),
  aliases: [["@/", path.join(fixtureRoot, "web/src")]],
};

function fixtureGraph() {
  return buildArchitectureImportGraph({
    root: fixtureRoot,
    source: "fixture",
    gitSha: "fixture-sha",
    surfaces: [fixtureSurface],
  });
}

function edge(graph, from, to) {
  return graph.edges.find((candidate) => candidate.from.endsWith(from) && candidate.to.endsWith(to));
}

test("architecture graph resolves relative, alias, facade, test and type-only imports", () => {
  const graph = fixtureGraph();
  const allowed = edge(graph, "components/allowed.ts", "lib/actions/workflow.ts");
  const inverted = edge(graph, "components/inverted.ts", "lib/supabase/adapter.ts");
  const aliased = edge(graph, "components/alias.ts", "lib/domain/contracts.ts");
  const testTypeOnly = edge(graph, "components/fixture.test.ts", "lib/domain/contracts.ts");
  const ownFacade = edge(graph, "lib/domain/facade-internal.ts", "lib/domain/index.ts");

  assert.equal(allowed?.kind, "runtime");
  assert.equal(allowed?.uiToInfrastructure, false);
  assert.equal(inverted?.uiToInfrastructure, true);
  assert.equal(aliased?.specifier, "@/lib/domain/contracts");
  assert.equal(testTypeOnly?.sourceKind, "test");
  assert.equal(testTypeOnly?.kind, "type-only");
  assert.equal(ownFacade?.targetsPublicFacade, true);
  assert.equal(ownFacade?.importsOwnFacade, true);
});

test("architecture graph reports a runtime A -> B -> A cycle", () => {
  const graph = fixtureGraph();
  assert.ok(graph.findings.cyclesRuntime.some((cycle) => cycle.some((file) => file.endsWith("lib/domain/cycle-a.ts")) && cycle.some((file) => file.endsWith("lib/domain/cycle-b.ts"))));
});

test("boundary evaluation fails new violations and recognizes exact historical exceptions", () => {
  const graph = fixtureGraph();
  const violations = collectBoundaryViolations(graph);
  assert.equal(violations.filter((violation) => violation.rule === "UI_TO_INFRASTRUCTURE").length, 1);
  const result = evaluateBoundary(graph, {
    schemaVersion: 1,
    exceptions: [],
    retired: [],
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.newViolations.length, 2);
  const allowedResult = evaluateBoundary(graph, {
    schemaVersion: 1,
    exceptions: result.newViolations.map(({ id, signature, rule, from, to, kind, sourceKind }) => ({ id, signature, rule, from, to, kind, sourceKind, reason: "fixture", reviewedRef: "fixture-sha" })),
    retired: [],
  });
  assert.equal(allowedResult.status, "PASS");
});
