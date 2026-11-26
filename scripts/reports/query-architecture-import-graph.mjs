#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function queryGraph(graph, selector, expectedSha, limit = 20) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("limit must be an integer between 1 and 100");
  if (typeof expectedSha !== "string" || !/^[a-f0-9]{40}$/i.test(expectedSha)) throw new Error("full expected SHA required");
  if (graph?.schemaVersion !== 1 || graph.report !== "architecture-import-graph" || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new Error("invalid graph schema");
  if (graph.gitSha !== expectedSha || graph.provenance?.verified !== true || graph.provenance?.measuredSource !== "git") throw new Error("graph provenance mismatch or unverified source");
  if (typeof selector !== "string" || !selector.trim() || selector.includes("\\") || selector.startsWith("/") || selector.split("/").includes("..")) throw new Error("repository-relative path or directory required");
  const normalized = selector.replace(/\/+$/, "");
  const selected = graph.nodes.filter(node => node.path === normalized || node.path.startsWith(normalized + "/"));
  if (!selected.length) throw new Error("no matching graph nodes");
  const scope = new Set(selected.map(node => node.path));
  const incoming = graph.edges.filter(edge => scope.has(edge.to) && !scope.has(edge.from));
  const outgoing = graph.edges.filter(edge => scope.has(edge.from) && !scope.has(edge.to));
  const bounded = values => {
    const items = [...new Set(values)].sort();
    return { total: items.length, items: items.slice(0, limit), omitted: Math.max(0, items.length - limit) };
  };
  return {
    schemaVersion: 1, gitSha: graph.gitSha, selector: normalized, limit,
    nodes: bounded(selected.map(n => n.path)),
    runtimeCallers: bounded(incoming.filter(e => e.sourceKind === "runtime" && e.kind === "runtime").map(e => e.from)),
    typeCallers: bounded(incoming.filter(e => e.sourceKind === "runtime" && e.kind === "type-only").map(e => e.from)),
    tests: bounded([...selected.filter(n => n.sourceKind === "test").map(n => n.path), ...incoming.filter(e => e.sourceKind === "test").map(e => e.from)]),
    runtimeDependencies: bounded(outgoing.filter(e => e.sourceKind === "runtime" && e.kind === "runtime").map(e => e.to)),
    typeDependencies: bounded(outgoing.filter(e => e.sourceKind === "runtime" && e.kind === "type-only").map(e => e.to)),
    unresolved: bounded((graph.findings?.unresolvedInternal ?? []).filter(e => scope.has(e.from)).map(e => `${e.from}:${e.line} ${e.specifier}`)),
    limitations: "Direct static graph edges only; excludes string-based HTTP/RPC references, indirect callers and non-import test associations."
  };
}

function main(args) {
  const [graphPath, selector, expectedSha, limit, ...extra] = args;
  if (!graphPath || !selector || !expectedSha || extra.length) {
    throw new Error("Usage: node scripts/reports/query-architecture-import-graph.mjs GRAPH_JSON PATH_OR_DIRECTORY FULL_SHA [LIMIT]");
  }
  const graph = JSON.parse(readFileSync(graphPath, "utf8"));
  process.stdout.write(JSON.stringify(queryGraph(graph, selector, expectedSha, limit === undefined ? 20 : Number(limit)), null, 2) + "\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
