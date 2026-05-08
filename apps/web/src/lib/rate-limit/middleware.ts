import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "./store";
import { getClientIp, getRateLimitConfig, getAuthenticatedUserId, getRateLimitKey } from "./utils";

export interface RateLimitMiddlewareOptions {
  route?: string;
  skipPaths?: string[];
  customLimit?: number;
  customWindow?: number;
}

const SKIP_PATHS = [
  "/api/health",
  "/api/uptime",
  "/api/email/test",
  "/_next",
  "/favicon",
  "/robots.txt",
];

const LOGGED_ABUSE_PATHS = new Map<string, { count: number; firstAt: number }>();

function logAbuse(identifier: string, route: string, ip: string): void {
  const key = `${identifier}:${route}`;
  const now = Date.now();
  const existing = LOGGED_ABUSE_PATHS.get(key) || { count: 0, firstAt: now };
  
  existing.count++;
  
  if (existing.count === 1 || existing.count % 10 === 0) {
    console.warn("[RateLimit] Abuse pattern detected:", {
      identifier,
      ip,
      route,
      count: existing.count,
      timeWindow: now - existing.firstAt,
    });
  }
  
  if (existing.count > 50) {
    console.error("[RateLimit] Critical abuse - key locked:", { identifier, route });
  }
  
  LOGGED_ABUSE_PATHS.set(key, existing);
}

export async function rateLimitMiddleware(request: NextRequest, options: RouteHandlerOptions = {}): Promise<{ 
  allowed: boolean; 
  response?: NextResponse; 
}> {
  const { skipPaths = [] } = options;
  const path = request.nextUrl.pathname;
  
  if (SKIP_PATHS.some(skip => path.startsWith(skip)) || skipPaths.some(skip => path.startsWith(skip))) {
    return { allowed: true };
  }
  
  if (!path.startsWith("/api/")) {
    return { allowed: true };
  }

  const userId = await getAuthenticatedUserId();
  const ip = await getClientIp();
  const identifier = userId || ip;
  const config = getRateLimitConfig(path);
  const rateLimitKey = getRateLimitKey(identifier, path);

  const result = checkRateLimit({
    key: rateLimitKey,
    limit: config.limit,
    window: config.window,
  });

  const retryAfterSeconds = result.retryAfter || config.window;
  const response = NextResponse.json(
    {
      error: "Trop de tentatives. Réessayez dans quelques instants.",
      message: "Trop de tentatives. Réessayez dans quelques instants.",
      kind: "network",
      status: "rate_limited",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
        ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {}),
      },
    },
  );

  if (!result.success) {
    logAbuse(identifier, path, ip);
    
    response.headers.set("X-RateLimit-Reset", String(result.reset));
    
    return { allowed: false, response };
  }

  return { allowed: true };
}

interface RouteHandlerOptions {
  skipPaths?: string[];
}

export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: RouteHandlerOptions
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    const { allowed, response } = await rateLimitMiddleware(request, options);
    
    if (!allowed && response) {
      return response;
    }
    
    return handler(request);
  };
}
