#!/usr/bin/env node
// Read-only projection of the existing architecture graph.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gitExecutable } from "../ci/git-executable.mjs";
import { VITEST_GROUPS } from "../checks/validation-policy.mjs";

function verifyCommitSha(root, sha) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Full 40-hex Git SHA required");
  const resolved = execFileSync(gitExecutable(), ["rev-parse", "--verify", `${sha}^{commit}`], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (resolved !== sha) throw new Error(`Commit SHA mismatch: ${sha} resolved to ${resolved}`);
}

export function discoverRelatedTests(graph, sha, targets, options = {}) {
  const { depth = 3, limit = 50 } = options;
  if (!/^[a-f0-9]{40}$/.test(sha) || graph?.gitSha !== sha || graph?.provenance?.verified !== true || graph?.provenance?.measuredSource !== "git" || graph?.report !== "architecture-import-graph" || graph?.schemaVersion !== 1) throw new Error("Git graph provenance mismatch");
  if (!Number.isInteger(depth) || depth < 1 || depth > 8 || !Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error("Invalid discovery bounds");
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !Array.isArray(targets) || !targets.length) throw new Error("Invalid graph or targets");
  const nodes = new Map(graph.nodes.map((n) => [n.path, n]));
  const reverse = new Map();
  for (const edge of graph.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) throw new Error("Invalid graph edge");
    if (!reverse.has(edge.to)) reverse.set(edge.to, new Set());
    reverse.get(edge.to).add(edge.from);
  }
  const uniqueTargets = [...new Set(targets)].sort();
  const missingTargets = uniqueTargets.filter((p) => !nodes.has(p));
  const distances = new Map(uniqueTargets.filter((p) => nodes.has(p)).map((p) => [p, 0]));
  const queue = [...distances.keys()];
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    const distance = distances.get(current);
    if (distance >= depth) continue;
    for (const caller of reverse.get(current) ?? []) {
      if (distances.has(caller)) continue;
      distances.set(caller, distance + 1);
      queue.push(caller);
    }
  }
  const tests = graph.nodes.filter((n) => n.sourceKind === "test" && distances.has(n.path)).map((n) => ({ path: n.path, surface: n.surface, importDistance: distances.get(n.path) }))
    .sort((a, b) => a.importDistance - b.importDistance || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const runtime = graph.nodes.filter((n) => n.sourceKind === "runtime" && distances.has(n.path) && distances.get(n.path) > 0).map((n) => ({ path: n.path, surface: n.surface, importDistance: distances.get(n.path) }))
    .sort((a, b) => a.importDistance - b.importDistance || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const bySurface = {};
  for (const surface of [...new Set(tests.map((t) => t.surface ?? "unknown"))].sort()) {
    const list = tests.filter((t) => (t.surface ?? "unknown") === surface);
    bySurface[surface] = { total: list.length, items: list.slice(0, limit), omitted: Math.max(0, list.length - limit) };
  }
  return {
    sourceSha: sha,
    targets: uniqueTargets,
    missingTargets,
    depth,
    limit,
    testCandidates: bySurface,
    runtimeConsumers: { total: runtime.length, items: runtime.slice(0, limit), omitted: Math.max(0, runtime.length - limit) },
    mandatoryPolicyGroups: Object.keys(VITEST_GROUPS),
    depthBoundary: [...distances.values()].some((d) => d === depth),
    status: "STATIC_CANDIDATES_ONLY",
    limitations: "Import edges only (runtime and type). Missing targets, depth/limit boundaries, non-import associations, HTTP/RPC, SQL, E2E, fixtures and safety tests require independent review. This report must not gate or replace validation policy.",
  };
}

function main(args) {
  const [graphPath, sha, ...targets] = args;
  if (!graphPath || !sha || !targets.length) throw new Error("Usage: node scripts/reports/discover-related-tests.mjs GRAPH_JSON FULL_SHA TARGET...");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  verifyCommitSha(root, sha);
  const graph = JSON.parse(readFileSync(graphPath, "utf8"));
  process.stdout.write(JSON.stringify(discoverRelatedTests(graph, sha, targets), null, 2) + "\n");
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
