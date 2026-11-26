#!/usr/bin/env node
// CANDIDATE. Static discovery only. No application imports or network calls.
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createGitRepositoryView } from "../checks/repository-view.mjs";
import { scanVercelSurface } from "../vercel-audit-core.mjs";

function routeSegments(file) {
  const prefix = "apps/web/src/app/api/";
  if (!file.startsWith(prefix) || !/\/route\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(file)) return null;
  const parts=file.slice(prefix.length).split("/").slice(0,-1);
  if (parts.some(p => p.startsWith("@") || /^\(\.{1,3}\)/.test(p))) return null;
  return ["api",...parts.filter(p => !/^\([^()]+\)$/.test(p))];
}

function matchingSegments(route, actual, i=0, j=0) {
  if (i===route.length) return j===actual.length;
  const segment=route[i];
  if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) return i===route.length-1;
  if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return i===route.length-1 && j<actual.length;
  if (j===actual.length) return false;
  const dynamic=/^\[[^\]]+\]$/.test(segment);
  if (actual[j]!=="{param}" && !dynamic && segment!==actual[j]) return false;
  return matchingSegments(route,actual,i+1,j+1);
}

export function matchApiReference(routeFiles, reference) {
  if(typeof reference!=="string" || !reference.startsWith("/api/")) return {status:"UNRESOLVED_PATH",candidates:[]};
  const path=reference.split(/[?#]/,1)[0].replace(/\/+$/,"");
  const actual=path.slice(1).split("/");
  if(actual.some(p=>!p || (p.includes("{param}")&&p!=="{param}"))) return {status:"UNRESOLVED_PATH",candidates:[]};
  const candidates=[...new Set(routeFiles.filter(file=>{const route=routeSegments(file);return route&&matchingSegments(route,actual)}))].sort();
  return {status:candidates.length===0?"UNMATCHED":candidates.length===1?"CANDIDATE":"AMBIGUOUS",candidates};
}

function clientAliases(sourceFile) {
  const names = new Set();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (!statement.moduleSpecifier.text.endsWith("/mobile-api-client")) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const item of bindings.elements) {
      if ((item.propertyName ?? item.name).text === "mobileRequest") names.add(item.name.text);
    }
  }
  return names;
}

function pathReference(node, allowFetchBase) {
  if (!node) return null;
  if (ts.isStringLiteralLike(node)) return node.text.startsWith("/api/") ? node.text : null;
  if (!ts.isTemplateExpression(node)) return null;
  let result = node.head.text;
  for (const [index, span] of node.templateSpans.entries()) {
    // A leading interpolated fetch origin is a hint only, never proof of origin.
    if (!(allowFetchBase && index === 0 && result === "" && span.literal.text.startsWith("/api/"))) {
      result += "{param}";
    }
    result += span.literal.text;
  }
  return result.startsWith("/api/") ? result : null;
}

function declaredMethod(node) {
  if (!node) return "GET";
  if (!ts.isObjectLiteralExpression(node)) return null;
  if (node.properties.some(p => !ts.isPropertyAssignment(p) || ts.isComputedPropertyName(p.name))) return null;
  const methods = node.properties.filter(p => (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === "method");
  if (methods.length === 0) return "GET";
  if (methods.length !== 1 || !ts.isStringLiteralLike(methods[0].initializer)) return null;
  const method = methods[0].initializer.text.toUpperCase();
  return /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(method) ? method : null;
}

export function discoverMobileReferences(file, source, routeFiles) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const aliases = clientAliases(parsed);
  const references = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      const directClient = aliases.has(name);
      const fetchHint = name === "fetch";
      if (directClient || fetchHint) {
        const reference = pathReference(node.arguments[0], fetchHint);
        // Unknown mobileRequest paths are retained; arbitrary non-API fetches are not.
        if (directClient || reference) {
          const match = matchApiReference(routeFiles, reference);
          references.push({
            file,
            line: parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1,
            kind: directClient ? "mobileRequest" : "fetch-path-hint",
            method: declaredMethod(node.arguments[1]),
            ...match,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return references;
}

function isMobileSource(file) {
  return /^apps\/mobile\/.*\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(file)
    && !/(?:^|\/)(?:vendor|node_modules|\.expo|dist|build|coverage|android|ios|tests|__tests__)(?:\/|$)/.test(file)
    && !/\.(?:test|spec)(?:\.[^.]+)*\.[^.]+$/.test(file);
}

export function buildMobileApiDiscovery(view, sha, routeFiles) {
  if (!/^[a-f0-9]{40}$/.test(sha) || view.mode !== "git") throw new Error("Verified full Git SHA required");
  const references = view.listFiles("apps/mobile").filter(isMobileSource)
    .flatMap(file => discoverMobileReferences(file, view.readText(file), routeFiles));
  return {
    schemaVersion: 1,
    sourceSha: sha,
    measuredSource: "git",
    status: "STATIC_DISCOVERY",
    references,
    limitations: [
      "Direct imported mobileRequest calls and recognizable fetch path hints only.",
      "No symbol binding, URL precedence, server method, authorization or runtime proof.",
      "Computed paths, wrappers, dynamic fetch origins, RPC and direct Supabase accesses require complementary review."
    ],
  };
}

function main(args) {
  if (args.length !== 1 || !/^[a-f0-9]{40}$/.test(args[0])) throw new Error("Usage: node scripts/reports/mobile-api-discovery.mjs FULL_GIT_SHA");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const view = createGitRepositoryView(args[0], root);
  const { apiRoutes } = scanVercelSurface({ view });
  process.stdout.write(JSON.stringify(buildMobileApiDiscovery(view, args[0], apiRoutes), null, 2) + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
