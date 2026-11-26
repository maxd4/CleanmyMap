import { type LocalModuleSources } from "./api-boundary-analysis";
import { resolveRouteMethodsFromSource } from "./api-boundary-route-methods.mjs";
import {
  collectLocalModuleSources,
  collectReachableMethodSource,
} from "./api-boundary-evidence-analysis";
import type { ApiHttpMethod } from "@/lib/auth/api-authorization-contract";

export function resolveRouteMethods(path: string, source: string) {
  const resolved = resolveRouteMethodsFromSource(path, source);
  const methods = resolved.methods as Map<ApiHttpMethod, string>;
  const methodOwners = resolved.methodOwners as Map<ApiHttpMethod, string>;
  const moduleSources: LocalModuleSources = new Map();
  collectLocalModuleSources(path, source, moduleSources, new Set());

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
