import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "@/lib/services/upstash";
import { checkRateLimit } from "./store";
import {
  getRateLimitIdentity,
  getRateLimitKey,
  getRateLimitPolicy,
} from "./utils";

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
  failure?: "distributed-unavailable";
  failureMode?: "best-effort" | "fail-closed";
  source?: "distributed" | "local-fallback" | "unavailable";
}

export type ServerRateLimitResponseMetadata = Pick<
  ServerRateLimitResult,
  "limit" | "remaining" | "reset"
> & Pick<ServerRateLimitResult, "failure">;

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

function logDistributedUnavailable(reason: "not_configured" | "unavailable"): void {
  const stateKey = reason === "not_configured" ? "notConfigured" : "unavailable";
  if (fallbackLogState[stateKey]) {
    return;
  }

  fallbackLogState[stateKey] = true;
  console.warn("[RateLimit] Upstash unavailable; applying route failure policy.", {
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
}): Promise<
  | { status: "available"; result: ServerRateLimitResult }
  | { status: "unavailable" }
> {
  let redis: NonNullable<ReturnType<typeof getRedisClient>> | null;
  try {
    redis = getRedisClient();
  } catch {
    logDistributedUnavailable("unavailable");
    return { status: "unavailable" };
  }

  if (!redis) {
    logDistributedUnavailable("not_configured");
    return { status: "unavailable" };
  }

  try {
    const result = await getDistributedRateLimiter(
      redis,
      options.limit,
      options.window,
    ).limit(options.key);

    if (result.reason === "timeout") {
      logDistributedUnavailable("unavailable");
      return { status: "unavailable" };
    }

    return {
      status: "available",
      result: {
        allowed: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfter: result.success
          ? undefined
          : retryAfterFromReset(result.reset, options.window),
        source: "distributed",
      },
    };
  } catch {
    logDistributedUnavailable("unavailable");
    return { status: "unavailable" };
  }
}

export async function checkServerRateLimit(
  request: Request,
  options: ServerRateLimitOptions = {},
  method = request.method,
  authenticatedUserId?: string,
): Promise<ServerRateLimitResult> {
  const pathname = new URL(request.url).pathname;
  const policy = getRateLimitPolicy(pathname, method);
  const identity = authenticatedUserId
    ? { scope: "authenticated" as const, value: authenticatedUserId, key: `authenticated:${authenticatedUserId}` }
    : await getRateLimitIdentity(request);
  const limit = options.limit ?? policy.config.limit;
  const window = options.window ?? policy.config.window;
  const rateLimitKey = getRateLimitKey(identity.key, pathname, method);

  const distributedResult = await checkDistributedRateLimit({
    key: rateLimitKey,
    limit,
    window,
  });
  if (distributedResult.status === "available") {
    return {
      ...distributedResult.result,
      failureMode: policy.failureMode,
    };
  }

  if (policy.failureMode === "fail-closed") {
    const reset = Math.floor(Date.now() / 1000) + window;
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset,
      retryAfter: Math.max(1, window),
      failure: "distributed-unavailable",
      failureMode: policy.failureMode,
      source: "unavailable",
    };
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
    failureMode: policy.failureMode,
    source: "local-fallback",
  };
}

export async function verifyRateLimit(
  request: Request,
  options: ServerRateLimitOptions = {},
): Promise<ServerRateLimitResult> {
  return checkServerRateLimit(request, options);
}

export async function enforceServerRateLimit(
  request: Request,
  options: ServerRateLimitOptions = {},
) {
  const result = await verifyRateLimit(request, options);
  return createServerRateLimitResponse(
    result.allowed,
    result.retryAfter,
    result,
  );
}

/**
 * Uses an already authenticated Clerk identity for routes whose bearer token
 * is validated outside the browser-cookie auth context.
 */
export async function enforceServerRateLimitForAuthenticatedUser(
  request: Request,
  userId: string,
  options: ServerRateLimitOptions = {},
) {
  const result = await checkServerRateLimit(request, options, request.method, userId);
  return createServerRateLimitResponse(result.allowed, result.retryAfter, result);
}

export async function withServerRateLimit<T extends Response>(
  request: Request,
  options: ServerRateLimitOptions,
  handler: () => Promise<T>,
): Promise<Response | T> {
  const response = await enforceServerRateLimit(request, options);
  return response ?? handler();
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
      error:
        metadata?.failure === "distributed-unavailable"
          ? "Protection anti-abus temporairement indisponible."
          : "Trop de tentatives. Réessayez dans quelques instants.",
      message:
        metadata?.failure === "distributed-unavailable"
          ? "Protection anti-abus temporairement indisponible."
          : "Trop de tentatives. Réessayez dans quelques instants.",
      kind: "network",
      status: metadata?.failure === "distributed-unavailable" ? "unavailable" : "rate_limited",
      code:
        metadata?.failure === "distributed-unavailable"
          ? "RATE_LIMIT_UNAVAILABLE"
          : "RATE_LIMIT_EXCEEDED",
      retryAfterSeconds: retryAfter ?? 60,
    }),
    {
      status: metadata?.failure === "distributed-unavailable" ? 503 : 429,
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
