import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clerkMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => clerkMocks);

import {
  getRateLimitConfig,
  getRateLimitFailureMode,
  getRateLimitIdentity,
  getRateLimitKey,
  getRateLimitPolicy,
  getRateLimitProtectionClass,
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
    vi.stubEnv("CMM_DEV_AUTH_BYPASS", "1");
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

  it("classifies cheap public reads as best effort without changing their quota", () => {
    expect(getRateLimitProtectionClass("/api/actions", "GET")).toBe("public-read");
    expect(getRateLimitFailureMode("/api/actions", "GET")).toBe("best-effort");
    expect(getRateLimitPolicy("/api/actions", "GET").config).toBe(DEFAULT_RATE_LIMITS.read);
  });

  it.each([
    "/api/account/promotion-requests",
    "/api/account/active-profile",
    "/api/admin/promotion-requests",
    "/api/admin/role-accounts",
    "/api/mobile/account",
  ])("keeps private authenticated reads fail-closed for %s", (pathname) => {
    expect(getRateLimitFailureMode(pathname, "GET")).toBe("fail-closed");
  });

  it.each([
    ["POST", "/api/actions", "mutation"],
    ["POST", "/api/auth/session", "credential"],
    ["POST", "/api/signalements/signalement-1/media/intents", "upload"],
    ["GET", "/api/spogomi/events/event-1/gallery", "upload"],
    ["GET", "/api/spogomi/events/event-1/route-gpx", "upload"],
    ["GET", "/api/ai/vision", "expensive"],
    ["GET", "/api/actions/account-options", "expensive"],
    ["GET", "/api/reports/actions.csv", "expensive"],
    ["GET", "/api/spogomi/events/event-1/export.xlsx", "expensive"],
  ] as const)("classifies %s %s as %s and fails closed", (method, pathname, protectionClass) => {
    expect(getRateLimitProtectionClass(pathname, method)).toBe(protectionClass);
    expect(getRateLimitFailureMode(pathname, method)).toBe("fail-closed");
  });

  it("classifies credential routes issued inside event scopes", () => {
    expect(
      getRateLimitProtectionClass(
        "/api/spogomi/events/event-1/participants/participant-1/identity-code",
        "POST",
      ),
    ).toBe("credential");
    expect(
      getRateLimitProtectionClass("/api/spogomi/events/event-1/teams/team-1/access", "POST"),
    ).toBe("credential");
  });
});
