import test from "node:test";
import assert from "node:assert/strict";

import { assertArchitectureAuditFresh, classifySourceRevision, collectImportGraph } from "./architecture-audit.mjs";

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
