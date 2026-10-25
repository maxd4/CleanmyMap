import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";
import {
  API_AUTHORIZATION_CONTRACT,
  type ApiAuthorizationContractEntry,
  type ApiHttpMethod,
} from "@/lib/auth/api-authorization-contract";
import { assertNoApiAuthorizationContractKeyCollisions } from "@/lib/auth/api-authorization-contract.assembly";
import type { ApiAuthorizationContract } from "@/lib/auth/api-authorization-contract.types";

// This is an inventory scope, not an access decision. Every discovered method
// in these API domains must have an entry in API_AUTHORIZATION_CONTRACT.
const contractedApiFamilies = new Set([
  "admin",
  "actions",
  "account",
  "community",
  "chat",
  "analytics",
  "reports",
  "partners",
  "pilotage",
  "recycling",
  "route",
  "spots",
  "users",
  "send",
  "services",
  "email",
]);
const apiRoot = dirname(fileURLToPath(import.meta.url));
const httpMethodPattern =
  /export\s+(?:async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(|const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=)/g;

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function extractRouteMethods(source: string): Map<ApiHttpMethod, string> {
  const matches = Array.from(source.matchAll(httpMethodPattern));
  const methods = new Map<ApiHttpMethod, string>();
  matches.forEach((match, index) => {
    const method = (match[1] ?? match[2]) as ApiHttpMethod;
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? source.length;
    methods.set(method, source.slice(start, end));
  });
  return methods;
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

function resolveLocalModulePath(fromPath: string, specifier: string): string | null {
  const basePath = join(dirname(fromPath), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mjs`,
    `${basePath}.js`,
    join(basePath, "index.ts"),
    join(basePath, "index.tsx"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

type LocalModuleSources = Map<string, string>;

function collectLocalModuleSources(
  path: string,
  source: string,
  moduleSources: LocalModuleSources,
  visited: Set<string>,
): void {
  if (visited.has(path)) return;
  visited.add(path);
  moduleSources.set(path, source);

  const imports = source.matchAll(
    /(?:import|export)(?:[\s\S]*?from\s*)?\(?\s*["'](\.{1,2}\/[^"']+)["']\s*\)?/g,
  );
  for (const match of imports) {
    const targetPath = resolveLocalModulePath(path, match[1] ?? "");
    if (!targetPath) continue;
    collectLocalModuleSources(
      targetPath,
      readFileSync(targetPath, "utf8"),
      moduleSources,
      visited,
    );
  }
}

function resolveLocalModuleFromSources(
  fromPath: string,
  specifier: string,
  moduleSources: ReadonlyMap<string, string>,
): string | null {
  const basePath = join(dirname(fromPath), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mjs`,
    `${basePath}.js`,
    join(basePath, "index.ts"),
    join(basePath, "index.tsx"),
  ];
  return candidates.find((candidate) => moduleSources.has(candidate)) ?? null;
}

function extractLocalImports(
  source: string,
): Array<{ localName: string; importedName: string; specifier: string }> {
  const imports: Array<{ localName: string; importedName: string; specifier: string }> = [];
  const sourceFile = ts.createSourceFile(
    "api-boundary-module.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    if (!specifier.startsWith("./") && !specifier.startsWith("../")) continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name) {
      imports.push({ localName: clause.name.text, importedName: "default", specifier });
    }
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        imports.push({
          localName: element.name.text,
          importedName: element.propertyName?.text ?? element.name.text,
          specifier,
        });
      }
    }
  }
  return imports;
}

function extractLocalFunctionBodies(source: string): Map<string, string> {
  const functions = new Map<string, string>();
  const sourceFile = ts.createSourceFile(
    "api-boundary-module.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body) {
      functions.set(node.name.text, node.body.getText(sourceFile));
    } else if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
      node.initializer.body
    ) {
      functions.set(node.name.text, node.initializer.body.getText(sourceFile));
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return functions;
}

function collectIdentifierUsages(source: string): Set<string> {
  const sourceFile = ts.createSourceFile(
    "api-boundary-expression.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const usages = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node)) {
      const parent = node.parent;
      const isDeclaration =
        (ts.isVariableDeclaration(parent) && parent.name === node) ||
        (ts.isFunctionDeclaration(parent) && parent.name === node) ||
        (ts.isParameter(parent) && parent.name === node) ||
        (ts.isImportClause(parent) && parent.name === node) ||
        (ts.isImportSpecifier(parent) && (parent.name === node || parent.propertyName === node));
      if (!isDeclaration) usages.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return usages;
}

function hasEvidenceToken(
  source: string,
  token: string,
  identifierUsages = collectIdentifierUsages(source),
): boolean {
  const executableSource = withoutComments(source);
  if (!/^[A-Za-z_$][\w$]*$/.test(token)) return executableSource.includes(token);
  return (
    identifierUsages.has(token) ||
    (token.includes("_") && new RegExp(`["'\`]${token}["'\`]`).test(executableSource))
  );
}

function collectReachableMethodSource(
  entryPath: string,
  methodSource: string,
  moduleSources: ReadonlyMap<string, string>,
  analysisCache: {
    imports: Map<string, Array<{ localName: string; importedName: string; specifier: string }>>;
    functions: Map<string, Map<string, string>>;
  },
): string {
  const reachableSources: string[] = [];
  const visitedFunctions = new Set<string>();
  const identifierUsageCache = new Map<string, Set<string>>();
  const usesIdentifier = (source: string, name: string) => {
    const cached = identifierUsageCache.get(source);
    if (cached) return cached.has(name);
    const usages = collectIdentifierUsages(source);
    identifierUsageCache.set(source, usages);
    return usages.has(name);
  };

  const getImports = (modulePath: string) => {
    const cached = analysisCache.imports.get(modulePath);
    if (cached) return cached;
    const imports = extractLocalImports(moduleSources.get(modulePath) ?? "");
    analysisCache.imports.set(modulePath, imports);
    return imports;
  };

  const getFunctions = (modulePath: string) => {
    const cached = analysisCache.functions.get(modulePath);
    if (cached) return cached;
    const functions = extractLocalFunctionBodies(moduleSources.get(modulePath) ?? "");
    analysisCache.functions.set(modulePath, functions);
    return functions;
  };

  function visitFunction(modulePath: string, functionName: string): void {
    const key = `${modulePath}#${functionName}`;
    if (visitedFunctions.has(key)) return;
    visitedFunctions.add(key);
    const body = getFunctions(modulePath).get(functionName);
    if (body === undefined) return;
    visitText(modulePath, body);
  }

  function visitText(modulePath: string, source: string): void {
    reachableSources.push(source);
    for (const [functionName] of getFunctions(modulePath)) {
      if (usesIdentifier(source, functionName)) visitFunction(modulePath, functionName);
    }
    for (const { localName, importedName, specifier } of getImports(modulePath)) {
      if (!usesIdentifier(source, localName)) continue;
      const targetPath = resolveLocalModuleFromSources(modulePath, specifier, moduleSources);
      if (targetPath) visitFunction(targetPath, importedName === "default" ? localName : importedName);
    }
  }

  visitText(entryPath, methodSource);
  return reachableSources.join("\n");
}

function missingEvidence(
  entry: ApiAuthorizationContractEntry,
  routeEntry: {
    source: string;
    methods: Map<ApiHttpMethod, string>;
    methodEvidenceSources?: ReadonlyMap<ApiHttpMethod, string>;
  },
  method: ApiHttpMethod,
): string[] {
  const methodSource = routeEntry.methods.get(method);
  const evidenceSource =
    entry.evidenceScope === "module"
      ? routeEntry.methodEvidenceSources?.get(method) ?? routeEntry.source
      : methodSource;
  const executableEvidenceSource = withoutComments(evidenceSource ?? "");
  const identifierUsages = collectIdentifierUsages(executableEvidenceSource);
  const missing = (entry.evidence ?? []).filter(
    (token) => !hasEvidenceToken(executableEvidenceSource, token, identifierUsages),
  );
  const missingHandlerEvidence = (entry.handlerEvidence ?? []).filter(
    (token) => !withoutComments(methodSource ?? "").includes(token),
  );
  return [...missing, ...missingHandlerEvidence];
}

function resolveRouteMethods(path: string, source: string) {
  const methods = extractRouteMethods(source);
  const methodOwners = new Map<ApiHttpMethod, string>(
    Array.from(methods.keys()).map((method) => [method, path]),
  );
  const moduleSources: LocalModuleSources = new Map();
  collectLocalModuleSources(path, source, moduleSources, new Set());
  const reExports = Array.from(
    source.matchAll(
      /export\s*\{\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\}\s*from\s*["']([^"']+)["']/g,
    ),
  );

  for (const match of reExports) {
    const method = match[1] as ApiHttpMethod;
    const specifier = match[2];
    const targetPath = resolveLocalModulePath(path, specifier);
    if (!targetPath) continue;
    const targetSource = readFileSync(targetPath, "utf8");
    const targetMethods = extractRouteMethods(targetSource);
    const methodSource = targetMethods.get(method);
    if (methodSource) {
      methods.set(method, methodSource);
      methodOwners.set(method, targetPath);
    }
  }

  const methodEvidenceSources = new Map<ApiHttpMethod, string>();
  const analysisCache = {
    imports: new Map<string, Array<{ localName: string; importedName: string; specifier: string }>>(),
    functions: new Map<string, Map<string, string>>(),
  };
  for (const [method, methodSource] of methods) {
    methodEvidenceSources.set(
      method,
      collectReachableMethodSource(
        methodOwners.get(method) ?? path,
        methodSource,
        moduleSources,
        analysisCache,
      ),
    );
  }

  return {
    methods,
    source: Array.from(moduleSources.values()).join("\n"),
    methodEvidenceSources,
  };
}

function readRouteInventory() {
  return walk(apiRoot)
    .filter((path) => path.endsWith("route.ts"))
    .map((path) => {
      const route = relative(apiRoot, dirname(path)).replaceAll("\\", "/");
      const family = route.split("/")[0] ?? "";
      if (!contractedApiFamilies.has(family)) return null;

      const source = readFileSync(path, "utf8");
      const resolved = resolveRouteMethods(path, source);
      return { path, route, ...resolved };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function contractEntries() {
  return Object.entries(API_AUTHORIZATION_CONTRACT).flatMap(([route, methods]) =>
    Object.entries(methods).map(([method, entry]) => ({
      key: `${route} ${method}`,
      route,
      method: method as ApiHttpMethod,
      entry: entry as ApiAuthorizationContractEntry,
    })),
  );
}

function buildInlineRouteEntry(
  routeSource: string,
  localModules: Record<string, string>,
) {
  const routePath = join(apiRoot, "__inline-api-boundary__", "route.ts");
  const moduleSources: LocalModuleSources = new Map([[routePath, routeSource]]);
  for (const [relativePath, moduleSource] of Object.entries(localModules)) {
    moduleSources.set(join(dirname(routePath), relativePath), moduleSource);
  }
  const methods = extractRouteMethods(routeSource);
  const methodEvidenceSources = new Map<ApiHttpMethod, string>();
  const analysisCache = {
    imports: new Map<string, Array<{ localName: string; importedName: string; specifier: string }>>(),
    functions: new Map<string, Map<string, string>>(),
  };
  for (const [method, methodSource] of methods) {
    methodEvidenceSources.set(
      method,
      collectReachableMethodSource(routePath, methodSource, moduleSources, analysisCache),
    );
  }
  return {
    source: Array.from(moduleSources.values()).join("\n"),
    methods,
    methodEvidenceSources,
  };
}

describe("API security boundaries", () => {
  it("audits every contracted route.ts method against the method-level contract", () => {
    const inventory = readRouteInventory();
    const discovered = inventory.flatMap(({ route, methods }) =>
      Array.from(methods.keys()).map((method) => `${route} ${method}`),
    );
    const declared = contractEntries().map(({ key }) => key);

    expect(new Set(declared)).toEqual(new Set(discovered));
    expect(declared).toHaveLength(discovered.length);
  });

  it("rejects duplicate route keys before fragment assembly", () => {
    const fragment = (routeKey: string) =>
      ({ [routeKey]: {} }) as ApiAuthorizationContract;

    expect(() =>
      assertNoApiAuthorizationContractKeyCollisions([
        { name: "first", contract: fragment("actions") },
        { name: "second", contract: fragment("actions") },
      ]),
    ).toThrow('Duplicate API authorization contract key "actions"');
  });

  it("keeps public-safe and authenticated/AuthZ decisions explicit per method", () => {
    const entries = contractEntries();
    const byKey = new Map(entries.map((entry) => [entry.key, entry.entry]));

    expect(entries.length).toBeGreaterThan(0);
    for (const { key, entry } of entries) {
      expect(entry.expected, `${key} needs an expected decision`).toBeTruthy();
      expect(entry.actual, `${key} needs runtime evidence description`).toBeTruthy();
      expect(entry.dimensions, `${key} needs authorization dimensions`).not.toHaveLength(0);
    }

    expect(byKey.get("actions/map GET")?.dimensions).toContain("public-safe");
    expect(byKey.get("actions/group-join GET")?.dimensions).toContain("public-safe");
    expect(byKey.get("actions/[actionId] PATCH")?.dimensions).toContain("authentication");
    expect(byKey.get("actions/[actionId] PATCH")?.dimensions).toContain("business permission");
  });

  it("requires handler evidence for every non-public contract entry", () => {
    const inventoryByRoute = new Map(
      readRouteInventory().map((entry) => [entry.route, entry]),
    );

    for (const { route, method, entry } of contractEntries()) {
      if (
        entry.dimensions.length === 1 &&
        entry.dimensions.includes("public-safe")
      ) {
        continue;
      }

      const routeEntry = inventoryByRoute.get(route);
      expect(routeEntry, `${route} ${method} is missing from route inventory`).toBeDefined();
      const methodSource = routeEntry?.methods.get(method);
      expect(methodSource, `${route} ${method} is missing from route.ts`).toBeDefined();

      for (const token of missingEvidence(entry, routeEntry!, method)) {
        expect.fail(`${route} ${method} missing guard evidence ${token}`);
      }

      if (entry.delegatesTo) {
        expect(methodSource).toMatch(
          new RegExp(`return\\s+${entry.delegatesTo}\\s*\\(`),
        );
      }
    }
  });

  it("does not let an import or a different HTTP method satisfy method evidence", () => {
    const fixture = `
      import { requireCreatorAccess } from "@/lib/authz";
      export async function GET() {
        return requireCreatorAccess();
      }
      export async function POST() {
        return new Response("ok");
      }
    `;
    const routeEntry = {
      source: fixture,
      methods: extractRouteMethods(fixture),
    };
    const entry: ApiAuthorizationContractEntry = {
      expected: "creator access",
      dimensions: ["admin/creator role"],
      actual: "POST requires creator access",
      handlerEvidence: ["requireCreatorAccess"],
      evidenceScope: "method",
    };

    expect(missingEvidence(entry, routeEntry, "POST")).toEqual([
      "requireCreatorAccess",
    ]);
  });

  it("does not count a comment as execution evidence", () => {
    const fixture = `
      export async function POST() {
        // requireCreatorAccess is expected here but is not called.
        return new Response("ok");
      }
    `;
    const routeEntry = {
      source: fixture,
      methods: extractRouteMethods(fixture),
    };
    const entry: ApiAuthorizationContractEntry = {
      expected: "creator access",
      dimensions: ["admin/creator role"],
      actual: "POST requires creator access",
      handlerEvidence: ["requireCreatorAccess"],
      evidenceScope: "method",
    };

    expect(missingEvidence(entry, routeEntry, "POST")).toEqual([
      "requireCreatorAccess",
    ]);
  });

  it("does not let an imported but unused helper satisfy module evidence", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { unusedAudit } from "./unused";
        export async function PATCH() {
          return new Response("ok");
        }
      `,
      {
        "unused.ts": `
          export function unusedAudit() {
            appendActionModerationAudit();
          }
        `,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "audit",
      dimensions: ["audit"],
      actual: "PATCH must reach the audit owner",
      evidence: ["appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "appendActionModerationAudit",
    ]);
  });

  it("recognizes a helper only when the HTTP method actually delegates to it", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { preparePatchMutation } from "./patch";
        export async function PATCH() {
          return preparePatchMutation();
        }
      `,
      {
        "patch.ts": `
          export function preparePatchMutation() {
            canEditValidatedImpact();
            appendActionModerationAudit();
          }
        `,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH delegates to the preparation owner",
      evidence: [
        "preparePatchMutation",
        "canEditValidatedImpact",
        "appendActionModerationAudit",
      ],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([]);
  });

  it("detects a removed audit call from an otherwise reachable helper", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { preparePatchMutation } from "./patch";
        export async function PATCH() {
          return preparePatchMutation();
        }
      `,
      {
        "patch.ts": `
          export function preparePatchMutation() {
            canEditValidatedImpact();
          }
        `,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH must retain both delegated protections",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "appendActionModerationAudit",
    ]);
  });

  it("detects a removed validated-impact permission from a reachable helper", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { preparePatchMutation } from "./patch";
        export async function PATCH() {
          return preparePatchMutation();
        }
      `,
      {
        "patch.ts": `
          export function preparePatchMutation() {
            appendActionModerationAudit();
          }
        `,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction and audit",
      dimensions: ["validated impact correction", "audit"],
      actual: "PATCH must retain both delegated protections",
      evidence: ["canEditValidatedImpact", "appendActionModerationAudit"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "canEditValidatedImpact",
    ]);
  });

  it("does not count a declaration, import, comment, or different HTTP method", () => {
    const routeEntry = buildInlineRouteEntry(
      `
        import { canEditValidatedImpact as importedPermission } from "./permissions";
        const canEditValidatedImpact = true;
        export async function GET() {
          return importedPermission();
        }
        export async function PATCH() {
          // canEditValidatedImpact is required here, but is not called.
          return new Response("ok");
        }
      `,
      {
        "permissions.ts": `export function canEditValidatedImpact() { return true; }`,
      },
    );
    const entry: ApiAuthorizationContractEntry = {
      expected: "validated impact correction",
      dimensions: ["validated impact correction"],
      actual: "PATCH must execute its own permission check",
      evidence: ["canEditValidatedImpact"],
      evidenceScope: "module",
    };

    expect(missingEvidence(entry, routeEntry, "PATCH")).toEqual([
      "canEditValidatedImpact",
    ]);
  });
});
