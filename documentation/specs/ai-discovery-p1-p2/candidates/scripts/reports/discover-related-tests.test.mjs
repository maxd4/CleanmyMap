import test from "node:test";
import assert from "node:assert/strict";
import { discoverRelatedTests } from "./discover-related-tests.mjs";
const sha = "a".repeat(40);
const graph = {
  "gitSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "provenance": {
    "verified": true,
    "measuredSource": "git"
  },
  "schemaVersion": 1,
  "report": "architecture-import-graph",
  "nodes": [
    {
      "path": "a.ts",
      "surface": "web",
      "sourceKind": "runtime"
    },
    {
      "path": "b.ts",
      "surface": "web",
      "sourceKind": "runtime"
    },
    {
      "path": "c.test.ts",
      "surface": "web",
      "sourceKind": "test"
    },
    {
      "path": "d.test.ts",
      "surface": "mobile",
      "sourceKind": "test"
    }
  ],
  "edges": [
    {
      "from": "b.ts",
      "to": "a.ts"
    },
    {
      "from": "a.ts",
      "to": "b.ts"
    },
    {
      "from": "c.test.ts",
      "to": "b.ts"
    },
    {
      "from": "d.test.ts",
      "to": "a.ts"
    }
  ]
};
test("reverse traversal includes indirect and cross-surface tests and terminates cycles",()=>{
  const result=discoverRelatedTests(graph,sha,["a.ts","missing.ts"],{depth:2,limit:1});
  assert.deepEqual(result.missingTargets,["missing.ts"]);
  assert.equal(result.runtimeConsumers.total,1);
  assert.equal(result.testCandidates.web.items[0].importDistance,2);
  assert.equal(result.testCandidates.mobile.items[0].importDistance,1);
  assert.equal(result.depthBoundary,true);
});
test("depth and per-surface output limit are explicit",()=>{
  const limited=discoverRelatedTests(graph,sha,["a.ts"],{depth:1});
  assert.equal(limited.testCandidates.web,undefined);
  const second={path:"e.test.ts",surface:"web",sourceKind:"test"};
  const expanded={...graph,nodes:[...graph.nodes,second],edges:[...graph.edges,{from:second.path,to:"a.ts"}]};
  const result=discoverRelatedTests(expanded,sha,["a.ts"],{limit:1});
  assert.equal(result.testCandidates.web.total,2);
  assert.equal(result.testCandidates.web.omitted,1);
});
test("rejects stale reports and invalid edges or bounds",()=>{
  assert.throws(()=>discoverRelatedTests(graph,"b".repeat(40),["a.ts"]),/provenance/);
  assert.throws(()=>discoverRelatedTests(graph,sha,["a.ts"],{depth:0}),/bounds/);
  assert.throws(()=>discoverRelatedTests({...graph,edges:[{from:"absent",to:"a.ts"}]},sha,["a.ts"]),/edge/);
});
