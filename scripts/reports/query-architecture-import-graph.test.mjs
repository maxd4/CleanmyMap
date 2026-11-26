import test from "node:test";
import assert from "node:assert/strict";
import { queryGraph } from "./query-architecture-import-graph.mjs";

const sha = "a".repeat(40);
const graph = {
  "schemaVersion": 1,
  "report": "architecture-import-graph",
  "gitSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "provenance": {
    "verified": true,
    "measuredSource": "git"
  },
  "nodes": [
    {
      "path": "apps/web/src/lib/a/index.ts",
      "sourceKind": "runtime"
    },
    {
      "path": "apps/web/src/lib/a/x.test.ts",
      "sourceKind": "test"
    },
    {
      "path": "apps/web/src/app/api/a/route.ts",
      "sourceKind": "runtime"
    },
    {
      "path": "apps/web/src/lib/b.ts",
      "sourceKind": "runtime"
    },
    {
      "path": "apps/web/src/lib/c.ts",
      "sourceKind": "runtime"
    }
  ],
  "edges": [
    {
      "from": "apps/web/src/app/api/a/route.ts",
      "to": "apps/web/src/lib/a/index.ts",
      "sourceKind": "runtime",
      "kind": "runtime"
    },
    {
      "from": "apps/web/src/lib/a/index.ts",
      "to": "apps/web/src/lib/b.ts",
      "sourceKind": "runtime",
      "kind": "runtime"
    },
    {
      "from": "apps/web/src/lib/a/index.ts",
      "to": "apps/web/src/lib/c.ts",
      "sourceKind": "runtime",
      "kind": "runtime"
    }
  ],
  "findings": {
    "unresolvedInternal": []
  }
};

test("directory discovery bounds lists and reports omissions", () => {
  const result = queryGraph(graph, "apps/web/src/lib/a", sha, 1);
  assert.deepEqual(result.nodes, { total: 2, items: ["apps/web/src/lib/a/index.ts"], omitted: 1 });
  assert.equal(result.runtimeDependencies.total, 2);
  assert.equal(result.runtimeDependencies.omitted, 1);
  assert.deepEqual(result.runtimeCallers.items, ["apps/web/src/app/api/a/route.ts"]);
  assert.deepEqual(result.tests.items, ["apps/web/src/lib/a/x.test.ts"]);
});

test("exact module and no fabricated test coverage", () => {
  const result = queryGraph(graph, "apps/web/src/lib/a/index.ts", sha);
  assert.equal(result.nodes.total, 1);
  assert.equal(result.tests.total, 0);
});

test("rejects stale, unverified or invalid inputs", () => {
  assert.throws(() => queryGraph(graph, "missing", sha), /no matching/);
  assert.throws(() => queryGraph(graph, "apps/web/src/lib/a", "b".repeat(40)), /provenance/);
  assert.throws(() => queryGraph({...graph, provenance: {verified: false}}, "apps/web/src/lib/a", sha), /provenance/);
  assert.throws(() => queryGraph(graph, "apps/web/src/lib/a", sha, 0), /limit/);
  assert.throws(() => queryGraph(graph, "../a", sha), /relative/);
});
