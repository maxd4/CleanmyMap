import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => clerkMocks);

import {
  getRateLimitConfig,
  getRateLimitIdentity,
  getRateLimitKey,
  getTrustedClientIp,
  getTrustedClientIpFromHeaders,
} from "./utils";
import { DEFAULT_RATE_LIMITS } from "./types";

function buildRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/test", {
    headers: {
      host: "app.example.com",
      "x-real-ip": "198.51.100.20",
      ...headers,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  clerkMocks.getAuth.mockReturnValue({ userId: null });
  clerkMocks.auth.mockResolvedValue({ userId: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rate limit client ip extraction", () => {
  it("prefers trusted platform headers over spoofable x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "198.51.100.20",
    });

    expect(getTrustedClientIpFromHeaders(headers)).toBe("198.51.100.20");
  });

  it("uses x-vercel-forwarded-for when available", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10",
      "x-vercel-forwarded-for": "198.51.100.30, 198.51.100.31",
    });

    expect(getTrustedClientIpFromHeaders(headers)).toBe("198.51.100.30");
  });

  it("prefers a direct request ip when present", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10",
      "x-real-ip": "198.51.100.20",
    });

    expect(getTrustedClientIp({ headers, ip: "192.0.2.42" })).toBe("192.0.2.42");
  });

  it("falls back to unknown when no trusted ip header exists", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10",
    });

    expect(getTrustedClientIpFromHeaders(headers)).toBe("unknown");
  });

  it("ignores a spoofed x-user-id header for anonymous requests", async () => {
    const identity = await getRateLimitIdentity(
      buildRequest({ "x-user-id": "attacker-controlled-user" }),
    );

    expect(identity).toEqual({
      scope: "anonymous",
      value: "198.51.100.20",
      key: "anonymous:198.51.100.20",
    });
    expect(clerkMocks.getAuth).toHaveBeenCalled();
  });

  it("keeps the same anonymous identity when only x-user-id changes", async () => {
    const first = await getRateLimitIdentity(
      buildRequest({ "x-user-id": "attacker-one" }),
    );
    const second = await getRateLimitIdentity(
      buildRequest({ "x-user-id": "attacker-two" }),
    );

    expect(first.key).toBe(second.key);
    expect(first.key).toBe("anonymous:198.51.100.20");
  });

  it("uses the Clerk user identity instead of the client IP", async () => {
    clerkMocks.getAuth.mockReturnValue({ userId: "user_clerk_123" });

    const identity = await getRateLimitIdentity(buildRequest());

    expect(identity).toEqual({
      scope: "authenticated",
      value: "user_clerk_123",
      key: "authenticated:user_clerk_123",
    });
  });

  it("keeps the existing localhost auth bypass limited to development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    clerkMocks.getAuth.mockReturnValue({ userId: "should-not-win" });

    const identity = await getRateLimitIdentity(
      buildRequest({ host: "localhost:3000" }),
    );

    expect(identity.scope).toBe("authenticated");
    expect(identity.value).toBe("dev-localhost");
    expect(identity.key).toBe("authenticated:dev-localhost");
  });

  it("includes HTTP method and pathname in the counter key", () => {
    expect(getRateLimitKey("anonymous:198.51.100.20", "/api/items", "post")).toBe(
      "ratelimit:POST:/api/items:anonymous:198.51.100.20",
    );
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"]) (
    "%s uses the write profile",
    (method) => {
      expect(getRateLimitConfig("/api/example", method)).toBe(DEFAULT_RATE_LIMITS.write);
    },
  );

  it.each(["GET", "HEAD"]) ("%s uses the read profile", (method) => {
    expect(getRateLimitConfig("/api/example", method)).toBe(DEFAULT_RATE_LIMITS.read);
  });

  it("prioritizes auth and AI profiles over HTTP method", () => {
    expect(getRateLimitConfig("/api/auth/session", "POST")).toBe(DEFAULT_RATE_LIMITS.auth);
    expect(getRateLimitConfig("/api/ai/vision", "GET")).toBe(DEFAULT_RATE_LIMITS.ai);
  });
});
