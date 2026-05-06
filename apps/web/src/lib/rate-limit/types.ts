export type RateLimitStrategy = "token-bucket" | "sliding-window";

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

export type RateLimitRoute = "default" | "auth" | "api" | "ai" | "write";

export const DEFAULT_RATE_LIMITS: Record<RateLimitRoute, RateLimitConfig> = {
  default: { limit: 100, window: 60, strategy: "sliding-window" },
  auth: { limit: 10, window: 60, strategy: "sliding-window" },
  api: { limit: 50, window: 60, strategy: "token-bucket" },
  ai: { limit: 20, window: 60, strategy: "sliding-window" },
  write: { limit: 10, window: 60, strategy: "sliding-window" },
};
