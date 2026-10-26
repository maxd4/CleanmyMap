import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import * as ts from "typescript";
import {
  type ApiAuthorizationContractEntry,
  type ApiHttpMethod,
} from "@/lib/auth/api-authorization-contract";
import {
  apiRoot,
  extractRouteMethods,
  resolveLocalModulePath,
  withoutComments,
  type LocalModuleSources,
} from "./api-boundary-analysis";

export function collectLocalModuleSources(
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

function collectFunctionBindings(source: string): Set<string> {
  const bindings = new Set(extractLocalFunctionBodies(source).keys());
  const sourceFile = ts.createSourceFile(
    "api-boundary-bindings.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name) bindings.add(clause.name.text);
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        bindings.add(element.name.text);
      }
    }
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
      bindings.add(clause.namedBindings.name.text);
    }
  }
  return bindings;
}

function isIdentifierDeclaration(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isVariableDeclaration(parent) && parent.name === node) ||
    (ts.isFunctionDeclaration(parent) && parent.name === node) ||
    (ts.isParameter(parent) && parent.name === node) ||
    (ts.isImportClause(parent) && parent.name === node) ||
    (ts.isImportSpecifier(parent) && (parent.name === node || parent.propertyName === node))
  );
}

function isNonExecutablePropertyName(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    (ts.isMethodDeclaration(parent) && parent.name === node) ||
    (ts.isPropertySignature(parent) && parent.name === node)
  );
}

function visitIdentifierReferences(
  node: ts.Node,
  references: Set<string>,
  excludeNonExecutablePropertyNames: boolean,
): void {
  if (ts.isIdentifier(node) && !isIdentifierDeclaration(node)) {
    if (!excludeNonExecutablePropertyNames || !isNonExecutablePropertyName(node)) {
      references.add(node.text);
    }
  }
  ts.forEachChild(node, (child) => visitIdentifierReferences(
    child,
    references,
    excludeNonExecutablePropertyNames,
  ));
}

function collectIdentifierReferencesFromNode(node: ts.Node, excludeNonExecutablePropertyNames = false): Set<string> {
  const references = new Set<string>();
  visitIdentifierReferences(node, references, excludeNonExecutablePropertyNames);
  return references;
}

function collectIdentifierReferences(source: string): Set<string> {
  const sourceFile = ts.createSourceFile(
    "api-boundary-references.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return collectIdentifierReferencesFromNode(sourceFile);
}

const callableBindingsCache = new WeakMap<object, Set<string>>();

// Only these language/platform callback contracts establish execution of an
// identifier passed as an argument. An arbitrary function cannot be assumed
// to invoke a reference it receives, especially when that reference is a
// security guard or audit helper.
const callbackInvokingMethods = new Set([
  "catch",
  "every",
  "filter",
  "find",
  "findIndex",
  "findLast",
  "findLastIndex",
  "flatMap",
  "forEach",
  "map",
  "reduce",
  "reduceRight",
  "some",
  "sort",
  "then",
]);
const callbackInvokingFunctions = new Set([
  // These local route coordinators explicitly invoke the callbacks supplied
  // in their context object. Unknown application functions remain opaque.
  "handleGroupJoinQueue",
  "handleGroupJoinReview",
  "handleGroupJoinToggle",
  "handleCreatorInboxFeedback",
  "handleCreatorInboxPartner",
  "handleCreatorInboxPromotion",
  "runDecisionWorkflow",
  "applyRoleAccountMutation",
]);

function collectCalledIdentifiers(
  source: string,
  includePropertyAccess = false,
  includeCallbackArguments = false,
): Set<string> {
  const sourceFile = ts.createSourceFile(
    "api-boundary-expression.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const calledIdentifiers = new Set<string>();
  const callableAliases = new Map<string, Set<string>>();
  const collectAliases = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      callableAliases.set(
        node.name.text,
        collectIdentifierReferencesFromNode(node.initializer, true),
      );
    }
    ts.forEachChild(node, collectAliases);
  };
  collectAliases(sourceFile);
  const addCallableReference = (name: string, visited = new Set<string>()) => {
    if (visited.has(name)) return;
    visited.add(name);
    calledIdentifiers.add(name);
    for (const alias of callableAliases.get(name) ?? []) {
      addCallableReference(alias, visited);
    }
  };
  const getCalleeIdentifier = (expression: ts.Expression): string | null => {
    let unwrapped = expression;
    while (ts.isParenthesizedExpression(unwrapped)) {
      unwrapped = unwrapped.expression;
    }
    if (ts.isIdentifier(unwrapped)) return unwrapped.text;
    if (
      includePropertyAccess &&
      ts.isPropertyAccessExpression(unwrapped) &&
      ts.isIdentifier(unwrapped.name)
    ) {
      return unwrapped.name.text;
    }
    return null;
  };
  const invokesCallbackArgument = (expression: ts.Expression): boolean => {
    let unwrapped = expression;
    while (ts.isParenthesizedExpression(unwrapped)) {
      unwrapped = unwrapped.expression;
    }
    return (
      (ts.isIdentifier(unwrapped) && callbackInvokingFunctions.has(unwrapped.text)) ||
      (ts.isPropertyAccessExpression(unwrapped) &&
        ts.isIdentifier(unwrapped.name) &&
        callbackInvokingMethods.has(unwrapped.name.text))
    );
  };
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const calleeIdentifier = getCalleeIdentifier(node.expression);
      if (calleeIdentifier) addCallableReference(calleeIdentifier);
      if (includeCallbackArguments && invokesCallbackArgument(node.expression)) {
        for (const argument of node.arguments) {
          let callback = argument;
          while (ts.isParenthesizedExpression(callback)) {
            callback = callback.expression;
          }
          if (ts.isIdentifier(callback)) {
            addCallableReference(callback.text);
          } else {
            for (const reference of collectIdentifierReferencesFromNode(argument, true)) {
              addCallableReference(reference);
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return calledIdentifiers;
}

function hasEvidenceToken(
  source: string,
  token: string,
  calledIdentifiers = collectCalledIdentifiers(source, true),
  callableBindings = new Set<string>(),
  identifierReferences = collectIdentifierReferences(source),
): boolean {
  const executableSource = withoutComments(source);
  if (!/^[A-Za-z_$][\w$]*$/.test(token)) return executableSource.includes(token);
  if (callableBindings.has(token)) return calledIdentifiers.has(token);
  return (
    identifierReferences.has(token) ||
    (token.includes("_") && new RegExp(`["'\`]${token}["'\`]`).test(executableSource))
  );
}

export function collectReachableMethodSource(
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
  const calledIdentifierCache = new Map<string, Set<string>>();
  const usesIdentifier = (source: string, name: string) => {
    const cached = calledIdentifierCache.get(source);
    if (cached) return cached.has(name);
    const calledIdentifiers = collectCalledIdentifiers(source, false, true);
    calledIdentifierCache.set(source, calledIdentifiers);
    return calledIdentifiers.has(name);
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

export function missingEvidence(
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
  const calledIdentifiers = collectCalledIdentifiers(
    executableEvidenceSource,
    true,
    true,
  );
  let callableBindings = callableBindingsCache.get(routeEntry);
  if (!callableBindings) {
    callableBindings = collectFunctionBindings(routeEntry.source);
    callableBindingsCache.set(routeEntry, callableBindings);
  }
  const identifierReferences = collectIdentifierReferences(executableEvidenceSource);
  const missing = (entry.evidence ?? []).filter(
    (token) =>
      !hasEvidenceToken(
        executableEvidenceSource,
        token,
        calledIdentifiers,
        callableBindings,
        identifierReferences,
      ),
  );
  const handlerSource = methodSource ?? "";
  const handlerCalledIdentifiers = collectCalledIdentifiers(handlerSource, true);
  const handlerIdentifierReferences = collectIdentifierReferences(handlerSource);
  const missingHandlerEvidence = (entry.handlerEvidence ?? []).filter(
    (token) =>
      !hasEvidenceToken(
        handlerSource,
        token,
        handlerCalledIdentifiers,
        callableBindings,
        handlerIdentifierReferences,
      ),
  );
  return [...missing, ...missingHandlerEvidence];
}

export function buildInlineRouteEntry(
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
