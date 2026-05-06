import type { RateLimitOptions, RateLimitResult } from "./types";

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

const LOCKED_KEYS = new Set<string>();

export function clearRateLimitStore(): void {
  buckets.clear();
  LOCKED_KEYS.clear();
}

export function lockRateLimitKey(key: string): void {
  LOCKED_KEYS.add(key);
}

export function unlockRateLimitKey(key: string): void {
  LOCKED_KEYS.delete(key);
}

export function isRateLimitKeyLocked(key: string): boolean {
  return LOCKED_KEYS.has(key);
}

function refillTokenBucket(bucket: TokenBucket, limit: number, window: number): void {
  const now = Date.now();
  const windowMs = window * 1000;
  const timePassed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(timePassed / windowMs) * limit;
  
  bucket.tokens = Math.min(limit, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { key, limit, window } = options;
  const now = Date.now();
  const windowMs = window * 1000;

  if (LOCKED_KEYS.has(key)) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.ceil((now + windowMs) / 1000),
      retryAfter: window,
    };
  }

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: limit - 1, lastRefill: now };
    buckets.set(key, bucket);
    
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil((now + windowMs) / 1000),
    };
  }

  refillTokenBucket(bucket, limit, window);

  if (bucket.tokens > 0) {
    bucket.tokens--;
    
    return {
      success: true,
      limit,
      remaining: bucket.tokens,
      reset: Math.ceil((bucket.lastRefill + windowMs) / 1000),
    };
  }

  const resetTime = bucket.lastRefill + windowMs;
  const retryAfter = Math.ceil((resetTime - now) / 1000);

  return {
    success: false,
    limit,
    remaining: 0,
    reset: Math.ceil(resetTime / 1000),
    retryAfter,
  };
}

export function cleanupOldBuckets(): void {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; 
  
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > maxAge) {
      buckets.delete(key);
    }
  }
}

setInterval(cleanupOldBuckets, 60000);