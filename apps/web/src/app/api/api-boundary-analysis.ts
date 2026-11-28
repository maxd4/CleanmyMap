import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  API_AUTHORIZATION_CONTRACT,
  type ApiAuthorizationContractEntry,
  type ApiHttpMethod,
} from "@/lib/auth/api-authorization-contract";
import {
  extractRouteMethods as extractRouteMethodsUntyped,
  resolveLocalModulePath,
} from "./api-boundary-route-methods.mjs";

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

// Some API families still contain legacy routes that are not yet represented
// in the authorization contract. New routes can opt in individually without
// widening this inventory to the whole family.
export const contractedApiRoutes = new Set([
  "gamification/territorial-leaderboard/overview",
  "spogomi/events/[eventId]/volunteer-help-proposals",
  "spogomi/events/[eventId]/volunteer-help-proposals/review",
  "personal-ai/declarations",
  "personal-ai/declarations/[id]",
  "personal-ai/imports",
  "actions/[actionId]/accessibility-support",
  "organizations",
]);

export const apiRoot = dirname(fileURLToPath(import.meta.url));

export function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

export function extractRouteMethods(source: string): Map<ApiHttpMethod, string> {
  return extractRouteMethodsUntyped(source) as Map<ApiHttpMethod, string>;
}

export function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

export { resolveLocalModulePath };

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
