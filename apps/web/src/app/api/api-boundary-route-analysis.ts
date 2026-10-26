import { readFileSync } from "node:fs";
import {
  extractRouteMethods,
  resolveLocalModulePath,
  type LocalModuleSources,
} from "./api-boundary-analysis";
import {
  collectLocalModuleSources,
  collectReachableMethodSource,
} from "./api-boundary-evidence-analysis";
import type { ApiHttpMethod } from "@/lib/auth/api-authorization-contract";

export function resolveRouteMethods(path: string, source: string) {
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
