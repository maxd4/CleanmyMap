import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  assertArchitectureAuditFresh,
  classifySourceRevision,
  collectImportGraph,
  coverageAvailability,
  readModularitySnapshot,
} from "./architecture-audit.mjs";
import { collectArchitectureRows, collectMeasuredRows } from "../checks/top-heavy-measurement.mjs";
import { isAboveReview } from "../checks/top-heavy-policy.mjs";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

function metric() {
  return { total: 1, covered: 1, pct: 100 };
}

function coverageSummary() {
  return {
    total: { statements: metric(), branches: metric(), functions: metric(), lines: metric() },
    "src/lib/auth/auth.ts": { statements: metric(), branches: metric(), functions: metric(), lines: metric() },
    "src/lib/actions/actions.ts": { statements: metric(), branches: metric(), functions: metric(), lines: metric() },
    "src/app/api/actions/[actionId]/formalities/index.ts": { statements: metric(), branches: metric(), functions: metric(), lines: metric() },
    "src/lib/route/route.ts": { statements: metric(), branches: metric(), functions: metric(), lines: metric() },
    "src/lib/supabase/client.ts": { statements: metric(), branches: metric(), functions: metric(), lines: metric() },
  };
}

function coverageFixture({ evidence = null, summary = coverageSummary() } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cleanmymap-architecture-coverage-"));
  fs.mkdirSync(path.join(root, "apps", "web", "coverage"), { recursive: true });
  fs.writeFileSync(path.join(root, "apps", "web", "coverage", "coverage-summary.json"), JSON.stringify(summary), "utf8");
  if (evidence) fs.writeFileSync(path.join(root, "apps", "web", "coverage", "coverage-evidence.json"), JSON.stringify(evidence), "utf8");
  return root;
}

function coverageView() {
  const baseline = JSON.stringify({ sourceCommit: SHA_B });
  return {
    isFile: (file) => file === "scripts/checks/coverage-baseline.json" || file === "scripts/checks/coverage-mobile-baseline.json",
    readText: () => baseline,
  };
}

function coverageArgs(root, overrides = {}) {
  return {
    root,
    view: coverageView(),
    auditedSha: SHA_A,
    auditedHead: SHA_A,
    classify: () => false,
    scope: "web",
    baselineFile: "scripts/checks/coverage-baseline.json",
    worktreeClean: true,
    ...overrides,
  };
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test("classifies exact, ancestor, stale, and missing source revisions", () => {
  const head = "a".repeat(40);
  assert.equal(classifySourceRevision({ sourceSha: head, auditedSha: head }), "CURRENT_SHA");
  assert.equal(classifySourceRevision({ sourceSha: "b".repeat(40), auditedSha: head, isAncestor: () => true }), "ANCESTOR_BASELINE");
  assert.equal(classifySourceRevision({ sourceSha: "b".repeat(40), auditedSha: head }), "STALE_SNAPSHOT");
  assert.equal(classifySourceRevision({ sourceSha: null, auditedSha: head }), "MISSING");
});

test("freshness assertion rejects an artifact attached to another SHA", () => {
  const sha = "a".repeat(40);
  const artifact = { sourceSha: sha, freshness: { status: "CURRENT_SHA" } };
  assert.equal(assertArchitectureAuditFresh(artifact, sha), artifact);
  assert.throws(() => assertArchitectureAuditFresh(artifact, "b".repeat(40)), /not current/);
  assert.throws(() => assertArchitectureAuditFresh({ ...artifact, freshness: { status: "HISTORICAL_SNAPSHOT" } }, sha), /not current/);
});

test("architecture audit reads deferred decisions from the separate registry", () => {
  const radar = "`RADAR_REF=" + SHA_A + "`\n[modularity-decisions.md](./modularity-decisions.md)";
  const registry = "<!-- RADAR:HUMAN_DECISIONS:BEGIN -->\n| PATH | DECISION | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |\n| --- | --- | --- | --- | --- |\n| `src/deferred.ts` | DEFERRED_SPLIT | LATER | — | wait |\n<!-- RADAR:HUMAN_DECISIONS:END -->";
  const view = {
    isFile: (file) => file === "documentation/architecture/monolith-split-plan.md" || file === "documentation/architecture/modularity-decisions.md",
    readText: (file) => file.endsWith("monolith-split-plan.md") ? radar : registry,
  };
  const snapshot = readModularitySnapshot(view, SHA_A);
  assert.equal(snapshot.decisionSource, "documentation/architecture/modularity-decisions.md");
  assert.deepEqual(snapshot.deferredSplit, ["src/deferred.ts"]);
});

test("architecture audit keeps reading legacy integrated decisions for old snapshots", () => {
  const radar = "`RADAR_REF=" + SHA_B + "`\n<!-- RADAR:HUMAN_DECISIONS:BEGIN -->\n| PATH | DECISION | PRIORITY | SIGNALS | BLOCKER / NEXT_TRIGGER |\n| --- | --- | --- | --- | --- |\n| `src/legacy.ts` | DEFERRED_SPLIT | LATER | — | wait |\n<!-- RADAR:HUMAN_DECISIONS:END -->";
  const view = {
    isFile: (file) => file === "documentation/architecture/monolith-split-plan.md",
    readText: () => radar,
  };
  const snapshot = readModularitySnapshot(view, SHA_B);
  assert.equal(snapshot.decisionSource, "documentation/architecture/monolith-split-plan.md");
  assert.deepEqual(snapshot.deferredSplit, ["src/legacy.ts"]);
});

test("architecture audit fails explicitly when a new radar has no registry", () => {
  const view = {
    isFile: (file) => file === "documentation/architecture/monolith-split-plan.md",
    readText: () => "`RADAR_REF=" + SHA_A + "`\n[modularity-decisions.md](./modularity-decisions.md)",
  };
  assert.throws(() => readModularitySnapshot(view, SHA_A), /Registre canonique/);
});

test("import graph reports resolved relative and alias edges without claiming external modules", () => {
  const files = {
    "apps/web/src/domain/a.ts": "import { b } from './b'; import { c } from '@/domain/c'; import React from 'react';\n",
    "apps/web/src/domain/b.ts": "export const b = 1;\n",
    "apps/web/src/domain/c.ts": "export const c = 1;\n",
  };
  const view = {
    isFile: (file) => Object.hasOwn(files, file),
    readText: (file) => files[file],
  };
  const rows = Object.keys(files).map((file) => ({ file, kind: "runtime", lines: 1, bytes: files[file].length }));
  const graph = collectImportGraph(view, rows);
  assert.equal(graph.available, true);
  assert.equal(graph.unresolvedLocalImports, 0);
  assert.deepEqual(graph.modules.find((entry) => entry.file.endsWith("/a.ts")), {
    file: "apps/web/src/domain/a.ts",
    domain: "web/domain",
    importsOut: 2,
    importsIn: 0,
  });
  assert.equal(graph.modules.find((entry) => entry.file.endsWith("/b.ts")).importsIn, 1);
  assert.equal(graph.modules.find((entry) => entry.file.endsWith("/c.ts")).importsIn, 1);
});

test("coverage audit accepts only validated web evidence for the exact audited SHA", () => {
  const root = coverageFixture({ evidence: { gitHead: SHA_A, candidateFingerprint: "candidate" } });
  try {
    const result = coverageAvailability(coverageArgs(root, {
      validateEvidence: () => ({ gitHead: SHA_A, candidateFingerprint: "candidate" }),
    }));
    assert.equal(result.available, true);
    assert.equal(result.proofStatus, "VALID");
    assert.equal(result.availabilityReason, null);
    assert.equal(result.metrics.metrics.lines.covered, 1);
  } finally {
    cleanup(root);
  }
});

test("coverage audit distinguishes missing, stale, and incoherent web evidence", () => {
  const missingRoot = coverageFixture();
  try {
    const result = coverageAvailability(coverageArgs(missingRoot));
    assert.equal(result.available, false);
    assert.equal(result.availabilityReason, "EVIDENCE_MISSING");
  } finally {
    cleanup(missingRoot);
  }

  const staleRoot = coverageFixture({ evidence: { gitHead: SHA_B, candidateFingerprint: "old" } });
  try {
    const result = coverageAvailability(coverageArgs(staleRoot));
    assert.equal(result.available, false);
    assert.equal(result.proofStatus, "STALE_OR_INCOHERENT");
    assert.equal(result.availabilityReason, "EVIDENCE_STALE_OR_INCOHERENT");
  } finally {
    cleanup(staleRoot);
  }

  const incoherentRoot = coverageFixture({ evidence: { gitHead: SHA_A, candidateFingerprint: "candidate" } });
  try {
    const result = coverageAvailability(coverageArgs(incoherentRoot, {
      validateEvidence: () => { throw new Error("configuration mismatch"); },
    }));
    assert.equal(result.available, false);
    assert.equal(result.proofStatus, "STALE_OR_INCOHERENT");
    assert.equal(result.availabilityReason, "EVIDENCE_INVALID_OR_INCOHERENT");
  } finally {
    cleanup(incoherentRoot);
  }
});

test("mobile coverage is unavailable without a mobile evidence producer", () => {
  const root = coverageFixture();
  try {
    const result = coverageAvailability(coverageArgs(root, {
      scope: "mobile",
      baselineFile: "scripts/checks/coverage-mobile-baseline.json",
    }));
    assert.equal(result.available, false);
    assert.equal(result.metrics, null);
    assert.equal(result.availabilityReason, "EVIDENCE_NOT_PRODUCED");
  } finally {
    cleanup(root);
  }
});

test("architecture inventory includes first-party MJS and JS, classifies tests, and excludes vendor", () => {
  const files = {
    "scripts/tool.mjs": "import './helper.mjs'; import './helper.js'; import './vendor/third-party.mjs';\n",
    "scripts/helper.mjs": "export const helper = true;\n",
    "scripts/helper.js": "export const helperJs = true;\n",
    "scripts/tool.test.mjs": "export const test = true;\n",
    "scripts/vendor/third-party.mjs": "export const vendor = true;\n",
    "scripts/radar.ts": "export const radar = true;\n" + "x\n".repeat(500),
  };
  const view = {
    listFiles: () => Object.keys(files),
    readBinary: (file) => Buffer.from(files[file]),
  };
  const architectureRows = collectArchitectureRows(view, ["scripts"]);
  assert.ok(architectureRows.some((row) => row.file === "scripts/tool.mjs" && row.kind === "runtime"));
  assert.ok(architectureRows.some((row) => row.file === "scripts/tool.test.mjs" && row.kind === "test"));
  assert.equal(architectureRows.some((row) => row.file.includes("vendor")), false);

  const radarRows = collectMeasuredRows(view, ["scripts"]);
  assert.deepEqual(radarRows.map((row) => row.file), ["scripts/radar.ts"]);
  assert.equal(isAboveReview(radarRows[0]), true);

  const graph = collectImportGraph(
    { ...view, isFile: (file) => Object.hasOwn(files, file), readText: (file) => files[file] },
    architectureRows,
  );
  assert.equal(graph.unresolvedLocalImports, 0);
  assert.equal(graph.excludedLocalImports, 1);
  assert.equal(graph.modules.find((entry) => entry.file === "scripts/tool.mjs").importsOut, 2);
});
