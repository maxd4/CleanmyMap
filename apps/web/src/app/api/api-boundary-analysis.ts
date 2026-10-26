import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  API_AUTHORIZATION_CONTRACT,
  type ApiAuthorizationContractEntry,
  type ApiHttpMethod,
} from "@/lib/auth/api-authorization-contract";

// This scope is shared by the inventory test and its focused evidence tests.
// It describes which API families are subject to the authorization contract;
// it does not make an access decision.
export const contractedApiFamilies = new Set([
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

export const apiRoot = dirname(fileURLToPath(import.meta.url));
const httpMethodPattern =
  /export\s+(?:async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(|const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=)/g;

export function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

export function extractRouteMethods(source: string): Map<ApiHttpMethod, string> {
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

export function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

export function resolveLocalModulePath(fromPath: string, specifier: string): string | null {
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

export type LocalModuleSources = Map<string, string>;

export function contractEntries() {
  return Object.entries(API_AUTHORIZATION_CONTRACT).flatMap(([route, methods]) =>
    Object.entries(methods).map(([method, entry]) => ({
      key: `${route} ${method}`,
      route,
      method: method as ApiHttpMethod,
      entry: entry as ApiAuthorizationContractEntry,
    })),
  );
}
