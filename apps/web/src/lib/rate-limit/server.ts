import { checkRateLimit } from "./store";
import { getAuthenticatedUserId, getClientIp, getRateLimitKey } from "./utils";
import { DEFAULT_RATE_LIMITS } from "./types";

export interface ServerRateLimitOptions {
  limit?: number;
  window?: number;
  key?: string;
}

export async function verifyRateLimit(options: ServerRateLimitOptions = {}): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter?: number;
}> {
  const { limit = DEFAULT_RATE_LIMITS.write.limit, window = DEFAULT_RATE_LIMITS.write.window, key } = options;
  
  const userId = await getAuthenticatedUserId();
  const ip = await getClientIp();
  const identifier = key || userId || ip;
  
  const route = "server-api";
  const rateLimitKey = getRateLimitKey(identifier, route);
  
  const result = checkRateLimit({
    key: rateLimitKey,
    limit,
    window,
  });
  
  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    retryAfter: result.retryAfter,
  };
}

export function createServerRateLimitResponse(allowed: boolean, retryAfter?: number): Response | null {
  if (allowed) {
    return null;
  }
  
  return new Response(
    JSON.stringify({
      error: "Trop de tentatives. Réessayez dans quelques instants.",
      message: "Trop de tentatives. Réessayez dans quelques instants.",
      kind: "network",
      status: "rate_limited",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfterSeconds: retryAfter || 60,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter || 60),
      },
    }
  );
}
