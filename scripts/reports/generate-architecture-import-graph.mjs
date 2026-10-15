#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { createRepositoryView, parseRepositoryRef } from "../checks/repository-view.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const sourceExtensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"];
const ignoredDirectoryNames = new Set([
  ".expo",
  ".next",
  "android",
  "build",
  "coverage",
  "dist",
  "ios",
  "node_modules",
  "out",
  "vendor",
]);

function createSurfaces(root) {
  return [
    {
      id: "web",
      root: path.join(root, "apps/web/src"),
      aliases: [["@/", path.join(root, "apps/web/src")]],
    },
    {
      id: "mobile",
      root: path.join(root, "apps/mobile"),
      aliases: [],
    },
  ];
}

function git(args, cwd = repositoryRoot) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function normalizePath(filePath, root = repositoryRoot) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function sortStrings(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort((left, right) => left.localeCompare(right, "en")).map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value), null, 2) + "\n";
}

function isSourceFile(filePath) {
  return sourceExtensions.includes(path.extname(filePath).toLowerCase());
}

function shouldIgnore(filePath) {
  return filePath.split(path.sep).some((segment) => ignoredDirectoryNames.has(segment));
}

function listSourceFilesFromView(view, root, directory) {
  const prefix = normalizePath(directory, root);
  return view
    .listFiles(prefix)
    .filter((relativePath) => isSourceFile(relativePath) && !shouldIgnore(relativePath))
    .map((relativePath) => path.resolve(root, ...relativePath.split("/")));
}

function isTestFile(filePath, root = repositoryRoot) {
  const relative = normalizePath(filePath, root);
  return /(^|\/)(?:__tests__|tests?)(\/|$)/.test(relative)
    || /\.(?:test|spec)\.[^.]+$/.test(relative);
}

function sourceKind(filePath, root = repositoryRoot) {
  return isTestFile(filePath, root) ? "test" : "runtime";
}

function applyAlias(surface, specifier) {
  for (const [alias, target] of surface.aliases) {
    if (specifier.startsWith(alias)) return path.join(target, specifier.slice(alias.length));
  }
  return null;
}

function resolveInternalImport(surface, importerPath, specifier, { root = repositoryRoot, view } = {}) {
  const aliased = applyAlias(surface, specifier);
  if (!specifier.startsWith(".") && !aliased) return null;
  const basePath = aliased ?? path.resolve(path.dirname(importerPath), specifier);
  const candidates = [basePath];
  for (const extension of sourceExtensions) {
    candidates.push(`${basePath}${extension}`);
  }
  for (const extension of sourceExtensions) {
    candidates.push(path.join(basePath, `index${extension}`));
  }
  const resolved = candidates.find((candidate) => {
    if (view) return view.isFile(normalizePath(candidate, root));
    return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
  });
  if (!resolved || !resolved.startsWith(`${surface.root}${path.sep}`) || shouldIgnore(resolved)) return null;
  return resolved;
}

function classifyDomain(surface, filePath, root = repositoryRoot) {
  const relative = path.relative(surface.root, filePath).split(path.sep);
  if (surface.id === "web") {
    if (isTestFile(filePath, root)) return "tests";
    if (relative[0] === "app") return `app/${relative[1] ?? "root"}`;
    if (relative[0] === "components") return relative.length > 2 ? `components/${relative[1] ?? "root"}` : "components";
    if (relative[0] === "lib") return relative.length > 2 ? `lib/${relative[1] ?? "root"}` : "lib";
    return relative[0] ?? "root";
  }
  if (isTestFile(filePath, root)) return "tests";
  if (relative[0] === "App.tsx" || relative[0] === "index.ts") return "ui-entry";
  if (relative[0] === "screens") return `screens/${relative[1] ?? "root"}`;
  if (relative[0] === "hooks") return relative.length > 2 ? `hooks/${relative[1] ?? "root"}` : "hooks";
  if (relative[0] === "lib") return relative.length > 2 ? `lib/${relative[1] ?? "root"}` : "lib";
  return relative[0] ?? "root";
}

function classifyLayer(surface, filePath, root = repositoryRoot) {
  if (isTestFile(filePath, root)) return "test";
  const relative = path.relative(surface.root, filePath).split(path.sep);
  const first = relative[0] ?? "";
  const second = relative[1] ?? "";
  if (surface.id === "web") {
    if (["app", "components", "hooks"].includes(first)) return "ui";
    if (first === "lib" && ["actions", "account", "admin", "chat", "community", "dashboard", "funding", "gamification", "missions", "notifications", "pilotage", "route", "spogomi", "spots"].includes(second)) return "application";
    if (first === "lib" && ["auth", "backpressure", "botid", "browser", "github", "http", "logging", "maps", "media", "observability", "persistence", "posthog", "rate-limit", "security", "storage", "supabase"].includes(second)) return "infrastructure";
    if (first === "lib" && ["domain", "contracts", "data", "geo", "impact", "learning", "reports", "sections-registry", "validation", "waste"].includes(second)) return "domain";
    return "domain";
  }
  if (["App.tsx", "index.ts", "screens", "components", "hooks"].includes(first)) return "ui";
  if (first === "tasks") return "application";
  if (first === "lib" && /(?:api|auth|network|service|storage|supabase|sync)/i.test(second)) return "infrastructure";
  if (first === "security") return "infrastructure";
  if (first === "types") return "domain";
  return "domain";
}

function parseImportKind(node) {
  const clause = node.importClause;
  if (!clause) return "runtime";
  if (clause.isTypeOnly) return "type-only";
  if (!clause.name && clause.namedBindings?.kind === ts.SyntaxKind.NamedImports && clause.namedBindings.elements.length > 0 && clause.namedBindings.elements.every((element) => element.isTypeOnly)) {
    return "type-only";
  }
  return "runtime";
}

function parseExportKind(node) {
  if (node.isTypeOnly) return "type-only";
  const clause = node.exportClause;
  if (clause && ts.isNamedExports(clause) && clause.elements.length > 0 && clause.elements.every((element) => element.isTypeOnly)) {
    return "type-only";
  }
  return "runtime";
}

function moduleSpecifierText(node) {
  return node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier.text : null;
}

export function parseImports(filePath, source) {
  const scriptKind = filePath.endsWith(".tsx") || filePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
  const imports = [];
  function add(node, specifier, kind, form) {
    if (!specifier) return;
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    imports.push({ specifier, kind, form, line: position.line + 1 });
  }
  function visit(node) {
    if (ts.isImportDeclaration(node)) add(node, moduleSpecifierText(node), parseImportKind(node), "import");
    else if (ts.isExportDeclaration(node)) add(node, moduleSpecifierText(node), parseExportKind(node), "export");
    else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node, moduleSpecifierText(node.moduleReference), "runtime", "import-equals");
    else if (ts.isCallExpression(node) && node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(node, node.arguments[0].text, "runtime", "dynamic-import");
      else if (ts.isIdentifier(node.expression) && node.expression.text === "require") add(node, node.arguments[0].text, "runtime", "require");
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return imports;
}

function isPublicFacade(relativePath) {
  return relativePath.endsWith("/index.ts")
    || relativePath.endsWith("/index.tsx")
    || [
      "apps/web/src/lib/actions/data-contract.ts",
      "apps/web/src/lib/actions/unified-source.ts",
    ].includes(relativePath);
}

function facadeOwner(relativePath) {
  if (relativePath.endsWith("/index.ts") || relativePath.endsWith("/index.tsx")) return relativePath.slice(0, relativePath.lastIndexOf("/"));
  if (relativePath.endsWith("/data-contract.ts")) return relativePath.slice(0, relativePath.lastIndexOf("/"));
  if (relativePath.endsWith("/unified-source.ts")) return relativePath.slice(0, relativePath.lastIndexOf("/"));
  return null;
}

function compareEdge(left, right) {
  return [left.from, left.to, left.kind, left.sourceKind, left.form, left.specifier, left.line].map(String).join("\0").localeCompare([right.from, right.to, right.kind, right.sourceKind, right.form, right.specifier, right.line].map(String).join("\0"));
}

function findCycles(nodes, edges) {
  const adjacency = new Map(nodes.map((node) => [node.path, []]));
  for (const edge of edges) adjacency.get(edge.from)?.push(edge.to);
  for (const targets of adjacency.values()) targets.sort((a, b) => a.localeCompare(b));
  const indexByNode = new Map();
  const lowLinkByNode = new Map();
  const stack = [];
  const onStack = new Set();
  const stronglyConnectedComponents = [];
  let nextIndex = 0;

  function visit(node) {
    indexByNode.set(node, nextIndex);
    lowLinkByNode.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);
    for (const target of adjacency.get(node) ?? []) {
      if (!indexByNode.has(target)) {
        visit(target);
        lowLinkByNode.set(node, Math.min(lowLinkByNode.get(node), lowLinkByNode.get(target)));
      } else if (onStack.has(target)) {
        lowLinkByNode.set(node, Math.min(lowLinkByNode.get(node), indexByNode.get(target)));
      }
    }
    if (lowLinkByNode.get(node) === indexByNode.get(node)) {
      const component = [];
      let current;
      do {
        current = stack.pop();
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      component.sort((a, b) => a.localeCompare(b));
      if (component.length > 1 || (component.length === 1 && adjacency.get(component[0])?.includes(component[0]))) {
        stronglyConnectedComponents.push(component);
      }
    }
  }

  for (const node of [...adjacency.keys()].sort((a, b) => a.localeCompare(b))) {
    if (!indexByNode.has(node)) visit(node);
  }
  return stronglyConnectedComponents.sort((left, right) => left[0].localeCompare(right[0]));
}

function summarizeDomains(nodes, edges) {
  const domains = new Map();
  function ensureDomain(domain) {
    const domainKey = domain || "unknown";
    if (!domains.has(domainKey)) domains.set(domainKey, { domain: domainKey, layers: new Set(), files: 0, runtimeFanIn: 0, runtimeFanOut: 0, typeOnlyFanIn: 0, typeOnlyFanOut: 0, testFanIn: 0, testFanOut: 0 });
    return domains.get(domainKey);
  }
  for (const node of nodes) {
    const entry = ensureDomain(node.domain);
    entry.layers.add(node.layer);
    entry.files += 1;
  }
  for (const edge of edges) {
    const from = ensureDomain(edge.fromDomain);
    const to = ensureDomain(edge.toDomain);
    const suffix = edge.kind === "type-only" ? "TypeOnly" : "Runtime";
    from[`${edge.sourceKind === "test" ? "test" : suffix === "Runtime" ? "runtime" : "typeOnly"}FanOut`] += 1;
    to[`${edge.sourceKind === "test" ? "test" : suffix === "Runtime" ? "runtime" : "typeOnly"}FanIn`] += 1;
  }
  return [...domains.values()].map((entry) => ({ ...entry, layers: sortStrings(entry.layers) })).sort((a, b) => a.domain.localeCompare(b.domain));
}

export function buildArchitectureImportGraph({ source = "worktree", root = repositoryRoot, surfaces: suppliedSurfaces, gitSha, ref, view: suppliedView } = {}) {
  const measurementView = suppliedView ?? createRepositoryView({ root, ref });
  const activeSurfaces = suppliedSurfaces ?? createSurfaces(root);
  const sha = gitSha ?? git(["rev-parse", ref ?? "HEAD"], root);
  const provenanceVerified = measurementView.mode === "git" && Boolean(ref);
  const nodes = [];
  const edges = [];
  const unresolvedInternal = [];
  for (const surface of activeSurfaces) {
    for (const filePath of listSourceFilesFromView(measurementView, root, surface.root)) {
      const relativePath = normalizePath(filePath, root);
      const node = {
        path: relativePath,
        surface: surface.id,
        domain: classifyDomain(surface, filePath, root),
        layer: classifyLayer(surface, filePath, root),
        sourceKind: sourceKind(filePath, root),
        publicFacade: isPublicFacade(relativePath),
        facadeOwner: facadeOwner(relativePath),
      };
      nodes.push(node);
      const sourceText = measurementView.readText(relativePath);
      for (const parsed of parseImports(filePath, sourceText)) {
        const targetPath = resolveInternalImport(surface, filePath, parsed.specifier, { root, view: measurementView });
        if (!targetPath) {
          if (parsed.specifier.startsWith(".") || parsed.specifier.startsWith("@/")) unresolvedInternal.push({ from: relativePath, specifier: parsed.specifier, line: parsed.line });
          continue;
        }
        const targetRelative = normalizePath(targetPath, root);
        const targetNode = {
          path: targetRelative,
          surface: surface.id,
          domain: classifyDomain(surface, targetPath, root),
          layer: classifyLayer(surface, targetPath, root),
          sourceKind: sourceKind(targetPath, root),
          publicFacade: isPublicFacade(targetRelative),
          facadeOwner: facadeOwner(targetRelative),
        };
        const edge = {
          from: relativePath,
          to: targetRelative,
          surface: surface.id,
          sourceKind: node.sourceKind,
          kind: parsed.kind,
          form: parsed.form,
          specifier: parsed.specifier,
          line: parsed.line,
          fromDomain: node.domain,
          toDomain: targetNode.domain,
          fromLayer: node.layer,
          toLayer: targetNode.layer,
          crossDomain: node.domain !== targetNode.domain,
          targetsPublicFacade: targetNode.publicFacade,
          importsOwnFacade: targetNode.publicFacade && targetNode.facadeOwner && node.path.startsWith(`${targetNode.facadeOwner}/`) && node.path !== targetNode.path,
          uiToInfrastructure: node.layer === "ui" && targetNode.layer === "infrastructure",
          domainToUi: node.layer === "domain" && targetNode.layer === "ui",
          invertedLayer: node.sourceKind === "runtime" && node.layer !== "test" && targetNode.layer !== "test" && ["ui", "application", "domain", "infrastructure", "external-services"].indexOf(node.layer) > ["ui", "application", "domain", "infrastructure", "external-services"].indexOf(targetNode.layer),
        };
        edges.push(edge);
      }
    }
  }
  nodes.sort((a, b) => a.path.localeCompare(b.path));
  edges.sort(compareEdge);
  const runtimeEdges = edges.filter((edge) => edge.kind === "runtime");
  const typeOnlyEdges = edges.filter((edge) => edge.kind === "type-only");
  const graph = {
    schemaVersion: 1,
    report: "architecture-import-graph",
    source,
    repository: "maxd4/CleanmyMap",
    gitSha: sha,
    provenance: {
      gitRef: ref ?? null,
      measuredSource: measurementView.mode,
      verified: provenanceVerified,
    },
    generatedAt: null,
    surfaces: activeSurfaces.map((surface) => ({ id: surface.id, root: normalizePath(surface.root, root) })),
    layers: ["ui", "application", "domain", "infrastructure", "external-services", "test"],
    nodes,
    edges,
    findings: {
      crossDomainImports: edges.filter((edge) => edge.crossDomain),
      publicFacadeImports: edges.filter((edge) => edge.targetsPublicFacade),
      ownFacadeImports: edges.filter((edge) => edge.importsOwnFacade),
      uiToInfrastructure: edges.filter((edge) => edge.uiToInfrastructure),
      domainToUi: edges.filter((edge) => edge.domainToUi),
      invertedLayer: edges.filter((edge) => edge.invertedLayer),
      cyclesRuntime: findCycles(nodes, runtimeEdges),
      cyclesAll: findCycles(nodes, edges),
      unresolvedInternal,
    },
    summary: {
      files: nodes.length,
      runtimeFiles: nodes.filter((node) => node.sourceKind === "runtime").length,
      testFiles: nodes.filter((node) => node.sourceKind === "test").length,
      imports: edges.length,
      runtimeImports: runtimeEdges.length,
      typeOnlyImports: typeOnlyEdges.length,
      testImports: edges.filter((edge) => edge.sourceKind === "test").length,
      crossDomainImports: edges.filter((edge) => edge.crossDomain).length,
      publicFacadeImports: edges.filter((edge) => edge.targetsPublicFacade).length,
      ownFacadeImports: edges.filter((edge) => edge.importsOwnFacade).length,
      uiToInfrastructure: edges.filter((edge) => edge.uiToInfrastructure).length,
      domainToUi: edges.filter((edge) => edge.domainToUi).length,
      invertedLayer: edges.filter((edge) => edge.invertedLayer).length,
      runtimeCycles: findCycles(nodes, runtimeEdges).length,
      allCycles: findCycles(nodes, edges).length,
      unresolvedInternalImports: unresolvedInternal.length,
    },
    domains: summarizeDomains(nodes, edges),
  };
  return graph;
}

function parseArgs(args) {
  const options = { source: "worktree", output: null, ref: parseRepositoryRef(args) };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--output") options.output = args[++index];
    else if (arg === "--source") options.source = args[++index];
    else if (arg === "--ref") options.ref = args[++index];
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const graph = buildArchitectureImportGraph(options);
  const output = stableJson(graph);
  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, output);
  } else {
    process.stdout.write(output);
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === path.resolve(import.meta.filename)) main();
