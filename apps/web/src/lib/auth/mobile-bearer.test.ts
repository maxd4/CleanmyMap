import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    authenticateRequest: mocks.authenticateRequest,
  })),
}));

import { requireMobileAuthenticatedAccess } from "./mobile-bearer";

describe("mobile Clerk bearer boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects cookie-only and missing credentials", async () => {
    await expect(
      requireMobileAuthenticatedAccess(
        new Request("https://cleanmymap.test/api/mobile/actions"),
      ),
    ).resolves.toEqual({ ok: false, status: 401, error: "Unauthorized" });
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
  });

  it("accepts only an authenticated Clerk session token and returns its subject", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isAuthenticated: true,
      toAuth: () => ({ userId: "user_mobile_1" }),
    });

    const request = new Request("https://cleanmymap.test/api/mobile/actions", {
      headers: { Authorization: "Bearer native-clerk-session-jwt" },
    });

    await expect(requireMobileAuthenticatedAccess(request)).resolves.toEqual({
      ok: true,
      userId: "user_mobile_1",
    });
    expect(mocks.authenticateRequest).toHaveBeenCalledWith(request, {
      acceptsToken: "session_token",
    });
  });

  it("fails closed for expired or otherwise invalid tokens", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isAuthenticated: false,
      reason: "session-token-expired",
    });

    await expect(
      requireMobileAuthenticatedAccess(
        new Request("https://cleanmymap.test/api/mobile/actions", {
          headers: { Authorization: "Bearer expired-clerk-session-jwt" },
        }),
      ),
    ).resolves.toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it.each([
    "Basic credentials",
    "Bearer",
    "Bearer   ",
    "Bearer token extra",
  ])("rejects malformed authorization input without asking Clerk to authenticate: %s", async (authorization) => {
    const request = new Request("https://cleanmymap.test/api/mobile/actions", {
      headers: { Authorization: authorization },
    });

    await expect(requireMobileAuthenticatedAccess(request)).resolves.toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    expect(mocks.authenticateRequest).not.toHaveBeenCalled();
  });

  it("rejects an authenticated Clerk state without a user id", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isAuthenticated: true,
      toAuth: () => ({ userId: null }),
    });

    await expect(
      requireMobileAuthenticatedAccess(
        new Request("https://cleanmymap.test/api/mobile/actions", {
          headers: { Authorization: "Bearer token-without-subject" },
        }),
      ),
    ).resolves.toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("fails closed when Clerk verification throws", async () => {
    mocks.authenticateRequest.mockRejectedValue(new Error("Clerk unavailable"));

    await expect(
      requireMobileAuthenticatedAccess(
        new Request("https://cleanmymap.test/api/mobile/actions", {
          headers: { Authorization: "Bearer unverifiable-token" },
        }),
      ),
    ).resolves.toEqual({ ok: false, status: 401, error: "Unauthorized" });
  });
});
