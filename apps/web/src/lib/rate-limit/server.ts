import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "@/lib/services/upstash";
import { checkRateLimit } from "./store";
import { getRateLimitConfig, getRateLimitIdentity, getRateLimitKey } from "./utils";

export interface ServerRateLimitOptions {
  limit?: number;
  window?: number;
}

export interface ServerRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export type ServerRateLimitResponseMetadata = Pick<
  ServerRateLimitResult,
  "limit" | "remaining" | "reset"
>;

type DistributedRateLimiter = {
  limit: (identifier: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
    reason?: string;
  }>;
};

const DISTRIBUTED_PREFIX = "cleanmymap:rate-limit";
const UPSTASH_TIMEOUT_MS = 1000;
const distributedRateLimiters = new Map<string, DistributedRateLimiter>();
let cachedRedisClient: ReturnType<typeof getRedisClient> = null;
const fallbackLogState = {
  notConfigured: false,
  unavailable: false,
};

function logFallback(reason: "not_configured" | "unavailable"): void {
  const stateKey = reason === "not_configured" ? "notConfigured" : "unavailable";
  if (fallbackLogState[stateKey]) {
    return;
  }

  fallbackLogState[stateKey] = true;
  console.warn("[RateLimit] Upstash unavailable; using local best-effort fallback.", {
    reason,
  });
}

function getDistributedRateLimiter(
  redis: NonNullable<ReturnType<typeof getRedisClient>>,
  limit: number,
  window: number,
): DistributedRateLimiter {
  if (cachedRedisClient !== redis) {
    distributedRateLimiters.clear();
    cachedRedisClient = redis;
  }

  const cacheKey = `${limit}:${window}`;
  const existing = distributedRateLimiters.get(cacheKey);
  if (existing) {
    return existing;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${window} s`),
    prefix: DISTRIBUTED_PREFIX,
    ephemeralCache: false,
    timeout: UPSTASH_TIMEOUT_MS,
  });

  distributedRateLimiters.set(cacheKey, limiter);
  return limiter;
}

function retryAfterFromReset(reset: number, window: number): number {
  if (!Number.isFinite(reset) || reset <= 0) {
    return window;
  }

  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

async function checkDistributedRateLimit(options: {
  key: string;
  limit: number;
  window: number;
}): Promise<ServerRateLimitResult | null> {
  let redis: NonNullable<ReturnType<typeof getRedisClient>> | null;
  try {
    redis = getRedisClient();
  } catch {
    logFallback("unavailable");
    return null;
  }

  if (!redis) {
    logFallback("not_configured");
    return null;
  }

  try {
    const result = await getDistributedRateLimiter(
      redis,
      options.limit,
      options.window,
    ).limit(options.key);

    if (result.reason === "timeout") {
      logFallback("unavailable");
      return null;
    }

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success
        ? undefined
        : retryAfterFromReset(result.reset, options.window),
    };
  } catch {
    logFallback("unavailable");
    return null;
  }
}

export async function checkServerRateLimit(
  request: Request,
  options: ServerRateLimitOptions = {},
  method = request.method,
): Promise<ServerRateLimitResult> {
  const pathname = new URL(request.url).pathname;
  const config = getRateLimitConfig(pathname, method);
  const identity = await getRateLimitIdentity(request);
  const limit = options.limit ?? config.limit;
  const window = options.window ?? config.window;
  const rateLimitKey = getRateLimitKey(identity.key, pathname, method);

  const distributedResult = await checkDistributedRateLimit({
    key: rateLimitKey,
    limit,
    window,
  });
  if (distributedResult) {
    return distributedResult;
  }

  const localResult = checkRateLimit({
    key: rateLimitKey,
    limit,
    window,
  });

  return {
    allowed: localResult.success,
    limit: localResult.limit,
    remaining: localResult.remaining,
    reset: localResult.reset,
    retryAfter: localResult.retryAfter,
  };
}

export async function verifyRateLimit(
  request: Request,
  options: ServerRateLimitOptions = {},
): Promise<ServerRateLimitResult> {
  return checkServerRateLimit(request, options);
}

export function createServerRateLimitResponse(
  allowed: boolean,
  retryAfter?: number,
  metadata?: Partial<ServerRateLimitResponseMetadata>,
): Response | null {
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
      retryAfterSeconds: retryAfter ?? 60,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter ?? 60),
        ...(metadata?.limit !== undefined
          ? { "X-RateLimit-Limit": String(metadata.limit) }
          : {}),
        ...(metadata?.remaining !== undefined
          ? { "X-RateLimit-Remaining": String(metadata.remaining) }
          : {}),
        ...(metadata?.reset !== undefined
          ? { "X-RateLimit-Reset": String(metadata.reset) }
          : {}),
      },
    }
  );
}
