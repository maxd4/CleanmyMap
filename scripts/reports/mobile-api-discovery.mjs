#!/usr/bin/env node
// Static discovery only. No application imports or network calls.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { gitExecutable } from "../ci/git-executable.mjs";
import { createGitRepositoryView } from "../checks/repository-view.mjs";
import { scanVercelSurface } from "../vercel-audit-core.mjs";

const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function verifyCommitSha(root, sha) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("Full 40-hex Git SHA required");
  const resolved = execFileSync(gitExecutable(), ["rev-parse", "--verify", `${sha}^{commit}`], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (resolved !== sha) throw new Error(`Commit SHA mismatch: ${sha} resolved to ${resolved}`);
}

function routeSegments(file) {
  const prefix = "apps/web/src/app/api/";
  if (!file.startsWith(prefix) || !/\/route\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(file)) return null;
  const parts = file.slice(prefix.length).split("/").slice(0, -1);
  if (parts.some((p) => p.startsWith("@") || /^\(\.{1,3}\)/.test(p))) return null;
  return ["api", ...parts.filter((p) => !/^\([^()]+\)$/.test(p))];
}

function routeContractKey(file) {
  const prefix = "apps/web/src/app/api/";
  if (!file.startsWith(prefix)) return null;
  return file.slice(prefix.length).replace(/\/route\.(?:ts|tsx|js|jsx|mjs|cjs)$/, "");
}

function matchingSegments(route, actual, i = 0, j = 0) {
  if (i === route.length) return j === actual.length;
  const segment = route[i];
  if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) return i === route.length - 1;
  if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return i === route.length - 1 && j < actual.length;
  if (j === actual.length) return false;
  const dynamic = /^\[[^\]]+\]$/.test(segment);
  if (actual[j] !== "{param}" && !dynamic && segment !== actual[j]) return false;
  return matchingSegments(route, actual, i + 1, j + 1);
}

export function matchApiReference(routeFiles, reference) {
  if (typeof reference !== "string" || !reference.startsWith("/api/")) return { status: "UNRESOLVED_PATH", candidates: [] };
  const cleanPath = reference.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  const actual = cleanPath.slice(1).split("/");
  if (actual.some((p) => !p || (p.includes("{param}") && p !== "{param}"))) return { status: "UNRESOLVED_PATH", candidates: [] };
  const candidates = [...new Set(routeFiles.filter((file) => {
    const route = routeSegments(file);
    return route && matchingSegments(route, actual);
  }))].sort();
  return { status: candidates.length === 0 ? "UNMATCHED" : candidates.length === 1 ? "CANDIDATE" : "AMBIGUOUS", candidates };
}

function extractExportedMethods(source) {
  const methods = new Set();
  for (const m of source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)) {
    methods.add(m[1]);
  }
  for (const m of source.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)) {
    methods.add(m[1]);
  }
  for (const m of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/i).pop()?.trim();
      if (name && HTTP_METHODS.has(name)) methods.add(name);
    }
  }
  return [...methods].sort();
}

function collectAuthContractKeys(view) {
  const keys = new Set();
  for (const file of view.listFiles("apps/web/src/lib/auth")) {
    if (!/^apps\/web\/src\/lib\/auth\/api-authorization-contract(?:\.[^.]+)?\.ts$/.test(file)) continue;
    const content = view.readText(file);
    for (const m of content.matchAll(/["']([^"'\s]+\/[^"'\s]+|health|ping|version)["']\s*:/g)) {
      keys.add(m[1]);
    }
  }
  return keys;
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
  if (node.properties.some((p) => !ts.isPropertyAssignment(p) || ts.isComputedPropertyName(p.name))) return null;
  const methods = node.properties.filter((p) => (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === "method");
  if (methods.length === 0) return "GET";
  if (methods.length !== 1 || !ts.isStringLiteralLike(methods[0].initializer)) return null;
  const method = methods[0].initializer.text.toUpperCase();
  return HTTP_METHODS.has(method) ? method : null;
}

export function discoverMobileReferences(file, source, routeFiles, routeMeta = null) {
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
        if (directClient || reference) {
          const match = matchApiReference(routeFiles, reference);
          const method = declaredMethod(node.arguments[1]);
          const singleRoute = match.status === "CANDIDATE" ? match.candidates[0] : null;
          const meta = singleRoute && routeMeta ? routeMeta.get(singleRoute) : null;
          const serverMethods = meta?.serverMethods ?? null;
          const methodMismatch = Boolean(
            singleRoute && method && Array.isArray(serverMethods) && serverMethods.length > 0 && !serverMethods.includes(method),
          );
          references.push({
            file,
            line: parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1,
            kind: directClient ? "mobileRequest" : "fetch-path-hint",
            method,
            ...match,
            ...(meta ? { serverMethods, authContractDeclared: meta.authContractDeclared, methodMismatch } : {}),
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
  const authKeys = collectAuthContractKeys(view);
  const routeMeta = new Map();
  for (const routeFile of routeFiles) {
    if (typeof view.exists === "function" && !view.exists(routeFile)) continue;
    const serverMethods = extractExportedMethods(view.readText(routeFile));
    const key = routeContractKey(routeFile);
    routeMeta.set(routeFile, {
      serverMethods,
      authContractDeclared: key ? authKeys.has(key) : false,
    });
  }
  const references = view.listFiles("apps/mobile").filter(isMobileSource)
    .flatMap((file) => discoverMobileReferences(file, view.readText(file), routeFiles, routeMeta));
  return {
    schemaVersion: 1,
    sourceSha: sha,
    measuredSource: "git",
    status: "STATIC_DISCOVERY",
    references,
    limitations: [
      "Direct imported mobileRequest calls and recognizable fetch path hints only.",
      "No symbol binding, URL precedence, authorization verdict or runtime proof.",
      "Computed paths, wrappers, dynamic fetch origins, RPC and direct Supabase accesses require complementary review.",
    ],
  };
}

function main(args) {
  if (args.length !== 1 || !/^[a-f0-9]{40}$/.test(args[0])) throw new Error("Usage: node scripts/reports/mobile-api-discovery.mjs FULL_GIT_SHA");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  verifyCommitSha(root, args[0]);
  const view = createGitRepositoryView(args[0], root);
  const { apiRoutes } = scanVercelSurface({ view });
  process.stdout.write(JSON.stringify(buildMobileApiDiscovery(view, args[0], apiRoutes), null, 2) + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
