import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { buildArchitectureImportGraph } from "../reports/generate-architecture-import-graph.mjs";
import { createIndexRepositoryView } from "./repository-view.mjs";
import { AUTHORIZED_BOUNDARY_RULES, collectBoundaryViolations, evaluateBoundary } from "./check-architecture-import-boundary.mjs";

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
  const reexports = graph.edges.filter((candidate) => candidate.from.endsWith("lib/domain/reexports.ts"));
  const typeReexport = reexports.find((candidate) => candidate.kind === "type-only");

  assert.equal(allowed?.kind, "runtime");
  assert.equal(allowed?.uiToInfrastructure, false);
  assert.equal(inverted?.uiToInfrastructure, true);
  assert.equal(aliased?.specifier, "@/lib/domain/contracts");
  assert.equal(testTypeOnly?.sourceKind, "test");
  assert.equal(testTypeOnly?.kind, "type-only");
  assert.equal(ownFacade?.targetsPublicFacade, true);
  assert.equal(ownFacade?.importsOwnFacade, true);
  assert.equal(typeReexport?.kind, "type-only");
  assert.equal(reexports.length, 3);
  assert.equal(reexports.filter((candidate) => candidate.kind === "type-only").length, 2);
  assert.equal(reexports.filter((candidate) => candidate.kind === "runtime").length, 1);
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
    rules: [...AUTHORIZED_BOUNDARY_RULES],
    exceptions: [],
    retired: [],
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.newViolations.length, 2);
  const allowedResult = evaluateBoundary(graph, {
    schemaVersion: 1,
    rules: [...AUTHORIZED_BOUNDARY_RULES],
    exceptions: result.newViolations.map(({ id, signature, rule, from, to, kind, sourceKind }) => ({ id, signature, rule, from, to, kind, sourceKind, reason: "fixture", reviewedRef: "fixture-sha" })),
    retired: [],
  });
  assert.equal(allowedResult.status, "PASS");
});

function runGit(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function createGitFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-architecture-view-"));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  runGit(root, ["init", "--quiet"]);
  runGit(root, ["config", "user.email", "architecture-test"]);
  runGit(root, ["config", "user.name", "Architecture Boundary Test"]);
  fs.writeFileSync(path.join(root, "src", "entry.ts"), 'import { value } from "./a";\nexport { value };\n');
  fs.writeFileSync(path.join(root, "src", "a.ts"), 'export const value = "a";\n');
  fs.writeFileSync(path.join(root, "src", "b.ts"), 'export const value = "b";\n');
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "--quiet", "-m", "first"]);
  const first = runGit(root, ["rev-parse", "HEAD"]);
  fs.writeFileSync(path.join(root, "src", "entry.ts"), 'import { value } from "./b";\nexport { value };\n');
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "--quiet", "-m", "second"]);
  const second = runGit(root, ["rev-parse", "HEAD"]);
  return { root, first, second };
}

function gitFixtureSurface(root) {
  return { id: "web", root: path.join(root, "src"), aliases: [] };
}

test("Git-ref graph provenance is exact and ignores dirty worktree contents", () => {
  const fixture = createGitFixture();
  try {
    fs.writeFileSync(path.join(fixture.root, "src", "entry.ts"), 'import { value } from "./a";\nexport { value };\n');
    const exact = buildArchitectureImportGraph({ root: fixture.root, ref: fixture.second, surfaces: [gitFixtureSurface(fixture.root)] });
    const worktree = buildArchitectureImportGraph({ root: fixture.root, source: "worktree", surfaces: [gitFixtureSurface(fixture.root)] });
    assert.equal(exact.provenance.gitRef, fixture.second);
    assert.equal(exact.provenance.measuredSource, "git");
    assert.equal(exact.provenance.verified, true);
    assert.ok(edge(exact, "src/entry.ts", "src/b.ts"));
    assert.ok(edge(worktree, "src/entry.ts", "src/a.ts"));
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("two Git refs and the index each measure their own candidate contents", () => {
  const fixture = createGitFixture();
  try {
    const first = buildArchitectureImportGraph({ root: fixture.root, ref: fixture.first, surfaces: [gitFixtureSurface(fixture.root)] });
    const second = buildArchitectureImportGraph({ root: fixture.root, ref: fixture.second, surfaces: [gitFixtureSurface(fixture.root)] });
    assert.ok(edge(first, "src/entry.ts", "src/a.ts"));
    assert.ok(edge(second, "src/entry.ts", "src/b.ts"));

    fs.writeFileSync(path.join(fixture.root, "src", "entry.ts"), 'import { value } from "./a";\nexport { value };\n');
    runGit(fixture.root, ["add", "src/entry.ts"]);
    fs.writeFileSync(path.join(fixture.root, "src", "entry.ts"), 'import { value } from "./b";\nexport { value };\n');
    const staged = buildArchitectureImportGraph({
      root: fixture.root,
      source: "staged",
      view: createIndexRepositoryView(fixture.root),
      surfaces: [gitFixtureSurface(fixture.root)],
    });
    assert.equal(staged.provenance.measuredSource, "index");
    assert.equal(staged.provenance.verified, false);
    assert.ok(edge(staged, "src/entry.ts", "src/a.ts"));
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("exception identity and registry state are validated before boundary comparison", () => {
  const graph = fixtureGraph();
  const violation = collectBoundaryViolations(graph)[0];
  const valid = { ...violation, reason: "fixture", reviewedRef: "fixture-sha" };
  const base = { schemaVersion: 1, rules: [...AUTHORIZED_BOUNDARY_RULES], exceptions: [valid], retired: [] };

  const wrongId = evaluateBoundary(graph, { ...base, exceptions: [{ ...valid, id: "000000000000000000000000" }] });
  assert.ok(wrongId.invalidExceptions.some((issue) => issue.code === "ID_MISMATCH"));
  assert.equal(wrongId.status, "FAIL");

  const duplicate = evaluateBoundary(graph, { ...base, exceptions: [valid, { ...valid }] });
  assert.ok(duplicate.invalidExceptions.some((issue) => issue.code === "DUPLICATE_SIGNATURE"));
  assert.ok(duplicate.invalidExceptions.some((issue) => issue.code === "DUPLICATE_ID"));

  const contradictory = evaluateBoundary(graph, { ...base, retired: [valid] });
  assert.ok(contradictory.invalidExceptions.some((issue) => issue.code === "CONTRADICTORY_STATE"));

  const reintroduced = evaluateBoundary(graph, { schemaVersion: 1, rules: [...AUTHORIZED_BOUNDARY_RULES], exceptions: [], retired: [valid] });
  assert.equal(reintroduced.reintroduced.length, 1);
  assert.equal(reintroduced.status, "FAIL");
});
