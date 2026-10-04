import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AUDIT_MODES,
  attentionRequired,
  createAuditPaths,
  parseAuditMode,
  runQualityAudit,
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
  return { gateStatus: "PASS", cycles: [], comparison: { added: [], stale: [] } };
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
    const result = await runQualityAudit("dead-code", { root, snapshot: () => stableSnapshot, engine: async () => fixtureResult("dead-code"), now: () => "2026-10-04T00:00:00.000Z" });
    const auditRoot = path.join(root, "artifacts", "quality-audits", sha, "dead-code");
    assert.equal(result.status, "PASS");
    assert.deepEqual(fs.readdirSync(auditRoot).sort(), ["manifest.json", "report.json", "summary.md"]);
    const manifest = JSON.parse(fs.readFileSync(path.join(auditRoot, "manifest.json"), "utf8"));
    assert.deepEqual(manifest, {
      schemaVersion: 1,
      audit: "dead-code",
      auditedHead: sha,
      originMain: sha,
      baselineStable: true,
      worktreeClean: true,
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
  assert.equal(attentionRequired("top-heavy", topHeavy), true);

  const complexity = fixtureResult("complexity");
  complexity.result.improvements.push({ key: "improvement" });
  assert.equal(attentionRequired("complexity", complexity), true);

  const cycles = fixtureResult("cycles");
  cycles.comparison.added.push("cycle");
  assert.equal(attentionRequired("cycles", cycles), true);
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
    assert.ok(fs.existsSync(path.join(root, "artifacts", "quality-audits", sha, "manifest.json")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("unstable start and end snapshots stop without publishing a canonical result", async () => {
  const root = tempRoot();
  try {
    await assert.rejects(
      () => runQualityAudit("dead-code", { root, snapshot: () => ({ ...stableSnapshot, worktree: " M foreign.ts", worktreeClean: false, baselineStable: false }), engine: async () => fixtureResult("dead-code") }),
      (error) => error.code === "BASELINE_UNSTABLE",
    );
    let snapshotCount = 0;
    await assert.rejects(
      () => runQualityAudit("dead-code", { root, snapshot: () => (++snapshotCount === 1 ? stableSnapshot : { ...stableSnapshot, auditedHead: "b".repeat(40), baselineStable: false }), engine: async () => fixtureResult("dead-code") }),
      (error) => error.code === "BASELINE_CHANGED",
    );
    assert.equal(fs.existsSync(path.join(root, "artifacts")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
// End-to-end engine execution belongs to the audit commands, not this plumbing suite.
