import { headers } from "next/headers";
import type { RateLimitConfig } from "./types";
import { DEFAULT_RATE_LIMITS } from "./types";

export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    
    if (forwardedFor) {
      const firstForwardedIp = forwardedFor.split(",")[0]?.trim();
      if (firstForwardedIp) {
        return firstForwardedIp;
      }
    }
    
    const realIp = headersList.get("x-real-ip");
    if (realIp) {
      return realIp;
    }
  } catch {
    // headers() peut échouer si appelé hors du contexte de requête
  }
  
  return "unknown";
}

export function getRateLimitKey(identifier: string, route: string): string {
  return `ratelimit:${route}:${identifier}`;
}

export function getRateLimitConfig(route: string): RateLimitConfig {
  if (route.startsWith("/api/auth") || route.startsWith("/api/sign") || route.startsWith("/api/login")) {
    return DEFAULT_RATE_LIMITS.auth;
  }
  
  if (route.startsWith("/api/ai") || route.includes("vision") || route.includes("recommendation")) {
    return DEFAULT_RATE_LIMITS.ai;
  }
  
  if (route.includes("create") || route.includes("update") || route.includes("delete") || route === "POST") {
    return DEFAULT_RATE_LIMITS.write;
  }
  
  if (route.startsWith("/api/")) {
    return DEFAULT_RATE_LIMITS.api;
  }
  
  return DEFAULT_RATE_LIMITS.default;
}

export async function getAuthenticatedUserIdAsync(): Promise<string | null> {
  try {
    const headersList = await headers();
    const userIdHeader = headersList.get("x-user-id");
    return userIdHeader;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const headersList = await headers();
    const userIdHeader = headersList.get("x-user-id");
    return userIdHeader;
  } catch {
    return null;
  }
}
