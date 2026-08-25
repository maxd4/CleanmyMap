import { checkRateLimit } from "./store";
import { getRateLimitConfig, getRateLimitIdentity, getRateLimitKey } from "./utils";

export interface ServerRateLimitOptions {
  limit?: number;
  window?: number;
}

export async function verifyRateLimit(
  request: Request,
  options: ServerRateLimitOptions = {},
): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter?: number;
}> {
  const pathname = new URL(request.url).pathname;
  const method = request.method;
  const config = getRateLimitConfig(pathname, method);
  const identity = await getRateLimitIdentity(request);
  const rateLimitKey = getRateLimitKey(identity.key, pathname, method);
  
  const result = checkRateLimit({
    key: rateLimitKey,
    limit: options.limit ?? config.limit,
    window: options.window ?? config.window,
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
