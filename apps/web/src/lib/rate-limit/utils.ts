import { auth, getAuth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import {
  getDevAuthBypassUserId,
  isDevAuthBypassEnabled,
} from "@/lib/auth/dev-auth";
import type { RateLimitConfig } from "./types";
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
