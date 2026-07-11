import { describe, expect, it } from "vitest";
import {
  PROTECTED_ROUTE_PATTERNS,
  isProtectedRoutePath,
} from "@/lib/auth/protected-routes";

const sensitiveApiFamilies = [
  "/api/admin",
  "/api/actions",
  "/api/account",
  "/api/community",
  "/api/chat",
  "/api/analytics",
  "/api/pilotage",
  "/api/partners",
  "/api/recycling",
  "/api/reports",
  "/api/route",
  "/api/send",
  "/api/services",
  "/api/spots",
  "/api/users",
  "/api/email/test",
] as const;

const intentionallyPublicApiPaths = [
  "/api/health",
  "/api/uptime",
] as const;

describe("API security boundaries", () => {
  it.each(sensitiveApiFamilies)(
    "keeps %s behind the protected route contract",
    (path) => {
      expect(isProtectedRoutePath(path)).toBe(true);
      expect(isProtectedRoutePath(`${path}/nested`)).toBe(true);
    },
  );

  it.each(intentionallyPublicApiPaths)(
    "keeps %s outside the global protected route contract",
    (path) => {
      expect(isProtectedRoutePath(path)).toBe(false);
    },
  );

  it("does not contain duplicate protected route patterns", () => {
    expect(new Set(PROTECTED_ROUTE_PATTERNS).size).toBe(
      PROTECTED_ROUTE_PATTERNS.length,
    );
  });

  it("keeps the explicit email test route protected", () => {
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/email/test(.*)");
  });

  it("keeps the legacy send route protected even when local test-token compatibility exists", () => {
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/send(.*)");
  });
});
