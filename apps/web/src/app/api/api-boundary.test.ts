import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROTECTED_ROUTE_PATTERNS,
  isProtectedRoutePath,
} from "@/lib/auth/protected-routes";
import {
  API_AUTHORIZATION_CONTRACT,
  type ApiAuthorizationContractEntry,
  type ApiHttpMethod,
} from "@/lib/auth/api-authorization-contract";

const sensitiveApiFamilies = [
  "/api/admin",
  "/api/actions",
  "/api/account",
  "/api/community",
  "/api/chat",
  "/api/analytics",
  "/api/pilotage",
  "/api/partners",
  "/api/recycling",
  "/api/reports",
  "/api/route",
  "/api/send",
  "/api/services",
  "/api/spots",
  "/api/users",
  "/api/email/test",
] as const;

const intentionallyPublicApiPaths = [
  "/api/health",
  "/api/uptime",
] as const;

const auditedApiFamilies = new Set([
  "admin",
  "actions",
  "community",
  "reports",
  "partners",
  "pilotage",
  "spots",
  "users",
  "send",
  "services",
]);
const apiRoot = dirname(fileURLToPath(import.meta.url));

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function readRouteInventory() {
  return walk(apiRoot)
    .filter((path) => path.endsWith("route.ts"))
    .map((path) => {
      const route = relative(apiRoot, dirname(path)).replaceAll("\\", "/");
      const family = route.split("/")[0] ?? "";
      if (!auditedApiFamilies.has(family)) return null;

      const source = readFileSync(path, "utf8");
      const matches = Array.from(
        source.matchAll(
          /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g,
        ),
      );
      const methods = new Map<ApiHttpMethod, string>();
      matches.forEach((match, index) => {
        const method = match[1] as ApiHttpMethod;
        const start = match.index ?? 0;
        const end = matches[index + 1]?.index ?? source.length;
        methods.set(method, source.slice(start, end));
      });
      return { path, route, source, methods };
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
  it.each(sensitiveApiFamilies)(
    "keeps %s behind the protected route contract",
    (path) => {
      expect(isProtectedRoutePath(path)).toBe(true);
      expect(isProtectedRoutePath(`${path}/nested`)).toBe(true);
    },
  );

  it.each(intentionallyPublicApiPaths)(
    "keeps %s outside the global protected route contract",
    (path) => {
      expect(isProtectedRoutePath(path)).toBe(false);
    },
  );

  it("does not contain duplicate protected route patterns", () => {
    expect(new Set(PROTECTED_ROUTE_PATTERNS).size).toBe(
      PROTECTED_ROUTE_PATTERNS.length,
    );
  });

  it("keeps the explicit email test route protected", () => {
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/email/test(.*)");
  });

  it("keeps the legacy send route protected even when local test-token compatibility exists", () => {
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/send(.*)");
  });

  it("audits every route.ts method in the protected API families", () => {
    const inventory = readRouteInventory();
    const discovered = inventory.flatMap(({ route, methods }) =>
      Array.from(methods.keys()).map((method) => `${route} ${method}`),
    );
    const declared = contractEntries().map(({ key }) => key);

    expect(new Set(declared)).toEqual(new Set(discovered));
    expect(declared).toHaveLength(discovered.length);
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
