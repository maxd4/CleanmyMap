import { auth, getAuth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import {
  getDevAuthBypassUserId,
  isDevAuthBypassEnabled,
} from "@/lib/auth/dev-auth";
import type {
  RateLimitConfig,
  RateLimitFailureMode,
  RateLimitPolicy,
  RateLimitProtectionClass,
} from "./types";
import { DEFAULT_RATE_LIMITS } from "./types";

function firstHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [candidateRaw] = value.split(",");
  const candidate = candidateRaw?.trim();
  return candidate ? candidate : null;
}

export function getTrustedClientIpFromHeaders(headersList: Headers): string {
  const vercelForwardedFor = firstHeaderValue(headersList.get("x-vercel-forwarded-for"));
  if (vercelForwardedFor) {
    return vercelForwardedFor;
  }

  const realIp = headersList.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function getTrustedClientIp(source: { headers: Headers; ip?: string | null }): string {
  const requestIp = source.ip?.trim();
  if (requestIp) {
    return requestIp;
  }

  return getTrustedClientIpFromHeaders(source.headers);
}

type RequestWithOptionalIp = Request & { ip?: string | null };

export async function getClientIp(request?: Request): Promise<string> {
  if (request) {
    return getTrustedClientIp({
      headers: request.headers,
      ip: (request as RequestWithOptionalIp).ip,
    });
  }

  try {
    const headersList = await headers();
    return getTrustedClientIpFromHeaders(headersList);
  } catch {
    // headers() peut échouer si appelé hors du contexte de requête
  }

  return "unknown";
}

export type RateLimitIdentity = {
  scope: "authenticated" | "anonymous";
  value: string;
  key: string;
};

async function getRequestHost(request?: Request): Promise<string | null> {
  if (request) {
    return request.headers.get("host");
  }

  try {
    const headersList = await headers();
    return headersList.get("host");
  } catch {
    return null;
  }
}

async function getClerkUserId(request?: Request): Promise<string | null> {
  if (request) {
    try {
      const { userId } = getAuth(request as Parameters<typeof getAuth>[0]);
      if (userId) {
        return userId;
      }
    } catch {
      // Route handlers still have the app-router auth() context when the
      // request does not carry Clerk's middleware headers directly.
    }
  }

  try {
    return (await auth()).userId ?? null;
  } catch {
    return null;
  }
}

export async function getRateLimitIdentity(request?: Request): Promise<RateLimitIdentity> {
  const host = await getRequestHost(request);
  if (isDevAuthBypassEnabled(host)) {
    const value = getDevAuthBypassUserId();
    return {
      scope: "authenticated",
      value,
      key: `authenticated:${value}`,
    };
  }

  const userId = await getClerkUserId(request);
  if (userId) {
    return {
      scope: "authenticated",
      value: userId,
      key: `authenticated:${userId}`,
    };
  }

  const value = await getClientIp(request);
  return {
    scope: "anonymous",
    value,
    key: `anonymous:${value}`,
  };
}

export function getRateLimitKey(identityKey: string, pathname: string, method: string): string {
  return `ratelimit:${method.toUpperCase()}:${pathname}:${identityKey}`;
}

export function getRateLimitConfig(pathname: string, method: string): RateLimitConfig {
  const normalizedMethod = method.toUpperCase();

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/sign") ||
    pathname.startsWith("/api/login")
  ) {
    return DEFAULT_RATE_LIMITS["auth"];
  }

  if (
    pathname.startsWith("/api/ai") ||
    pathname.includes("vision") ||
    pathname.includes("recommendation")
  ) {
    return DEFAULT_RATE_LIMITS["ai"];
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(normalizedMethod)) {
    return DEFAULT_RATE_LIMITS["write"];
  }

  if (["GET", "HEAD"].includes(normalizedMethod)) {
    return DEFAULT_RATE_LIMITS["read"];
  }

  if (pathname.startsWith("/api/")) {
    return DEFAULT_RATE_LIMITS["api"];
  }

  return DEFAULT_RATE_LIMITS["default"];
}

function isPathOrDescendant(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function matchesAnyPath(pathname: string, paths: readonly string[]): boolean {
  return paths.some((path) => isPathOrDescendant(pathname, path));
}

const CREDENTIAL_PATHS = [
  "/api/auth",
  "/api/sign",
  "/api/login",
  "/api/spogomi/team-access",
] as const;

const CREDENTIAL_PATTERNS = [
  /^\/api\/spogomi\/events\/[^/]+\/participants\/[^/]+\/identity-code(?:\/|$)/,
  /^\/api\/spogomi\/events\/[^/]+\/teams\/[^/]+\/access(?:\/|$)/,
] as const;

const EXPENSIVE_PATHS = [
  "/api/ai",
  "/api/route/recommend",
  "/api/geo/address-suggestions",
  "/api/geo/reverse-location",
  "/api/actions/account-options",
  "/api/analytics/funnel",
  "/api/reports",
] as const;

// These families contain private account/admin reads as well as mutations.
// Their GET handlers must not silently fall back to the local limiter when
// the distributed protection is unavailable.
const FAIL_CLOSED_PRIVATE_READ_PATHS = [
  "/api/account",
  "/api/admin",
  "/api/mobile",
] as const;

function matchesCredentialPath(pathname: string): boolean {
  return (
    matchesAnyPath(pathname, CREDENTIAL_PATHS) ||
    CREDENTIAL_PATTERNS.some((pattern) => pattern.test(pathname))
  );
}

function matchesUploadPath(pathname: string): boolean {
  return (
    isPathOrDescendant(pathname, "/api/actions/import") ||
    /\/api\/signalements\/[^/]+\/media(?:\/|$)/.test(pathname) ||
    /\/media(?:\/|$)/.test(pathname) ||
    /\/imports?(?:\/|$)/.test(pathname) ||
    isPathOrDescendant(pathname, "/api/spogomi/events") &&
      /\/(gallery|route-gpx)(?:\/|$)/.test(pathname)
  );
}

function matchesExpensivePath(pathname: string): boolean {
  return (
    matchesAnyPath(pathname, EXPENSIVE_PATHS) ||
    /\/export\.xlsx(?:\/|$)/.test(pathname) ||
    /\/recognition\/reconcile(?:\/|$)/.test(pathname) ||
    /\/governance-monthly(?:\/|$)/.test(pathname)
  );
}

export function getRateLimitProtectionClass(
  pathname: string,
  method: string,
): RateLimitProtectionClass {
  if (matchesCredentialPath(pathname)) {
    return "credential";
  }

  if (matchesUploadPath(pathname)) {
    return "upload";
  }

  if (matchesExpensivePath(pathname)) {
    return "expensive";
  }

  if (["GET", "HEAD"].includes(method.toUpperCase())) {
    return "public-read";
  }

  return "mutation";
}

export function getRateLimitFailureMode(
  pathname: string,
  method: string,
): RateLimitFailureMode {
  if (matchesAnyPath(pathname, FAIL_CLOSED_PRIVATE_READ_PATHS)) {
    return "fail-closed";
  }

  return getRateLimitProtectionClass(pathname, method) === "public-read"
    ? "best-effort"
    : "fail-closed";
}

export function getRateLimitPolicy(pathname: string, method: string): RateLimitPolicy {
  return {
    config: getRateLimitConfig(pathname, method),
    protectionClass: getRateLimitProtectionClass(pathname, method),
    failureMode: getRateLimitFailureMode(pathname, method),
  };
}
