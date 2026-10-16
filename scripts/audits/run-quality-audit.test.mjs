import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AUDIT_MODES,
  attentionRequired,
  buildHumanDecisionsByFile,
  enrichTopHeavyEvaluation,
  createAuditPaths,
  executeAudit,
  parseAuditMode,
  runQualityAudit,
  serialize,
} from "./run-quality-audit.mjs";

const sha = "a".repeat(40);
const stableSnapshot = {
  auditedHead: sha,
  originMain: sha,
  worktree: "",
  worktreeClean: true,
  baselineStable: true,
};

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-quality-audit-"));
}

function emptyComparison() {
  return { newFindings: [], resolvedFindings: [], historicalActionableFindings: [], keepJustifiedFindings: [], staleKeepJustifications: [], currentCount: 0, baselineCount: 0, baselineFresh: true };
}

function fixtureResult(audit) {
  if (audit === "dead-code") return { comparison: emptyComparison() };
  if (audit === "duplication") return { results: [{ scopeName: "runtime", metrics: { clones: 0, duplicatedLines: 0, duplicatedTokens: 0, newClones: 0 }, comparison: { status: "PASS", failures: [] } }], justificationReport: { stale: [] } };
  if (audit === "top-heavy") return { status: "PASS", rows: [], proximityRows: [], radarProjection: { rows: [] }, evaluation: { blockingFindings: [], reviewWarnings: [], reviewImprovements: [], staleReviewBaselineEntries: [], staleBaselineEntries: [] } };
  if (audit === "complexity") return { status: "PASS", metrics: [], result: { failures: [], stale: [], improvements: [], reviews: [] } };
  return { gateStatus: "PASS", cycles: [], cycleObjects: [], comparison: { added: [], stale: [] } };
}

function complexityEngineResult() {
  return {
    baseline: { entries: [] },
    metrics: [{ metric: "complexity", path: "apps/web/src/fixture.ts", value: 23 }],
    result: { failures: [{ key: "fixture-complexity" }], reviews: [], improvements: [], stale: [] },
    status: "FAIL",
  };
}

function cycleEngineResult() {
  return {
    baseline: { cycles: [] },
    report: { status: "clean", enumeration: "complete", cycles: [] },
    cycles: ["fixture-cycle"],
    cycleObjects: [],
    comparison: { added: [], stale: [] },
    gateStatus: "PASS",
  };
}

test("CLI parser accepts exactly the six audit modes and rejects unknown input", () => {
  for (const mode of AUDIT_MODES) assert.equal(parseAuditMode([mode]), mode);
  assert.throws(() => parseAuditMode(["knip"]), /Mode d'audit inconnu/);
  assert.throws(() => parseAuditMode([]), /Usage:/);
});
test("artifact paths are deterministic and SHA-scoped", () => {
  const paths = createAuditPaths({ root: "C:/repo", auditedHead: sha, audit: "dead-code" });
  assert.equal(paths.auditRoot, path.join("C:/repo", "artifacts/quality-audits", sha, "dead-code"));
  assert.match(paths.report, new RegExp(`${sha}.*dead-code`));
});
test("a single audit writes manifest, raw report and generated summary only below the artifact root", async () => {
  const root = tempRoot();
  try {
    const result = await runQualityAudit("dead-code", { root, runId: "run-single", snapshot: () => stableSnapshot, engine: async () => fixtureResult("dead-code"), now: () => "2026-10-04T00:00:00.000Z" });
    const auditRoot = result.results[0].paths.auditRoot;
    assert.equal(result.status, "PASS");
    assert.deepEqual(fs.readdirSync(auditRoot).sort(), ["manifest.json", "report.json", "summary.md"]);
    const manifest = JSON.parse(fs.readFileSync(path.join(auditRoot, "manifest.json"), "utf8"));
    assert.deepEqual(manifest, {
      schemaVersion: 1,
      audit: "dead-code",
      runId: "run-single",
      auditedHead: sha,
      originMain: sha,
      baselineStable: true,
      worktreeClean: true,
      initialWorktreeClean: true,
      readProvenance: "WORKTREE_LIVE",
      worktreeChanged: false,
      reproducible: true,
      resultClass: "REPRODUCIBLE",
      status: "PASS",
      attentionRequired: false,
      generatedAt: "2026-10-04T00:00:00.000Z",
    });
    const files = fs.readdirSync(root, { recursive: true }).map((entry) => String(entry).replaceAll("\\", "/"));
    const artifactRoot = path.resolve(root, "artifacts", "quality-audits");
    const generatedRoot = path.resolve(root, "artifacts");
    assert.ok(files.every((file) => path.resolve(root, file) === generatedRoot || path.resolve(root, file).startsWith(artifactRoot)));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("attention rules cover dead-code, duplication, top-heavy, complexity and cycles", () => {
  const dead = fixtureResult("dead-code");
  dead.comparison.newFindings.push({ file: "src/new.ts" });
  assert.equal(attentionRequired("dead-code", dead), true);

  const duplication = fixtureResult("duplication");
  duplication.results[0].metrics.newClones = 1;
  assert.equal(attentionRequired("duplication", duplication), true);

  const topHeavy = fixtureResult("top-heavy");
  topHeavy.evaluation.reviewWarnings.push({ file: "src/large.ts" });
  topHeavy.evaluation.reviewWarningsRequiringDecision = [{ file: "src/large.ts" }];
  assert.equal(attentionRequired("top-heavy", topHeavy), true);

  const complexity = fixtureResult("complexity");
  complexity.result.improvements.push({ key: "improvement" });
  assert.equal(attentionRequired("complexity", complexity), true);

  const cycles = fixtureResult("cycles");
  cycles.comparison.added.push("cycle");
  assert.equal(attentionRequired("cycles", cycles), true);
});

test("top-heavy distingue les décisions acquises, REVIEW_REQUIRED et les deltas", () => {
  const acquired = {
    "src/decided.ts": {
      file: "src/decided.ts",
      architectureDecision: "PROACTIVE_SPLIT",
      priority: "LATER",
      dependencyOrBlocker: "aucun",
      nextTrigger: "prochain changement",
      decisionAcquired: true,
    },
  };
  const baseEvaluation = {
    blockingFindings: [],
    reviewWarnings: [{ file: "src/decided.ts", lines: 501, bytes: 100, kind: "runtime" }],
    reviewImprovements: [],
    staleReviewBaselineEntries: [],
    staleBaselineEntries: [],
  };
  const decided = enrichTopHeavyEvaluation(baseEvaluation, acquired);
  assert.equal(decided.reviewWarningsWithDecision.length, 1);
  assert.equal(decided.reviewWarningsRequiringDecision.length, 0);
  assert.equal(attentionRequired("top-heavy", { evaluation: decided }), false);

  const undecided = enrichTopHeavyEvaluation({ ...baseEvaluation, reviewWarnings: [{ ...baseEvaluation.reviewWarnings[0], file: "src/unknown.ts" }] }, acquired);
  assert.equal(undecided.reviewWarningsWithDecision.length, 0);
  assert.equal(undecided.reviewWarningsRequiringDecision.length, 1);
  assert.equal(attentionRequired("top-heavy", { evaluation: undecided }), true);

  const reviewRequired = enrichTopHeavyEvaluation(baseEvaluation, {
    "src/decided.ts": { ...acquired["src/decided.ts"], architectureDecision: "REVIEW_REQUIRED", decisionAcquired: false },
  });
  assert.equal(reviewRequired.reviewWarningsWithDecision[0].architectureDecision, "REVIEW_REQUIRED");
  assert.equal(reviewRequired.reviewWarningsRequiringDecision.length, 1);
  assert.equal(attentionRequired("top-heavy", { evaluation: reviewRequired }), true);

  const improvement = enrichTopHeavyEvaluation({ ...baseEvaluation, reviewImprovements: [{ file: "src/decided.ts" }] }, acquired);
  assert.equal(attentionRequired("top-heavy", { evaluation: improvement }), true);
});

test("la projection humaine associe les décisions du bloc canonique aux chemins", () => {
  const markdown = fs.readFileSync(path.join(process.cwd(), "documentation", "architecture", "monolith-split-plan.md"), "utf8");
  const decisions = buildHumanDecisionsByFile(markdown);
  assert.equal(decisions["apps/web/src/components/chat/chat-shell.tsx"].architectureDecision, "ALREADY_MODULARIZED");
  assert.equal(decisions["apps/web/src/components/chat/chat-shell.tsx"].decisionAcquired, true);
  assert.equal(decisions["apps/web/src/components/chat/chat-shell.tsx"].priority, "NONE");
});

test("executeAudit attend la promesse de complexité et conserve ses métriques", async () => {
  const root = tempRoot();
  try {
    const result = await executeAudit("complexity", root, {
      complexityRunner: async () => complexityEngineResult(),
    });
    assert.equal(result.status, "FAIL");
    assert.equal(result.readProvenance, "WORKTREE_LIVE");
    assert.equal(result.metrics[0].value, 23);
    assert.deepEqual(result.result.failures, [{ key: "fixture-complexity" }]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("executeAudit attend la promesse de cycles et conserve le gate et la comparaison", async () => {
  const root = tempRoot();
  try {
    const result = await executeAudit("cycles", root, {
      cycleRunner: async () => cycleEngineResult(),
    });
    assert.equal(result.gateStatus, "PASS");
    assert.deepEqual(result.cycles, ["fixture-cycle"]);
    assert.deepEqual(result.comparison, { added: [], stale: [] });
    assert.equal(result.readProvenance, "WORKTREE_LIVE");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("une promesse asynchrone rejetée produit un FAIL diagnostiqué et laisse les engines suivants s'exécuter", async () => {
  const root = tempRoot();
  let snapshotCount = 0;
  const startSnapshot = { ...stableSnapshot, worktree: " M foreign.ts", worktreeClean: false, baselineStable: false };
  const endSnapshot = { ...startSnapshot, worktree: " M foreign.ts\n?? another-foreign.ts" };
  const calls = [];
  try {
    const result = await runQualityAudit("all", {
      root,
      snapshot: () => (++snapshotCount === 1 ? startSnapshot : endSnapshot),
      engine: async (audit, engineRoot, context) => {
        if (audit === "complexity") {
          return executeAudit(audit, engineRoot, {
            ...context,
            complexityRunner: async () => {
              calls.push("complexity");
              const error = new Error("fixture complexity failure");
              error.code = "FIXTURE_COMPLEXITY_FAILED";
              throw error;
            },
          });
        }
        if (audit === "cycles") {
          return executeAudit(audit, engineRoot, {
            ...context,
            cycleRunner: async () => {
              calls.push("cycles");
              return cycleEngineResult();
            },
          });
        }
        calls.push(audit);
        return fixtureResult(audit);
      },
    });

    const complexity = result.results.find((entry) => entry.audit === "complexity");
    const cycles = result.results.find((entry) => entry.audit === "cycles");
    const complexityReport = JSON.parse(fs.readFileSync(complexity.paths.report, "utf8"));
    const cyclesReport = JSON.parse(fs.readFileSync(cycles.paths.report, "utf8"));
    const manifest = JSON.parse(fs.readFileSync(result.allPaths.manifest, "utf8"));

    assert.deepEqual(calls, ["dead-code", "duplication", "top-heavy", "complexity", "cycles"]);
    assert.equal(complexity.status, "FAIL");
    assert.equal(complexityReport.status, "FAIL");
    assert.equal(complexityReport.error.code, "FIXTURE_COMPLEXITY_FAILED");
    assert.equal(complexityReport.error.message, "fixture complexity failure");
    assert.equal(cycles.status, "PASS");
    assert.equal(cyclesReport.gateStatus, "PASS");
    assert.equal(manifest.worktreeChanged, true);
    assert.equal(manifest.worktreeClean, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all runs each engine once, aggregates statuses and retains other results after failure", async () => {
  const root = tempRoot();
  const calls = [];
  try {
    const result = await runQualityAudit("all", {
      root,
      snapshot: () => stableSnapshot,
      engine: async (audit) => {
        calls.push(audit);
        if (audit === "duplication") throw new Error("fixture engine failure");
        return fixtureResult(audit);
      },
    });
    assert.deepEqual(calls, ["dead-code", "duplication", "top-heavy", "complexity", "cycles"]);
    assert.equal(result.results.length, 5);
    assert.equal(result.status, "FAIL");
    assert.equal(result.results.find((entry) => entry.audit === "duplication").status, "FAIL");
    assert.equal(result.results.find((entry) => entry.audit === "cycles").status, "PASS");
    assert.ok(fs.existsSync(result.allPaths.manifest));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("all correlates the five current gate results after execution without rerunning an engine", async () => {
  const root = tempRoot();
  try {
    const candidate = { file: "apps/web/src/example.ts", lines: 601, bytes: 20_000, kind: "runtime" };
    const result = await runQualityAudit("all", {
      root,
      snapshot: () => stableSnapshot,
      engine: async (audit) => {
        if (audit === "top-heavy") return { ...fixtureResult(audit), rows: [candidate] };
        if (audit === "complexity") return { ...fixtureResult(audit), metrics: [{ metric: "complexity", path: candidate.file, category: "React/JSX", value: 23 }] };
        return fixtureResult(audit);
      },
    });
    const topHeavy = result.results.find((entry) => entry.audit === "top-heavy").result;
    assert.equal(topHeavy.radarProjection.rows[0].signals.size.state, "PRESENT");
    assert.equal(topHeavy.radarProjection.rows[0].signals.complexity.state, "PRESENT");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("duplication audit accepts a stable dirty worktree and records it as non-clean evidence", async () => {
  const root = tempRoot();
  const dirtySnapshot = { ...stableSnapshot, worktree: " M src/dirty.ts", worktreeClean: false, baselineStable: false };
  try {
    const result = await runQualityAudit("duplication", {
      root,
      snapshot: () => dirtySnapshot,
      engine: async () => fixtureResult("duplication"),
    });
    const manifest = JSON.parse(fs.readFileSync(result.results[0].paths.manifest, "utf8"));
    assert.equal(result.status, "PASS");
    assert.equal(manifest.baselineStable, false);
    assert.equal(manifest.worktreeClean, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("all audits accept a stable dirty worktree and record non-clean evidence", async () => {
  const root = tempRoot();
  const dirtySnapshot = { ...stableSnapshot, worktree: " M src/dirty.ts", worktreeClean: false, baselineStable: false };
  try {
    const result = await runQualityAudit("all", {
      root,
      snapshot: () => dirtySnapshot,
      engine: async (audit) => fixtureResult(audit),
    });
    const manifest = JSON.parse(fs.readFileSync(result.allPaths.manifest, "utf8"));
    assert.equal(result.status, "PASS");
    assert.equal(manifest.baselineStable, false);
    assert.equal(manifest.worktreeClean, false);
    assert.equal(manifest.audit, "all");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("divergent start and changed snapshots remain published as informative evidence", async () => {
  const root = tempRoot();
  try {
    let snapshotCount = 0;
    const changed = {
      ...stableSnapshot,
      auditedHead: "b".repeat(40),
      originMain: "c".repeat(40),
      worktree: " M src/audited.ts\n?? foreign.txt",
      worktreeClean: false,
      baselineStable: false,
    };
    const result = await runQualityAudit("dead-code", {
      root,
      runId: "run-changed",
      snapshot: () => (++snapshotCount === 1 ? { ...stableSnapshot, originMain: "c".repeat(40), baselineStable: false, worktree: "?? foreign.txt", worktreeClean: false } : changed),
      engine: async () => fixtureResult("dead-code"),
    });
    const manifest = JSON.parse(fs.readFileSync(result.results[0].paths.manifest, "utf8"));
    assert.equal(result.status, "PASS");
    assert.equal(manifest.auditedHead, sha);
    assert.equal(manifest.baselineStable, false);
    assert.equal(manifest.initialWorktreeClean, false);
    assert.equal(manifest.worktreeChanged, true);
    assert.equal(manifest.reproducible, false);
    assert.equal(manifest.resultClass, "INFORMATIVE");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("HEAD divergence without worktree edits is accepted and remains reproducible locally", async () => {
  const root = tempRoot();
  try {
    const localSnapshot = { ...stableSnapshot, originMain: "c".repeat(40), baselineStable: false };
    const result = await runQualityAudit("dead-code", { root, runId: "run-local-commit", snapshot: () => localSnapshot, engine: async () => fixtureResult("dead-code") });
    const manifest = JSON.parse(fs.readFileSync(result.results[0].paths.manifest, "utf8"));
    assert.equal(result.status, "PASS");
    assert.equal(manifest.baselineStable, false);
    assert.equal(manifest.reproducible, true);
    assert.equal(manifest.resultClass, "REPRODUCIBLE");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("each engine retains provenance and concurrent runs use distinct artifact roots", async () => {
  const root = tempRoot();
  try {
    const engine = async (audit) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { ...fixtureResult(audit), readProvenance: audit === "top-heavy" ? "COMMITTED_SNAPSHOT" : "WORKTREE_LIVE" };
    };
    const [first, second] = await Promise.all([
      runQualityAudit("all", { root, runId: "run-a", snapshot: () => stableSnapshot, engine }),
      runQualityAudit("all", { root, runId: "run-b", snapshot: () => stableSnapshot, engine }),
    ]);
    assert.notEqual(first.allPaths.runRoot, second.allPaths.runRoot);
    assert.ok(fs.existsSync(first.allPaths.manifest));
    assert.ok(fs.existsSync(second.allPaths.manifest));
    const topHeavy = first.results.find((entry) => entry.audit === "top-heavy");
    assert.equal(topHeavy.readProvenance, "COMMITTED_SNAPSHOT");
    assert.equal(topHeavy.reproducible, true);
    assert.equal(first.results.find((entry) => entry.audit === "dead-code").readProvenance, "WORKTREE_LIVE");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("serializes shared findings in each branch instead of marking them circular", () => {
  const staleEntry = {
    path: "src/example.ts",
    metric: "complexity",
    identity: "function:example",
    value: 23,
  };
  const report = {
    baseline: { entries: [staleEntry] },
    result: { stale: [staleEntry] },
  };

  const serialized = serialize(report);

  assert.deepEqual(serialized.baseline.entries[0], serialized.result.stale[0]);
  assert.notEqual(serialized.result.stale[0], "[Circular]");
  assert.equal(serialized.result.stale[0].path, "src/example.ts");
  assert.equal(serialized.result.stale[0].metric, "complexity");
  assert.equal(serialized.result.stale[0].identity, "function:example");
  assert.equal(serialized.result.stale[0].value, 23);
});

test("protects true circular references", () => {
  const value = { name: "cycle" };
  value.self = value;

  assert.deepEqual(serialize(value), { name: "cycle", self: "[Circular]" });
});

test("serializes metrics and diagnostic error fields", () => {
  const error = new Error("engine failed");
  error.code = "ENGINE_FAILED";

  assert.deepEqual(serialize({
    metrics: {
      complexity: 23,
      duplicatedLines: 7,
      nonFinite: Number.POSITIVE_INFINITY,
    },
    error,
  }), {
    metrics: {
      complexity: 23,
      duplicatedLines: 7,
      nonFinite: null,
    },
    error: {
      name: "Error",
      message: "engine failed",
      code: "ENGINE_FAILED",
    },
  });
});

// End-to-end engine execution belongs to the audit commands, not this plumbing suite.
