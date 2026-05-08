import { describe, expect, it } from "vitest";
import { PROTECTED_ROUTE_PATTERNS } from "./protected-routes";

describe("protected route patterns", () => {
  it("keeps internal and sensitive surfaces behind auth", () => {
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/form-comparison(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/chat(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/notifications(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/community(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/analytics(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/users(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/email/test(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/partners(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/admin(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/send(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).toContain("/api/services(.*)");
    expect(PROTECTED_ROUTE_PATTERNS).not.toContain("/actions/map(.*)");
  });
});
