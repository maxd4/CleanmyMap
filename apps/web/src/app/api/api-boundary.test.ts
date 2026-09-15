import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  API_AUTHORIZATION_CONTRACT,
  type ApiAuthorizationContractEntry,
  type ApiHttpMethod,
} from "@/lib/auth/api-authorization-contract";

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
  /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g;

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
    const method = match[1] as ApiHttpMethod;
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? source.length;
    methods.set(method, source.slice(start, end));
  });
  return methods;
}

function resolveRouteMethods(path: string, source: string) {
  const methods = extractRouteMethods(source);
  const moduleSources = [source];
  const reExports = Array.from(
    source.matchAll(
      /export\s*\{\s*(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\}\s*from\s*["']([^"']+)["']/g,
    ),
  );

  for (const match of reExports) {
    const method = match[1] as ApiHttpMethod;
    const specifier = match[2];
    const targetPath = join(dirname(path), `${specifier}.ts`);
    if (!existsSync(targetPath)) continue;
    const targetSource = readFileSync(targetPath, "utf8");
    const targetMethods = extractRouteMethods(targetSource);
    const methodSource = targetMethods.get(method);
    if (methodSource) methods.set(method, methodSource);
    moduleSources.push(targetSource);
  }

  return { methods, source: moduleSources.join("\n") };
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

      const evidenceSource =
        entry.evidenceScope === "module" ? routeEntry?.source : methodSource;
      for (const token of entry.evidence ?? []) {
        expect(evidenceSource, `${route} ${method} missing guard evidence ${token}`).toContain(token);
      }

      if (entry.delegatesTo) {
        expect(methodSource).toMatch(
          new RegExp(`return\\s+${entry.delegatesTo}\\s*\\(`),
        );
      }
    }
  });
});
