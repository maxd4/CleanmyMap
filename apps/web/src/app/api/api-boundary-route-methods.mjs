import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const httpMethodPattern =
  /export\s+(?:async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(|const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=)/g;

export function extractRouteMethods(source) {
  const matches = Array.from(source.matchAll(httpMethodPattern));
  const methods = new Map();
  matches.forEach((match, index) => {
    const method = match[1] ?? match[2];
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? source.length;
    methods.set(method, source.slice(start, end));
  });
  return methods;
}

export function resolveLocalModulePath(fromPath, specifier, exists = existsSync) {
  const isPosixRelative = fromPath.includes("/") && !fromPath.includes("\\");
  const pathApi = isPosixRelative ? path.posix : path;
  const basePath = pathApi.join(pathApi.dirname(fromPath), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.mjs`,
    `${basePath}.js`,
    pathApi.join(basePath, "index.ts"),
    pathApi.join(basePath, "index.tsx"),
  ];
  return candidates.find((candidate) => exists(candidate)) ?? null;
}

export function resolveRouteMethodsFromSource(
  routePath,
  source,
  {
    exists = existsSync,
    readText = (targetPath) => readFileSync(targetPath, "utf8"),
  } = {},
) {
  const methods = extractRouteMethods(source);
  const methodOwners = new Map(
    Array.from(methods.keys()).map((method) => [method, routePath]),
  );
  const reExports = Array.from(
    source.matchAll(
      /export\s*\{\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\}\s*from\s*["']([^"']+)["']/g,
    ),
  );

  for (const match of reExports) {
    const method = match[1];
    const specifier = match[2];
    const targetPath = resolveLocalModulePath(routePath, specifier, exists);
    if (!targetPath) continue;
    const targetSource = readText(targetPath);
    const targetMethods = extractRouteMethods(targetSource);
    const methodSource = targetMethods.get(method);
    if (methodSource) {
      methods.set(method, methodSource);
      methodOwners.set(method, targetPath);
    }
  }

  return { methods, methodOwners };
}
