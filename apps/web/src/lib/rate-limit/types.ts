type RateLimitStrategy = "token-bucket" | "sliding-window";

export interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
  strategy: RateLimitStrategy;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  window: number;
}

export type RateLimitRoute = "default" | "auth" | "api" | "read" | "ai" | "write";

/**
 * The protection class is deliberately independent from the quota profile.
 * Quotas are compatibility-sensitive; this class only decides what happens
 * when the distributed anti-abuse store cannot be reached.
 */
export type RateLimitProtectionClass =
  | "public-read"
  | "mutation"
  | "credential"
  | "upload"
  | "expensive";

export type RateLimitFailureMode = "best-effort" | "fail-closed";

export interface RateLimitPolicy {
  config: RateLimitConfig;
  protectionClass: RateLimitProtectionClass;
  failureMode: RateLimitFailureMode;
}

export const DEFAULT_RATE_LIMITS: Record<RateLimitRoute, RateLimitConfig> = {
  default: { limit: 100, window: 60, strategy: "sliding-window" },
  auth: { limit: 10, window: 60, strategy: "sliding-window" },
  api: { limit: 50, window: 60, strategy: "token-bucket" },
  read: { limit: 50, window: 60, strategy: "token-bucket" },
  ai: { limit: 20, window: 60, strategy: "sliding-window" },
  write: { limit: 10, window: 60, strategy: "sliding-window" },
};
